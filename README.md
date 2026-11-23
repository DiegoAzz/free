# ⚡ FreeGames (AppzPlay) — https://freegames.appzplay.online

> Plataforma automatizada de videojuegos, skins, cursos y software profesional a $0.00. Se actualiza sola cada 4 horas mediante APIs oficiales y está preparada para monetización con Google AdSense.

---

## 🚀 Despliegue en Coolify

Este repositorio está 100% listo para desplegarse en **Coolify**:

1. En tu panel de Coolify, selecciona tu Servidor / Proyecto y haz clic en **+ New Resource** → **Public Repository** (o Private).
2. Pega la URL del repositorio:
   ```text
   https://github.com/DiegoAzz/free.git
   ```
3. En **Branch**, selecciona `main`.
4. En **Domains / FQDN**, escribe tu dominio oficial:
   ```text
   https://freegames.appzplay.online
   ```
5. En **Ports Exposes**, define:
   ```text
   3000
   ```
6. Haz clic en **Deploy**. Coolify detectará automáticamente el `Dockerfile` (o `nixpacks.toml`), compilará la aplicación y activará el certificado SSL HTTPS gratuito de Let's Encrypt.

---

## 💰 Activación de Google AdSense

El sitio ya incluye todos los requisitos estrictos exigidos por Google:
- **Páginas Legales:**
  - `/quienes-somos.html` (Misión editorial y transparencia)
  - `/politica-de-privacidad.html` (Con cláusula explícita de cookies DART de AdSense y GDPR/CCPA)
  - `/terminos-y-condiciones.html` (Descargo de responsabilidad de tiendas oficiales)
  - `/contacto.html` (Formulario y correo oficial de contacto)
  - `/aviso-legal.html` (Divulgación de enlaces externos)
- **Contenido Editorial & FAQ:** Sección completa en la página principal con preguntas frecuentes sobre cómo canjear juegos para evitar el rechazo por *"Contenido de poco valor"*.
- **SEO & Rastreo:** `robots.txt` y `sitemap.xml` configurados para `https://freegames.appzplay.online`.
- **Banner de Consentimiento de Cookies (GDPR):** Integrado de forma no invasiva.

### Dónde pegar tu código de Google AdSense:
Cuando solicites la cuenta en Google AdSense y te den tu código `ca-pub-XXXXXXXXXXXXXX`:
1. Abre `public/index.html`.
2. En las líneas 18-21 (dentro de `<head>`), descomenta y reemplaza:
   ```html
   <meta name="google-adsense-account" content="ca-pub-XXXXXXXXXXXXXXXX">
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
   ```
3. Guarda y haz `git push`. Coolify actualizará tu sitio automáticamente.

---

## 💻 Ejecución Local

```bash
# Instalar / Iniciar servidor local
npm start

# Forzar actualización manual de las APIs
npm run fetch
```
Acceso local en: `http://localhost:3000`
