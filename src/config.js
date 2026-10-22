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
    /** Idioma que se pide a los servicios que lo admiten. */
    language: "es",
  },

  clock: {
    /** Milisegundos entre actualizaciones del reloj. */
    tickInterval: 1000,
  },

  time: {
    /** Milisegundos en un minuto. */
    minute: 60000,
  },

  http: {
    /** Milisegundos maximos de espera de una peticion. */
    timeout: 10000,
    /** Milisegundos de espera antes de reintentar. Se duplica en cada intento. */
    backoff: 500,
  },

  weather: {
    /** Minutos entre refrescos del clima. */
    refreshInterval: 10,
    /** Milisegundos antes de reintentar tras un fallo. */
    retryDelay: 60000,
    /** Reintentos por peticion antes de darse por vencido. */
    retries: 2,
    /** Campos del bloque `current` que se piden a la API. */
    currentFields: ["temperature_2m", "weather_code", "is_day"],
    /** Dias de pronostico que se piden. */
    forecastDays: 1,
    /** Zona horaria: `auto` hace que la API use la de las coordenadas. */
    timezone: "auto",
  },

  geo: {
    /** Milisegundos maximos de espera de la geolocalizacion del navegador. */
    timeout: 8000,
    /** Antiguedad maxima en milisegundos de una posicion ya conocida. */
    maximumAge: 600000,
    /** Localizacion aproximada por IP, usada como respaldo del navegador. */
    fallbackUrl: "https://free.freeipapi.com/api/v1/json",
  },

  wallpaper: {
    /** Minutos entre cambios de imagen de fondo. */
    interval: 1,
    /** Sufijo de la version en alta resolucion en el CDN de fotos. */
    highResSuffix: "_1280",
    /** Patron que convierte una URL de baja resolucion en una de alta. */
    highResPattern: /_\d+\.(jpg|png|jpeg|webp)$/,
  },

  icons: {
    /** Base de las imagenes de los iconos meteorologicos. */
    baseUrl: "https://rodrigokamada.github.io/openweathermap/images/",
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
    reverseGeocode: "https://api.bigdatacloud.net/data/reverse-geocode-client",
  },

  messages: {
    loading: "Cargando",
    locationError: "No se pudo cargar la localizacion",
    weatherError: "No se pudo cargar el clima",
    retry: "Reintentar",
    // Las dos de abajo solo las usa el modulo antiguo. Desaparecen junto con
    // el en el commit siguiente.
    geoError: "No se pudo obtener la ubicacion",
    weatherUnavailable: "No se pudo obtener el clima",
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
