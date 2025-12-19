import pika
import json
import pandas as pd
import joblib
import os
import numpy as np
from dotenv import load_dotenv
from pathlib import Path


# --- 1. CẤU HÌNH ---
base_dir = Path(__file__).resolve().parent
env_path = base_dir.parent / '.env'
load_dotenv(dotenv_path=env_path)

RABBITMQ_URL = os.getenv('RABBITMQ_URL') 
QUEUE_NAME = 'ai_queue_prediction'  # <--- Bổ sung định nghĩa tên hàng đợi

# --- 2. LOAD MODEL ---
print("Loading model...")

try:
    model = joblib.load('queue_prediction_model.pkl')
    print("Model loaded successfully!")
except FileNotFoundError:
    print("LỖI: Không tìm thấy file 'queue_prediction_model.pkl'. Hãy chạy train lại hoặc kiểm tra đường dẫn.")
    exit(1)

def on_request(ch, method, props, body):
    try:
        # Nhận payload từ Backend
        payload = json.loads(body)
        
        if not payload:
            response = []
        else:
            # Chuyển list dict thành Pandas DataFrame
            df = pd.DataFrame(payload)
            
            # GIỮ LẠI ticketId
            ids = df['ticketId'].values
            
            # LỌC LẤY features (Thứ tự cột phải chuẩn như lúc train)
            features = ['queue_length', 'hour', 'day_of_week']
            
            # Đảm bảo data không bị thiếu cột nào (phòng hờ)
            for f in features:
                if f not in df.columns:
                    df[f] = 0 
            
            X_predict = df[features]
            
            # Dự đoán
            predictions = model.predict(X_predict)
            
            # Ghép ID vé với kết quả
            response = []
            for i, time_pred in enumerate(predictions):
                val_id = int(ids[i])
                val_time = float(time_pred)
                
                response.append({
                    'ticketId': val_id,
                    'predicted_wait_time': round(val_time, 2)
                })

        # Gửi kết quả ngược lại
        ch.basic_publish(
            exchange='',
            routing_key=props.reply_to,
            properties=pika.BasicProperties(correlation_id=props.correlation_id),
            body=json.dumps(response)
        )
        
        ch.basic_ack(delivery_tag=method.delivery_tag)
        print(f"Processed batch of {len(payload)} tickets.")

    except Exception as e:
        print(f"Error processing message: {str(e)}")
        # Nack để RabbitMQ biết mà xử lý lại (hoặc đẩy vào Dead Letter)
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

# --- 3. KẾT NỐI (Đã sửa cho Cloud) ---
print(f"Connecting to RabbitMQ: {RABBITMQ_URL.split('@')[-1] if RABBITMQ_URL else 'None'}") # Log host để debug (che pass)

if not RABBITMQ_URL:
    print("LỖI: Biến môi trường RABBITMQ_URL chưa được thiết lập!")
    exit(1)

# QUAN TRỌNG: Dùng URLParameters cho chuỗi kết nối Cloud (amqps://...)
params = pika.URLParameters(RABBITMQ_URL)

try:
    connection = pika.BlockingConnection(params)
    channel = connection.channel()

    # Khai báo queue (durable=True để giữ queue khi RabbitMQ restart)
    channel.queue_declare(queue=QUEUE_NAME, durable=True)

    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=on_request)

    print(" [x] AI Service is RUNNING. Awaiting RPC requests...")
    channel.start_consuming()

except pika.exceptions.AMQPConnectionError as e:
    print("LỖI KẾT NỐI: Không thể kết nối tới RabbitMQ Cloud. Kiểm tra lại URL.")
    print(e)
except KeyboardInterrupt:
    print('Interrupted')
    try:
        connection.close()
    except:
        pass