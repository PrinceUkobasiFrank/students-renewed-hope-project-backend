const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// POST /api/analytics/pageview — the frontend only ever calls this after
// the visitor has accepted the cookie banner (see js/consent.js). No IP,
// no user agent, no cookie value read here — just "this path loaded at
// this time", for a simple visit count on the super admin dashboard.
router.post('/pageview', asyncHandler(async (req, res) => {
  const { path } = req.body;
  await pool.query(
    `INSERT INTO page_views (path) VALUES ($1)`,
    [(path || '/').slice(0, 255)]
  );
  res.status(204).send();
}));

module.exports = router;
