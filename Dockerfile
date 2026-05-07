FROM python:3.12-slim

LABEL maintainer="Group 5 — Smart Warehouse Team"
LABEL version="2.0.0"
LABEL description="AI-Powered Bio-Hazard & Pest Detection API (YOLO11)"
LABEL hackathon="AI Open Innovation Challenge 2026"

WORKDIR /app

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

# Expose port
EXPOSE 8000

# Health check using dedicated health endpoint
HEALTHCHECK --interval=30s --timeout=10s --retries=5 --start-period=15s \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Run server (production mode, no reload)
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

