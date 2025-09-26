from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import joblib
import pandas as pd

app = FastAPI(title="Waiting Time Prediction API")

model = joblib.load("random_forest_waiting_time.pkl")

class TicketData(BaseModel):
    ticketId: int
    queue_length: int
    hour: int
    day_of_week: int

class TicketsRequest(BaseModel):
    tickets: List[TicketData]

@app.post("/predict")
def predict(data: TicketsRequest):
    try:
        df = pd.DataFrame([{
            "queue_length": t.queue_length,
            "hour": t.hour,
            "day_of_week": t.day_of_week
        } for t in data.tickets])

        predictions = model.predict(df)

        results = []
        for ticket, pred in zip(data.tickets, predictions):
            results.append({
                "ticketId": ticket.ticketId,
                "waiting_time_prediction": round(float(pred), 2)
            })

        return results
    except Exception as e:
        return {"error": str(e)}
