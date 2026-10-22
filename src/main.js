/**
 * main.js - El arranque.
 *
 * Aqui se decide que modulos existen y se les pasa lo que necesitan. Cada
 * modulo se aparta solo con stop(); el arranque no tiene que acordarse de
 * nada mas.
 */

import { init as initStore } from "./core/store.js";
import { createScheduler } from "./core/scheduler.js";
import { deviceTimeZone } from "./utils/time.js";
import { createClock } from "./modules/clock/clock.js";
import { createWeather } from "./modules/weather/weather.js";
import { createWallpaper } from "./modules/wallpaper/wallpaper.js";

const $ = (selector) => document.querySelector(selector);

function bootstrap() {
  const store = initStore({ timezone: deviceTimeZone() });
  const scheduler = createScheduler({ onError: (error) => console.error(error) });

  const clock = createClock(
    { $clock: $("#time"), $day: $("#day") },
    { store, scheduler },
  );

  const weather = createWeather(
    {
      $weather: $("#weather"),
      $icon: $("#icon"),
      $location: $("#location"),
      $retry: $("#retry"),
    },
    { store, scheduler },
  );

  const wallpaper = createWallpaper(
    { $tapeA: $("#tapeA"), $tapeB: $("#tapeB") },
    { scheduler },
  );

  clock.start();
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
