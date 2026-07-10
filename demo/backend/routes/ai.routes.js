const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const vision = require('@google-cloud/vision');
const speech = require('@google-cloud/speech');
const AIService = require('../services/ai.service');
const MediaAI = require('../services/media-ai.service');
const CategoryModel = require('../models/category.model');
const AccountModel = require('../models/account.model');
const pending = require('../services/pendingTransaction.service');
const { FeedbackService } = require('../services/feedback');

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
    const examples = await FeedbackService.getFewShotExamples(userId, req.body.text, { limit: 5 }).catch(() => []);
    const prompt = examples.length
      ? `Phân tích yêu cầu: "${req.body.text}". Các sửa danh mục trước đây của người dùng:\n${examples.map((example) => `- "${example.input}" -> ${example.corrected_category?.category_name || example.corrected_category?.category_id}`).join('\n')}`
      : undefined;
    const data = await AIService.parseTransaction(req.body.text, categories, prompt);
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
    let provider = 'unavailable';
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
      console.warn(`[ocr] provider failed: ${error.message}`);
      providerError = error.message;
    } finally {
      fs.unlink(req.file.path, () => {});
    }

    if (!text.trim()) {
      return res.status(503).json({
        success: false,
        error: 'OCR hiện không khả dụng; hệ thống không tạo dữ liệu giả để tránh ghi sai giao dịch.',
        code: 'OCR_UNAVAILABLE',
        provider,
        provider_error: providerError,
      });
    }

    const parsed = await extractFromMedia(text, 'receipt');
    const receiptOptions = buildReceiptOptions(parsed);
    const data = receiptOptions ? null : await createMediaPendingPreview(parsed, text, 'ocr');
    res.json({ success: true, text, provider, parsed, receipt_options: receiptOptions, data });
  } catch (error) {
    next(error);
  }
}

async function handleSpeech(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Chưa có audio' });
    console.log(`[speech] received ${req.file.originalname || req.file.filename} (${req.file.mimetype}, ${req.file.size} bytes)`);
    let text = '';
    let provider = 'unavailable';
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
      console.warn(`[speech] provider failed: ${error.message}`);
      providerError = error.message;
    } finally {
      fs.unlink(req.file.path, () => {});
    }

    if (!text.trim()) {
      return res.status(503).json({
        success: false,
        error: 'Nhận dạng giọng nói hiện không khả dụng; hệ thống không tạo transcript giả.',
        code: 'SPEECH_UNAVAILABLE',
        provider,
        provider_error: providerError,
      });
    }

    // Flow 2: transcript must be shown and confirmed before it is parsed into a
    // transaction. `auto_parse=1` is kept as an explicit compatibility escape hatch.
    const parsed = req.query.auto_parse === '1' ? await extractFromMedia(text, 'voice') : null;
    res.json({
      success: true,
      text,
      transcript: text,
      provider,
      requires_confirmation: req.query.auto_parse !== '1',
      parsed,
    });
  } catch (error) {
    next(error);
  }
}

// Extract a transaction from media text via the AI service; never throws (parsing is best-effort).
async function extractFromMedia(text, sourceType) {
  if (!String(text || '').trim()) return null;
  try {
    const categories = await CategoryModel.getAll(userId);
    const parsed = await AIService.parseFromMedia(text, categories, sourceType);
    const source = sourceType === 'voice' ? 'voice' : 'ocr';
    const transactions = parsed.transactions || (parsed.transaction ? [parsed.transaction] : []);
    for (const transaction of transactions) {
      transaction.source = source;
      transaction.original_text = text;
    }
    if (transactions.length) {
      parsed.transaction = transactions[0];
      parsed.transactions = transactions;
    }
    return parsed;
  } catch (error) {
    console.warn(`[media-parse] failed: ${error.message}`);
    return null;
  }
}

function buildReceiptOptions(parsed) {
  const transactions = parsed?.transactions || (parsed?.transaction ? [parsed.transaction] : []);
  if (transactions.length <= 1) return null;
  const totalIndex = transactions.findIndex((tx) => /^tổng hóa đơn:/i.test(String(tx.description || '')));
  const total = totalIndex >= 0 ? transactions[totalIndex] : null;
  const items = transactions.filter((_, index) => index !== totalIndex);
  if (!items.length) return null;
  return {
    mode: 'choose_total_or_items',
    total,
    items,
    suggested: total ? 'total' : 'items',
  };
}

router.post('/speech/confirm', async (req, res, next) => {
  try {
    const transcript = String(req.body.transcript || req.body.text || '').trim();
    if (!transcript || transcript.length > 2000) {
      return res.status(400).json({ success: false, error: 'Transcript không hợp lệ' });
    }
    const parsed = await extractFromMedia(transcript, 'voice');
    const data = await createMediaPendingPreview(parsed, transcript, 'voice');
    res.json({ success: true, transcript, confirmed: true, parsed, data });
  } catch (error) {
    next(error);
  }
});

router.post('/ocr/confirm', async (req, res, next) => {
  try {
    const text = String(req.body.text || '').trim();
    const mode = req.body.mode === 'items' ? 'items' : 'total';
    if (!text || text.length > 10000) return res.status(400).json({ success: false, error: 'Văn bản OCR không hợp lệ' });
    const parsed = await extractFromMedia(text, 'receipt');
    const options = buildReceiptOptions(parsed);
    let selected = parsed?.transactions || (parsed?.transaction ? [parsed.transaction] : []);
    if (options) selected = mode === 'items' ? options.items : (options.total ? [options.total] : options.items);
    const selectedParsed = {
      ...parsed,
      intent: selected.length > 1 ? 'transactions' : 'transaction',
      transaction: selected[0] || null,
      transactions: selected,
    };
    const data = await createMediaPendingPreview(selectedParsed, text, 'ocr');
    res.json({
      success: true,
      confirmed: true,
      mode,
      parsed: selectedParsed,
      data,
    });
  } catch (error) {
    next(error);
  }
});

async function createMediaPendingPreview(parsed, originalText, source) {
  const transactions = parsed?.transactions || (parsed?.transaction ? [parsed.transaction] : []);
  if (!transactions.length) {
    return { type: 'clarification', message: 'Không trích xuất được giao dịch từ nội dung đã xác nhận.' };
  }
  const wallet = await AccountModel.ensureDefault(userId);
  const drafts = transactions.map((transaction) => ({
    ...transaction,
    wallet_id: transaction.wallet_id || wallet.id,
    source,
    original_text: originalText,
  }));
  const kind = drafts.length > 1 ? 'transactions' : 'transaction';
  const pendingId = await pending.set(userId, drafts.length > 1 ? drafts : drafts[0], kind);
  return drafts.length > 1
    ? {
      type: 'transactions_preview',
      message: `Mình tìm thấy ${drafts.length} giao dịch từ ${source === 'voice' ? 'giọng nói' : 'hóa đơn'}. Bạn xác nhận tất cả nhé.`,
      transactions: drafts,
      pending_id: pendingId,
    }
    : {
      type: 'transaction_preview',
      message: `Mình đã tạo bản xem trước từ ${source === 'voice' ? 'giọng nói' : 'hóa đơn'}:`,
      transaction: drafts[0],
      pending_id: pendingId,
    };
}

router.post('/ocr', acceptUpload('image', handleOcr));
router.post('/speech', acceptUpload('audio', handleSpeech));

module.exports = router;
module.exports.buildReceiptOptions = buildReceiptOptions;
module.exports.createMediaPendingPreview = createMediaPendingPreview;
