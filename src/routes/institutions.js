const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/institutions?state_id= — matches register.js's institution select,
// which repopulates whenever the state select changes. Returns [] (not an
// error) for a state with nothing seeded yet, so the frontend can fall back
// to its "Other — type it in" option rather than showing an empty dropdown.
router.get('/', asyncHandler(async (req, res) => {
  const { state_id } = req.query;
  if (!state_id) {
    return res.status(400).json({ error: 'state_id is required.' });
  }

  const { rows } = await pool.query(
    `SELECT id, name, type FROM institutions
     WHERE state_id = $1 AND status = 'active'
     ORDER BY name`,
    [state_id]
  );
  res.json(rows);
}));

module.exports = router;
