# Dockerfile para despliegue en Coolify
FROM node:20-alpine

# Crear directorio de la aplicación
WORKDIR /app

# Copiar configuración de dependencias
COPY package*.json ./

# Copiar todo el código fuente
COPY . .

# Ejecutar el recolector inicial para que la imagen ya tenga datos precargados
RUN node fetcher.js || true

# Configurar variables de entorno y puerto
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Healthcheck nativo para Coolify
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/healthz || exit 1

# Comando de inicio del servidor
CMD ["node", "server.js"]
