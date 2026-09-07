// Creates the first real Super Admin account. Run once, with your own
// real name/email/password — not a seeded placeholder, since fabricated
// accounts were explicitly ruled out for this project.
//
// Usage:
//   node src/db/create-super-admin.js "Your Name" "you@email.com" "a-real-password"
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./pool');

async function run() {
  const [name, email, password] = process.argv.slice(2);
  if (!name || !email || !password) {
    console.error('Usage: node src/db/create-super-admin.js "Name" "email@example.com" "password"');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password should be at least 8 characters.');
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO admins (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'super_admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id, name, email, role`,
    [name, email, password_hash]
  );

  console.log('Super Admin ready:', rows[0]);
  await pool.end();
}

run().catch((err) => {
  console.error('Failed to create Super Admin:', err);
  process.exit(1);
});
