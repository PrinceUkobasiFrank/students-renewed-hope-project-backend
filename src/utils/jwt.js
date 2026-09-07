const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.warn('WARNING: JWT_SECRET is not set. Set it in .env before running in anything but local dev.');
}

function signStudentToken(student) {
  return jwt.sign(
    { sub: student.id, type: 'student', state_id: student.state_id },
    SECRET || 'dev-secret-change-me',
    { expiresIn: '30d' }
  );
}

function signAdminToken(admin) {
  return jwt.sign(
    { sub: admin.id, type: 'admin', role: admin.role, state_id: admin.state_id },
    SECRET || 'dev-secret-change-me',
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, SECRET || 'dev-secret-change-me');
}

module.exports = { signStudentToken, signAdminToken, verifyToken };
