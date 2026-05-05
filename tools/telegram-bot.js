#!/usr/bin/env node

/**
 * Incrementum Telegram Bot
 * Bridges Telegram ↔ incrementum-analista (Claude Code)
 *
 * Env vars required:
 *   TELEGRAM_BOT_TOKEN     - from BotFather
 *   TELEGRAM_ALLOWED_ID    - your Telegram chat ID (run once without it to discover)
 *   INCREMENTUM_DIR        - path to repo (default: ~/Incrementum_Dashboard)
 */

const https = require('node:https');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_ID = process.env.TELEGRAM_ALLOWED_ID ? Number(process.env.TELEGRAM_ALLOWED_ID) : null;
const PROJECT_DIR = process.env.INCREMENTUM_DIR || path.join(os.homedir(), 'Incrementum_Dashboard');
const API = `https://api.telegram.org/bot${TOKEN}`;
const MAX_MSG_LEN = 4000;

if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN not set');
  process.exit(1);
}

function apiRequest(method, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(`${API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sendMessage(chatId, text) {
  const chunks = [];
  for (let i = 0; i < text.length; i += MAX_MSG_LEN) {
    chunks.push(text.slice(i, i + MAX_MSG_LEN));
  }
  return chunks.reduce((p, chunk) =>
    p.then(() => apiRequest('sendMessage', { chat_id: chatId, text: chunk, parse_mode: 'Markdown' })
      .catch(() => apiRequest('sendMessage', { chat_id: chatId, text: chunk }))),
    Promise.resolve()
  );
}

function runAnalista(prompt) {
  console.log(`[bot] Running analista: ${prompt.slice(0, 80)}...`);
  const result = spawnSync('claude', ['-p', prompt], {
    cwd: PROJECT_DIR,
    encoding: 'utf8',
    timeout: 300000, // 5 min
    env: { ...process.env, CLAUDE_AGENT: 'incrementum-analista' }
  });
  if (result.error) throw result.error;
  return (result.stdout || '').trim() || result.stderr || 'Sem resposta.';
}

async function processMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text || '';

  if (!ALLOWED_ID) {
    console.log(`First message from chat_id: ${chatId} — set TELEGRAM_ALLOWED_ID=${chatId}`);
    await sendMessage(chatId, `Seu chat ID é: \`${chatId}\`\nDefina TELEGRAM_ALLOWED_ID=${chatId} e reinicie o bot.`);
    return;
  }

  if (chatId !== ALLOWED_ID) {
    console.log(`Ignored message from unauthorized chat_id: ${chatId}`);
    return;
  }

  if (!text || text.startsWith('/start')) {
    await sendMessage(chatId, 'Analista online. Pode falar.');
    return;
  }

  await apiRequest('sendChatAction', { chat_id: chatId, action: 'typing' });

  try {
    const response = runAnalista(text);
    await sendMessage(chatId, response);
  } catch (err) {
    console.error('[bot] Error:', err.message);
    await sendMessage(chatId, `Erro: ${err.message}`);
  }
}

async function poll(offset = 0) {
  try {
    const res = await apiRequest('getUpdates', { offset, timeout: 30, allowed_updates: ['message'] });
    if (!res.ok) { console.error('getUpdates error:', res); return poll(offset); }

    let nextOffset = offset;
    for (const update of res.result || []) {
      nextOffset = update.update_id + 1;
      if (update.message) {
        processMessage(update.message).catch(e => console.error('[bot] processMessage error:', e.message));
      }
    }
    return poll(nextOffset);
  } catch (err) {
    console.error('[bot] Poll error:', err.message);
    setTimeout(() => poll(offset), 5000);
  }
}

console.log(`Incrementum bot starting — project: ${PROJECT_DIR}`);
if (!ALLOWED_ID) console.log('TELEGRAM_ALLOWED_ID not set — send any message to discover your chat ID');
poll();
