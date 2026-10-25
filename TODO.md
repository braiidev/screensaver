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

- Ultima version cerrada: `v0.8.9`
- Version en curso: ninguna
- Siguiente version reservada: `v0.9.0`

## Tablero

### NEXT

- [ ] **v0.9.0-step3** - Pulir guardado/restaurado de temas
  - Asegurar guardado/restaurado correcto con nuevos predefinidos
  - Compatibilidad con temas guardados antiguos

- [ ] **v0.9.0-step4** - Añadir selector de fecha (Desactivado/Compacta/Completa)
  - Unificar fecha junto al reloj
  - Usar Intl.DateTimeFormat en español
  - Persistir ajuste

- [ ] **v0.9.0-step5** - Añadir Calidad del Aire (AQI)
  - Integrar Open-Meteo Air Quality API
  - Mostrar badge con valor/categoría/semáforo
  - Configurable desde ajustes

### DOING

- [ ] **v0.9.0-step2** - Reestructurar panel de Temas con predefinidos
  - Añadir selector "Tema" con predefinidos
  - Añadir <details> "Personalizar" para ejes A/B/align
  - Mapeo de combinaciones + pasar a "Personalizado" al tocar avanzado

### DONE

- [x] **v0.9.0-step1** - Diferenciar estructuras (A) y estilos (B)
  - Agrandar diferencias entre minimal/clasico/compacto/tv en themes.css
  - Marcar más diferencia entre clasico/elegante/dev/arial
  - `1637428`.

- [x] **v0.8.8** - Panel de ajustes renovado
  - Pestañas horizontales (Temas/Ciudades/Clima/Pantalla/General).
  - Color de acento funcional en foco/switches/chips.
  - Color de fondo configurable siempre.
  - Botón pantalla completa en ajustes (sin forzado al primer click).
  - Filas normalizadas (label a izquierda, control a derecha).
  - `Elegante` con fuente cursiva `Caveat`. `Clásico` sin cambios.
  - Navegación por teclado en pestañas con roving tabindex.
  - `12a3e98`, `2a06406`, `1792c20`, `1e2f047`, `a435cca`.

- [x] **v0.8.7** - Suite de pruebas reproducible
  - Tests en Node nativo (`node:test`) para utils, config y datos.
  - Integrado con `npm test`.
  - Sin dependencias externas. `76d70dd`.

- [x] **v0.8.6** - Fase 8 - Bloque 3 - Pulido móvil estrecho
  - 3.5 En 320x568 y 360x640 la tira horaria cabe en una sola fila
    (`minmax(2.75rem, 1fr)`, `gap: var(--space-1)`) y la ficha deja de empujar
    el reloj fuera de pantalla. El gap del tablero y el relleno de la tarjeta se
    limitan en `max-width: 30em`.
  - En apaisado bajo (`max-height: 30em`) el tablero pasa a dos columnas:
    ciudades y reloj a la izquierda, tarjeta a la derecha. Dentro de la tarjeta
    el pronóstico va junto al bloque actual y las horas cruzan por debajo.
  - El panel recupera los 14px que el límite nativo del `<dialog>` comía en
    320px (`max-width: none`), sin desbordes y con scroll solo en
    `.settings__body`.
  - Verificado sin solapes ni desbordes en 320x568, 360x640, 568x320, 640x360,
    844x390, 390x844 y 1440x900, con mínimo de 13px y bloques ocultos en
    apaisado. `62bdce9`.
