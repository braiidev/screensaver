# TODO - WeatherApp

## Descripcion

WeatherApp es un screensaver web que muestra el reloj y el clima de una ciudad
elegida sobre un fondo de pantalla rotativo, pensado para dejar un Chromecast en
pared. Se construye sobre modulos ES nativos sin build ni dependencias, y se
despliega como sitio estatico en Netlify. Consta de un reloj con zona horaria por
ciudad, una ficha de clima con pronostico de 5 dias, un selector multi-ciudad, un
panel de ajustes persistentes y un fondo rotativo precargado. Esta terminado
cuando el mismo codigo se ve identico en movil de 390px, escritorio de 1440px y TV
de 1920x1080, ningun texto baja de 13px en ningun breakpoint, y todas las funciones
se manejan con el mando del Chromecast sin raton.

## Estado

- Version actual: `v0.1.5`
- Fase en curso: ninguna
- Siguiente version reservada: `v0.2.0`

## Tablero

### En curso

_Nada en curso. La siguiente fase es la 1._

### Siguiente

- [ ] **v0.2.0** - Fase 1 - Reloj y fondo migrados
  - Portar `clock` y `wallpaper` al patron `modulo + store + servicio`. El reloj pasa
    de 100 ms a 1 s de polling, rellena las horas con cero y usa
    `Intl.DateTimeFormat` con la zona horaria de la ciudad activa en lugar de los
    arrays `DAYS`/`MONTH` en espanol. El fondo precarga la siguiente imagen para
    eliminar el flash y su lista pasa a `src/data/wallpapers.js` con el mismo formato
    de array para que siga siendo editable a mano.

- [ ] **v0.3.0** - Fase 2 - Clima sobre servicios
  - Reubicar la llamada a Open-Meteo en `services/weatherApi.js` y la de
    localizacion en `services/geo.js`, con `http.js` aplicando tiempo limite,
    `AbortController` y reintentos. Corregir el doble calendario de reintentos que
    hoy encadena varios temporizadores si la peticion falla, y hacer que un fallo de
    geolocalizacion se recupere solo en lugar de dejar la app sin ciudad para
    siempre. Anadir esqueleto de carga y estado de error con boton de reintentar.

- [ ] **v0.4.0** - Fase 3 - Layout dashboard responsivo
  - Sustituir el layout anclado en la esquina por la direccion Dashboard: reloj como
    heroe abajo a la izquierda, ficha de clima arriba a la derecha, forecast en tira.
    Escala tipografica por rol con minimos absolutos, iconos SVG inline coloreables
    por condicion, scrim vertical escalable y `100dvh` con `safe-area-inset`. Ningun
    texto por debajo de 13px en ningun breakpoint.

- [ ] **v0.5.0** - Fase 4 - Multi-ciudad y panel de ajustes
  - Anadir selector de ciudad con chips navegables por flechas y persistencia en
    `localStorage`, usando el geocoding de Open-Meteo para buscar y el reverse
    geocoding para las coordenadas del navegador. El reloj muestra la hora de la
    ciudad activa. Panel de ajustes con unidades C/F, fondo on-off, intervalo,
    pronostico y sensacion termica, navegable con el mando y con raton.

- [ ] **v0.6.0** - Fase 5 - Infraestructura y despliegue
  - Anadir `netlify.toml` con directorio de publicacion y bloque de cabeceras,
    `_headers` con CSP, `X-Frame-Options`, `Referrer-Policy` y cache larga para
    `assets/`. Completar `package.json` con scripts de lint y format. Corregir el
    README: el enlace a GitHub Pages esta roto y la lista de herramientas atribuye
    IconExpress cuando los iconos vienen de otro sitio. Anadir `.gitignore`,
    `.editorconfig` y `robots.txt`.

- [ ] **v0.7.0** - Fase 6 - Despliegue y verificacion
  - Desplegar en Netlify y verificar en el sitio real que el layout coincide en los
    tres tamaños objetivo, que la consola esta limpia y que el cacheo y la CSP no
    rompen la carga de imagenes ni los iconos.

### Terminado

- [x] **v0.1.0** - Fase 0 - Andamiaje
  - Esqueleto `src/` con `core/`, `modules/`, `services/`, `data/`, `ui/`, `styles/` y
    `utils/`, mas `src/config.js` con las constantes que estaban magicas y los tokens
    CSS de color, espaciado y escala tipografica. El codigo existente pasa a leer de
    `config.js` sin cambiar ningun valor, y el CSS se traslada a `src/styles/`.
  - Se verifico que no hay regresiones: las 63 reglas del CSS resueltas son identicas
    a las de la `v0.0.0` con la misma cascada, los valores del config coinciden
    caracter a caracter con los originales, el grafo de imports resuelve y
    `npm run verify` da 0 fallos.
  - De paso: servidor estatico propio (`npm run dev`) y verificador de integridad del
    repo (`npm run verify`) para que cada fase siguiente se pueda medir igual.

### Descartado

- [ ] ~~Wallpaper segun la hora del dia~~ — el usuario edita la lista de imagenes a
  mano, asi que no compensa anadir clasificacion por mood.
- [ ] ~~Modo idle con ocultacion de la interfaz~~ — requiere un mando que el
  Chromecast no envia de forma fiable; se descarta para no anadir complejidad.
- [ ] ~~Interfaz bilingue es/en~~ — el producto es solo en espanol; el i18n se
  puede anadir mas adelante sin rehacer la estructura.

## Notas

- El repositorio remoto `braiidev/weatherapp` es privado. Mientras no se conecte,
  el trabajo vive en `/data/data/com.termux/files/home/weatherapp` con su propio
  historial.
- La `v0.0.0` es la linea base: el commit que importa el codigo que ya estaba en
  produccion. Por eso la Fase 0 se cierra en `v0.1.0` y las siguientes fases siguen
  `Fase N -> v0.(N+1).0`.
- `free.freeipapi.com/api/json` responde 307 hacia `/api/v1/json`; `fetch` sigue la
  redireccion y la respuesta llega bien, pero en la Fase 2 se fija la ruta directa
  para no depender de la redireccion.
- El geocoding de Open-Meteo devuelve el timezone IANA, asi que el reloj por ciudad no
  necesita ningun proveedor adicional.
- `BigDataCloud /data/timezone` responde 403 sin clave; el timezone sale de la propia
  respuesta de Open-Meteo con `timezone=auto`.
- La API de fotos de Pixabay se usa solo por CDN, sin credenciales.
- `src/styles/states.css` se importa el ultimo a proposito: la clase `warning` se
  aplica sobre `#location`, que es `.item2-3`, y los dos fijan `font-size` con la
  misma especificidad. Si el aviso se importara antes, el mensaje de error pasaria
  de 1rem a 0.1em y seria ilegible en movil.
- `assets/` es codigo heredado del proyecto original, todavia sin migrar. En la
  Fase 1 y la Fase 2 sus ficheros se mudan a `src/modules/` y a `src/services/`.

## Seguimiento

El progreso de este proyecto se registra en el historial de commits de Git, no en
este archivo. Cada commit lleva un prefijo de version `Vx.y.Z` y lista en el cuerpo
los archivos que modifica, de modo que `git log` funciona como bitacora del proyecto
y `git tag` marca el cierre de cada fase. La version vigente esta en el archivo
`VERSION` de la raiz del repositorio.
