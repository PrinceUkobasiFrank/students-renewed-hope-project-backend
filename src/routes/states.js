const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/states — matches MOCK_STATES shape in the frontend's mock-data.js,
// with community_links attached for any state that has them (Akwa Ibom today).
router.get('/', asyncHandler(async (req, res) => {
  const statesResult = await pool.query(`
    SELECT s.id, s.name, s.code, s.status,
           COUNT(st.id) AS students
    FROM states s
    LEFT JOIN students st ON st.state_id = s.id
    GROUP BY s.id
    ORDER BY s.name
  `);

  const linksResult = await pool.query(`SELECT * FROM state_community_links ORDER BY id`);
  const linksByState = {};
  linksResult.rows.forEach((link) => {
    if (!linksByState[link.state_id]) linksByState[link.state_id] = [];
    linksByState[link.state_id].push({
      label: link.label,
      note: link.note,
      url: link.url
    });
  });

  const states = statesResult.rows.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    status: s.status,
    students: parseInt(s.students, 10),
    community_links: linksByState[s.id] || null,
    community_members: linksByState[s.id]
      ? linksResult.rows.filter((l) => l.state_id === s.id).reduce((sum, l) => sum + (l.member_count || 0), 0)
      : null
  }));

  res.json(states);
}));

module.exports = router;
