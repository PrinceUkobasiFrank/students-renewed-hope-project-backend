const express = require('express');
const pool = require('../db/pool');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// POST /api/contact — stores the submission so it shows up in the CRM,
// in addition to (or instead of) the frontend's mailto fallback.
// NOTE: wire up real email delivery here (e.g. nodemailer + SMTP, or a
// transactional email API) to hello@studentsrenewedhope.com.ng if you want
// a copy in the inbox as well as the CRM. No SMTP credentials were
// available when this was scaffolded, so that part is left as a TODO.
router.post('/', asyncHandler(async (req, res) => {
  const { reason, name, email, state_id, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, and message are required.' });
  }

  const { rows } = await pool.query(
    `INSERT INTO contact_messages (reason, name, email, state_id, message)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
    [reason || null, name, email, state_id || null, message]
  );

  // TODO: send a copy to hello@studentsrenewedhope.com.ng via your email
  // provider of choice once credentials are available.

  res.status(201).json({ id: rows[0].id, received_at: rows[0].created_at });
}));

module.exports = router;
