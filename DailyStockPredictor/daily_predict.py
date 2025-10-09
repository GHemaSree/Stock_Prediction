import os
import sys
import json
import traceback
from datetime import date, timedelta

import numpy as np
import pandas as pd

from src.config import CONFIG, MODELS_DIR, CACHE_DIR, LOGS_DIR
from src.features import fetch_prices, compute_indicators, align_and_merge_sentiment, make_last_window
from src.sentiment import read_news_csv, compute_daily_sentiment
from src.model_loader import (
    load_scaler,
    load_transformer,
    transformer_prob_up,
    load_ppo,
    ppo_decide_action,
)


def log(msg: str):
    print(f"[{date.today().isoformat()}] {msg}")


def ensure_sentiment_cache(ticker: str) -> pd.DataFrame:
    """Return a daily sentiment dataframe with columns [Date, sentiment]. Cache per ticker."""
    cache_path = os.path.join(CACHE_DIR, f"sentiment_{ticker}.parquet")
    if os.path.exists(cache_path):
        try:
            df = pd.read_parquet(cache_path)
            df["Date"] = pd.to_datetime(df["Date"]).dt.date
            log(f"[{ticker}] Loaded sentiment cache ({len(df)} days)")
            return df
        except Exception:
            log(f"[{ticker}] Failed loading sentiment cache, will recompute.")

    news_csv = CONFIG.get("news_csv")
    if news_csv and os.path.exists(news_csv):
        try:
            df_news = read_news_csv(news_csv)
            daily = compute_daily_sentiment(df_news)
            os.makedirs(CACHE_DIR, exist_ok=True)
            daily.to_parquet(cache_path, index=False)
            log(f"[{ticker}] Computed & cached sentiment to {cache_path} ({len(daily)} days)")
            return daily
        except Exception as e:
            log(f"[{ticker}] Error computing sentiment from news CSV: {e}. Using zeros.")
    else:
        log(f"[{ticker}] News CSV not found; using zero sentiment.")

    return pd.DataFrame({"Date": [], "sentiment": []})


def map_action_to_signal(a: int) -> str:
    return {0: "HOLD", 1: "BUY", 2: "SELL"}.get(a, "HOLD")


def prob_to_signal(prob_up: float) -> str:
    """Threshold-mapped signal from Transformer probability.
    BUY: prob_up >= 0.50
    HOLD: 0.45 <= prob_up < 0.50
    SELL: prob_up < 0.45
    """
    try:
        p = float(prob_up)
    except Exception:
        return "HOLD"
    if p >= 0.50:
        return "BUY"
    if p < 0.45:
        return "SELL"
    return "HOLD"


