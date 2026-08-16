#!/usr/bin/env node
// describe-image.js - 用智谱免费视觉模型识别图片（默认 glm-4.6v-flash，429/5xx 自动降级 glm-4v-flash）
// Usage:
//   node describe-image.js <图片路径或URL...> [--prompt "问题"]
'use strict';

const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.dirname(path.dirname(__filename));
const CONFIG_FILE = path.join(SKILL_DIR, 'config.json');
const DEFAULT_MODEL = 'glm-4.6v-flash';
const FREE_MODELS = ['glm-4.6v-flash', 'glm-4v-flash']; // 仅免费模型白名单，防止误调付费模型
const FALLBACK_MODEL = 'glm-4v-flash';
const ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const WARN_IMAGE_BYTES = 8 * 1024 * 1024;
const URL_RE = /^https?:\/\//i;

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch { return {}; }
}

function getApiKey() {
  const cfg = readConfig();
  let key = process.env.GLM_API_KEY || process.env.ZHIPU_API_KEY || cfg.api_key || '';
  key = String(key).trim();
  if (!key || key === 'YOUR_GLM_API_KEY') {
    console.error('ERROR: 未找到智谱 API key。请设置 GLM_API_KEY 环境变量，或编辑 ' + CONFIG_FILE + ' 里的 api_key。');
    process.exit(1);
  }
  return key;
}

function getModel() {
  let m = process.env.GLM_VISION_MODEL || readConfig().model || DEFAULT_MODEL;
  if (!FREE_MODELS.includes(m)) {
    console.error('[警告] 模型 ' + m + ' 不在免费白名单，已强制改用免费模型 ' + DEFAULT_MODEL + '（防止产生费用）');
    m = DEFAULT_MODEL;
  }
  return m;
}

function toDataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = {'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.bmp':'image/bmp'}[ext] || 'image/png';
  return 'data:' + mime + ';base64,' + buf.toString('base64');
}

async function callOnce(imageUrl, prompt, model, key) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  let resp;
  try {
    resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: [
          { type: 'image_url', image_url: { url: imageUrl } },
          { type: 'text', text: prompt },
        ]}],
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    const timedOut = e && e.name === 'AbortError';
    console.error('ERROR: 请求' + (timedOut ? '超时(90s)' : '失败: ' + (e.message || e)));
    process.exit(1);
  } finally { clearTimeout(timer); }

  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = JSON.stringify(body).slice(0, 300);
    if (resp.status === 429 || resp.status >= 500) return { retryable: true, model, status: resp.status, msg };
    console.error('ERROR: API ' + resp.status + ': ' + msg);
    process.exit(1);
  }
  const answer = body.choices?.[0]?.message?.content;
  if (!answer) { console.error('ERROR: 空响应: ' + JSON.stringify(body).slice(0, 300)); process.exit(1); }
  return { retryable: false, answer };
}

async function describe(imageUrl, prompt, model, key) {
  const models = [model, FALLBACK_MODEL].filter((m, i, a) => a.indexOf(m) === i);
  for (const m of models) {
    const r = await callOnce(imageUrl, prompt, m, key);
    if (!r.retryable) return r.answer;
    console.error('[describe-image] 模型 ' + m + ' 暂不可用(' + r.status + ')，' + (models.length > 1 ? '降级为 ' + FALLBACK_MODEL : '请稍后再试'));
  }
  process.exit(1);
}

(async () => {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('describe-image.js - 用智谱免费视觉模型识别图片\n\n用法:\n  node describe-image.js <图片路径或URL...> [--prompt "问题"]\n\n示例:\n  node describe-image.js /path/to/img.png\n  node describe-image.js "https://example.com/img.png" --prompt "这个报错说什么？"\n\n环境变量(可选): GLM_API_KEY / GLM_VISION_MODEL(默认 ' + DEFAULT_MODEL + '，429/5xx 自动降级 ' + FALLBACK_MODEL + ')');
    process.exit(0);
  }

  const promptIdx = args.indexOf('--prompt');
  let prompt = null;
  if (promptIdx >= 0) { prompt = args[promptIdx + 1] || null; args.splice(promptIdx, 2); }

  const sources = [];
  for (const a of args) {
    if (a.startsWith('--')) { console.error('未知参数: ' + a + '（用 --help 查看用法）'); process.exit(1); }
    sources.push(a);
  }
  if (sources.length === 0) {
    console.error('用法: node describe-image.js <图片路径或URL...> [--prompt "问题"]  （--help 看帮助）');
    process.exit(1);
  }

  const key = getApiKey();
  const model = getModel();
  const defaultPrompt = '请详细描述这张图片的内容。如果图中有文字，请原样引用；如果是图表/界面/照片，请说明结构和重点。';

  let all = [];
  for (const s of sources) {
    let imageUrl;
    if (URL_RE.test(s)) {
      imageUrl = s;
    } else {
      if (!fs.existsSync(s)) { console.error('ERROR: 文件不存在: ' + s); process.exit(1); }
      const size = fs.statSync(s).size;
      if (size > MAX_IMAGE_BYTES) { console.error('ERROR: 图片过大(' + (size / 1048576).toFixed(1) + 'MB)，上限 25MB'); process.exit(1); }
      if (size > WARN_IMAGE_BYTES) console.error('[describe-image] 警告: 图片 ' + (size / 1048576).toFixed(1) + 'MB，过大可能被 API 拒绝');
      imageUrl = toDataUrl(s);
    }
    const out = await describe(imageUrl, prompt || defaultPrompt, model, key);
    all.push('### ' + s + '\n' + out.trim());
  }
  console.log(all.join('\n\n'));
})().catch(e => { console.error('ERROR: ' + (e.message || e)); process.exit(1); });
