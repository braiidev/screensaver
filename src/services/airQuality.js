import { CONFIG } from "../config.js";
import { fetchJson } from "./http.js";

export async function fetchAirQuality({ latitude, longitude, signal } = {}) {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw new Error("air-quality: missing coords");
  }

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "us_aqi",
    timezone: "auto",
  });

  const url = `${CONFIG.endpoints.airQuality}?${params.toString()}`;
  return fetchJson(url, { signal });
}