def main():
    tickers = CONFIG["tickers"]
    seq_len = CONFIG["seq_len"]
    feature_cols = CONFIG["features"]

    # Use the last ~600 days for indicator stability and sentiment alignment
    today = date.today()
    start_cutoff = today - timedelta(days=700)
    start_date = max(pd.to_datetime(CONFIG["start"]).date(), start_cutoff)
    end_date = today

    results = []
    ppo_rows = []  # collect PPO diagnostics for separate file

    for ticker in tickers:
        try:
            log(f"Processing {ticker}...")
            # 1) Data and indicators
            px = fetch_prices(ticker, start=start_date.isoformat(), end=end_date.isoformat())
            px = compute_indicators(px)

            # 2) Sentiment
            sent_daily = ensure_sentiment_cache(ticker)
            feat_df = align_and_merge_sentiment(px, sent_daily)

            # Verify feature availability
            missing = [c for c in feature_cols if c not in feat_df.columns]
            if missing:
                raise ValueError(f"Missing required features for {ticker}: {missing}")

            # 3) Scaling (must match training)
            scaler, scaler_path = load_scaler(MODELS_DIR, ticker)
            if scaler is None:
                raise FileNotFoundError(
                    f"Scaler not found for {ticker}: {scaler_path}. Please copy scaler_{ticker}.pkl from your notebook's MODELS_DIR."
                )
            X_scaled = scaler.transform(feat_df[feature_cols].values)

            # 4) Last window for Transformer
            last_win = make_last_window(pd.DataFrame(X_scaled, index=feat_df.index, columns=feature_cols), feature_cols, seq_len)

            # 5) Transformer prob_up
            model, t_path = load_transformer(MODELS_DIR, ticker, n_features=len(feature_cols), seq_len=seq_len, device="cpu")
            prob_up = transformer_prob_up(model, last_win, device="cpu")

            # 6) Build PPO observation and decide action
            obs_vec = np.concatenate([last_win.flatten(), np.array([prob_up], dtype=np.float32)])
            ppo, ppo_path = load_ppo(MODELS_DIR, ticker)
            # Deterministic action for production signal
            action, _ = ppo_decide_action(ppo, obs_vec)
            ppo_signal = map_action_to_signal(action)

            # Threshold-based signal (used as primary Signal)
            signal = prob_to_signal(prob_up)

            # 6b) Price info (use latest row from features)
            try:
                latest_close = float(feat_df["Close"].iloc[-1])
            except Exception:
                latest_close = None
            try:
                # Return is fraction; convert to percent
                change_pct = float(feat_df["Return"].iloc[-1] * 100.0)
            except Exception:
                change_pct = None
            try:
                latest_volume = float(feat_df["Volume"].iloc[-1])
            except Exception:
                latest_volume = None
            try:
                vol_norm = float(feat_df.get("Vol_norm", pd.Series([np.nan])).iloc[-1])
            except Exception:
                vol_norm = None

            results.append({
                "Date": end_date.isoformat(),
                "Ticker": ticker,
                "ProbUp": round(float(prob_up), 6),
                # Keep original action for compatibility
                "Action": int(action),
                # Primary display signal mapped by probability thresholds
                "Signal": signal,
                "Price": round(latest_close, 2) if latest_close is not None else "",
                "ChangePct": round(change_pct, 2) if change_pct is not None else "",
                "Volume": int(latest_volume) if latest_volume is not None and not np.isnan(latest_volume) else "",
                "Vol_norm": round(vol_norm, 3) if vol_norm is not None and not np.isnan(vol_norm) else "",
            })
            # collect PPO diagnostics (written to logs/ppo_<date>.csv later)
            ppo_rows.append({
                "Date": end_date.isoformat(),
                "Ticker": ticker,
                "PPO_Action": int(action),
                "PPO_Signal": ppo_signal,
                "ProbUp": round(float(prob_up), 6),
            })
            # console log without PPO details
            log(f"{ticker}: ProbUp={prob_up:.3f} -> Signal={signal}")

            # No testing debug collection in normal mode
        except Exception as e:
            log(f"[ERROR] {ticker}: {e}")
            traceback.print_exc()

    # 7) Write/append to a single cumulative CSV
    if results:
        os.makedirs(LOGS_DIR, exist_ok=True)
        out_path = os.path.join(LOGS_DIR, "signals.csv")
        today_df = pd.DataFrame(results)
        if os.path.exists(out_path):
            try:
                existing = pd.read_csv(out_path)
                combined = pd.concat([existing, today_df], ignore_index=True)
                # De-duplicate by Date+Ticker, keep latest
                combined = combined.drop_duplicates(subset=["Date", "Ticker"], keep="last")
                # Remove any PPO diagnostic columns from cumulative signals
                combined = combined.drop(columns=["PPO_Action", "PPO_Signal"], errors="ignore")
                # Sort for readability
                combined = combined.sort_values(["Date", "Ticker"]).reset_index(drop=True)
                combined.to_csv(out_path, index=False)
                log(f"Updated cumulative signals at: {out_path}")
            except Exception:
                # Fallback: write today's only to ensure we don't lose output
                today_df = today_df.drop(columns=["PPO_Action", "PPO_Signal"], errors="ignore")
                today_df.to_csv(out_path, index=False)
                log(f"Rewrote cumulative signals (fallback) at: {out_path}")
        else:
            today_df = today_df.drop(columns=["PPO_Action", "PPO_Signal"], errors="ignore")
            today_df.to_csv(out_path, index=False)
            log("Created cumulative signals at: {out_path}")
    else:
        log("No results to log.")

    # Write PPO diagnostics to a per-day file (no console spam)
    try:
        if ppo_rows:
            os.makedirs(LOGS_DIR, exist_ok=True)
            ppo_path = os.path.join(LOGS_DIR, f"ppo_{end_date.isoformat()}.csv")
            pd.DataFrame(ppo_rows).to_csv(ppo_path, index=False)
            log(f"Wrote PPO diagnostics to: {ppo_path}")
    except Exception as e:
        log(f"[WARN] Failed writing PPO diagnostics: {e}")


if __name__ == "__main__":
    main()
