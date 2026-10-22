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
│   ├── store.js     Estado central (pub/sub)
│   └── scheduler.js Temporizadores unicos, con cleanup
│
├── modules/         Una carpeta por funcionalidad visible, con su CSS
│   ├── clock/       Reloj y fecha
│   ├── weather/     Clima actual
│   └── wallpaper/   Fondo rotativo
│
├── data/            Datos estaticos editables a mano
│   ├── wno.js       Codigos de tiempo: icono y etiqueta
│   └── wallpapers.js Lista de imagenes de fondo
│
├── styles/          Lo transversal: reset, tokens, layout y estados
│   ├── index.css    Hoja de entrada: importa todo en orden
│   ├── reset.css
│   ├── tokens.css   Color, espaciado, escala tipografica, z-index
│   ├── layout.css   La composicion de la pantalla
│   └── states.css   Los avisos, que se importan al final
│
└── utils/           Funciones puras, sin estado
    └── time.js      Formato de la hora con Intl
```

## Lo que viene

Estas carpetas estan planeadas pero todavia no existen. Se anaden en la fase
que les toca:

- `services/` - una capa por API externa, sin DOM: `http.js`, `geo.js`,
  `weatherApi.js`, `photos.js`.
- `ui/` - presentacion sin logica: `icons.js` (SVG inline), `dom.js`,
  `format.js`.
- `core/storage.js` - wrapper de `localStorage` con versionado.
- `core/app.js` - registro y `start`/`stop` de cada modulo.
- `modules/settings/` - panel de ajustes y selector de ciudad.
- `utils/math.js` - funciones numericas puras.

## Reglas

1. **Los modulos no hacen `fetch`.** Piden datos a `services/`. Todavia no es
   asi: el modulo del clima hace sus peticiones directamente hasta que llegue
   `services/` en la Fase 2.
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
9. **Los datos editables a mano van en `data/`.** Se editan sin tocar codigo:
   `wallpapers.js` es un array de una linea por fondo.
