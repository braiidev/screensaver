/**
 * weatherApi.js - El tiempo, tal como lo devuelve Open-Meteo.
 *
 * Traduce la respuesta cruda de la API a los datos que la app necesita, para
 * que el modulo del clima no tenga que saber como se llaman los campos de
 * Open-Meteo ni como viene `is_day`.
 *
 * Los bloques `current`, `daily` y `hourly` viajan en la misma peticion: el
 * pronostico, las proximas horas y los extras no cuestan llamadas extra. La
 * hora pasada se pide con `past_hours=1` para poder calcular la tendencia.
 */

import { CONFIG } from "../config.js";
import { getJSON } from "./http.js";

/**
 * @param {Object} options
 * @param {number} options.latitude
 * @param {number} options.longitude
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{
 *   current: {
 *     temperature: number,
 *     apparentTemperature: number,
 *     code: number,
 *     isDay: boolean,
 *     humidity: number | null,
 *     windSpeed: number | null,
 *   },
 *   daily: Array<{
 *     date: string,
 *     code: number,
 *     max: number,
 *     min: number,
 *     sunrise: string | null,
 *     sunset: string | null,
 *   }>,
 *   hourly: Array<{
 *     time: string,
 *     temperature: number | null,
 *     code: number | null,
 *     precipitationProbability: number | null,
 *     uvIndex: number | null,
 *   }>,
 *   previousTemperature: number | null,
 *   uvIndex: number | null,
 *   timezone: string,
 * }>}
 */
export async function fetchWeather({ latitude, longitude, signal }) {
  const url =
    `${CONFIG.endpoints.forecast}?latitude=${latitude}&longitude=${longitude}` +
    `&current=${CONFIG.weather.currentFields.join(",")}` +
    `&daily=${CONFIG.weather.dailyFields.join(",")}` +
    `&hourly=${CONFIG.weather.hourlyFields.join(",")}` +
    `&past_hours=${CONFIG.weather.hourlyPastHours}` +
    `&forecast_hours=${CONFIG.weather.hourlyForecastHours}` +
    `&timezone=${CONFIG.weather.timezone}` +
    `&forecast_days=${CONFIG.weather.forecastDays}`;

  const data = await getJSON(url, { signal, retries: CONFIG.weather.retries });
  const {
    temperature_2m,
    apparent_temperature,
    weather_code,
    is_day,
    relative_humidity_2m,
    wind_speed_10m,
  } = data.current;

  const hourly = toHourly(
    data.hourly,
    data.current?.time,
    CONFIG.weather.hourlyForecastHours,
  );

  return {
    current: {
      temperature: temperature_2m,
      apparentTemperature: apparent_temperature,
      code: weather_code,
      isDay: is_day === 1,
      humidity: relative_humidity_2m ?? null,
      windSpeed: wind_speed_10m ?? null,
    },
    daily: toDaily(data.daily),
    hourly: hourly.list,
    previousTemperature: hourly.previousTemperature,
    uvIndex: hourly.uvIndex,
    // Con `timezone=auto` la API devuelve la zona IANA de las coordenadas.
    timezone: data.timezone,
  };
}

/**
 * El pronostico, de una lista de columnas a una lista de dias.
 *
 * Open-Meteo devuelve el bloque `daily` como columnas paralelas; la app quiere
 * una fila por dia. Si el bloque falta o viene incompleto se devuelve lo que
 * haya, y si no hay nada, una lista vacia: el pronostico es lo unico que puede
 * faltar sin que la ficha se quede sin temperatura.
 *
 * @param {{
 *   time?: string[],
 *   weather_code?: number[],
 *   temperature_2m_max?: number[],
 *   temperature_2m_min?: number[],
 *   sunrise?: string[],
 *   sunset?: string[],
 * }} [daily]
 * @returns {Array<{
 *   date: string,
 *   code: number,
 *   max: number,
 *   min: number,
 *   sunrise: string | null,
 *   sunset: string | null,
 * }>}
 */
function toDaily(daily) {
  const dates = daily?.time ?? [];

  return dates.map((date, i) => ({
    date,
    code: daily.weather_code?.[i],
    max: daily.temperature_2m_max?.[i],
    min: daily.temperature_2m_min?.[i],
    sunrise: daily.sunrise?.[i] ?? null,
    sunset: daily.sunset?.[i] ?? null,
  }));
}

/**
 * Las proximas horas, recortadas a partir de la hora actual.
 *
 * Con `past_hours=1` la API manda primero la hora pasada y despues la actual,
 * asi que la lista que se devuelve empieza en la hora en curso. Se busca esa
 * hora por su prefijo `YYYY-MM-DDTHH` y no por posicion: si la respuesta se
 * retrasa o el intervalo cambia, el indice fijo mentiria.
 *
 * @param {{
 *   time?: string[],
 *   temperature_2m?: number[],
 *   weather_code?: number[],
 *   precipitation_probability?: number[],
 *   uv_index?: number[],
 * }} [hourly]
 * @param {string} [currentTime] hora local de la ciudad, "2026-10-22T22:30"
 * @param {number} count horas futuras que se devuelven
 */
function toHourly(hourly, currentTime, count) {
  const times = hourly?.time ?? [];
  const prefix = typeof currentTime === "string" ? currentTime.slice(0, 13) : "";

  let start = prefix
    ? times.findIndex((time) => time.slice(0, 13) === prefix)
    : -1;
  // Sin la hora actual, la primera entrada es la pasada y la segunda la actual.
  if (start < 0) start = times.length > 1 ? 1 : 0;

  const list = times.slice(start, start + count).map((time, i) => {
    const index = start + i;
    return {
      time,
      temperature: hourly.temperature_2m?.[index] ?? null,
      code: hourly.weather_code?.[index] ?? null,
      precipitationProbability:
        hourly.precipitation_probability?.[index] ?? null,
      uvIndex: hourly.uv_index?.[index] ?? null,
    };
  });

  const previous = start > 0 ? hourly?.temperature_2m?.[start - 1] : null;

  return {
    list,
    previousTemperature: Number.isFinite(previous) ? previous : null,
    uvIndex: hourly?.uv_index?.[start] ?? null,
  };
}
