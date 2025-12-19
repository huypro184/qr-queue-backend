FROM python:3.12-slim

WORKDIR /app

# 🔥 CÀI LIBGOMP (QUAN TRỌNG)
RUN apt-get update && apt-get install -y \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY queue_prediction_model.pkl .
COPY app.py .

CMD ["python", "app.py"]
