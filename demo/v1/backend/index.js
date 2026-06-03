const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');
const vision = require('@google-cloud/vision');
const speech = require('@google-cloud/speech');
require('dotenv').config();

const upload = multer({ dest: 'uploads/' });

// Initialize AI clients (requires valid environment variables)
// Initialize AI clients
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'MOCK_KEY' });
let visionClient = null;
let speechClient = null;

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  visionClient = new vision.ImageAnnotatorClient();
  speechClient = new speech.SpeechClient();
} else {
  console.warn("GCP Credentials missing. OCR and Speech will use MOCK_RESULT.");
}

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

// --- AI ENDPOINTS FOR DEMO ---

// 1. Chat with Gemini
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    // Mock response if API key is invalid
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MOCK_KEY') {
      return res.json({ success: true, text: `[MOCK GEMINI] Nhận diện giao dịch: "${prompt}". Đã thêm vào danh mục!` });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    res.json({ success: true, text: response.text });
  } catch (error) {
    console.error('Gemini error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. OCR with Google Vision
app.post('/api/ocr', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    
    try {
      if (!visionClient) throw new Error("Vision client not initialized");
      const [result] = await visionClient.textDetection(req.file.path);
      const detections = result.textAnnotations;
      res.json({ success: true, text: detections[0] ? detections[0].description : '' });
    } catch (gcpError) {
      console.warn("GCP Vision failed. Mocking result.");
      res.json({ success: true, text: "MOCK_OCR_RESULT: Hóa đơn siêu thị Co.opmart - Tổng: 250.000đ" });
    } finally {
      fs.unlinkSync(req.file.path); // cleanup
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Speech-to-Text with Google Cloud Speech
app.post('/api/speech', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio uploaded' });
    
    try {
      if (!speechClient) throw new Error("Speech client not initialized");
      const file = fs.readFileSync(req.file.path);
      const audioBytes = file.toString('base64');
      const audio = { content: audioBytes };
      const config = { languageCode: 'vi-VN' };
      const request = { audio, config };
      
      const [response] = await speechClient.recognize(request);
      const transcription = response.results.map(r => r.alternatives[0].transcript).join('\n');
      res.json({ success: true, text: transcription });
    } catch (gcpError) {
      console.warn("GCP Speech failed. Mocking result.");
      res.json({ success: true, text: "MOCK_SPEECH_RESULT: Hôm nay đi uống cà phê hết 50 nghìn" });
    } finally {
      fs.unlinkSync(req.file.path); // cleanup
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server listening on port ${port}`);
});
