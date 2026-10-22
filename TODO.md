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

- Version actual: `v0.4.0`
- Fase en curso: ninguna
- Siguiente version reservada: `v0.5.0`

## Tablero

### En curso

_Nada en curso. La siguiente fase es la 4._

### Siguiente

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

- [x] **v0.2.0** - Fase 1 - Reloj y fondo migrados
  - El reloj pasa a `src/modules/clock/`: un modulo con `start` y `stop` que lee la
    zona horaria del store y se suscribe a ella, de modo que en la Fase 4 cambien
    solos al cambiar de ciudad. El polling baja de 100 ms a 1 s, la hora sale siempre
    con dos digitos y la fecha con el formato de `Intl` en espanol.
  - El fondo pasa a `src/modules/wallpaper/`: precarga la imagen antes de revelarla,
    asi que no hay flash, no repite el mismo fondo dos veces seguidas y cruza con un
    leve movimiento en vez de un fundido a pelo. La lista de 196 fondos pasa a
    `src/data/wallpapers.js`, con una linea por fondo y editable a mano.
  - El clima se muda a `src/modules/weather/` sin cambiar su logica. Los dos fallos
    conocidos, el reintento calendarizado dos veces y la localizacion que no se
    reintenta, quedan intactos para la Fase 2, que es donde se arreglan.
  - `src/main.js` sustituye al arranque suelto y `assets/js/` desaparece. El fondo
    pasa a tener las clases que le pertenecen, se quita la llamada a pantalla
    completa que estaba fuera de ningun clic y el documento deja de dar un
    destello blanco mientras llega la imagen.
  - Se verifico que no hay regresiones: el calculo de estilos finales de los 16
    estados del HTML da una sola diferencia frente a la `v0.0.0`, el `tabular-nums`
    anadido al reloj. Los 21 recursos responden 200 por HTTP con el MIME correcto.

- [x] **v0.3.0** - Fase 2 - Clima sobre servicios
  - Aparece `src/services/`, la unica capa que habla con el exterior. `http.js`
    resuelve cada intento a mano (respuesta, reloj o cancelacion) en vez de confiar
    en que `fetch` obedezca la `AbortSignal` —una peticion colgada ya no puede colgar
    la app—, reintenta con espera creciente y se cancela desde fuera. `geo.js`
    pregunta primero al navegador y cae a la IP solo si no hay permiso, tarda
    demasiado o el navegador no sabe, y devuelve siempre coordenadas y un nombre.
    `weatherApi.js` normaliza Open-Meteo a cuatro datos y aprovecha que
    `timezone=auto` trae la zona IANA de las coordenadas.
  - Los dos fallos conocidos, arreglados. El doble calendario: cada intento empieza
    por `clearTimers()`, asi que al acabar queda exactamente un temporizador, el del
    refresco si fue bien o el del reintento si no. La localizacion terminal: un fallo
    de ubicacion entra por el mismo camino que el del tiempo, se reintenta solo y la
    app se recupera sin recargar.
  - El modulo del clima pierde su ultima dependencia de red y gana estado de error con
    un boton de reintentar de verdad, alcanzable con teclado y con mando. El refresco
    periodico pasa a ser silencioso —ya no borra la temperatura cada diez minutos
    para escribir puntos suspensivos— y la temperatura se redondea.
  - La zona horaria que devuelve la API se guarda en el store, con lo que el reloj ya
    da la hora de la ciudad localizada y no la del aparato, incluso antes de que
    exista el selector de ciudades.
  - Se verifico: 90 pruebas en Node sobre el doble calendario, la recuperacion de la
    ubicacion, el boton, el contrato de `start()` y los servicios con `fetch` imitado;
    los tres servicios contra las APIs reales; el calculo de estilos finales frente a
    `v0.2.1` da solo los dos elementos nuevos del boton; los recursos nuevos responden
    200 con el MIME correcto; `npm run verify` da 0 fallos. El verificador gana una
    invariante: toda constante del config tiene que leerse en algun sitio, que es como
    aparecieron `app.name` y `messages.loading` sin usar.

- [x] **v0.4.0** - Fase 3 - Layout dashboard responsivo
  - La pantalla deja de estar anclada a una esquina y pasa a una rejilla de tres
    filas: ciudades arriba (vacias hasta la Fase 4), la ficha del clima arriba a la
    derecha y el reloj abajo a la izquierda, que pasa a ser el heroe. En movil la
    ficha ocupa el ancho y el reloj queda debajo; desde 768px la ficha se va a su
    esquina con ancho propio y el reloj crece hasta 160px.
  - La tipografia abandona los tamanos sueltos y pasa a una escala por roles, cada
    una con un `clamp()` cuyo primer valor es el minimo absoluto de ese rol: reloj
    52px en movil y 160px en TV, temperatura 32/64, y ningun texto por debajo de
    13px. El verificador resuelve las variables y falla si alguien perfora el suelo,
    asi que la promesa ya no depende de mirar capturas.
  - El lienzo pasa a `100dvh` con respaldo `100vh` y el margen suma
    `safe-area-inset`, para que el reloj no caiga bajo la barra del gesto. El reset
    pasa a `border-box`, que es lo que necesita una tarjeta con relleno y borde.
  - Los iconos del clima dejan de ser PNG de un tercero y pasan a SVG en linea de
    `src/ui/icons.js` (trazos de Lucide, ISC), coloreados por un token segun la
    familia de la condicion. `wno.js` deja de fabricar `url()` y devuelve etiqueta
    en espanol con variante de dia y noche; la ficha gana la condicion escrita, que
    antes no existia.
  - La ficha gana el pronostico de cinco dias en una tira de cinco celdas iguales,
    con maxima, minima, icono y etiqueta accesible por dia. Llega en la misma
    peticion que el tiempo actual, asi que no cuesta una llamada extra.
  - Un fallo de red deja de vaciar la ficha: con una lectura buena en pantalla, el
    refresco fallido se queda en la consola y el reintento va por detras. El aviso
    naranja y el boton quedan para cuando no hay nada que enseñar.
  - Se anaden dos velos de esquina en vez de un velo plano, el boton de reintentar
    gana objetivo de 44px y foco visible para el mando, y la entrada del contenido y
    el cruce del fondo respetan `prefers-reduced-motion`. Se quita la animacion de
    entrada con `filter: blur()`, que rasterizaba el lienzo entero en el Chromecast.
  - Se verifico: 178 pruebas en Node; los estilos finales de los 22 estados del HTML
    resueltos con la cascada real; la geometria evaluada en 390x640, 390x844,
    844x390, 1440x900 y 1920x1080, sin desbordes y con la columna del pronostico
    nunca por debajo de 45px; el servicio contra la API real devolviendo cinco dias;
    `npm run verify` da 0 fallos.

