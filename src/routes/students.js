const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { requireStudentAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/students/me — matches dashboard.js's expectations
router.get('/me', requireStudentAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT st.id, st.first_name, st.last_name, st.email, st.phone, st.level, st.ward, st.lga,
            st.profile_photo_url, st.created_at, s.name AS state, s.id AS state_id
     FROM students st JOIN states s ON s.id = st.state_id
     WHERE st.id = $1`,
    [req.student.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Student not found.' });

  const cardCount = await pool.query('SELECT COUNT(*) FROM cards WHERE student_id = $1', [req.student.id]);
  const activity = await pool.query(
    `SELECT event_type AS type, metadata, created_at FROM activity_events
     WHERE student_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [req.student.id]
  );

  res.json({
    ...rows[0],
    cards_generated: parseInt(cardCount.rows[0].count, 10),
    activity: activity.rows
  });
}));

// PATCH /api/students/me — matches profile.js's save handler
router.patch('/me', requireStudentAuth, asyncHandler(async (req, res) => {
  const { first_name, last_name, phone, state_id, level, institution_name_freetext } = req.body;

  const { rows } = await pool.query(
    `UPDATE students SET
       first_name = COALESCE($1, first_name),
       last_name = COALESCE($2, last_name),
       phone = COALESCE($3, phone),
       state_id = COALESCE($4, state_id),
       level = COALESCE($5, level),
       institution_name_freetext = COALESCE($6, institution_name_freetext),
       updated_at = now()
     WHERE id = $7
     RETURNING id, first_name, last_name, email, phone, state_id, level`,
    [first_name, last_name, phone, state_id, level, institution_name_freetext, req.student.id]
  );
  res.json(rows[0]);
}));

module.exports = router;
