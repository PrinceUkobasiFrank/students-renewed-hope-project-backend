const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { requireAdminAuth } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const { updateEmail } = require('../utils/emailTemplates');

const router = express.Router();

function slugify(title) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// GET /api/news — public, published only, matches MOCK_NEWS shape
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, title, excerpt, body, category, source_url, published_at
     FROM news WHERE status = 'published' ORDER BY published_at DESC`
  );
  res.json(rows);
}));

// ---------- admin ----------

// GET /api/admin/news — includes drafts, matches admin/news.html's table
router.get('/admin', requireAdminAuth(['super_admin', 'national_admin', 'content_staff']), asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM news ORDER BY published_at DESC NULLS LAST, created_at DESC`);
  res.json(rows);
}));

// POST /api/admin/news — create
router.post('/admin', requireAdminAuth(['super_admin', 'national_admin', 'content_staff']), asyncHandler(async (req, res) => {
  const { title, category, status, excerpt, body, source_url } = req.body;
  if (!title || !excerpt || !body) return res.status(400).json({ error: 'title, excerpt, and body are required.' });

  const slug = `${slugify(title)}-${Date.now().toString(36)}`;
  const publishedAt = status === 'published' ? new Date() : null;

  const { rows } = await pool.query(
    `INSERT INTO news (title, slug, excerpt, body, category, status, author_id, published_at, source_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [title, slug, excerpt, body, category || 'community', status || 'draft', req.admin.id, publishedAt, source_url || null]
  );
  res.status(201).json(rows[0]);
}));

// PATCH /api/admin/news/:id — edit
router.patch('/admin/:id', requireAdminAuth(['super_admin', 'national_admin', 'content_staff']), asyncHandler(async (req, res) => {
  const { title, category, status, excerpt, body, source_url } = req.body;
  const existing = await pool.query('SELECT * FROM news WHERE id = $1', [req.params.id]);
  if (!existing.rows.length) return res.status(404).json({ error: 'News item not found.' });

  const current = existing.rows[0];
  const publishedAt = status === 'published' && !current.published_at ? new Date() : current.published_at;

  const { rows } = await pool.query(
    `UPDATE news SET title = $1, category = $2, status = $3, excerpt = $4, body = $5,
       published_at = $6, source_url = $7, updated_at = now()
     WHERE id = $8 RETURNING *`,
    [title || current.title, category || current.category, status || current.status,
     excerpt || current.excerpt, body || current.body, publishedAt,
     source_url !== undefined ? (source_url || null) : current.source_url, req.params.id]
  );
  res.json(rows[0]);
}));

// DELETE /api/admin/news/:id
router.delete('/admin/:id', requireAdminAuth(['super_admin', 'national_admin', 'content_staff']), asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM news WHERE id = $1', [req.params.id]);
  res.status(204).send();
}));

// POST /api/admin/news/:id/notify — emails every registered student about
// this update. Deliberately a separate, explicit action (not automatic on
// publish) so an admin can fix typos after publishing without accidentally
// spamming everyone on every small edit.
router.post('/admin/:id/notify', requireAdminAuth(['super_admin', 'national_admin']), asyncHandler(async (req, res) => {
  const { rows: newsRows } = await pool.query('SELECT * FROM news WHERE id = $1', [req.params.id]);
  if (!newsRows.length) return res.status(404).json({ error: 'News item not found.' });
  const item = newsRows[0];
  if (item.status !== 'published') {
    return res.status(400).json({ error: 'Publish this update before notifying students.' });
  }

  const { rows: students } = await pool.query('SELECT id, first_name, email FROM students');
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
  const { subject, html, text } = updateEmail(item, { newsUrl: `${frontendUrl}/news.html` });

  // Fire sequentially rather than in parallel — Resend (and most providers)
  // rate-limit per-second sends, and this list is small enough that a
  // short delay per email is a non-issue at current scale.
  let sent = 0;
  const failures = [];
  for (const student of students) {
    try {
      const personalizedHtml = html.replace(/{{first_name}}/g, student.first_name);
      const personalizedText = text.replace(/{{first_name}}/g, student.first_name);
      await sendEmail({ to: student.email, subject, html: personalizedHtml, text: personalizedText });
      sent++;
    } catch (err) {
      failures.push({ email: student.email, error: err.message });
    }
  }

  res.json({ recipients: students.length, sent, failed: failures.length, failures: failures.slice(0, 5) });
}));

module.exports = router;
