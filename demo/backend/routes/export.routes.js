// Vai trò: Công bố API tạo, tải, dọn export và quản lý cấu hình backup.
// Luồng chính: xác thực định dạng/kỳ, gọi export service và bảo vệ đường dẫn tệp trả về.

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const {
  ExportHistoryModel,
  BackupConfigModel,
  exportCSV,
  exportPDF,
  createBackup,
  restoreBackup,
  EXPORTS_DIR,
} = require('../services/export.service');

const userId = 'default_user';

// ─── Multer for backup restore upload ────────────────────────────────────────
const backupStorage = multer.diskStorage({
  destination: (req, file, cb) => { fs.mkdirSync(EXPORTS_DIR, { recursive: true }); cb(null, EXPORTS_DIR); },
  filename: (req, file, cb) => { cb(null, `restore-${Date.now()}.pfbak`); },
});
const backupUpload = multer({
  storage: backupStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max backup
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pfbak' || file.mimetype === 'application/octet-stream') return cb(null, true);
    cb(new Error('File phải là định dạng .pfbak'));
  },
});

// ─── FR-07-01: Export CSV ─────────────────────────────────────────────────────

/**
 * POST /api/export/csv
 * Body: { from?, to?, category_id?, wallet_id?, type?, label? }
 */
router.post('/csv', async (req, res) => {
  const filters = {
    from: req.body.from,
    to: req.body.to,
    category_id: req.body.category_id,
    wallet_id: req.body.wallet_id,
    type: req.body.type,
    label: req.body.label,
  };

  const result = await exportCSV(userId, filters);
  if (!result) {
    return res.status(404).json({ success: false, error: 'Không có dữ liệu phù hợp để xuất' });
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
  res.setHeader('X-Row-Count', String(result.rowCount));
  res.setHeader('X-History-Id', String(result.historyId));
  fs.createReadStream(result.filePath).pipe(res);
});

// ─── FR-07-02: Export PDF (HTML Report) ──────────────────────────────────────

/**
 * POST /api/export/pdf
 * Body: { from?, to?, label? }
 */
router.post('/pdf', async (req, res) => {
  const filters = {
    from: req.body.from,
    to: req.body.to,
    label: req.body.label,
  };

  const result = await exportPDF(userId, filters);
  if (!result) {
    return res.status(404).json({ success: false, error: 'Không có dữ liệu phù hợp để xuất báo cáo' });
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
  res.setHeader('X-History-Id', String(result.historyId));
  fs.createReadStream(result.filePath).pipe(res);
});

// ─── FR-07-04: Create Backup ──────────────────────────────────────────────────

/**
 * POST /api/export/backup
 * Body: {} (creates a full encrypted backup)
 */
router.post('/backup', async (req, res) => {
  const result = await createBackup(userId, { is_auto: false });
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
  res.setHeader('X-File-Size', String(result.fileSize));
  res.setHeader('X-History-Id', String(result.historyId));
  fs.createReadStream(result.filePath).pipe(res);
});

// ─── FR-07-05: Restore Backup ─────────────────────────────────────────────────

/**
 * POST /api/export/restore
 * Multipart: file field = backup .pfbak
 */
router.post('/restore', (req, res, next) => {
  backupUpload.single('file')(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ success: false, error: uploadErr.message });
    if (!req.file) return res.status(400).json({ success: false, error: 'Chưa có file backup' });

    try {
      const result = await restoreBackup(userId, req.file.path);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    } finally {
      // Clean up temp restore file
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlink(req.file.path, () => {});
      }
    }
  });
});

// ─── FR-07-08: Export History ─────────────────────────────────────────────────

/**
 * GET /api/export/history
 */
router.get('/history', async (req, res) => {
  const data = await ExportHistoryModel.getAll(userId);
  res.json({ success: true, data });
});

/**
 * GET /api/export/history/:id/download
 * Re-download a previously exported file
 */
router.get('/history/:id/download', async (req, res) => {
  const record = await ExportHistoryModel.getById(req.params.id, userId);
  if (!record) return res.status(404).json({ success: false, error: 'Không tìm thấy bản ghi' });
  if (!record.file_path || !fs.existsSync(record.file_path)) {
    return res.status(410).json({ success: false, error: 'File không còn khả dụng. Vui lòng xuất lại.' });
  }
  const mimeMap = { csv: 'text/csv', pdf: 'text/html', backup: 'application/octet-stream' };
  res.setHeader('Content-Type', mimeMap[record.export_type] || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${record.file_name}"`);
  fs.createReadStream(record.file_path).pipe(res);
});

// ─── FR-07-09: Delete Backup ─────────────────────────────────────────────────

/**
 * DELETE /api/export/history/:id
 */
router.delete('/history/:id', async (req, res) => {
  const record = await ExportHistoryModel.delete(req.params.id, userId);
  if (!record) return res.status(404).json({ success: false, error: 'Không tìm thấy bản ghi' });
  res.json({ success: true, data: { id: record.id, deleted: true } });
});

// ─── FR-07-06: Backup Config ──────────────────────────────────────────────────

/**
 * GET /api/export/backup-config
 */
router.get('/backup-config', async (req, res) => {
  const data = await BackupConfigModel.get(userId);
  res.json({ success: true, data });
});

/**
 * PUT /api/export/backup-config
 * Body: { auto_enabled?, frequency?, keep_count? }
 */
router.put('/backup-config', async (req, res) => {
  const { auto_enabled, frequency, keep_count } = req.body;
  const validFreqs = ['daily', 'weekly', 'monthly'];
  if (frequency && !validFreqs.includes(frequency)) {
    return res.status(400).json({ success: false, error: `frequency phải là: ${validFreqs.join(', ')}` });
  }
  const data = await BackupConfigModel.update(userId, { auto_enabled, frequency, keep_count });
  res.json({ success: true, data });
});

// ─── FR-07-07: Export via chat intent (used by ai.service) ───────────────────
// This endpoint is called internally by AI service when it detects export intent

/**
 * POST /api/export/from-intent
 * Body: { format: 'csv'|'pdf'|'backup', filters: { from?, to?, category?, wallet? } }
 */
router.post('/from-intent', async (req, res) => {
  const { format, filters = {} } = req.body;
  if (!['csv', 'pdf', 'backup'].includes(format)) {
    return res.status(400).json({ success: false, error: 'format phải là: csv, pdf, backup' });
  }

  let result;
  if (format === 'csv') result = await exportCSV(userId, filters);
  else if (format === 'pdf') result = await exportPDF(userId, filters);
  else result = await createBackup(userId, { is_auto: false });

  if (!result) return res.status(404).json({ success: false, error: 'Không có dữ liệu để xuất' });

  res.json({
    success: true,
    data: {
      file_name: result.fileName,
      file_size: result.fileSize || null,
      history_id: result.historyId,
      download_url: `/api/export/history/${result.historyId}/download`,
    },
  });
});

module.exports = router;
