import numpy as np
import pandas as pd
import yfinance as yf

from typing import List, Tuple


def fetch_prices(ticker: str, start: str, end: str) -> pd.DataFrame:
    """Fetch OHLCV for a single ticker, robust to different yfinance shapes."""
    df = yf.download(ticker, start=start, end=end, auto_adjust=True, progress=False, group_by="column")
    if df is None or df.empty:
        raise ValueError(f"No price data returned for {ticker}")

    # Debug incoming columns
    try:
        print(f"[features.fetch_prices] {ticker} raw cols:", df.columns)
    except Exception:
        pass

    # Case 1: MultiIndex with (Price, Ticker) or (Ticker, Price)
    if isinstance(df.columns, pd.MultiIndex):
        level_names = list(df.columns.names)
        # Try to find the level that holds the ticker symbol
        ticker_level_idx = None
        for i, name in enumerate(level_names):
            try:
                vals = [str(v).upper() for v in df.columns.get_level_values(i)]
                if ticker.upper() in vals:
                    ticker_level_idx = i
                    break
            except Exception:
                continue
        if ticker_level_idx is not None:
            # Find the exact label object that matches the ticker (case-insensitive)
            label = None
            for val in df.columns.levels[ticker_level_idx]:
                if str(val).upper() == ticker.upper():
                    label = val
                    break
            if label is not None:
                sub = df.xs(label, level=ticker_level_idx, axis=1)
                # After xs, columns should be price fields
                sub.columns = [str(c).strip().title() for c in sub.columns]
                if set(["Open","High","Low","Close","Volume"]).issubset(sub.columns):
                    out = sub[["Open","High","Low","Close","Volume"]].dropna().copy()
                    out.index.name = "Date"
                    return out

    # Case 3: Single column with ticker name (e.g., ['AAPL']) -> use Ticker().history
    if len(df.columns) == 1 and str(df.columns[0]).strip().upper() == ticker.upper():
        try:
            th = yf.Ticker(ticker).history(start=start, end=end, auto_adjust=True)
            if th is not None and not th.empty:
                th = th.rename(columns=str.title)
                if set(["Open","High","Low","Close","Volume"]).issubset(th.columns):
                    out = th[["Open","High","Low","Close","Volume"]].dropna().copy()
                    out.index.name = "Date"
                    return out
        except Exception:
            pass

    # Case 4: Already flat single-ticker columns, normalize titles last
    norm = df.copy()
    norm.columns = [str(c).strip().title() for c in norm.columns]
    if set(["Open","High","Low","Close","Volume"]).issubset(norm.columns):
        out = norm[["Open","High","Low","Close","Volume"]].dropna().copy()
        out.index.name = "Date"
        return out

    # If we got here, raise an informative error
    raise ValueError(f"Unable to extract OHLCV for {ticker}. Got columns: {list(df.columns)}")


