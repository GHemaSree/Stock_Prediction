import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export type LatestPredictionItem = {
  date: string;
  ticker: string;
  probUp: number | null;
  action: number | null;
  signal: string | null;
  price?: number | null;
  changePct?: number | null;
  changeFmt?: string | null;
  volume?: number | null;
  volNorm?: number | null;
};

export type LatestPredictionsResponse = {
  date: string | null;
  items: LatestPredictionItem[];
};

export async function fetchLatestPredictions(): Promise<LatestPredictionsResponse> {
  const res = await axios.get(`${BASE_URL}/api/predictions/latest`);
  return res.data as LatestPredictionsResponse;
}
