/**
 * report.js — Ghi artifact thí nghiệm (JSON + Markdown) kèm siêu dữ liệu tái
 * lập (commit, phiên bản Node, cấu hình provider, thời điểm). Mọi thí nghiệm
 * dùng chung định dạng này để kết quả có thể truy vết vào báo cáo mục 3.3.2.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

function gitCommit() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
  } catch {
    return 'unknown';
  }
}

function gitWorkingTreeDirty() {
  try {
    return execFileSync('git', ['status', '--porcelain'], { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim().length > 0;
  } catch {
    return null;
  }
}

function codeFingerprint(files = []) {
  const normalized = [...new Set(files.map((file) => path.resolve(file)))].sort();
  if (!normalized.length) return null;
  const digest = crypto.createHash('sha256');
  for (const file of normalized) {
    digest.update(path.basename(file));
    digest.update('\0');
    digest.update(fs.readFileSync(file));
    digest.update('\0');
  }
  return digest.digest('hex');
}

function runMeta(options = {}) {
  const has = (key) => Object.prototype.hasOwnProperty.call(options, key);
  const codeFiles = Array.isArray(options.codeFiles) ? options.codeFiles : [];
  const meta = {
    timestamp: new Date().toISOString(),
    commit: gitCommit(),
    working_tree_dirty: gitWorkingTreeDirty(),
    node: process.version,
    ai_provider: has('aiProvider') ? options.aiProvider : (process.env.AI_PROVIDER || 'gemini'),
    gemini_model: has('geminiModel') ? options.geminiModel : (process.env.GEMINI_MODEL || null),
    tz: process.env.TZ || null,
  };
  if (options.executionMode) meta.execution_mode = options.executionMode;
  if (Number.isInteger(options.providerCalls)) meta.provider_calls = options.providerCalls;
  if (codeFiles.length) {
    meta.code_sha256 = codeFingerprint(codeFiles);
    meta.code_files = codeFiles.map((file) => path.relative(process.cwd(), path.resolve(file)) || path.basename(file));
  }
  return meta;
}

// Đọc --out DIR từ argv; trả null nếu không có (chỉ in ra màn hình).
function parseOutDir(argv) {
  const idx = argv.indexOf('--out');
  if (idx >= 0 && argv[idx + 1]) return path.resolve(process.cwd(), argv[idx + 1]);
  const inline = argv.find((a) => a.startsWith('--out='));
  if (inline) return path.resolve(process.cwd(), inline.slice('--out='.length));
  return null;
}

function writeArtifact(outDir, slug, jsonResult, markdown) {
  fs.mkdirSync(outDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const base = `${slug}_${date}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const mdPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(jsonResult, null, 2));
  fs.writeFileSync(mdPath, markdown.endsWith('\n') ? markdown : `${markdown}\n`);
  return { json: jsonPath, md: mdPath };
}

module.exports = { codeFingerprint, gitCommit, gitWorkingTreeDirty, runMeta, parseOutDir, writeArtifact };
