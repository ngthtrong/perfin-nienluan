/**
 * report.js — Ghi artifact thí nghiệm (JSON + Markdown) kèm siêu dữ liệu tái
 * lập (commit, phiên bản Node, cấu hình provider, thời điểm). Mọi thí nghiệm
 * dùng chung định dạng này để kết quả có thể truy vết vào báo cáo mục 3.3.2.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function gitCommit() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
  } catch {
    return 'unknown';
  }
}

function runMeta() {
  return {
    timestamp: new Date().toISOString(),
    commit: gitCommit(),
    node: process.version,
    ai_provider: process.env.AI_PROVIDER || 'gemini',
    gemini_model: process.env.GEMINI_MODEL || null,
    tz: process.env.TZ || null,
  };
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

module.exports = { gitCommit, runMeta, parseOutDir, writeArtifact };
