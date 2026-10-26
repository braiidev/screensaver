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

  geocoding: {
    /** Resultados que se piden en cada busqueda. Con ocho cabe la lista en el
     * panel sin tener que desplazarla demasiado. */
    count: 8,
    /** Letras minimas antes de buscar. Con una sola, el servicio devuelve
     * medio mundo y ninguna es la que se busca. */
    minQuery: 2,
    /** Milisegundos de espera desde la ultima tecla. Buscar en cada letra
     * llenaria la red de peticiones que ya no sirven. */
    debounce: 350,
  },

  ui: {
    /** Milisegundos sin actividad tras los que el engranaje se desvanece. */
    idle: 5000,
    /** Cada cuanto, como mucho, un movimiento rearma ese temporizador. Sin
     * esto, un `pointermove` supondria cancelar y crear un reloj 60 veces por
     * segundo. */
    activityThrottle: 1000,
  },

  cities: {
    /** Ciudades que caben en la fila de chips. */
    max: 8,
    /** Decimales con los que se redondean las coordenadas para el id. Dos
     * decimales son ~1 km, de sobra para distinguir una ciudad de otra. */
    idDecimals: 2,
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
    currentFields: [
      "temperature_2m",
      "apparent_temperature",
      "weather_code",
      "is_day",
      "relative_humidity_2m",
      "wind_speed_10m",
    ],
    /** Campos del bloque `daily` que se piden a la API. */
    dailyFields: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "sunrise",
      "sunset",
    ],
    /** Campos del bloque `hourly` que se piden a la API. */
    hourlyFields: [
      "temperature_2m",
      "weather_code",
      "precipitation_probability",
      "uv_index",
    ],
    /** Horas pasadas que se piden: una, para calcular la tendencia. */
    hourlyPastHours: 1,
    /** Horas futuras que se piden y se muestran en la tira. Se puede subir a
     * 8 o 12: la rejilla envuelve sola y no necesita scroll. */
    hourlyForecastHours: 5,
    /** Probabilidad de lluvia, en porcentaje, a partir de la cual se muestra. */
    rainChanceThreshold: 20,
    /** Dias de pronostico que se piden y se muestran. */
    forecastDays: 5,
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
    /** Minutos entre cambios de imagen de fondo. Es el valor de fabrica: el
     * que vale es `wallpaperInterval`, que se puede cambiar en los ajustes. */
    interval: 1,
    /** Intervalos que se pueden elegir en los ajustes, en minutos. */
    intervals: [1, 5, 10, 30],
    /** Sufijo de la version en alta resolucion en el CDN de fotos. */
    highResSuffix: "_1280",
    /** Patron que convierte una URL de baja resolucion en una de alta. */
    highResPattern: /_\d+\.(jpg|png|jpeg|webp)$/,
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
    airQuality: "https://air-quality-api.open-meteo.com/v1/air-quality",
  },

  /** Configurables desde ajustes (Grupo 1). */
  extras: {
    /** Mostrar próximas horas */
    nextHours: true,
    /** Mostrar amanecer/atardecer */
    sun: true,
    /** Mostrar viento */
    wind: true,
    /** Mostrar humedad / índice UV */
    humidityUv: true,
    /** Mostrar tendencia vs hace 1h */
    trend: true,
    /** Mostrar calidad del aire */
    airQuality: true,
  },

  /** Grupo 1 extras - usados por el módulo de extras */
  extrasKeys: ['nextHours','sun','wind','humidityUv','trend','airQuality'],

  messages: {
    locationError: "No se pudo cargar la localización",
    weatherError: "No se pudo cargar el clima",
    retry: "Reintentar",
    /** Etiqueta del primer dia de la tira del pronostico. */
    today: "Hoy",
    /** Como se lee cada dia del pronostico en un lector de pantalla. */
    forecastMax: "máxima",
    forecastMin: "mínima",
    /** Delante de la temperatura que se siente. */
    feelsLike: "Sensación de",
    /** Encabezado de la lista de ciudades del panel. */
    popular: "Ciudades populares",
    /** Mientras se espera la respuesta del geocoding. */
    searching: "Buscando…",
    /** La busqueda no encontro nada. */
    noResults: "Ninguna ciudad con ese nombre",
    /** La busqueda no pudo hacerse. */
    searchError: "No se pudo buscar. Inténtalo otra vez.",
    /** Se ha llegado al limite de ciudades guardadas. */
    citiesFull: "Ya tienes todas las ciudades que caben. Quita alguna para añadir otra.",
    /** Texto del boton de quitar una ciudad. */
    remove: "Quitar",
    /** Aviso de una ciudad que ya esta guardada. */
    alreadySaved: "ya está",
    /** Extras de la ficha. */
    sunrise: "Amanecer",
    sunset: "Atardecer",
    wind: "Viento",
    humidity: "Humedad",
    uv: "UV",
    nextHours: "Próximas horas",
    rainChance: "lluvia",
    trendUp: "Sube",
    trendDown: "Baja",
    trendSame: "Sin cambios",
    trendAgo: "respecto a hace 1 hora",
    /** Calidad del aire */
    airQuality: "Calidad del aire",
    aqGood: "Buena",
    aqModerate: "Aceptable",
    aqUnhealthySensitive: "Dañina para grupos sensibles",
    aqUnhealthy: "Dañina",
    aqVeryUnhealthy: "Muy dañina",
    aqHazardous: "Peligrosa",
  },

  storage: {
    /** Prefijo de todas las claves de localStorage. */
    prefix: "weatherapp:v1:",
    keys: {
      /** La lista de ciudades, con la activa dentro de los ajustes. */
      cities: "cities",
      /** Un solo bloque con los ajustes y la ciudad activa. */
      settings: "settings",
      /** Los presets de apariencia y visibilidad. */
      themes: "themes",
    },
  },
};

export default CONFIG;
