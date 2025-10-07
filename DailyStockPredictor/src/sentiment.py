import os
import pandas as pd
from typing import Optional

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    _HAS_VADER = True
except Exception:
    _HAS_VADER = False


def read_news_csv(path: str) -> pd.DataFrame:
    if not os.path.exists(path):
        raise FileNotFoundError(f"News CSV not found at: {path}")
    df = pd.read_csv(path)
    # Expect columns: Date, headline (robustness: detect common column names)
    if "Date" not in df.columns:
        # try lowercase fallback
        if "date" in df.columns:
            df = df.rename(columns={"date": "Date"})
        else:
            raise ValueError("News CSV must have a 'Date' column")
    # Infer headline column
    headline_col = None
    for c in ["headline", "Headlines", "News", "Title", "text", "Text"]:
        if c in df.columns:
            headline_col = c
            break
    if headline_col is None:
        # If multiple columns exist (like DJIA dataset), merge row's strings into one
        non_date_cols = [c for c in df.columns if c != "Date"]
        df["headline"] = df[non_date_cols].astype(str).agg(". ".join, axis=1)
    else:
        if headline_col != "headline":
            df = df.rename(columns={headline_col: "headline"})
    # Normalize Date to date object
    df["Date"] = pd.to_datetime(df["Date"]).dt.date
    # Dropna
    df = df.dropna(subset=["headline"]).copy()
    return df[["Date", "headline"]]


def compute_daily_sentiment(df_news: pd.DataFrame) -> pd.DataFrame:
    if not _HAS_VADER:
        # Fallback: zero sentiment if VADER not available
        daily = (
            df_news.groupby("Date").size().reset_index(name="cnt")
            .assign(sentiment=0.0)
            [["Date", "sentiment"]]
        )
        return daily
    vs = SentimentIntensityAnalyzer()
    df = df_news.copy()
    df["_s"] = df["headline"].map(lambda x: vs.polarity_scores(str(x))["compound"])
    daily = df.groupby("Date")["_s"].mean().reset_index().rename(columns={"_s": "sentiment"})
    return daily
