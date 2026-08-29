require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');

const childrenRouter = require('./routes/children');
const tasksRouter = require('./routes/tasks');
const templatesRouter = require('./routes/templates');
const rewardsRouter = require('./routes/rewards');
const purchasesRouter = require('./routes/purchases');
const authRouter = require('./routes/auth');
const statsRouter = require('./routes/stats');

const { generateDailyTasks, weeklyReset } = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json());

/* ── Health ── */
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

/* ── API Routes ── */
app.use('/api/auth',      authRouter);
app.use('/api/children',  childrenRouter);
app.use('/api/tasks',     tasksRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/rewards',   rewardsRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/stats',     statsRouter);

/* ── 404 ── */
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

/* ── Error handler ── */
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

/* ── Scheduled jobs ── */
// Generate daily tasks at midnight
cron.schedule('0 0 * * *', () => {
  console.log('[cron] Generating daily tasks…');
  generateDailyTasks();
});

// Weekly reset on Sunday midnight
cron.schedule('0 0 * * 0', () => {
  console.log('[cron] Running weekly reset…');
  weeklyReset();
});

app.listen(PORT, () => {
  console.log(`🚀  Family Rewards API running on port ${PORT}`);
  // Generate tasks for today on startup if not already done
  generateDailyTasks();
});
