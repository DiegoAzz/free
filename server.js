// radar-gratis/server.js
// Servidor web nativo en Node.js para Producción (Coolify) y Desarrollo

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFetcher } from './fetcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data', 'freebies.json');

// 1. Verificación inicial de datos
if (!fs.existsSync(DATA_FILE)) {
  console.log('📦 Archivo de datos no encontrado. Ejecutando recolección inicial...');
  await runFetcher();
}

// 2. Tarea automática programada interna (Coolify): Se actualiza solo cada 4 horas
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
setInterval(async () => {
  console.log('⏰ [Cron Interno] Actualizando promociones y regalos automáticamente...');
  try {
    await runFetcher();
    console.log('✅ [Cron Interno] Datos actualizados con éxito.');
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
