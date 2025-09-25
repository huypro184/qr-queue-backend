FROM python:3.12-slim

WORKDIR /app

COPY . .

RUN pip install --no-cache-dir fastapi uvicorn joblib pandas scikit-learn

EXPOSE 9100

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "9100"]