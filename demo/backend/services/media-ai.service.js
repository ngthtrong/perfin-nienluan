const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const backendRoot = path.resolve(__dirname, '..');
const defaultVenvPython = path.join(backendRoot, '.venv-ai', 'bin', 'python');
const pythonBin = process.env.MEDIA_AI_PYTHON || (fs.existsSync(defaultVenvPython) ? defaultVenvPython : 'python3');
const timeoutMs = Number(process.env.MEDIA_AI_TIMEOUT_MS || 300000);
const cacheRoot = process.env.MEDIA_AI_CACHE_DIR || path.join(backendRoot, '.cache', 'media-ai');

function isEnabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function getOcrProvider() {
  return (process.env.OCR_PROVIDER || 'google').trim().toLowerCase();
}

function getSpeechProvider() {
  return (process.env.SPEECH_PROVIDER || 'google').trim().toLowerCase();
}

function getOfflineEnv() {
  if (!isEnabled(process.env.MEDIA_AI_OFFLINE)) return {};
  return {
    HF_HUB_OFFLINE: '1',
    TRANSFORMERS_OFFLINE: '1',
  };
}

function parseJson(stdout) {
  const lines = String(stdout || '').trim().split(/\r?\n/).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]);
    } catch (_) {}
  }
  throw new Error(`Python script did not return JSON. Output: ${String(stdout || '').slice(-500)}`);
}

function runPython(scriptName, args = [], extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(backendRoot, 'scripts', scriptName);
    execFile(
      pythonBin,
      [scriptPath, ...args],
      {
        cwd: backendRoot,
        timeout: timeoutMs,
        maxBuffer: 20 * 1024 * 1024,
        env: {
          ...process.env,
          HOME: cacheRoot,
          XDG_CACHE_HOME: path.join(cacheRoot, 'xdg'),
          HF_HOME: path.join(cacheRoot, 'huggingface'),
          PADDLE_HOME: path.join(cacheRoot, 'paddle'),
          FLAGS_use_mkldnn: '0',
          FLAGS_use_onednn: '0',
          FLAGS_enable_pir_api: '0',
          PADDLE_DISABLE_MKLDNN: '1',
          ...getOfflineEnv(),
          ...extraEnv,
        },
      },
      (error, stdout, stderr) => {
        const stderrText = String(stderr || '').trim();
        if (error) {
          const detail = stderrText || error.message;
          return reject(new Error(`${scriptName} failed: ${detail}`));
        }

        try {
          const result = parseJson(stdout);
          if (result.success === false) throw new Error(result.error || 'Unknown media AI error');
          resolve(result);
        } catch (parseError) {
          reject(new Error(`${scriptName} failed: ${parseError.message}${stderrText ? `; stderr: ${stderrText}` : ''}`));
        }
      },
    );
  });
}

async function runPaddleOcr(filePath) {
  const result = await runPython('paddleocr_ocr.py', [filePath], {
    OCR_LANG: process.env.OCR_LANG || 'vi',
  });
  return { text: result.text || '', provider: 'paddleocr', raw: result.raw };
}

async function runPhoWhisper(filePath) {
  const result = await runPython('phowhisper_speech.py', [filePath], {
    PHOWHISPER_MODEL: process.env.PHOWHISPER_MODEL || 'vinai/PhoWhisper-small',
  });
  return { text: result.text || '', provider: 'phowhisper', raw: result.raw };
}

module.exports = {
  getOcrProvider,
  getSpeechProvider,
  runPaddleOcr,
  runPhoWhisper,
};
