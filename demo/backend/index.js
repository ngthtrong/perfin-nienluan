const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { pool } = require('./config/database');
const { getReadiness } = require('./services/health.service');
const AccountModel = require('./models/account.model');
const CategoryModel = require('./models/category.model');
const aiRoutes = require('./routes/ai.routes');
const chatRoutes = require('./routes/chat.routes');
const transactionRoutes = require('./routes/transaction.routes');
const categoryRoutes = require('./routes/category.routes');
const budgetRoutes = require('./routes/budget.routes');
const accountRoutes = require('./routes/account.routes');
const reportRoutes = require('./routes/report.routes');
const cashflowRoutes = require('./routes/cashflow.routes');
const exportRoutes = require('./routes/export.routes');
const recurringRoutes = require('./routes/recurring.routes');
const personaRoutes = require('./routes/persona.routes');
const goalRoutes = require('./routes/goal.routes');
const errorMiddleware = require('./middleware/error.middleware');
const { rateLimit } = require('./middleware/rateLimit.middleware');

const app = express();
const port = process.env.PORT || 3000;
const aiLimiter = rateLimit({ prefix: 'ai', limit: 30, windowSeconds: 60 });
const chatLimiter = rateLimit({ prefix: 'chat', limit: 60, windowSeconds: 60 });

app.use(cors());
app.use(express.json({ limit: '15mb' }));

app.get('/', (req, res) => {
  res.json({ success: true, message: 'PERFIN MVP API is running' });
});

app.get('/api/health/live', (req, res) => {
  res.json({ success: true, data: { status: 'alive', timestamp: new Date().toISOString() } });
});

app.get('/api/health/ready', async (req, res, next) => {
  try {
    const data = await getReadiness();
    res.status(data.ready ? 200 : 503).json({ success: data.ready, data });
  } catch (error) {
    next(error);
  }
});

app.get('/api/test-db', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/cashflow', cashflowRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/personas', personaRoutes);
app.use('/api/goals', goalRoutes);

app.post('/api/chat', chatLimiter, async (req, res, next) => {
  req.url = '/message';
  req.body.text = req.body.text || req.body.prompt;
  chatRoutes(req, res, next);
});
app.post('/api/ocr', aiLimiter, (req, res, next) => {
  req.url = '/ocr';
  aiRoutes(req, res, next);
});
app.post('/api/speech', aiLimiter, (req, res, next) => {
  req.url = '/speech';
  aiRoutes(req, res, next);
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: `Không tìm thấy endpoint ${req.method} ${req.originalUrl}`, code: 'NOT_FOUND' });
});

app.use(errorMiddleware);

async function bootstrap() {
  try {
    await pool.query('SELECT 1');
    await CategoryModel.initDefaults();
    await AccountModel.ensureDefault();
    console.log('Database ready');
  } catch (error) {
    console.warn(`Database bootstrap skipped: ${error.message}`);
  }
}

async function start() {
  await bootstrap();
  return app.listen(port, '0.0.0.0', () => {
    console.log(`PERFIN MVP API listening on port ${port}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { app, start, bootstrap };
