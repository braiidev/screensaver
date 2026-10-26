import { CONFIG } from "../../config.js";
import { fetchAirQuality } from "../../services/airQuality.js";

export function createAirQuality({ $root, $value, $label }, { store, scheduler }) {
  let timer = null;
  let controller = null;

  function getCategory(aqi) {
    if (typeof aqi !== "number") return null;
    if (aqi <= 50) return { key: "aqGood", cls: "aq--good" };
    if (aqi <= 100) return { key: "aqModerate", cls: "aq--moderate" };
    if (aqi <= 150) return { key: "aqUnhealthySensitive", cls: "aq--usg" };
    if (aqi <= 200) return { key: "aqUnhealthy", cls: "aq--unhealthy" };
    if (aqi <= 300) return { key: "aqVeryUnhealthy", cls: "aq--very" };
    return { key: "aqHazardous", cls: "aq--hazardous" };
  }

  async function load() {
    if (!$root) return;
    if (store.get("airQuality") === false) {
      $root.hidden = true;
      return;
    }
    $root.hidden = false;
    const city = store.get("activeCity");
    if (!city || typeof city.lat !== "number" || typeof city.lon !== "number") {
      $value.textContent = "--";
      $label.textContent = "";
      $root.className = "extras__item extras__item--air";
      return;
    }

    controller?.abort();
    controller = new AbortController();

    try {
      const data = await fetchAirQuality({ latitude: city.lat, longitude: city.lon, signal: controller.signal });
      const aqi = data?.current?.us_aqi;
      $value.textContent = typeof aqi === "number" ? String(Math.round(aqi)) : "--";
      const cat = getCategory(aqi);
      if (cat) {
        $label.textContent = CONFIG.messages[cat.key] ?? "";
        $root.className = `extras__item extras__item--air ${cat.cls}`;
      } else {
        $label.textContent = "";
        $root.className = "extras__item extras__item--air";
      }
    } catch {
      $value.textContent = "--";
      $label.textContent = "";
      $root.className = "extras__item extras__item--air";
    }
  }

  const offCity = store.subscribe("activeCity", load);
  const offSetting = store.subscribe("airQuality", load);

  return {
    start() {
      load();
      timer = scheduler.every(CONFIG.weather.refreshInterval, load);
    },
    stop() {
      timer?.();
      timer = null;
      controller?.abort();
      controller = null;
      offCity();
      offSetting();
    },
  };
}
