from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "AI Service is running!"}

@app.get("/predict")
def predict_expense():
    return {"category": "Food", "confidence": 0.95}