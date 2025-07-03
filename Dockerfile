# Dockerfile para Express Escape Room
FROM node:18-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el resto del código
COPY . .

# Exponer el puerto (ajustar si usas otro)
EXPOSE 3000

# Comando para arrancar el servidor
CMD ["node", "server.js"] 