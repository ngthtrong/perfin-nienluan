const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');
const { EXPORTS_DIR } = require('./export.service');

function isPathInside(directory, candidate) {
  if (!candidate) return false;
  const root = path.resolve(directory);
  const resolved = path.resolve(candidate);
  const relative = path.relative(root, resolved);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function isManagedFilePath(directory, candidate, fsPromises = fs.promises) {
  if (!isPathInside(directory, candidate)) return false;
  if (typeof fsPromises.realpath !== 'function') return true;
  try {
    const [realRoot, realParent] = await Promise.all([
      fsPromises.realpath(directory),
      fsPromises.realpath(path.dirname(candidate)),
    ]);
    return path.resolve(realParent) === path.resolve(realRoot) || isPathInside(realRoot, realParent);
  } catch (error) {
    // If the parent directory disappeared there is no file left to unlink. The
    // lexical containment check is enough to safely clear the stale DB pointer.
    if (error.code === 'ENOENT') return true;
    throw error;
  }
}

async function unlinkIfPresent(filePath, fsPromises = fs.promises) {
  try {
    await fsPromises.unlink(filePath);
    return 'deleted';
  } catch (error) {
    if (error.code === 'ENOENT') return 'missing';
    throw error;
  }
}

async function cleanupExpiredExports({
  now = new Date(),
  batchSize = 100,
  exportsDir = EXPORTS_DIR,
  queryFn = query,
  fsPromises = fs.promises,
} = {}) {
  const limit = Math.min(1000, Math.max(1, Number(batchSize) || 100));
  const result = await queryFn(
    `SELECT id, file_name, file_path
     FROM export_history
     WHERE expires_at IS NOT NULL AND expires_at <= $1 AND file_path IS NOT NULL
     ORDER BY expires_at ASC
     LIMIT $2`,
    [new Date(now).toISOString(), limit]
  );

  const summary = {
    scanned: result.rows.length,
    cleaned: 0,
    deleted: 0,
    missing: 0,
    skipped: 0,
    errors: [],
  };

  for (const row of result.rows) {
    if (!(await isManagedFilePath(exportsDir, row.file_path, fsPromises))) {
      summary.skipped += 1;
      summary.errors.push({ id: row.id, reason: 'path_outside_exports_directory' });
      continue;
    }

    try {
      const status = await unlinkIfPresent(row.file_path, fsPromises);
      await queryFn(
        'UPDATE export_history SET file_path = NULL, file_size = NULL WHERE id = $1',
        [row.id]
      );
      summary.cleaned += 1;
      summary[status] += 1;
    } catch (error) {
      summary.errors.push({ id: row.id, reason: error.code || error.message });
    }
  }

  return summary;
}

module.exports = { isPathInside, isManagedFilePath, unlinkIfPresent, cleanupExpiredExports };
