FROM node:20

WORKDIR /app

# Pass frontend environment variables into build
ARG VITE_APPLICATION_DEADLINE
ENV VITE_APPLICATION_DEADLINE=$VITE_APPLICATION_DEADLINE

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
