/**
 * main.js - El arranque.
 *
 * Aqui se decide que modulos existen y se les pasa lo que necesitan. Cada
 * modulo se aparta solo con stop(); el arranque no tiene que acordarse de
 * nada mas.
 */

import { init as initStore } from "./core/store.js";
import { loadPreferences, persist } from "./core/preferences.js";
import { createScheduler } from "./core/scheduler.js";
import { deviceTimeZone } from "./utils/time.js";
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
