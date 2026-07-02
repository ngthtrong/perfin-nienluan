const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const vision = require('@google-cloud/vision');
const speech = require('@google-cloud/speech');
const AIService = require('../services/ai.service');
const MediaAI = require('../services/media-ai.service');
const CategoryModel = require('../models/category.model');

const router = express.Router();
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp']);
const audioExtensions = new Set(['.m4a', '.mp4', '.aac', '.wav', '.mp3']);
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync('uploads', { recursive: true });
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const extension = getExtension(file.originalname);
    const baseName = path.basename(file.originalname || file.fieldname, extension).replace(/[^a-zA-Z0-9._-]/g, '-');
    cb(null, `${file.fieldname}-${Date.now()}-${baseName || file.fieldname}${extension}`);
  },
});
const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    const isOcr = req.path === '/ocr';
    const isSpeech = req.path === '/speech';
    const allowedImage = isAllowedImage(file);
    const allowedAudio = isAllowedAudio(file);

    if ((isOcr && allowedImage) || (isSpeech && allowedAudio)) return cb(null, true);
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
  },
});
const userId = 'default_user';
const visionClient = process.env.GOOGLE_APPLICATION_CREDENTIALS ? new vision.ImageAnnotatorClient() : null;
const speechClient = process.env.GOOGLE_APPLICATION_CREDENTIALS ? new speech.SpeechClient() : null;

function getExtension(fileName = '') {
  return (String(fileName).match(/\.[a-z0-9]+$/i)?.[0] || '').toLowerCase();
}

function isAllowedImage(file) {
  const extension = getExtension(file.originalname);
  return file.mimetype?.startsWith('image/') || imageExtensions.has(extension);
}

function isAllowedAudio(file) {
  const extension = getExtension(file.originalname);
  return file.mimetype?.startsWith('audio/') || file.mimetype === 'video/mp4' || audioExtensions.has(extension);
}

function httpError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function uploadSingle(fieldName) {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (error) => {
      if (!error) return next();

      const message = error.message || '';
      if (error instanceof multer.MulterError) {
        const errorByCode = {
          LIMIT_FILE_SIZE: 'File quá lớn. Vui lòng chọn file nhỏ hơn 10MB.',
          LIMIT_UNEXPECTED_FILE: fieldName === 'image' ? 'File tải lên phải là ảnh.' : 'File tải lên phải là audio/mp4.',
        };
        return res.status(400).json({ success: false, error: errorByCode[error.code] || 'File tải lên không hợp lệ', code: error.code });
      }

      if (message.includes('Unexpected end of form')) {
        return res.status(400).json({
          success: false,
          error: 'Upload file bị ngắt trước khi hoàn tất. Vui lòng thử lại hoặc chọn file khác.',
          code: 'UPLOAD_INCOMPLETE',
        });
      }

      next(error);
    });
  };
}

function decodeBase64Upload(req, fieldName) {
  const body = req.body || {};
  let base64 = String(body.base64 || body[fieldName] || body.content || '');
  let mimeType = body.mimeType || body.type || 'application/octet-stream';

  const dataUrlMatch = base64.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1];
    base64 = dataUrlMatch[2];
  }

  base64 = base64.replace(/\s/g, '');
  if (!base64) throw httpError(400, fieldName === 'image' ? 'Chưa có ảnh' : 'Chưa có audio', 'NO_FILE');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw httpError(400, 'File base64 không hợp lệ', 'INVALID_BASE64');

  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) throw httpError(400, fieldName === 'image' ? 'Chưa có ảnh' : 'Chưa có audio', 'NO_FILE');
  if (buffer.length > MAX_UPLOAD_BYTES) throw httpError(400, 'File quá lớn. Vui lòng chọn file nhỏ hơn 10MB.', 'LIMIT_FILE_SIZE');

  const fileName = String(body.fileName || body.name || `${fieldName}-${Date.now()}`);
  const file = { originalname: fileName, mimetype: mimeType, size: buffer.length };
  if (fieldName === 'image' && !isAllowedImage(file)) throw httpError(400, 'File tải lên phải là ảnh.', 'LIMIT_UNEXPECTED_FILE');
  if (fieldName === 'audio' && !isAllowedAudio(file)) throw httpError(400, 'File tải lên phải là audio/mp4.', 'LIMIT_UNEXPECTED_FILE');

  fs.mkdirSync('uploads', { recursive: true });
  const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '-');
  const tempPath = path.join('uploads', `base64-${Date.now()}-${safeName || fieldName}`);
  fs.writeFileSync(tempPath, buffer);
  return { ...file, filename: path.basename(tempPath), path: tempPath };
}

