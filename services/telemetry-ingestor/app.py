from flask import Flask

app = Flask(__name__)

@app.route("/ready")
def ready():
    return "READY"

@app.route("/health")
def health():
    return "ALIVE"

@app.route("/")
def ingest():
    return "Ingesting telemetry..."

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)

