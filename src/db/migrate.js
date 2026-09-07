// Applies schema.sql against DATABASE_URL. Safe to re-run — every
// statement in schema.sql uses IF NOT EXISTS / DROP+ADD CONSTRAINT guards.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  console.log('Applying schema.sql...');
  await pool.query(sql);
  console.log('Schema applied successfully.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
