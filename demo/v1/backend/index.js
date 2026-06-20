const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { pool } = require('./config/database');
const AccountModel = require('./models/account.model');
const CategoryModel = require('./models/category.model');
const aiRoutes = require('./routes/ai.routes');
const chatRoutes = require('./routes/chat.routes');
const transactionRoutes = require('./routes/transaction.routes');
const categoryRoutes = require('./routes/category.routes');
const budgetRoutes = require('./routes/budget.routes');
const accountRoutes = require('./routes/account.routes');
const reportRoutes = require('./routes/report.routes');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/', (req, res) => {
  res.json({ success: true, message: 'PERFIN MVP API is running' });
});

app.get('/api/test-db', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.use('/api/ai', aiRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/reports', reportRoutes);

app.post('/api/chat', async (req, res, next) => {
  req.url = '/message';
  req.body.text = req.body.text || req.body.prompt;
  chatRoutes(req, res, next);
});
app.post('/api/ocr', (req, res, next) => {
  req.url = '/ocr';
  aiRoutes(req, res, next);
});
app.post('/api/speech', (req, res, next) => {
  req.url = '/speech';
  aiRoutes(req, res, next);
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

bootstrap().finally(() => {
  app.listen(port, '0.0.0.0', () => {
    console.log(`PERFIN MVP API listening on port ${port}`);
  });
});
