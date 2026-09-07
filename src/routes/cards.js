const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { requireStudentAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/cards — matches card.js's NOTE comment: records a generated
// card against the logged-in student. image_url is optional here; if you
// want the rendered PNG stored, upload it to Cloud Storage client-side (or
// via a follow-up endpoint) and pass the resulting URL.
router.post('/', requireStudentAuth, asyncHandler(async (req, res) => {
  const { ward, lga, image_url } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO cards (student_id, ward, lga, image_url) VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.student.id, ward || null, lga || null, image_url || null]
  );

  await pool.query(
    `INSERT INTO activity_events (student_id, event_type, metadata) VALUES ($1, 'card_generated', $2)`,
    [req.student.id, JSON.stringify({ card_id: rows[0].id })]
  );

  res.status(201).json(rows[0]);
}));

// POST /api/cards/:id/share — bumps share_count, logs a card_shared event
router.post('/:id/share', requireStudentAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE cards SET share_count = share_count + 1 WHERE id = $1 AND student_id = $2 RETURNING *`,
    [req.params.id, req.student.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Card not found.' });

  await pool.query(
    `INSERT INTO activity_events (student_id, event_type, metadata) VALUES ($1, 'card_shared', $2)`,
    [req.student.id, JSON.stringify({ card_id: req.params.id })]
  );
  res.json(rows[0]);
}));

module.exports = router;
