# src - Mapa del proyecto

Estructura por capas. Cada carpeta tiene una responsabilidad y una regla de
dependencia. Un modulo nunca salta a otra capa: si necesita algo de fuera, lo pide
a `services/`.

```
src/
├── main.js          Bootstrap: compone y arranca todo
├── config.js        Todas las constantes del proyecto en un solo sitio
│
├── core/            Infraestructura transversal
│   ├── app.js       Registro y start/stop de cada modulo
│   ├── store.js     Estado central (pub/sub) + persistencia
│   ├── scheduler.js Temporizadores unicos, con cleanup
│   └── storage.js   Wrapper de localStorage con versionado
│
├── modules/         Una carpeta por funcionalidad visible, con su CSS
│   ├── clock/       Reloj y fecha
│   ├── weather/     Clima actual, pronostico y estados de carga/error
│   ├── wallpaper/   Fondo rotativo
│   └── settings/    Panel de ajustes y selector de ciudad
│
├── services/        Una capa por API externa. Sin DOM: devuelven datos puros
│   ├── http.js      fetch con timeout, AbortController, retry y cache
│   ├── geo.js       IP, GPS del navegador y busqueda de ciudades
│   ├── weatherApi.js Datos meteorologicos
│   └── photos.js    Catalogo de imagenes de fondo
│
├── data/            Datos estaticos editables a mano
│   ├── wmo.js       Codigos de tiempo: icono y etiqueta
│   └── wallpapers.js Lista de imagenes de fondo
│
├── ui/              Presentacion sin logica de negocio
│   ├── icons.js     SVG inline
│   ├── dom.js       Helpers del DOM
│   └── format.js    Formato de numeros, fechas y unidades
│
├── styles/          Lo transversal: reset, tokens, layout y estados
│   ├── index.css    Hoja de entrada: importa las cuatro en orden
│   ├── reset.css
│   ├── tokens.css   Color, espaciado, escala tipografica, z-index
│   ├── layout.css   La composicion de la pantalla
│   └── states.css   Los avisos, que se importan al final
│
└── utils/           Funciones puras, sin estado
    ├── time.js
    └── math.js
```

## Reglas

1. **Los modulos no hacen `fetch`.** Piden datos a `services/`.
2. **`services/` no toca el DOM.** Devuelve datos puros.
3. **`core/store.js` es el unico que guarda estado.** Los modulos se suscriben.
4. **Cada modulo expone `start()` y `stop()`.** Sin `stop()`, los temporizadores
   sobreviven al desmontaje.
5. **El CSS de un modulo va en su carpeta.** En `styles/` solo lo transversal.
6. **Las constantes van en `config.js`.** Ningun numero magico en el codigo.
7. **Un modulo no importa de otro modulo.** Si hace falta, se comunican por el store.
8. **El orden de los `@import` de `styles/index.css` no es libre.** `states.css`
   va al final a proposito: sus avisos compiten en `font-size` con el contenido
   normal y, a igual especificidad, gana la regla que aparece despues.
