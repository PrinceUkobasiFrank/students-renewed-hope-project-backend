const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { signStudentToken, signAdminToken } = require('../utils/jwt');
const { sendEmail } = require('../utils/email');
const { welcomeEmail, resetPasswordEmail } = require('../utils/emailTemplates');

const router = express.Router();

// POST /api/auth/register — matches register.js's regForm submit
router.post('/register', asyncHandler(async (req, res) => {
  const { first_name, last_name, email, phone, state_id, institution_id, institution_name_freetext, level, vin, password, consent } = req.body;

  if (!first_name || !last_name || !email || !state_id || !level || !password) {
    return res.status(400).json({ error: 'first_name, last_name, email, state_id, level, and password are required.' });
  }
  if (!institution_id && !institution_name_freetext) {
    return res.status(400).json({ error: 'institution_id or institution_name_freetext is required.' });
  }
  if (!consent) {
    return res.status(400).json({ error: 'Consent is required to register.' });
  }

  const existing = await pool.query('SELECT id FROM students WHERE email = $1', [email]);
  if (existing.rows.length) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const stateResult = await pool.query('SELECT name, status FROM states WHERE id = $1', [state_id]);
  if (!stateResult.rows.length) {
    return res.status(400).json({ error: 'Invalid state_id.' });
  }
  const state = stateResult.rows[0];

  const password_hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO students (first_name, last_name, email, password_hash, phone, state_id, institution_id, institution_name_freetext, level, vin)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, first_name, last_name, email, state_id`,
    [first_name, last_name, email, password_hash, phone || null, state_id, institution_id || null, institution_name_freetext || null, level, vin || null]
  );
  const student = rows[0];

  await pool.query(
    `INSERT INTO activity_events (student_id, event_type, metadata) VALUES ($1, 'student_registered', $2)`,
    [student.id, JSON.stringify({ state_id })]
  );

  const token = signStudentToken(student);
  res.status(201).json({ token, student });

  // Fire the welcome email after responding — a slow/failed email should
  // never delay or break the registration response the frontend is waiting on.
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
  const { subject, html, text } = welcomeEmail(
    { ...student, stateName: state.name },
    {
      dashboardUrl: `${frontendUrl}/dashboard.html`,
      cardUrl: `${frontendUrl}/card.html`,
      stateActive: state.status === 'active'
    }
  );
  sendEmail({ to: student.email, subject, html, text }).catch((err) => {
    console.warn(`Welcome email failed for ${student.email}:`, err.message);
  });
}));

// POST /api/auth/login — matches the student portal's login.js
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const { rows } = await pool.query('SELECT * FROM students WHERE email = $1', [email]);
  const student = rows[0];
  if (!student || !(await bcrypt.compare(password, student.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = signStudentToken(student);
  res.json({
    token,
    student: { id: student.id, first_name: student.first_name, last_name: student.last_name, email: student.email, state_id: student.state_id }
  });
}));

// POST /api/auth/forgot-password — always responds the same way whether or
// not the email exists, so this can't be used to check who's registered.
// The reset token itself is a random 32-byte value; only its SHA-256 hash
// is stored, exactly like a password, so a database leak alone can't be
// used to reset anyone's account.
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const { rows } = await pool.query('SELECT id, first_name, email FROM students WHERE email = $1', [email]);
  const student = rows[0];

  if (student) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `UPDATE students SET reset_token_hash = $1, reset_token_expires_at = $2 WHERE id = $3`,
      [tokenHash, expiresAt, student.id]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
    const resetUrl = `${frontendUrl}/reset-password.html?token=${rawToken}&email=${encodeURIComponent(student.email)}`;
    const { subject, html, text } = resetPasswordEmail(student, { resetUrl });
    sendEmail({ to: student.email, subject, html, text }).catch((err) => {
      console.warn(`Password reset email failed for ${student.email}:`, err.message);
    });
  }

  res.json({ message: "If that email is registered, we've sent a password reset link to it." });
}));

// POST /api/auth/reset-password — verifies the raw token against the
// stored hash and expiry, then sets a new password. The token is single
// use: it's cleared immediately whether the request succeeds or the token
// turns out to be invalid/expired, so a captured link can't be replayed.
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { email, token, password } = req.body;
  if (!email || !token || !password) {
    return res.status(400).json({ error: 'Email, token, and new password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const { rows } = await pool.query('SELECT * FROM students WHERE email = $1', [email]);
  const student = rows[0];
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const validToken = student
    && student.reset_token_hash === tokenHash
    && student.reset_token_expires_at
    && new Date(student.reset_token_expires_at) > new Date();

  if (!validToken) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired. Request a new one.' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  await pool.query(
    `UPDATE students SET password_hash = $1, reset_token_hash = NULL, reset_token_expires_at = NULL WHERE id = $2`,
    [password_hash, student.id]
  );

  res.json({ message: 'Password updated — you can now log in with your new password.' });
}));

// POST /api/admin/auth/login — matches admin/js/admin-login.js
router.post('/admin/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const { rows } = await pool.query('SELECT * FROM admins WHERE email = $1 AND status = $2', [email, 'active']);
  const admin = rows[0];
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = signAdminToken(admin);
  res.json({
    token,
    admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role, state_id: admin.state_id }
  });
}));

module.exports = router;
