from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import pandas as pd

app = FastAPI(title="Waiting Time Prediction API")

model = joblib.load("random_forest_waiting_time.pkl")

class TicketData(BaseModel):
    queue_length: int
    hour: int
    day_of_week: int

@app.get("/")
def root():
    return {"message": "API is running"}


@app.post("/predict")
def predict(data: TicketData):
    try:
        # Chuyển input thành DataFrame
        features = pd.DataFrame([data.dict()])

        # Dự đoán
        prediction = model.predict(features)[0]

        return {
            "input": data.dict(),
            "waiting_time_prediction": round(float(prediction), 2)
        }
    except Exception as e:
        return {"error": str(e)}
