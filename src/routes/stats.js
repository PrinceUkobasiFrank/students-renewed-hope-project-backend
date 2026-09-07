const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/stats — public, unauthenticated. Powers the homepage hero
// counters. Separate from /api/admin/dashboard (which is role-scoped and
// requires auth) since this needs to be readable by anonymous visitors.
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM students) AS total_students,
      (SELECT COUNT(*) FROM states WHERE status = 'active') AS active_states,
      (SELECT COUNT(*) FROM states) AS total_states,
      (SELECT COUNT(*) FROM cards) AS total_cards,
      (SELECT COALESCE(SUM(member_count), 0) FROM state_community_links) AS community_members
  `);
  const row = rows[0];
  res.json({
    total_students: parseInt(row.total_students, 10),
    active_states: parseInt(row.active_states, 10),
    total_states: parseInt(row.total_states, 10),
    total_cards: parseInt(row.total_cards, 10),
    community_members: parseInt(row.community_members, 10)
  });
}));

module.exports = router;
