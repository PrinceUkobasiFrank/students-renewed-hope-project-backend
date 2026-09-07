require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const studentsRoutes = require('./routes/students');
const statesRoutes = require('./routes/states');
const newsRoutes = require('./routes/news');
const cardsRoutes = require('./routes/cards');
const adminRoutes = require('./routes/admin');
const contactRoutes = require('./routes/contact');
const statsRoutes = require('./routes/stats');

const app = express();

// Railway (and most PaaS hosts) sit behind a proxy; trust it so req.ip /
// rate limiting (if added later) reflects the real client, not the proxy.
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*'
}));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/states', statesRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/stats', statsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Centralized error handler — every route uses asyncHandler, so unhandled
// errors (bad SQL, etc.) land here instead of crashing the process.
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === '23505') { // Postgres unique_violation
    return res.status(409).json({ error: 'A record with that value already exists.' });
  }
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`SRHP API listening on port ${PORT}`);
});
