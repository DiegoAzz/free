// radar-gratis/telegram.js
// Automatización para publicar ofertas en el canal de Telegram

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '9223172643:AAEuLO-u8-G2FeLr8wCMdy7c8CzDmkd8zx4';
const CHANNEL = process.env.TELEGRAM_CHANNEL || '-1003977678358';

const POSTED_FILE = path.join(__dirname, 'data', 'telegram-posted.json');
const FREEBIES_FILE = path.join(__dirname, 'data', 'freebies.json');

function getPostedDeals() {
  try {
    if (fs.existsSync(POSTED_FILE)) {
      return JSON.parse(fs.readFileSync(POSTED_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function savePostedDeals(list) {
  try {
    fs.writeFileSync(POSTED_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.error('Error guardando registro de Telegram:', e.message);
  }
}

export async function broadcastNewDeals(maxPosts = 2) {
  if (!fs.existsSync(FREEBIES_FILE)) {
    console.log('⚠️ [Telegram] No hay archivo de ofertas para publicar.');
    return { count: 0 };
  }

  const freebiesData = JSON.parse(fs.readFileSync(FREEBIES_FILE, 'utf8'));
  const items = freebiesData.items || [];
  const posted = getPostedDeals();

  // Filtrar solo los que están activos hoy y que no se hayan publicado antes
  const unposted = items.filter(item => item.status === 'active' && !posted.includes(item.id));

  console.log(`📡 [Telegram] Ofertas pendientes de publicar: ${unposted.length}`);

  if (unposted.length === 0) {
    return { count: 0, message: 'No hay ofertas nuevas pendientes.' };
  }

  const toPublish = unposted.slice(0, maxPosts);
  let publishedCount = 0;

  for (const deal of toPublish) {
    const isGame = deal.category === 'juegos';
    const tag = isGame ? '🎮 ¡JUEGO GRATIS!' : '🎁 ¡PROMOCIÓN GRATIS!';
    
    const caption = 
      `<b>${tag}</b>\n\n` +
      `🕹️ <b>${escapeHtml(deal.title)}</b>\n` +
      `💰 Precio normal: <s>${escapeHtml(deal.originalPrice || '')}</s> ➔ <b>¡100% GRATIS!</b>\n` +
      `📦 Plataforma: <b>${escapeHtml(deal.platform || 'Oficial')}</b>\n\n` +
      `⚡ <i>Reclámalo antes de que finalice la oferta</i> 👇\n` +
      `👉 <b>https://freegames.appzplay.online</b>\n\n` +
      `#JuegosGratis #FreeGames #Gaming #Chollos`;

    let success = false;

    // Intentar enviar con foto
    if (deal.thumbnail && deal.thumbnail.startsWith('http')) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: CHANNEL,
            photo: deal.thumbnail,
            caption: caption,
            parse_mode: 'HTML'
          })
        });
        const resJson = await res.json();
        if (resJson.ok) {
          success = true;
          console.log(`✅ [Telegram] Publicado con foto: ${deal.title}`);
        } else {
          console.error(`❌ [Telegram] Error al enviar foto:`, resJson.description);
        }
      } catch (err) {
        console.error(`❌ [Telegram] Fallo de red con foto:`, err.message);
      }
    }

    // Si falló la foto, enviar como texto simple
    if (!success) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: CHANNEL,
            text: caption,
            parse_mode: 'HTML',
            disable_web_page_preview: false
          })
        });
        const resJson = await res.json();
        if (resJson.ok) {
          success = true;
          console.log(`✅ [Telegram] Publicado como texto: ${deal.title}`);
        } else {
          console.error(`❌ [Telegram] Error al enviar mensaje:`, resJson.description);
        }
      } catch (err) {
        console.error(`❌ [Telegram] Fallo al enviar mensaje:`, err.message);
      }
    }

    if (success) {
      posted.push(deal.id);
      publishedCount++;
      // Pequeña pausa entre publicaciones para no saturar el canal
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  savePostedDeals(posted);
  return { count: publishedCount };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Ejecución directa si se corre desde terminal
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  broadcastNewDeals(1);
}
