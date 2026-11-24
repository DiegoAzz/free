// radar-gratis/fetcher.js
// Recopilador automático de regalos y ofertas desde múltiples APIs gratuitas

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 1. GamerPower: Juegos, Loot, DLCs y Skins (PC, Consolas, Móviles)
async function fetchGamerPower() {
  console.log('📡 [1/2] Consultando GamerPower API (Juegos, DLCs, Skins)...');
  try {
    const res = await fetch('https://www.gamerpower.com/api/giveaways', {
      headers: { 'User-Agent': 'RadarGratisBot/1.0' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    return data.map(item => {
      const typeLower = (item.type || '').toLowerCase();
      let category = 'loot';
      if (typeLower.includes('game')) category = 'juegos';
      else if (typeLower.includes('beta')) category = 'betas';

      // Parsear valor estimado
      let priceVal = item.worth;
      if (!priceVal || priceVal === 'N/A') priceVal = '$15.00';

      return {
        id: `gp_${item.id}`,
        title: item.title,
        category,
        platform: item.platforms,
        originalPrice: priceVal,
        currentPrice: '¡GRATIS!',
        thumbnail: item.image,
        claimUrl: item.open_giveaway_url,
        description: item.description,
        instructions: item.instructions,
        expiryDate: item.end_date !== 'N/A' ? item.end_date : null,
        status: 'active',
        publishedAt: item.published_date,
        source: 'GamerPower'
      };
    });
  } catch (err) {
    console.error('❌ Error en GamerPower:', err.message);
    return [];
  }
}

// 2. Epic Games Store: Juegos AAA semanales (Activos y Próximos)
async function fetchEpicGames() {
  console.log('📡 [2/2] Consultando Epic Games Store API...');
  try {
    const url = 'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=es-ES&country=CO&allowCountries=CO';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const elements = json?.data?.Catalog?.searchStore?.elements || [];

    const items = [];
    for (const game of elements) {
      const promotions = game.promotions;
      if (!promotions) continue;

      const activePromo = promotions.promotionalOffers?.[0]?.promotionalOffers?.[0];
      const upcomingPromo = promotions.upcomingPromotionalOffers?.[0]?.promotionalOffers?.[0];

      if (!activePromo && !upcomingPromo) continue;

      const isUpcoming = !activePromo && !!upcomingPromo;
      const promoInfo = activePromo || upcomingPromo;

      const imgObj = game.keyImages?.find(img => img.type === 'DieselStoreFrontWide' || img.type === 'OfferImageWide') 
                  || game.keyImages?.[0];

      const slug = game.catalogNs?.mappings?.[0]?.pageSlug 
                || game.productSlug 
                || game.urlSlug 
                || '';

      items.push({
        id: `epic_${game.id}`,
        title: game.title,
        category: 'juegos',
        platform: 'Epic Games (PC)',
        originalPrice: game.price?.totalPrice?.fmtPrice?.originalPrice || '$19.99',
        currentPrice: isUpcoming ? 'Próximamente' : '¡GRATIS!',
        thumbnail: imgObj?.url || '',
        claimUrl: slug ? `https://store.epicgames.com/es-ES/p/${slug}` : 'https://store.epicgames.com/es-ES/free-games',
        description: game.description,
        expiryDate: promoInfo?.endDate || null,
        startDate: promoInfo?.startDate || null,
        status: isUpcoming ? 'upcoming' : 'active',
        source: 'Epic Games'
      });
    }
    return items;
  } catch (err) {
    console.error('❌ Error en Epic Games:', err.message);
    return [];
  }
}

// 3. Cursos y Certificados Gratuitos Destacados (Plataformas Oficiales con Valor Alto)
function getCuratedCoursesAndTools() {
  return [
    {
      id: 'course_cs50',
      title: 'CS50: Introducción a la Ciencia de la Computación (Harvard University)',
      category: 'cursos',
      platform: 'edX / Harvard',
      originalPrice: '$149.00',
      currentPrice: '¡GRATIS!',
      thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80',
      claimUrl: 'https://www.edx.org/course/introduction-computer-science-harvardx-cs50x',
      description: 'El curso de programación más prestigioso del mundo de Harvard University. Aprende C, Python, SQL, algoritmos y desarrollo web completamente gratis.',
      expiryDate: null,
      status: 'active',
      source: 'Harvard University'
    },
    {
      id: 'course_google_cloud',
      title: 'Google Cloud Skills Boost: Fundamentos de Inteligencia Artificial Generativa',
      category: 'cursos',
      platform: 'Google Cloud',
      originalPrice: '$49.00',
      currentPrice: '¡GRATIS!',
      thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&auto=format&fit=crop&q=80',
      claimUrl: 'https://www.cloudskillsboost.google/paths/118',
      description: 'Curso oficial de Google con insignia y certificado al completar sobre modelos LLM y cómo aplicar IA en proyectos reales.',
      expiryDate: null,
      status: 'active',
      source: 'Google'
    },
    {
      id: 'tool_unreal_engine',
      title: 'Pack de Recursos 3D & Texturas Mensuales para Unreal Engine',
      category: 'software',
      platform: 'Epic Games / Unreal',
      originalPrice: '$89.00',
      currentPrice: '¡GRATIS!',
      thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      claimUrl: 'https://www.unrealengine.com/marketplace/es-ES/free',
      description: 'Modelos 3D, entornos y música profesional para desarrolladores de videojuegos. Gratis para siempre si los reclamas este mes.',
      expiryDate: null,
      status: 'active',
      source: 'Unreal Engine'
    },
    {
      id: 'tool_figma_pro',
      title: 'Figma & FigJam Pro: Licencia Completa de Educación',
      category: 'software',
      platform: 'Figma',
      originalPrice: '$144.00/año',
      currentPrice: '¡GRATIS!',
      thumbnail: 'https://images.unsplash.com/photo-1581291518655-9523844b306f?w=600&auto=format&fit=crop&q=80',
      claimUrl: 'https://www.figma.com/education/',
      description: 'Acceso a todas las funciones profesionales de diseño de interfaz y prototipado sin pagar nada para estudiantes y autodidactas.',
      expiryDate: null,
      status: 'active',
      source: 'Figma'
    }
  ];
}

export async function runFetcher() {
  console.log('🚀 Iniciando recolección de regalos y promociones...');
  const [gamerPowerItems, epicItems] = await Promise.all([
    fetchGamerPower(),
    fetchEpicGames()
  ]);

  const curated = getCuratedCoursesAndTools();
  const rawItems = [...epicItems, ...gamerPowerItems, ...curated];

  // Separar y priorizar: Primero los que están 100% activos para reclamar HOY, al final los próximos estrenos
  const activeItems = rawItems.filter(i => i.status !== 'upcoming');
  const upcomingItems = rawItems.filter(i => i.status === 'upcoming');
  const allItems = [...activeItems, ...upcomingItems];

  // Calcular ahorro total estimado
  let totalSavingsUSD = 0;
  allItems.forEach(item => {
    const raw = (item.originalPrice || '').replace(/[^0-9.]/g, '');
    const num = parseFloat(raw);
    if (!isNaN(num) && num > 0 && num < 1000) {
      totalSavingsUSD += num;
    } else {
      totalSavingsUSD += 19.99; // Estimado promedio
    }
  });

  const payload = {
    updatedAt: new Date().toISOString(),
    totalCount: allItems.length,
    estimatedSavingsUSD: Math.round(totalSavingsUSD),
    items: allItems
  };

  const outputPath = path.join(DATA_DIR, 'freebies.json');
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`✅ ¡Recolección terminada con éxito!`);
  console.log(`📊 Total de elementos disponibles: ${allItems.length}`);
  console.log(`💰 Ahorro acumulado estimado: $${payload.estimatedSavingsUSD} USD`);
  console.log(`💾 Guardado en: ${outputPath}`);
  return payload;
}

// Ejecutar si se llama directamente
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runFetcher();
}
