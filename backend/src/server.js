import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import pg from 'pg';

const { Pool } = pg;

const PORT = Number.parseInt(process.env.PORT || '4010', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const ALLOW_PLAINTEXT_ADMIN = String(process.env.ALLOW_PLAINTEXT_ADMIN || '').toLowerCase() === 'true';
const ADMIN_EMAILS = String(process.env.ADMIN_EMAILS || '')
  .split(/[\s,]+/)
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);

const DATABASE_URL = String(process.env.DATABASE_URL || '').trim();
const dbHost = process.env.PGHOST || process.env.DB_HOST;
const dbPort = process.env.PGPORT || process.env.DB_PORT;
const dbName = process.env.PGDATABASE || process.env.DB_NAME;
const dbUser = process.env.PGUSER || process.env.DB_USER;
const dbPassword = process.env.PGPASSWORD ?? process.env.DB_PASSWORD ?? '';
const requireSsl = String(process.env.PGSSL || process.env.DB_SSL_REQUIRE || '').toLowerCase() === 'true';

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: requireSsl ? { rejectUnauthorized: false } : undefined,
    })
  : new Pool({
      host: dbHost,
      port: Number.parseInt(String(dbPort || '5432'), 10),
      database: dbName,
      user: dbUser,
      password: String(dbPassword),
      ssl: requireSsl ? { rejectUnauthorized: false } : undefined,
    });

function isDevBypassToken(token) {
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  const bypassToken = process.env.DEV_BYPASS_TOKEN || 'dev-bypass-token';
  const allowBypassInProd = String(process.env.ALLOW_BYPASS_IN_PROD || '').toLowerCase() === 'true';
  // 在正式環境若未明確允許，不開放 bypass
  if (isProd && !allowBypassInProd) return false;
  return token === bypassToken;
}

function requireAdmin(req, res, next) {
  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return res.status(401).json({ success: false, message: '未提供 Token' });
  }

  if (isDevBypassToken(token)) {
    req.admin = { id: null, email: 'admin@local', bypass: true };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const email = String(decoded?.email || '').toLowerCase();

    if (!email || ADMIN_EMAILS.length === 0 || !ADMIN_EMAILS.includes(email)) {
      return res.status(403).json({ success: false, message: '需要管理員權限' });
    }

    req.admin = { id: decoded.id ?? null, email };
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, message: e?.name === 'TokenExpiredError' ? 'Token 已過期' : 'Token 無效' });
  }
}

const app = express();

app.use(cors({
  origin: (origin, cb) => cb(null, true),
  credentials: true,
}));
app.use(express.json());

function parsePagination(req, { defaultLimit = 50, maxLimit = 200 } = {}) {
  const limit = Math.min(
    Math.max(Number.parseInt(String(req.query.limit || String(defaultLimit)), 10) || defaultLimit, 1),
    maxLimit
  );
  const offset = Math.max(Number.parseInt(String(req.query.offset || '0'), 10) || 0, 0);
  return { limit, offset };
}

let ensuredSystemSettings = false;
let ensureSystemSettingsPromise = null;

async function ensureSystemSettingsTable() {
  if (ensuredSystemSettings) return;
  if (ensureSystemSettingsPromise) return ensureSystemSettingsPromise;
  ensureSystemSettingsPromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    ensuredSystemSettings = true;
  })();
  return ensureSystemSettingsPromise;
}

function normalizeBool(value) {
  if (typeof value === 'boolean') return value;
  const s = String(value ?? '').trim().toLowerCase();
  if (!s) return null;
  if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
  return null;
}