### Descartado

- [ ] ~~Wallpaper segun la hora del dia~~ — el usuario edita la lista de imagenes a
  mano, asi que no compensa anadir clasificacion por mood.
- [ ] ~~Modo idle con ocultacion de la interfaz~~ — requiere un mando que el
  Chromecast no envia de forma fiable; se descarta para no anadir complejidad.
- [ ] ~~Interfaz bilingue es/en~~ — el producto es solo en espanol; el i18n se
  puede anadir mas adelante sin rehacer la estructura.

## Notas

- El repositorio remoto `braiidev/weatherapp` es privado. Por decision del usuario,
  de momento todo el trabajo vive solo en local, en
  `/data/data/com.termux/files/home/weatherapp`, con su propio historial. Nada se
  publica hasta que se decida lo contrario.
- La `v0.0.0` es la linea base: el commit que importa el codigo que ya estaba en
  produccion. Por eso la Fase 0 se cierra en `v0.1.0` y las siguientes fases siguen
  `Fase N -> v0.(N+1).0`.
- `free.freeipapi.com/api/json` respondia 307 hacia `/api/v1/json`; desde la `v0.2.1`
  se pide la ruta directa para no depender de esa redireccion.
- Cada modulo tiene como mucho un temporizador vivo. El clima lo cumple llamando a
  `clearTimers()` al empezar cada intento: si se anade otra programacion, tiene que
  pasar por ahi o volveran las peticiones que se multiplican.
- Las peticiones no confian en que `fetch` obedezca la `AbortSignal`: `http.js`
  resuelve cada intento contra el reloj, contra la cancelacion y contra la respuesta.
  Asi una promesa que no se asentara nunca no deja la app esperando.
- `npm run verify` comprueba que toda constante del config se lea en algun sitio. Lo
  que este reservado para una fase futura vive en la lista `RESERVED` del verificador
  y hay que sacarlo de ahi en cuanto se empiece a usar.
- El geocoding de Open-Meteo devuelve el timezone IANA, asi que el reloj por ciudad no
  necesita ningun proveedor adicional.
- `BigDataCloud /data/timezone` responde 403 sin clave; el timezone sale de la propia
  respuesta de Open-Meteo con `timezone=auto`.
- La API de fotos de Pixabay se usa solo por CDN, sin credenciales.
- `src/styles/states.css` se importa el ultimo a proposito: la clase `warning` se
  aplica sobre `#location` y `#weather`, que fijan `font-size` en `.card__city` y
  `.card__temp` con la misma especificidad. Si el aviso se importara antes, el mensaje
  de error saldria al tamano de la temperatura (hasta 64px) y desbordaria la tarjeta.
- Los iconos del clima son SVG en linea de `src/ui/icons.js`, con trazos de Lucide
  (ISC). No se descarga ninguno: `src/data/wno.js` solo dice el nombre del dibujo y el
  color sale de un token por familia de condicion.
- La fecha del pronostico se formatea en UTC, no en la zona de la ciudad: la API ya
  la devuelve como fecha local del sitio y pasarla por una zona la mueve de dia (en
  Auckland, UTC+13, un jueves salia viernes). Lo detecto una prueba, no una captura.
- La rejilla del dashboard reserva la fila `cities` desde la Fase 3. En la Fase 4
  los chips solo tienen que entrar en su area, sin tocar la composicion.
- La escala tipografica va por roles y el primer valor de cada `clamp()` es el minimo
  absoluto de ese rol. `npm run verify` resuelve las variables y falla si algun
  `font-size` baja de 13px, asi que la promesa no depende de mirar capturas.
- `assets/` ya solo tiene el icono de la pagina. Todo el codigo esta migrado a
  `src/`, y `assets/js/` se borro en el paso 6 de la Fase 1.
- El cruce del fondo se mide con el calculo de estilos finales, no a ojo: se
  resuelven las reglas del CSS como haria el navegador para cada elemento del
  HTML y se comparan los resultados. Asi se detecto que el aviso de error
  passaria de 1rem a 0.1em si `states.css` se importara antes.

## Seguimiento

El progreso de este proyecto se registra en el historial de commits de Git, no en
este archivo. Cada commit lleva un prefijo de version `vx.y.z` y lista en el cuerpo
los archivos que modifica, de modo que `git log` funciona como bitacora del proyecto
y `git tag` marca el cierre de cada fase. La version vigente esta en el archivo
`VERSION` de la raiz del repositorio.
