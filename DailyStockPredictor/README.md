# DailyStockPredictor

Project path: `<path-to-repo>\\DailyStockPredictor\\`

This project runs daily stock trading signals using your trained Transformer + PPO models, including daily news sentiment. Outputs a CSV of Buy/Sell/Hold per ticker each day under `logs/`.

## Project Structure
- `src/config.py`: Configuration (tickers, features, directories).
- `src/features.py`: Price download, indicators, feature windowing.
- `src/sentiment.py`: News CSV reading and VADER daily sentiment.
- `src/model_loader.py`: Loads saved Transformer and PPO models and scalers.
- `daily_predict.py`: Main script to run daily predictions and write logs.
- `models/`: Place your trained models here.
- `cache/`: Sentiment cache per ticker.
- `logs/`: Daily signals.
- `data/`: Optional news CSV.

## Prerequisites
1) Python 3.10+ recommended.
2) Install dependencies:

```powershell
# In a PowerShell terminal
python -m venv .venv
. .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Copy your trained artifacts
From your notebook's `MODELS_DIR` (originally in Google Drive: `/content/drive/MyDrive/stock_rl_transformer/models/`), copy the files for each ticker (e.g., AAPL, MSFT, GOOGL):

- Transformer weights:
  - `models/transformer_best_{TICKER}.pt`
- Scaler per ticker:
  - `models/scaler_{TICKER}.pkl`
- PPO agent zip:
  - `models/ppo_saved_models/ppo_agent_{TICKER}.zip`

If the `ppo_saved_models/` folder does not exist locally, create it.

## Optional: News CSV
If you want daily sentiment:
- Put your news CSV at: `data/Combined_News_DJIA.csv`
- The file should have a `Date` column and at least one text column with headlines. If many columns exist, the loader will concatenate them.
- The script caches computed daily sentiment into `cache/sentiment_{TICKER}.parquet`.

If the news CSV is missing, the script uses zero sentiment.

## Run manually
```powershell
. .\.venv\Scripts\Activate.ps1
python .\daily_predict.py
```

On success, check `logs/YYYY-MM-DD_signals.csv`.

## Schedule with Windows Task Scheduler
1. Open Task Scheduler > Create Basic Task
2. Name: DailyStockPredictor
3. Trigger: Daily (choose time after market close)
4. Action: Start a program
   - Program/script: `<path-to-repo>\\DailyStockPredictor\\.venv\\Scripts\\python.exe` (or your system Python)
   - Add arguments: `<path-to-repo>\\DailyStockPredictor\\daily_predict.py`
   - Start in: `<path-to-repo>\\DailyStockPredictor\\`
5. Finish.

Note: If you don't use a venv, point to your system `python.exe` and ensure `requirements.txt` are installed globally.

## Configuration
Edit `src/config.py`:
- `CONFIG["tickers"]`: update tickers list.
- `CONFIG["features"]`: must match features used in training (already seeded from your notebook).
- `CONFIG["seq_len"]`: must match what PPO expects.
- `CONFIG["news_csv"]`: path to your news file (defaults to `data/Combined_News_DJIA.csv`).

Note: `src/config.py` now derives `PROJECT_DIR` from the file location, so paths like `data/`, `logs/`, `models/` are relative to the repository and work for any user without editing absolute paths.

## Troubleshooting
- Missing scaler error: Copy `models/scaler_{TICKER}.pkl` from notebook output.
- Missing Transformer `.pt`: Copy `models/transformer_best_{TICKER}.pt`.
- Missing PPO zip: Copy `models/ppo_saved_models/ppo_agent_{TICKER}.zip`.
- Feature mismatch: Ensure `src/config.py` feature list order matches training.
- Empty Yahoo Finance data: Verify ticker symbol and date range.

## Notes
- PPO observation in this script is: `flatten(last_window) + [Transformer ProbUp]` to mirror your training setup.
- If you retrain models, replace files in `models/` accordingly.
