const express = require('express');
const multer = require('multer');
const fs = require('fs');
const vision = require('@google-cloud/vision');
const speech = require('@google-cloud/speech');
const AIService = require('../services/ai.service');
const CategoryModel = require('../models/category.model');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
const userId = 'default_user';
const visionClient = process.env.GOOGLE_APPLICATION_CREDENTIALS ? new vision.ImageAnnotatorClient() : null;
const speechClient = process.env.GOOGLE_APPLICATION_CREDENTIALS ? new speech.SpeechClient() : null;

router.get('/status', (req, res) => res.json({ success: true, data: AIService.getStatus() }));

router.post('/parse-transaction', async (req, res, next) => {
  try {
    if (!req.body.text || req.body.text.length > 500) return res.status(400).json({ success: false, error: 'Nội dung không hợp lệ' });
    const categories = await CategoryModel.getAll(userId);
    const data = await AIService.parseTransaction(req.body.text, categories);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/chat', async (req, res, next) => {
  try {
    const text = req.body.prompt || req.body.text;
    const data = await AIService.chat(text || '');
    res.json({ success: true, text: data.text, data });
  } catch (error) {
    next(error);
  }
});

router.post('/ocr', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Chưa có ảnh' });
    try {
      if (!visionClient) throw new Error('Vision client is not configured');
      const [result] = await visionClient.textDetection(req.file.path);
      res.json({ success: true, text: result.textAnnotations?.[0]?.description || '' });
    } catch {
      res.json({ success: true, text: 'MOCK_OCR_RESULT: Hóa đơn siêu thị - Tổng: 250.000đ' });
    } finally {
      fs.unlink(req.file.path, () => {});
    }
  } catch (error) {
    next(error);
  }
});

router.post('/speech', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Chưa có audio' });
    try {
      if (!speechClient) throw new Error('Speech client is not configured');
      const audio = { content: fs.readFileSync(req.file.path).toString('base64') };
      const [response] = await speechClient.recognize({ audio, config: { languageCode: 'vi-VN' } });
      res.json({ success: true, text: response.results.map((r) => r.alternatives[0].transcript).join('\n') });
    } catch {
      res.json({ success: true, text: 'MOCK_SPEECH_RESULT: Hôm nay uống cà phê hết 50 nghìn' });
    } finally {
      fs.unlink(req.file.path, () => {});
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
