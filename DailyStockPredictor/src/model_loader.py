import os
import json
import joblib
import numpy as np
import torch
from torch import nn
from typing import Tuple
from stable_baselines3 import PPO


class TransformerClassifier(nn.Module):
    def __init__(self, n_features: int, d_model: int, nhead: int, num_layers: int, dim_ff: int, dropout: float, seq_len: int):
        super().__init__()
        self.input_proj = nn.Linear(n_features, d_model)
        self.pos_emb = nn.Parameter(torch.randn(1, seq_len, d_model) * 0.01)
        enc_layer = nn.TransformerEncoderLayer(d_model, nhead, dim_ff, dropout, batch_first=True, norm_first=True)
        self.encoder = nn.TransformerEncoder(enc_layer, num_layers)
        self.dropout = nn.Dropout(dropout)
        self.head = nn.Sequential(
            nn.LayerNorm(d_model),
            nn.Linear(d_model, d_model // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 2, 2)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        h = self.input_proj(x) + self.pos_emb[:, :x.size(1), :]
        h = self.encoder(h)
        out = self.head(self.dropout(h[:, -1, :]))
        return out


def load_scaler(models_dir: str, ticker: str):
    path = os.path.join(models_dir, f"scaler_{ticker}.pkl")
    if not os.path.exists(path):
        return None, path
    scaler = joblib.load(path)
    return scaler, path


def load_transformer(models_dir: str, ticker: str, n_features: int, seq_len: int,
                     d_model: int = None, nhead: int = 4, num_layers: int = None, dim_ff: int = None, dropout: float = 0.3,
                     device: str = "cpu") -> Tuple[TransformerClassifier, str]:
    model_path = os.path.join(models_dir, f"transformer_best_{ticker}.pt")
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Transformer weights not found for {ticker}: {model_path}")

    # Load state dict first to infer architecture params used in training
    state = torch.load(model_path, map_location=device)

    # Infer d_model from input_proj.weight (shape: [d_model, n_features])
    if d_model is None:
        if "input_proj.weight" in state:
            d_model = int(state["input_proj.weight"].shape[0])
        elif "pos_emb" in state:
            d_model = int(state["pos_emb"].shape[-1])
        else:
            d_model = 128  # safe fallback

    # Infer seq_len from pos_emb if present
    if "pos_emb" in state:
        inferred_seq_len = int(state["pos_emb"].shape[1])
        if inferred_seq_len != seq_len:
            seq_len = inferred_seq_len

    # Infer number of layers from keys like 'encoder.layers.{i}.'
    if num_layers is None:
        layer_indices = []
        for k in state.keys():
            if k.startswith("encoder.layers."):
                try:
                    idx = int(k.split(".")[2])
                    layer_indices.append(idx)
                except Exception:
                    pass
        num_layers = (max(layer_indices) + 1) if layer_indices else 2

    # Infer dim_ff from linear1.weight (shape: [dim_ff, d_model])
    if dim_ff is None:
        if "encoder.layers.0.linear1.weight" in state:
            dim_ff = int(state["encoder.layers.0.linear1.weight"].shape[0])
        else:
            dim_ff = 2 * d_model

    # Ensure nhead divides d_model; pick a common divisor if not
    if d_model % nhead != 0:
        for h in [8, 4, 2, 1]:
            if d_model % h == 0:
                nhead = h
                break

    model = TransformerClassifier(
        n_features=n_features,
        d_model=d_model,
        nhead=nhead,
        num_layers=num_layers,
        dim_ff=dim_ff,
        dropout=dropout,
        seq_len=seq_len
    ).to(device)

    model.load_state_dict(state)
    model.eval()
    return model, model_path


def transformer_prob_up(model: TransformerClassifier, window_np: np.ndarray, device: str = "cpu") -> float:
    # window_np shape: (seq_len, n_features)
    x = torch.tensor(window_np, dtype=torch.float32, device=device).unsqueeze(0)  # (1, seq_len, n_features)
    with torch.no_grad():
        logits = model(x)
        probs = torch.softmax(logits, dim=-1).squeeze(0).cpu().numpy()
    # Assume class 1 = Up
    return float(probs[1])


def load_ppo(models_dir: str, ticker: str):
    ppo_save_dir = os.path.join(models_dir, "ppo_saved_models")
    path = os.path.join(ppo_save_dir, f"ppo_agent_{ticker}.zip")
    if not os.path.exists(path):
        raise FileNotFoundError(f"PPO model not found for {ticker}: {path}")
    model = PPO.load(path, device="cpu")  # CPU inference is okay; SB3 handles device
    return model, path


def ppo_decide_action(ppo_model: PPO, obs_vec: np.ndarray) -> Tuple[int, dict]:
    # obs_vec shape: (obs_dim,) -> SB3 expects (n_envs, obs_dim)
    obs = np.asarray(obs_vec, dtype=np.float32).reshape(1, -1)
    action, state = ppo_model.predict(obs, deterministic=True)
    return int(action), {"raw_action": int(action)}
