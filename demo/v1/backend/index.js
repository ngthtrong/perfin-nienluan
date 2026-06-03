const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'demodb',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL successfully!'))
  .catch(err => console.error('❌ PostgreSQL connection error', err.stack));

// Initial route
app.get('/', (req, res) => {
  res.send('Backend Server is running! 🚀');
});

// Demo endpoint to test DB connection by creating a test table if not exists and inserting a row
app.get('/api/test-db', async (req, res) => {
  try {
    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL PRIMARY KEY,
        message VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert a test row
    await pool.query(`INSERT INTO test_table (message) VALUES ('Hello from Express!')`);

    // Fetch rows
    const result = await pool.query('SELECT * FROM test_table ORDER BY id DESC LIMIT 5');
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Database operation failed' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server listening on port ${port}`);
});