def compute_indicators(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # Flatten any MultiIndex columns that can come from yfinance
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(-1)
    # Drop duplicate columns if any and ensure plain Index
    if df.columns.duplicated().any():
        df = df.loc[:, ~df.columns.duplicated()].copy()
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(-1)
    else:
        df.columns = pd.Index([str(c) for c in df.columns])

    # Debug: show incoming columns once
    try:
        print("[features.compute_indicators] incoming cols:", list(df.columns)[:10], "... total:", len(df.columns))
    except Exception:
        pass

    # Ensure OHLCV columns are present; if not, attempt typical fallbacks
    required_ohlcv = ["Open", "High", "Low", "Close", "Volume"]
    if not all(c in df.columns for c in required_ohlcv):
        # Sometimes yfinance may provide lowercase or spaced names; normalize and try mapping
        cols_norm = {str(c).strip().title(): c for c in df.columns}
        missing = [c for c in required_ohlcv if c not in df.columns]
        remap = {}
        for name in missing:
            if name in cols_norm:
                remap[cols_norm[name]] = name
        if remap:
            df = df.rename(columns=remap)
        # Final check
        if not all(c in df.columns for c in required_ohlcv):
            raise KeyError(f"Missing OHLCV columns after normalization: {required_ohlcv}; have: {list(df.columns)}")
    # Explicitly subset to the core OHLCV columns to ensure a flat, clean schema
    df = df.loc[:, required_ohlcv].copy()
    # Returns
    df["Return"] = df["Close"].pct_change()
    df["LogRet"] = np.log(df["Close"]).diff()

    # Moving averages
    df["SMA_10"] = df["Close"].rolling(10).mean()
    df["SMA_20"] = df["Close"].rolling(20).mean()
    df["SMA_50"] = df["Close"].rolling(50).mean()
    df["EMA_12"] = df["Close"].ewm(span=12, adjust=False).mean()
    df["EMA_26"] = df["Close"].ewm(span=26, adjust=False).mean()

    # Ensure no duplicated column names (can cause single-column assignment errors)
    if df.columns.duplicated().any():
        df = df.loc[:, ~df.columns.duplicated()].copy()

    # MACD
    macd = df["EMA_12"] - df["EMA_26"]
    signal = macd.ewm(span=9, adjust=False).mean()
    df["MACD"] = macd
    df["MACD_Signal"] = signal
    df["MACD_Hist"] = macd - signal
    # Aliases to match training feature names
    df["MACD_S"] = df["MACD_Signal"]
    df["MACD_H"] = df["MACD_Hist"]

    # RSI(14)
    delta = df["Close"].diff()
    gain = (delta.where(delta > 0, 0)).rolling(14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
    rs = gain / (loss.replace(0, np.nan))
    df["RSI_14"] = 100 - (100 / (1 + rs))

    # Bollinger Bands 20
    mid = df["Close"].rolling(20).mean()
    std = df["Close"].rolling(20).std()
    df["BB_Middle"] = mid
    df["BB_Upper"] = mid + 2 * std
    df["BB_Lower"] = mid - 2 * std
    df["BB_Width"] = (df["BB_Upper"] - df["BB_Lower"]) / df["BB_Middle"]

    # Vol/Range
    df["HL_Range"] = (df["High"] - df["Low"]) / df["Close"].replace(0, np.nan)
    df["Volume_Change"] = df["Volume"].pct_change()

    # Additional features per training config
    # Lagged/aggregated log returns
    df["LogRet_1d"] = df["LogRet"].shift(1)
    df["LogRet_5d"] = df["LogRet"].rolling(5).sum()
    df["LogRet_10d"] = df["LogRet"].rolling(10).sum()

    # Rolling volatility of log returns
    df["Volatility_5d"] = df["LogRet"].rolling(5).std()
    df["Volatility_10d"] = df["LogRet"].rolling(10).std()

    # Normalized volume (relative to 20D average)
    vol_ma20 = df["Volume"].rolling(20).mean()
    df["Vol_norm"] = df["Volume"] / vol_ma20

    # Price relative to SMAs
    def _col_as_series(frame: pd.DataFrame, name: str) -> pd.Series:
        col = frame[name]
        if isinstance(col, pd.DataFrame):
            col = col.iloc[:, 0]
        return pd.to_numeric(col.squeeze(), errors="coerce")

    close_s = _col_as_series(df, "Close")
    sma20_s = _col_as_series(df, "SMA_20")
    sma50_s = _col_as_series(df, "SMA_50")

    price_vs_sma20 = (close_s / sma20_s) - 1.0
    price_vs_sma50 = (close_s / sma50_s) - 1.0
    # Force 1-D series with correct index
    price_vs_sma20 = pd.Series(price_vs_sma20.to_numpy().reshape(-1), index=df.index, name="Price_vs_SMA20")
    price_vs_sma50 = pd.Series(price_vs_sma50.to_numpy().reshape(-1), index=df.index, name="Price_vs_SMA50")
    df["Price_vs_SMA20"] = price_vs_sma20
    df["Price_vs_SMA50"] = price_vs_sma50

    df = df.dropna().copy()
    return df


def align_and_merge_sentiment(df_prices: pd.DataFrame, daily_sentiment: pd.DataFrame) -> pd.DataFrame:
    """Merge a daily sentiment series (Date, sentiment) into price df as 'Sentiment'."""
    if daily_sentiment is None or daily_sentiment.empty:
        df_prices["Sentiment"] = 0.0
        return df_prices
    s = pd.Series(daily_sentiment.set_index(pd.to_datetime(daily_sentiment["Date"]))["sentiment"])
    s.index = s.index.tz_localize(None)
    out = df_prices.copy()
    out["Sentiment"] = s.reindex(out.index, method="ffill").fillna(0.0).values
    return out


def make_last_window(df_feat: pd.DataFrame, feature_cols: List[str], seq_len: int) -> np.ndarray:
    X = df_feat[feature_cols].values
    if len(X) < seq_len:
        raise ValueError(f"Not enough rows ({len(X)}) to form a sequence of length {seq_len}")
    return X[-seq_len:]