function normalizeMaxOnline(value) {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

async function readPresenceSettings() {
  await ensureSystemSettingsTable();
  const keys = ['presence.max_online_users', 'presence.enable_queue', 'presence.block_queued_write_heavy'];
  const result = await pool.query(
    'SELECT key, value FROM system_settings WHERE key = ANY($1::text[])',
    [keys]
  );
  const map = new Map();
  for (const row of result.rows || []) {
    map.set(String(row.key), row.value);
  }

  const defaults = {
    max_online_users: 0,
    enable_queue: false,
    block_queued_write_heavy: true,
  };

  const dbMaxOnline = normalizeMaxOnline(map.get('presence.max_online_users'));
  const dbEnableQueue = normalizeBool(map.get('presence.enable_queue'));
  const dbBlockQueued = normalizeBool(map.get('presence.block_queued_write_heavy'));

  return {
    max_online_users: dbMaxOnline === null ? defaults.max_online_users : dbMaxOnline,
    enable_queue: dbEnableQueue === null ? defaults.enable_queue : dbEnableQueue,
    block_queued_write_heavy: dbBlockQueued === null ? defaults.block_queued_write_heavy : dbBlockQueued,
  };
}

async function writePresenceSettings(next) {
  await ensureSystemSettingsTable();

  const updates = [];
  if (Object.prototype.hasOwnProperty.call(next, 'max_online_users')) {
    const normalized = normalizeMaxOnline(next.max_online_users);
    if (normalized === null) {
      const err = new Error('max_online_users must be a non-negative integer');
      err.status = 400;
      throw err;
    }
    updates.push(['presence.max_online_users', normalized]);
  }
  if (Object.prototype.hasOwnProperty.call(next, 'enable_queue')) {
    const normalized = normalizeBool(next.enable_queue);
    if (normalized === null) {
      const err = new Error('enable_queue must be boolean');
      err.status = 400;
      throw err;
    }
    updates.push(['presence.enable_queue', normalized]);
  }
  if (Object.prototype.hasOwnProperty.call(next, 'block_queued_write_heavy')) {
    const normalized = normalizeBool(next.block_queued_write_heavy);
    if (normalized === null) {
      const err = new Error('block_queued_write_heavy must be boolean');
      err.status = 400;
      throw err;
    }
    updates.push(['presence.block_queued_write_heavy', normalized]);
  }

  for (const [key, value] of updates) {
    await pool.query(
      `INSERT INTO system_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, JSON.stringify(value)]
    );
  }

  return readPresenceSettings();
}

async function tryWriteAuditLog({ action, details, ip, userAgent } = {}) {
  try {
    await pool.query(
      'INSERT INTO audit_logs (action, entity_type, entity_id, ip_address, user_agent, details) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        String(action || 'admin_settings_update'),
        'system_settings',
        null,
        ip || null,
        userAgent || null,
        details ? JSON.stringify(details) : null,
      ]
    );
  } catch {
    // ignore
  }
}

app.get('/health', async (_req, res) => {
  let dbOk = true;
  let dbError = null;
  try {
    await pool.query('SELECT 1');
  } catch (e) {
    dbOk = false;
    dbError = e?.message || String(e);
  }
  res.json({ status: 'ok', db: { ok: dbOk, error: dbError } });
});

app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).json({ success: false, message: '請提供 Email 和密碼' });
  }

  if (ADMIN_EMAILS.length === 0) {
    return res.status(500).json({ success: false, message: '尚未設定 ADMIN_EMAILS' });
  }

  if (!ADMIN_EMAILS.includes(normalizedEmail)) {
    return res.status(403).json({ success: false, message: '需要管理員權限' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash, is_active, email_verified FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Email 或密碼錯誤' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: '帳戶已被停用' });
    }

    if (!user.email_verified) {
      return res.status(403).json({ success: false, message: '帳號尚未完成 Email 驗證' });
    }

    let ok = false;
    if (ALLOW_PLAINTEXT_ADMIN && String(user.password_hash) === String(password)) {
      ok = true;
    } else {
      ok = await bcrypt.compare(String(password), String(user.password_hash));
    }
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Email 或密碼錯誤' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, scope: 'admin' },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.json({
      success: true,
      data: {
        token,
        admin: { id: user.id, email: user.email },
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || '登入失敗' });
  }
});

app.post('/admin/exchange-key', async (req, res) => {
  const provided = String(req.body?.accessKey || req.headers['x-admin-access-key'] || '').trim();
  const expected = String(process.env.ADMIN_ACCESS_KEY || '').trim();

  if (!expected) {
    return res.status(500).json({ success: false, message: '尚未設定 ADMIN_ACCESS_KEY' });
  }

  if (!provided || provided !== expected) {
    return res.status(401).json({ success: false, message: 'Access key 無效' });
  }

  if (ADMIN_EMAILS.length === 0) {
    return res.status(500).json({ success: false, message: '尚未設定 ADMIN_EMAILS' });
  }

  const email = ADMIN_EMAILS[0];
  const token = jwt.sign(
    { id: null, email, scope: 'admin', via: 'access_key' },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  return res.json({
    success: true,
    data: {
      token,
      admin: { id: null, email },
    },
  });
});

app.get('/admin/me', requireAdmin, async (req, res) => {
  return res.json({ success: true, data: { admin: req.admin } });
});

app.get('/admin/status', requireAdmin, async (_req, res) => {
  const startedAt = process.uptime();
  let dbOk = true;
  let dbError = null;

  try {
    await pool.query('SELECT 1');
  } catch (e) {
    dbOk = false;
    dbError = e?.message || String(e);
  }

  const counts = {};
  try {
    const userCount = await pool.query('SELECT COUNT(*)::int AS n FROM users');
    counts.users = userCount.rows[0]?.n ?? null;
  } catch {
    counts.users = null;
  }

  try {
    const subCount = await pool.query('SELECT COUNT(*)::int AS n FROM subscriptions');
    counts.subscriptions = subCount.rows[0]?.n ?? null;
  } catch {
    counts.subscriptions = null;
  }

  try {
    const payCount = await pool.query('SELECT COUNT(*)::int AS n FROM payments');
    counts.payments = payCount.rows[0]?.n ?? null;
  } catch {
    counts.payments = null;
  }

  try {
    const auditCount = await pool.query('SELECT COUNT(*)::int AS n FROM audit_logs');
    counts.audit_logs = auditCount.rows[0]?.n ?? null;
  } catch {
    counts.audit_logs = null;
  }

  return res.json({
    success: true,
    data: {
      env: String(process.env.NODE_ENV || 'development'),
      uptimeSeconds: startedAt,
      db: { ok: dbOk, error: dbError },
      counts,
    },
  });
});

app.get('/admin/settings/presence', requireAdmin, async (_req, res) => {
  try {
    const settings = await readPresenceSettings();
    return res.json({ success: true, data: settings });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || '讀取設定失敗' });
  }
});

app.put('/admin/settings/presence', requireAdmin, async (req, res) => {
  try {
    const next = req.body || {};
    const settings = await writePresenceSettings(next);

    const ip = String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
    const ua = String(req.get('user-agent') || '').slice(0, 512);
    await tryWriteAuditLog({
      action: 'admin_presence_settings_update',
      details: { next, admin: req.admin?.email || null },
      ip,
      userAgent: ua,
    });

    return res.json({ success: true, data: settings });
  } catch (e) {
    const status = Number(e?.status) || 500;
    return res.status(status).json({ success: false, message: e?.message || '更新設定失敗' });
  }
});

app.get('/admin/users', requireAdmin, async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const { limit, offset } = parsePagination(req, { defaultLimit: 50, maxLimit: 200 });

  const params = [];
  let where = '';
  if (q) {
    params.push(`%${q}%`);
    where = `WHERE lower(email) LIKE $${params.length} OR lower(coalesce(username, '')) LIKE $${params.length}`;
  }

  params.push(limit);
  params.push(offset);

  const sql = `
    SELECT id, email, username, full_name, plan, subscription_status, email_verified, is_active, last_login_at, created_at
    FROM users
    ${where}
    ORDER BY created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  try {
    const result = await pool.query(sql, params);
    return res.json({ success: true, data: { users: result.rows } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || '查詢失敗' });
  }
});

app.get('/admin/subscriptions', requireAdmin, async (req, res) => {
  const { limit, offset } = parsePagination(req, { defaultLimit: 50, maxLimit: 200 });
  const q = String(req.query.q || '').trim().toLowerCase();
  const status = String(req.query.status || '').trim();
  const plan = String(req.query.plan || '').trim();

  const params = [];
  const wheres = [];

  if (q) {
    params.push(`%${q}%`);
    wheres.push(`(lower(u.email) LIKE $${params.length} OR lower(coalesce(u.username, '')) LIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    wheres.push(`s.status = $${params.length}`);
  }
  if (plan) {
    params.push(plan);
    wheres.push(`s.plan = $${params.length}`);
  }

  const where = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';

  params.push(limit);
  params.push(offset);

  const sql = `
    SELECT
      s.id,
      s.user_id,
      u.email AS user_email,
      u.username AS user_username,
      s.plan,
      s.status,
      s.amount,
      s.currency,
      s.start_date,
      s.end_date,
      s.auto_renew,
      s.cancelled_at,
      s.cancel_reason,
      s.created_at
    FROM subscriptions s
    LEFT JOIN users u ON u.id = s.user_id
    ${where}
    ORDER BY s.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  try {
    const result = await pool.query(sql, params);
    return res.json({ success: true, data: { subscriptions: result.rows } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || '查詢失敗' });
  }
});

app.get('/admin/payments', requireAdmin, async (req, res) => {
  const { limit, offset } = parsePagination(req, { defaultLimit: 50, maxLimit: 200 });
  const q = String(req.query.q || '').trim().toLowerCase();
  const status = String(req.query.status || '').trim();
  const gateway = String(req.query.gateway || '').trim();

  const params = [];
  const wheres = [];

  if (q) {
    params.push(`%${q}%`);
    wheres.push(`(
      lower(coalesce(u.email, '')) LIKE $${params.length}
      OR lower(coalesce(p.merchant_trade_no, '')) LIKE $${params.length}
      OR lower(coalesce(p.transaction_id, '')) LIKE $${params.length}
    )`);
  }
  if (status) {
    params.push(status);
    wheres.push(`p.status = $${params.length}`);
  }
  if (gateway) {
    params.push(gateway);
    wheres.push(`p.payment_gateway = $${params.length}`);
  }

  const where = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';

  params.push(limit);
  params.push(offset);

  const sql = `
    SELECT
      p.id,
      p.user_id,
      u.email AS user_email,
      p.subscription_id,
      s.plan AS subscription_plan,
      p.amount,
      p.currency,
      p.payment_method,
      p.payment_gateway,
      p.merchant_trade_no,
      p.transaction_id,
      p.status,
      p.paid_at,
      p.created_at
    FROM payments p
    LEFT JOIN users u ON u.id = p.user_id
    LEFT JOIN subscriptions s ON s.id = p.subscription_id
    ${where}
    ORDER BY p.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  try {
    const result = await pool.query(sql, params);
    return res.json({ success: true, data: { payments: result.rows } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || '查詢失敗' });
  }
});

app.get('/admin/audit-logs', requireAdmin, async (req, res) => {
  const { limit, offset } = parsePagination(req, { defaultLimit: 100, maxLimit: 500 });
  const q = String(req.query.q || '').trim().toLowerCase();
  const action = String(req.query.action || '').trim();

  const params = [];
  const wheres = [];

  if (q) {
    params.push(`%${q}%`);
    wheres.push(`(
      lower(coalesce(u.email, '')) LIKE $${params.length}
      OR lower(coalesce(a.action, '')) LIKE $${params.length}
      OR lower(coalesce(a.entity_type, '')) LIKE $${params.length}
      OR coalesce(a.ip_address, '') LIKE $${params.length}
    )`);
  }
  if (action) {
    params.push(action);
    wheres.push(`a.action = $${params.length}`);
  }

  const where = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';

  params.push(limit);
  params.push(offset);

  const sql = `
    SELECT
      a.id,
      a.user_id,
      u.email AS user_email,
      a.action,
      a.entity_type,
      a.entity_id,
      a.ip_address,
      a.user_agent,
      a.details,
      a.created_at
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.user_id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  try {
    const result = await pool.query(sql, params);
    return res.json({ success: true, data: { auditLogs: result.rows } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || '查詢失敗' });
  }
});

app.listen(PORT, () => {
  console.log(`quantgems-admin-api running at http://localhost:${PORT}`);
});
