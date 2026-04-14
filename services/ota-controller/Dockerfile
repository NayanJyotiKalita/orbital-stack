# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json .
RUN npm install --production

COPY . .

# Runtime Stage
FROM gcr.io/distroless/nodejs20-debian11

WORKDIR /app
COPY --from=builder /app .

EXPOSE 7070

CMD ["server.js"]
