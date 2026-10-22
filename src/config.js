/**
 * config.js - Todas las constantes del proyecto en un solo sitio.
 *
 * Regla: ningun numero magico en el codigo. Si un valor se usa en mas de un
 * sitio, o si es un parametro que habra que tocar, vive aqui.
 *
 * Los valores de este fichero replican exactamente los que tenian las
 * constantes en su sitio. Cualquier cambio de valor aqui es un cambio de
 * comportamiento y debe ir en su propia version.
 */

export const CONFIG = {
  app: {
    name: "WeatherApp",
    locale: "es-ES",
  },

  clock: {
    /** Milisegundos entre actualizaciones del reloj. */
    tickInterval: 100,
    /** Rellena las horas con cero para que el ancho del texto no cambie. */
    padHours: true,
  },

  weather: {
    /** Minutos entre refrescos del clima. */
    refreshInterval: 10,
    /** Milisegundos maximos de espera de una peticion. */
    timeout: 10000,
    /** Milisegundos antes de reintentar tras un fallo. */
    retryDelay: 60000,
    /** Campos del bloque `current` que se piden a la API. */
    currentFields: ["temperature_2m", "weather_code", "is_day"],
    /** Dias de pronostico que se piden. */
    forecastDays: 1,
    /** Zona horaria: `auto` hace que la API use la de las coordenadas. */
    timezone: "auto",
  },

  geo: {
    /** Milisegundos maximos de espera de la localizacion. */
    timeout: 8000,
    /** Precisa maxima en metros de la geolocalizacion del navegador. */
    maximumAge: 600000,
    /** Localizacion aproximada por IP, usada como respaldo. */
    fallbackUrl: "https://free.freeipapi.com/api/json",
  },

  wallpaper: {
    /** Minutos entre cambios de imagen de fondo. */
    interval: 1,
    /** Primer indice valido de la lista de imagenes. */
    minIndex: 0,
    /** Ultimo indice valido de la lista de imagenes. */
    maxIndex: 195,
    /** Milisegundos que dura el fundido entre imagenes. */
    transition: 1000,
    /** Sufijo de la version en alta resolucion en el CDN de fotos. */
    highResSuffix: "_1280",
    /** Patron que convierte una URL de baja resolucion en una de alta. */
    highResPattern: /_\d+\.(jpg|png|jpeg|webp)$/,
    /** Milisegundos de espera antes de cargar la imagen que entra. */
    preloadDelay: 1000,
  },

  icons: {
    /** Base de las imagenes de los iconos meteorologicos. */
    baseUrl: "https://rodrigokamada.github.io/openweathermap/images/",
    /** Plantilla del nombre de archivo: codigo + d/n + sufijo. */
    template: "{code}{period}_t.png",
  },

  loading: {
    /** Numero maximo de puntos de la animacion de carga. */
    dots: 3,
    /** Milisegundos entre puntos. */
    interval: 250,
    /** Separacion entre letras durante la carga. */
    letterSpacing: "1rem",
  },

  endpoints: {
    forecast: "https://api.open-meteo.com/v1/forecast",
    geocoding: "https://geocoding-api.open-meteo.com/v1/search",
  },

  messages: {
    appUnloaded: "App is unload",
    locationError: "No se pudo cargar localización",
    weatherError: "Not available, trying again in 10 minutes",
    weatherUnavailable: "Could not obtain weather information",
  },

  storage: {
    /** Prefijo de todas las claves de localStorage. */
    prefix: "weatherapp:v1:",
    keys: {
      cities: "cities",
      units: "units",
      settings: "settings",
      activeCity: "activeCity",
    },
  },
};

export default CONFIG;
