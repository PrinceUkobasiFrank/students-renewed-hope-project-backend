const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { requireAdminAuth } = require('../middleware/auth');

const router = express.Router();

function slugify(title) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// GET /api/news — public, published only, matches MOCK_NEWS shape
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, title, excerpt, body, category, published_at
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
  const { title, category, status, excerpt, body } = req.body;
  if (!title || !excerpt || !body) return res.status(400).json({ error: 'title, excerpt, and body are required.' });

  const slug = `${slugify(title)}-${Date.now().toString(36)}`;
  const publishedAt = status === 'published' ? new Date() : null;

  const { rows } = await pool.query(
    `INSERT INTO news (title, slug, excerpt, body, category, status, author_id, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [title, slug, excerpt, body, category || 'community', status || 'draft', req.admin.id, publishedAt]
  );
  res.status(201).json(rows[0]);
}));

// PATCH /api/admin/news/:id — edit
router.patch('/admin/:id', requireAdminAuth(['super_admin', 'national_admin', 'content_staff']), asyncHandler(async (req, res) => {
  const { title, category, status, excerpt, body } = req.body;
  const existing = await pool.query('SELECT * FROM news WHERE id = $1', [req.params.id]);
  if (!existing.rows.length) return res.status(404).json({ error: 'News item not found.' });

  const current = existing.rows[0];
  const publishedAt = status === 'published' && !current.published_at ? new Date() : current.published_at;

  const { rows } = await pool.query(
    `UPDATE news SET title = $1, category = $2, status = $3, excerpt = $4, body = $5,
       published_at = $6, updated_at = now()
     WHERE id = $7 RETURNING *`,
    [title || current.title, category || current.category, status || current.status,
     excerpt || current.excerpt, body || current.body, publishedAt, req.params.id]
  );
  res.json(rows[0]);
}));

// DELETE /api/admin/news/:id
router.delete('/admin/:id', requireAdminAuth(['super_admin', 'national_admin', 'content_staff']), asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM news WHERE id = $1', [req.params.id]);
  res.status(204).send();
}));

module.exports = router;
