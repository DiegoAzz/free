// radar-gratis/server.js
// Servidor web nativo en Node.js para Producción (Coolify) y Desarrollo

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFetcher } from './fetcher.js';
import { broadcastNewDeals } from './telegram.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data', 'freebies.json');
const STATS_FILE = path.join(__dirname, 'data', 'stats.json');

// Memoria de visitantes recientes para contar únicamente VISITAS ÚNICAS reales (1 visita por IP cada 30 min)
const recentVisitors = new Map();

// Motor inteligente de análisis de tráfico interno
function trackVisit(req, pathname) {
  // 1. Ignorar APIs, panel de stats, healthcheck de Coolify y recursos estáticos
  if (pathname === '/healthz' || pathname.startsWith('/api') || pathname.includes('stats') || pathname.includes('health')) return;
  if (pathname.includes('.') && !pathname.endsWith('.html')) return;

  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  
  // 2. Ignorar bots, robots de rastreo, healthchecks y curl
  if (/curl|wget|uptime|healthcheck|bot|crawl|spider|slurp|facebookexternalhit/.test(userAgent)) return;

  // 3. Ignorar al administrador si tiene la cookie de admin activada
  const cookie = req.headers['cookie'] || '';
  if (cookie.includes('freegames_admin=1')) return;

  // 4. IP real del usuario (respetando proxies inversos de Coolify/Traefik)
  const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  
  // Si la misma persona recarga la página dentro de 30 minutos, NO se cuenta como visita nueva
  const lastVisit = recentVisitors.get(clientIp);
  if (lastVisit && (now - lastVisit < 30 * 60 * 1000)) {
    return;
  }
  recentVisitors.set(clientIp, now);

  // Limpieza periódica de memoria de IPs
  if (recentVisitors.size > 5000) recentVisitors.clear();

  const today = new Date().toISOString().split('T')[0];
  const refHeader = (req.headers['referer'] || req.headers['referrer'] || '').toLowerCase();
  let source = 'Directo / Otro';
  if (refHeader.includes('facebook') || refHeader.includes('fb.me')) source = 'Facebook';
  else if (refHeader.includes('t.me') || refHeader.includes('telegram')) source = 'Telegram';
  else if (refHeader.includes('whatsapp')) source = 'WhatsApp';
  else if (refHeader.includes('google')) source = 'Google';

  const isMobile = /mobile|iphone|android|ipad/.test(userAgent);

  let stats = { totalViews: 0, byDate: {}, sources: {}, devices: { mobile: 0, desktop: 0 } };
  try {
    if (fs.existsSync(STATS_FILE)) {
      stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    }
  } catch (e) {}

  stats.totalViews = (stats.totalViews || 0) + 1;
  stats.byDate = stats.byDate || {};
  stats.byDate[today] = (stats.byDate[today] || 0) + 1;
  stats.sources = stats.sources || {};
  stats.sources[source] = (stats.sources[source] || 0) + 1;
  stats.devices = stats.devices || { mobile: 0, desktop: 0 };
  if (isMobile) stats.devices.mobile = (stats.devices.mobile || 0) + 1;
  else stats.devices.desktop = (stats.devices.desktop || 0) + 1;

  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8');
  } catch (e) {}
}

// 1. Verificación inicial de datos
if (!fs.existsSync(DATA_FILE)) {
  console.log('📦 Archivo de datos no encontrado. Ejecutando recolección inicial...');
  await runFetcher();
}

// 2. Tarea automática programada interna (Coolify): Se actualiza y publica solo cada 4 horas
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
setInterval(async () => {
  console.log('⏰ [Cron Interno] Actualizando promociones y regalos automáticamente...');
  try {
    await runFetcher();
    console.log('✅ [Cron Interno] Datos actualizados con éxito.');
    
    // Publicar automáticamente ofertas nuevas en Telegram
    console.log('📢 [Telegram] Enviando ofertas nuevas al canal...');
    await broadcastNewDeals(2);
  } catch (err) {
    console.error('❌ [Cron Interno] Error al actualizar:', err.message);
  }
}, FOUR_HOURS_MS);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  
  // Headers de seguridad y CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Registrar visita de usuario en tiempo real
  trackVisit(req, url.pathname);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Healthcheck para Coolify
  if (url.pathname === '/healthz' || url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
    return;
  }

  // API: Obtener todos los regalos
  if (url.pathname === '/api/freebies' && req.method === 'GET') {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const content = fs.readFileSync(DATA_FILE, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(content);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Datos no encontrados' }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: Obtener estadísticas internas en tiempo real
  if (url.pathname === '/api/stats' && req.method === 'GET') {
    try {
      if (fs.existsSync(STATS_FILE)) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(fs.readFileSync(STATS_FILE, 'utf8'));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ totalViews: 0, byDate: {}, sources: {}, devices: { mobile: 0, desktop: 0 } }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: Resetear contador de estadísticas a 0
  if (url.pathname === '/api/stats/reset' && req.method === 'POST') {
    try {
      const emptyStats = { totalViews: 0, byDate: {}, sources: {}, devices: { mobile: 0, desktop: 0 } };
      fs.writeFileSync(STATS_FILE, JSON.stringify(emptyStats, null, 2), 'utf8');
      recentVisitors.clear();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, message: 'Contador reseteado a 0' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: Refrescar datos en vivo
  if (url.pathname === '/api/refresh' && req.method === 'POST') {
    try {
      console.log('🔄 Solicitud de actualización manual recibida...');
      const updated = await runFetcher();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(updated));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: Publicar ofertas en Telegram manualmente
  if (url.pathname === '/api/telegram/broadcast' && (req.method === 'POST' || req.method === 'GET')) {
    try {
      console.log('📢 Disparando publicación en Telegram...');
      const resTelegram = await broadcastNewDeals(1);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, published: resTelegram }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Servir archivos estáticos de /public
  let reqPath = url.pathname;
  if (reqPath === '/') reqPath = '/index.html';

  let filePath = path.join(PUBLIC_DIR, reqPath);
  
  // Si no tiene extensión y existe como .html, servir el .html
  if (!path.extname(filePath) && fs.existsSync(filePath + '.html')) {
    filePath += '.html';
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html lang="es" class="dark">
          <head><meta charset="UTF-8"><title>404 - Página no encontrada</title><script src="https://cdn.tailwindcss.com"></script></head>
          <body class="bg-slate-900 text-white min-h-screen flex items-center justify-center p-4">
            <div class="text-center">
              <h1 class="text-6xl font-black text-indigo-500 mb-4">404</h1>
              <p class="text-lg text-slate-300 mb-6">Página no encontrada.</p>
              <a href="/" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition">Volver al Inicio</a>
            </div>
          </body>
          </html>
        `);
      } else {
        res.writeHead(500);
        res.end(`Error del servidor: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 FREEGAMES (AppzPlay) — Servidor Activo`);
  console.log(`🌐 Dominio oficial: https://freegames.appzplay.online`);
  console.log(`📡 Puerto local: ${PORT}`);
  console.log(`⏰ Cron interno: Actualización cada 4 horas`);
  console.log(`==================================================\n`);
});
