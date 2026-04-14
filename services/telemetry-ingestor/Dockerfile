# Build Stage
FROM python:3.11-alpine AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Runtime Stage
FROM gcr.io/distroless/python3-debian11

WORKDIR /app
COPY --from=builder /app .

EXPOSE 8080

CMD ["app.py"]
