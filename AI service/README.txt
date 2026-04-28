Budget Time Series PKL Package
================================

Files included:
1. budget_time_series_model.pkl
   - Final trained RandomForest time-series forecasting model.
   - Contains model, feature columns, metrics, and category list.

2. train_time_series_colab.ipynb
   - Google Colab notebook to retrain the model and download the PKL.

3. predict_from_pkl.py
   - Python file to test the PKL prediction.

4. fastapi_pkl_service.py
   - FastAPI service that loads the PKL and provides:
     /health
     /forecast/next-month?budget_limit=100000

5. requirements.txt
   - Required Python packages.

How to test locally:
--------------------
Put expenses_feature_engineered_full.csv in this same folder.

Install dependencies:
    pip install -r requirements.txt

Test prediction:
    python predict_from_pkl.py

Run API:
    python -m uvicorn fastapi_pkl_service:app --reload --port 8001

Open:
    http://localhost:8001/health
    http://localhost:8001/forecast/next-month?budget_limit=100000

Model metrics:
--------------
MAE: 183108.36
RMSE: 245455.01
R2: 0.8324

Important note:
---------------
This model gives estimated forecasts based on historical data.
It should be explained as a prototype prediction model, not a guaranteed financial result.