function acceptUpload(fieldName, handler) {
  return (req, res, next) => {
    if (req.is('application/json')) {
      try {
        req.file = decodeBase64Upload(req, fieldName);
      } catch (error) {
        return next(error);
      }
      return handler(req, res, next);
    }

    return uploadSingle(fieldName)(req, res, () => handler(req, res, next));
  };
}

router.get('/status', (req, res) => res.json({ success: true, data: AIService.getStatus() }));

router.get('/media/status', (req, res) => {
  res.json({
    success: true,
    data: {
      ocr_provider: MediaAI.getOcrProvider(),
      speech_provider: MediaAI.getSpeechProvider(),
      phowhisper_model: process.env.PHOWHISPER_MODEL || 'vinai/PhoWhisper-small',
    },
  });
});

router.get('/models', async (req, res, next) => {
  try {
    res.json({ success: true, data: await AIService.getModels(), status: AIService.getStatus() });
  } catch (error) {
    next(error);
  }
});

router.post('/selection', async (req, res, next) => {
  try {
    res.json({ success: true, data: await AIService.setSelection(req.body || {}) });
  } catch (error) {
    next(error);
  }
});

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

async function handleOcr(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Chưa có ảnh' });
    console.log(`[ocr] received ${req.file.originalname || req.file.filename} (${req.file.mimetype}, ${req.file.size} bytes)`);
    let text = '';
    let provider = 'mock';
    let providerError;
    try {
      const ocrProvider = MediaAI.getOcrProvider();
      if (ocrProvider === 'paddleocr') {
        const result = await MediaAI.runPaddleOcr(req.file.path);
        text = result.text;
        provider = result.provider;
      } else {
        if (!visionClient) throw new Error('Vision client is not configured');
        const [result] = await visionClient.textDetection(req.file.path);
        text = result.textAnnotations?.[0]?.description || '';
        provider = 'google_vision';
      }
    } catch (error) {
      console.warn(`[ocr] using mock result: ${error.message}`);
      text = 'Hóa đơn siêu thị - Tổng: 250.000đ';
      provider = 'mock';
      providerError = error.message;
    } finally {
      fs.unlink(req.file.path, () => {});
    }

    const parsed = await extractFromMedia(text, 'receipt');
    res.json({ success: true, text, provider, provider_error: providerError, parsed });
  } catch (error) {
    next(error);
  }
}

async function handleSpeech(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Chưa có audio' });
    console.log(`[speech] received ${req.file.originalname || req.file.filename} (${req.file.mimetype}, ${req.file.size} bytes)`);
    let text = '';
    let provider = 'mock';
    let providerError;
    try {
      const speechProvider = MediaAI.getSpeechProvider();
      if (speechProvider === 'phowhisper') {
        const result = await MediaAI.runPhoWhisper(req.file.path);
        text = result.text;
        provider = result.provider;
      } else {
        if (!speechClient) throw new Error('Speech client is not configured');
        const audio = { content: fs.readFileSync(req.file.path).toString('base64') };
        const [response] = await speechClient.recognize({ audio, config: { languageCode: 'vi-VN' } });
        text = response.results.map((r) => r.alternatives[0].transcript).join('\n');
        provider = 'google_speech';
      }
    } catch (error) {
      console.warn(`[speech] using mock result: ${error.message}`);
      text = 'Hôm nay uống cà phê hết 50 nghìn';
      provider = 'mock';
      providerError = error.message;
    } finally {
      fs.unlink(req.file.path, () => {});
    }

    const parsed = await extractFromMedia(text, 'voice');
    res.json({ success: true, text, provider, provider_error: providerError, parsed });
  } catch (error) {
    next(error);
  }
}

// Extract a transaction from media text via the AI service; never throws (parsing is best-effort).
async function extractFromMedia(text, sourceType) {
  if (!String(text || '').trim()) return null;
  try {
    const categories = await CategoryModel.getAll(userId);
    return await AIService.parseFromMedia(text, categories, sourceType);
  } catch (error) {
    console.warn(`[media-parse] failed: ${error.message}`);
    return null;
  }
}

router.post('/ocr', acceptUpload('image', handleOcr));
router.post('/speech', acceptUpload('audio', handleSpeech));

module.exports = router;
