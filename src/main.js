/**
 * main.js - El arranque.
 *
 * Aqui se decide que modulos existen y se les pasa lo que necesitan. Cada
 * modulo se aparta solo con stop(); el arranque no tiene que acordarse de
 * nada mas.
 */

import { init as initStore } from "./core/store.js";

// Indicador de conexión para posible uso futuro
if (typeof navigator !== "undefined" && "onLine" in navigator) {
  window.addEventListener("online", () => document.body.classList.remove("is-offline"));
  window.addEventListener("offline", () => document.body.classList.add("is-offline"));
  if (!navigator.onLine) document.body.classList.add("is-offline");
}
import { loadPreferences, persist } from "./core/preferences.js";
import { createScheduler } from "./core/scheduler.js";
import { deviceTimeZone } from "./utils/time.js";
import { initTheme, VISIBILITY_KEYS } from "./core/theme.js";
import { createClock } from "./modules/clock/clock.js";
import { createCities } from "./modules/cities/cities.js";
import { createWeather } from "./modules/weather/weather.js";
import { createWallpaper } from "./modules/wallpaper/wallpaper.js";
import { createSettings } from "./modules/settings/settings.js";

const $ = (selector) => document.querySelector(selector);

function bootstrap() {
  // Lo que se recuerda de la visita anterior. Si no hay nada, los valores de
  // fabrica y la zona horaria del aparato.
  const { cities: storedCities, settings } = loadPreferences();

  // El preset activo manda sobre la visibilidad guardada: si se guardo una
  // ficha sin viento, al recargar sigue sin viento. Los presets viejos se
  // migran con los ajustes que hay ahora.
  const theme = initTheme(settings);
  for (const key of VISIBILITY_KEYS) {
    if (typeof theme?.state?.[key] === "boolean") settings[key] = theme.state[key];
  }

  const store = initStore({
    timezone: deviceTimeZone(),
    cities: storedCities,
    ...settings,
  });
  persist(store);

  const scheduler = createScheduler({ onError: (error) => console.error(error) });

  const clock = createClock(
    { $clock: $("#time"), $period: $("#period"), $day: $("#day") },
    { store, scheduler },
  );

  const cityChips = createCities(
    { $cities: $("#cities"), $list: $("#cities-list") },
    { store },
  );

  const weather = createWeather(
    {
      $weather: $("#weather"),
      $icon: $("#icon"),
      $location: $("#location"),
      $condition: $("#condition"),
      $feels: $("#feels"),
      $extras: $("#card-extras"),
      $sun: $("#sunrise-sunset"),
      $wind: $("#wind"),
      $huUv: $("#humidity-uv"),
      $trend: $("#trend"),
      $hourly: $("#hourly"),
      $forecast: $("#forecast"),
      $retry: $("#retry"),
    },
    { store, scheduler },
  );

  const wallpaper = createWallpaper(
    { $wallpaper: $("#background"), $tapeA: $("#tapeA"), $tapeB: $("#tapeB") },
    { scheduler, store },
  );

  const settingsPanel = createSettings(
    { $toggle: $("#gear"), $panel: $("#settings") },
    { store, scheduler },
  );

  clock.start();
  cityChips.start();
  settingsPanel.start();
  wallpaper.start().catch((error) => console.error(error));
  weather.start().catch((error) => console.error(error));

  // La pantalla completa solo se concede si lo pide el usuario. Antes habia
  // tambien una llamada suelta en el HTML, fuera de ningun clic, que el
  // navegador rechazaba siempre.
  document.addEventListener(
    "click",
    () => {
      document.documentElement.requestFullscreen?.().catch(() => {});
    },
    { once: true },
  );
}

bootstrap();


// Registro del Service Worker para PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { scope: "./" })
      .catch((err) => console.error("SW registration failed:", err));
  });
}


document.querySelector(".skip-link")?.addEventListener("click", (e) => {
  e.preventDefault();
  const main = document.getElementById("main");
  if (main) {
    main.focus();
    main.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});
