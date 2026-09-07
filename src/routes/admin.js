const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');
const { requireAdminAuth } = require('../middleware/auth');

const router = express.Router();

// Every route below mirrors the role gating already built into
// admin/js/admin-auth.js's renderAdminChrome() nav — so the frontend's
// "which sidebar links show up" and the backend's "which requests succeed"
// stay in sync by construction, not by convention.

// GET /api/admin/dashboard — matches admin/js/dashboard.js
router.get('/dashboard', requireAdminAuth(), asyncHandler(async (req, res) => {
  const isCoordinator = req.admin.role === 'state_coordinator';
  const stateFilter = isCoordinator ? 'WHERE s.id = $1' : '';
  const params = isCoordinator ? [req.admin.state_id] : [];

  const totals = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM students ${isCoordinator ? 'WHERE state_id = $1' : ''}) AS total_students,
       (SELECT COUNT(*) FROM states WHERE status = 'active') AS active_states,
       (SELECT COUNT(*) FROM states) AS total_states,
       (SELECT COUNT(*) FROM cards ${isCoordinator ? 'c JOIN students st ON st.id = c.student_id WHERE st.state_id = $1' : ''}) AS total_cards,
       (SELECT COALESCE(SUM(member_count), 0) FROM state_community_links) AS community_members`,
    params
  );

  const recentActivity = await pool.query(
    `SELECT ae.event_type, ae.metadata, ae.created_at, s.first_name, s.last_name, st.name AS state
     FROM activity_events ae
     LEFT JOIN students s ON s.id = ae.student_id
     LEFT JOIN states st ON st.id = s.state_id
     ${isCoordinator ? 'WHERE st.id = $1' : ''}
     ORDER BY ae.created_at DESC LIMIT 10`,
    params
  );

  const recentNews = await pool.query(
    `SELECT title, category, published_at FROM news
     WHERE status = 'published' ORDER BY published_at DESC LIMIT 5`
  );

  res.json({
    totals: totals.rows[0],
    recent_activity: recentActivity.rows,
    recent_news: recentNews.rows
  });
}));

// GET /api/admin/students — matches admin/js/students.js, role-scoped
router.get('/students', requireAdminAuth(['super_admin', 'national_admin', 'state_coordinator']), asyncHandler(async (req, res) => {
  const { search, state, level, page = 1, pageSize = 20 } = req.query;
  const isCoordinator = req.admin.role === 'state_coordinator';

  const conditions = [];
  const params = [];
  let i = 1;

  if (isCoordinator) {
    conditions.push(`st.state_id = $${i++}`);
    params.push(req.admin.state_id);
  } else if (state) {
    conditions.push(`s.name = $${i++}`);
    params.push(state);
  }
  if (search) {
    conditions.push(`(st.first_name ILIKE $${i} OR st.last_name ILIKE $${i} OR st.institution_name_freetext ILIKE $${i})`);
    params.push(`%${search}%`);
    i++;
  }
  if (level) {
    conditions.push(`st.level = $${i++}`);
    params.push(level);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM students st JOIN states s ON s.id = st.state_id ${whereClause}`,
    params
  );

  const dataResult = await pool.query(
    `SELECT st.id, st.first_name, st.last_name, st.level, st.created_at,
            s.name AS state, st.institution_name_freetext AS institution
     FROM students st JOIN states s ON s.id = st.state_id
     ${whereClause}
     ORDER BY st.created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...params, pageSize, offset]
  );

  res.json({
    total: parseInt(countResult.rows[0].count, 10),
    page: parseInt(page, 10),
    pageSize: parseInt(pageSize, 10),
    students: dataResult.rows
  });
}));

// GET /api/admin/activity — matches admin/js/activity.js (national roles only)
router.get('/activity', requireAdminAuth(['super_admin', 'national_admin']), asyncHandler(async (req, res) => {
  const { search, type, page = 1, pageSize = 25 } = req.query;
  const conditions = [];
  const params = [];
  let i = 1;

  if (type) {
    conditions.push(`ae.event_type = $${i++}`);
    params.push(type);
  }
  if (search) {
    conditions.push(`(s.first_name ILIKE $${i} OR s.last_name ILIKE $${i} OR st.name ILIKE $${i})`);
    params.push(`%${search}%`);
    i++;
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM activity_events ae
     LEFT JOIN students s ON s.id = ae.student_id
     LEFT JOIN states st ON st.id = s.state_id
     ${whereClause}`,
    params
  );

  const dataResult = await pool.query(
    `SELECT ae.event_type AS type, ae.created_at, s.first_name, s.last_name, st.name AS state
     FROM activity_events ae
     LEFT JOIN students s ON s.id = ae.student_id
     LEFT JOIN states st ON st.id = s.state_id
     ${whereClause}
     ORDER BY ae.created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...params, pageSize, offset]
  );

  res.json({
    total: parseInt(countResult.rows[0].count, 10),
    page: parseInt(page, 10),
    pageSize: parseInt(pageSize, 10),
    activity: dataResult.rows
  });
}));

// GET /api/admin/cards/stats — matches admin/js/cards.js (national roles only)
router.get('/cards/stats', requireAdminAuth(['super_admin', 'national_admin']), asyncHandler(async (req, res) => {
  const totals = await pool.query(`
    SELECT COUNT(*) AS total_cards, COALESCE(SUM(share_count), 0) AS total_shares
    FROM cards
  `);
  res.json(totals.rows[0]);
}));

// GET /api/admin/admins — read-only list (super_admin only)
router.get('/admins', requireAdminAuth(['super_admin']), asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT a.id, a.name, a.email, a.role, s.name AS state
     FROM admins a LEFT JOIN states s ON s.id = a.state_id
     ORDER BY a.role, a.name`
  );
  res.json(rows);
}));

module.exports = router;
