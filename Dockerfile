FROM node:20-alpine

# Instalar dependencias necesarias para módulos nativos
RUN apk add --no-cache git ffmpeg python3 make g++

WORKDIR /app

# Copiar definiciones de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --omit=dev

# Copiar el resto del código del proyecto
COPY . .

# El bot expone el servidor web del código QR
ENV PORT=3008
EXPOSE 3008

# Directorio de persistencia de sesiones de WhatsApp y estado
VOLUME ["/app/bot_sessions", "/app/src/data"]

# Iniciar bot
CMD ["npm", "start"]
