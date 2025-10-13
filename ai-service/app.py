import os
import json
import joblib
import pandas as pd
import pika
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load model
model = joblib.load("random_forest_waiting_time.pkl")
logger.info("Model loaded successfully")

# Connect to RabbitMQ
connection = pika.BlockingConnection(pika.URLParameters(os.getenv("RABBITMQ_URL")))
channel = connection.channel()

# Declare queues
channel.queue_declare(queue='predict_request', durable=True)
channel.queue_declare(queue='predict_response', durable=True)

def predict_waiting_time(tickets_data):
    """Simple prediction"""
    df = pd.DataFrame([{
        "queue_length": t["queue_length"],
        "hour": t["hour"],
        "day_of_week": t["day_of_week"]
    } for t in tickets_data])

    predictions = model.predict(df)

    return [{
        "ticketId": ticket["ticketId"],
        "waiting_time_prediction": round(float(pred), 2)
    } for ticket, pred in zip(tickets_data, predictions)]

def process_message(ch, method, properties, body):
    """Process prediction request"""
    try:
        data = json.loads(body.decode('utf-8'))
        tickets = data['tickets']
        correlation_id = data['correlationId']
        
        logger.info(f"Processing {len(tickets)} tickets - ID: {correlation_id}")
        
        # Predict
        predictions = predict_waiting_time(tickets)
        
        # Send response
        response = {
            'correlationId': correlation_id,
            'predictions': predictions
        }
        
        ch.basic_publish(
            exchange='',
            routing_key='predict_response',
            body=json.dumps(response)
        )
        
        logger.info(f"Sent predictions - ID: {correlation_id}")
        ch.basic_ack(delivery_tag=method.delivery_tag)
        
    except Exception as e:
        logger.error(f"Error: {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

# Start consuming
channel.basic_qos(prefetch_count=1)
channel.basic_consume(queue='predict_request', on_message_callback=process_message)

logger.info("AI Service started. Waiting for messages...")
channel.start_consuming()