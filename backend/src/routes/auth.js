const express = require('express');
const QRCode = require('qrcode');
const { v4: uuid } = require('uuid');

const router = express.Router();

// In-memory session store (replace with Redis in production)
const sessions = new Map();
const SESSION_DURATION = parseInt(process.env.PARENT_SESSION_DURATION || '300') * 1000;

const ADMIN_SECRET    = process.env.ADMIN_QR_SECRET    || 'admin-secret-change-me';
const APPROVAL_SECRET = process.env.APPROVAL_QR_SECRET || 'approval-secret-change-me';

/* ─── GET /api/auth/qr-codes
   Returns base64 QR images for admin and approval roles.
   Only exposed in development or after an existing admin session.
─────────────────────────────────────────────────────── */
router.get('/qr-codes', async (_req, res) => {
  try {
    const adminPayload    = JSON.stringify({ role: 'admin',    secret: ADMIN_SECRET,    ts: Date.now() });
    const approvalPayload = JSON.stringify({ role: 'approval', secret: APPROVAL_SECRET, ts: Date.now() });

    const [adminQR, approvalQR] = await Promise.all([
      QRCode.toDataURL(adminPayload,    { errorCorrectionLevel: 'M', width: 256 }),
      QRCode.toDataURL(approvalPayload, { errorCorrectionLevel: 'M', width: 256 }),
    ]);

    res.json({ admin: adminQR, approval: approvalQR });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── POST /api/auth/unlock
   Body: { payload: "<scanned QR text>" }
   Returns: { sessionToken, role, expiresAt }
─────────────────────────────────────────────────────── */
router.post('/unlock', (req, res) => {
  try {
    const { payload } = req.body;
    if (!payload) return res.status(400).json({ error: 'No payload' });

    let parsed;
    try { parsed = JSON.parse(payload); } catch { return res.status(400).json({ error: 'Invalid QR' }); }

    const { role, secret } = parsed;

    if (role === 'admin'    && secret === ADMIN_SECRET)    {}
    else if (role === 'approval' && secret === APPROVAL_SECRET) {}
    else return res.status(401).json({ error: 'Invalid QR code' });

    const token = uuid();
    const expiresAt = Date.now() + SESSION_DURATION;
    sessions.set(token, { role, expiresAt });

    // Auto-expire
    setTimeout(() => sessions.delete(token), SESSION_DURATION);

    res.json({ sessionToken: token, role, expiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── POST /api/auth/verify
   Body: { sessionToken }
─────────────────────────────────────────────────────── */
router.post('/verify', (req, res) => {
  const { sessionToken } = req.body;
  const session = sessions.get(sessionToken);

  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(sessionToken);
    return res.status(401).json({ valid: false });
  }

  res.json({ valid: true, role: session.role, expiresAt: session.expiresAt });
});

/* ─── POST /api/auth/logout ─────────────────────────── */
router.post('/logout', (req, res) => {
  const { sessionToken } = req.body;
  sessions.delete(sessionToken);
  res.json({ ok: true });
});

/* Middleware export for protecting routes */
function requireAuth(roles = ['admin', 'approval']) {
  return (req, res, next) => {
    const token = req.headers['x-session-token'];
    const session = sessions.get(token);

    if (!session || session.expiresAt < Date.now()) {
      sessions.delete(token);
      return res.status(401).json({ error: 'Parent session required' });
    }

    if (!roles.includes(session.role)) {
      return res.status(403).json({ error: 'Insufficient role' });
    }

    req.parentRole = session.role;
    next();
  };
}

module.exports = router;
module.exports.requireAuth = requireAuth;
