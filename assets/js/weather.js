/**
 * Puente temporal.
 *
 * El modulo del clima ya vive en src/modules/weather/weather.js. Este
 * fichero solo sirve para que el arranque antiguo siga funcionando hasta
 * que entre el nuevo. Se borra en el paso 6, junto con el resto de assets/js.
 */

import { createWeather } from "../../src/modules/weather/weather.js";
import { createScheduler } from "../../src/core/scheduler.js";

export default class Weather {
  constructor($weather, $icon, $location) {
    this.module = createWeather(
      { $weather, $icon, $location },
      { scheduler: createScheduler() },
    );
  }

  init() {
    return this.module.start();
  }
}
