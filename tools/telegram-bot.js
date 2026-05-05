#!/usr/bin/env node

/**
 * Incrementum Telegram Bot
 * Telegram → claude CLI (OAuth, Max subscription) → Telegram
 *
 * Env vars:
 *   TELEGRAM_BOT_TOKEN    - from BotFather
 *   TELEGRAM_ALLOWED_ID   - your chat ID (1775346822)
 *   INCREMENTUM_DIR       - repo path (default: ~/Incrementum_Dashboard)
 */

const https = require('node:https');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_ID = process.env.TELEGRAM_ALLOWED_ID ? Number(process.env.TELEGRAM_ALLOWED_ID) : null;
const PROJECT_DIR = process.env.INCREMENTUM_DIR || path.join(os.homedir(), 'Incrementum_Dashboard');
const MAX_MSG_LEN = 4000;

if (!TOKEN) { console.error('TELEGRAM_BOT_TOKEN not set'); process.exit(1); }

function apiCall(method, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function send(chatId, text) {
  const chunks = [];
  for (let i = 0; i < text.length; i += MAX_MSG_LEN) chunks.push(text.slice(i, i + MAX_MSG_LEN));
  for (const chunk of chunks) {
    await apiCall('sendMessage', { chat_id: chatId, text: chunk })
      .catch(e => console.error('send error:', e.message));
  }
}

function runClaude(prompt) {
  const result = spawnSync('claude', ['-p', prompt, '--dangerously-skip-permissions'], {
    cwd: PROJECT_DIR,
    encoding: 'utf8',
    timeout: 300000,
    env: { ...process.env, HOME: os.homedir(), PATH: process.env.PATH }
  });
  if (result.error) throw result.error;
  return (result.stdout || '').trim() || (result.stderr || '').trim() || 'Sem resposta.';
}

async function handle(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  if (!ALLOWED_ID) {
    console.log(`Chat ID: ${chatId}`);
    await send(chatId, `Seu chat ID: ${chatId}\nDefina TELEGRAM_ALLOWED_ID=${chatId} e reinicie.`);
    return;
  }

  if (chatId !== ALLOWED_ID) return;
  if (!text || text === '/start') { await send(chatId, 'Analista online.'); return; }

  await apiCall('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {});
  console.log(`[${new Date().toISOString()}] "${text.slice(0, 60)}"`);

  try {
    const response = runClaude(text);
    await send(chatId, response);
  } catch (err) {
    console.error('Claude error:', err.message);
    await send(chatId, `Erro: ${err.message}`);
  }
}

async function poll(offset = 0) {
  try {
    const res = await apiCall('getUpdates', { offset, timeout: 30, allowed_updates: ['message'] });
    if (!res.ok) { await new Promise(r => setTimeout(r, 5000)); return poll(offset); }
    let next = offset;
    for (const u of res.result || []) {
      next = u.update_id + 1;
      if (u.message) handle(u.message).catch(e => console.error('handle error:', e.message));
    }
    return poll(next);
  } catch (err) {
    console.error('Poll error:', err.message);
    await new Promise(r => setTimeout(r, 5000));
    return poll(offset);
  }
}

console.log(`Bot starting | dir: ${PROJECT_DIR} | allowed: ${ALLOWED_ID || 'discovery mode'}`);
poll();
