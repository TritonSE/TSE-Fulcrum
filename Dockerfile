FROM node:16

WORKDIR /app

ENV NODE_ENV=development
COPY package*.json ./
COPY backend/package*.json backend/
COPY frontend/package*.json frontend/
RUN npm ci --prefix backend
RUN npm ci --prefix frontend

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 8080
CMD npm start
