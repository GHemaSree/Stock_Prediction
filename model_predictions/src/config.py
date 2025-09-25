import os
from datetime import date

# Base project directory (update only if you move the project)
PROJECT_DIR = r"C:\Users\hemas\Hemasree\DailyStockPredictor"
DATA_DIR = os.path.join(PROJECT_DIR, "data")
CACHE_DIR = os.path.join(PROJECT_DIR, "cache")
MODELS_DIR = os.path.join(PROJECT_DIR, "models")
PLOTS_DIR = os.path.join(PROJECT_DIR, "plots")
LOGS_DIR = os.path.join(PROJECT_DIR, "logs")
SRC_DIR = os.path.join(PROJECT_DIR, "src")

# Ensure directories exist
for d in [DATA_DIR, CACHE_DIR, MODELS_DIR, PLOTS_DIR, LOGS_DIR, SRC_DIR]:
    os.makedirs(d, exist_ok=True)

# Core configuration
CONFIG = {
    "tickers": ["AAPL", "MSFT", "GOOGL"],
    "start": "2015-01-01",
    "end": date.today().isoformat(),
    "seq_len": 60,
    # Feature list must match the one used during training
    "features": [
        "Open","High","Low","Close","Volume",
        "Return","LogRet",
        "SMA_10","SMA_20","EMA_12","EMA_26",
        "RSI_14","MACD","MACD_S","MACD_H",
        "BB_Width","HL_Range","Volume_Change",
        "Sentiment",
        "LogRet_1d","LogRet_5d","LogRet_10d",
        "Volatility_5d","Volatility_10d",
        "Vol_norm","Price_vs_SMA20","Price_vs_SMA50"
    ],
    # News CSV used for daily sentiment (optional). If absent, we will fallback to zeros.
    # You can point this to your dataset of headlines with columns: [Date, headline]
    "news_csv": os.path.join(DATA_DIR, "Combined_News_DJIA.csv"),
    # Transaction fee assumption if needed for any strategy reporting
    "fee_bps": 5,
}
