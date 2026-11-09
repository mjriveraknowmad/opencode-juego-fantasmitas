# SPEC 01 — Cuatro fantasmas con comportamientos distintos

> **Estado:** Implementado
> **Depende de:** —
> **Fecha:** 2026-11-09
> **Objetivo:** Añadir cuatro fantasmas con comportamientos diferenciados —directo, emboscador, flanqueador y errático— que comparten velocidad y salen escalonados de la guarida.

## Por qué existe esta spec

Hoy hay dos fantasmas: uno persigue con distancia Manhattan de un paso y otro se mueve al azar. El segundo comportamiento no aporta variedad y el primero puede atascarse contra paredes. Esta spec convierte a los fantasmas en cuatro personalidades reconocibles sin cambiar el resto del juego.

## Alcance

**Dentro:**

- Cuatro fantasmas, cada uno con un comportamiento propio: directo, emboscador, flanqueador y errático.
- Persecución por camino más corto (BFS) para los tres fantasmas con objetivo.
- Salida escalonada de la guarida: una cada 1.5 s.
- Velocidad común de `0.1` celda/frame.
- Colores distintos por fantasma.
- Reinicio global actual al perder una vida (todos vuelven a la guarida).

**Fuera de alcance (para futuras specs):**

- Modo asustado y power pellets.
- Ciclos scatter/chase por tiempo.
- Reentrada individual a la guarida tras morir.
- Niveles múltiples o dificultad progresiva.
- Nuevos sprites, sonidos o controles móviles.
- Cambiar el movimiento basado en frames por movimiento basado en delta time.

## Modelo de datos

```js
// src/js/maze.js — cuatro posiciones válidas dentro de la guarida (x 11..16, y 13..15)
const GHOST_STARTS = [
  { x: 13, y: 13, kind: 'direct' },    // sale primero
  { x: 14, y: 13, kind: 'ambusher' },
  { x: 13, y: 14, kind: 'flanker' },
  { x: 14, y: 14, kind: 'wanderer' },
];

// src/js/game.js
const GHOST_RELEASE_MS = 1500;

// Dentro de createGame(): cada fantasma conserva kind y añade su hora de salida.
game.elapsedMs = 0;
game.ghosts = GHOST_STARTS.map((g, i) => ({
  x: g.x,
  y: g.y,
  dir: 'up',
  speed: GHOST_SPEED,
  kind: g.kind,
  releaseAt: i * GHOST_RELEASE_MS, // 0, 1500, 3000, 4500
}));
```

Convenciones:

- Identificadores en inglés (`direct`, `ambusher`, `flanker`, `wanderer`); comentarios y textos de UI en español.
- `game.elapsedMs` mide tiempo real desde el inicio de la partida.
- `resetPositions()` vuelve a dejar `elapsedMs = 0` y todos los fantasmas con su `releaseAt` original.

## Comportamientos

- **Directo (rojo):** objetivo = celda actual de Pac-Man. Sigue el camino más corto.
- **Emboscador (rosa):** objetivo = 4 celdas delante de Pac-Man en su dirección actual, recortado a los límites del laberinto. Si el objetivo cae en pared o no hay ruta, usa la celda de Pac-Man.
- **Flanqueador (cian):** `pivote = Pac-Man + 2 * dirección`; `objetivo = 2 * pivote - posición del directo`, recortado. Si el objetivo cae en pared o no hay ruta, usa la celda de Pac-Man.
- **Errático (naranja):** con Pac-Man a más de 8 celdas de distancia Manhattan, elige una dirección válida al azar. A 8 celdas o menos, elige la dirección válida que más lo aleje de Pac-Man.

Reglas comunes:

- Los fantasmas con objetivo usan un campo de distancias BFS calculado desde el objetivo sobre las celdas transitables. En cada celda alineada eligen el vecino con menor distancia.
- El giro de 180° solo se permite cuando no existe otra dirección válida.
- Desempate determinista en el orden `up`, `left`, `down`, `right`.
- La puerta de la guarida (`3`) es transitable para fantasmas y bloqueante para Pac-Man, como ya ocurre.
- Un fantasma no liberado no se actualiza: permanece inmóvil en su celda de salida.

## Plan de implementación

1. **Datos y colores.** En `maze.js`, ampliar `GHOST_STARTS` a las cuatro entradas con `kind`. En `render.js`, ordenar `GHOST_COLORS` como rojo, rosa, cian y naranja para que coincida con el orden anterior. Prueba manual: abrir el juego y ver cuatro fantasmas distintos, sin errores en consola.
2. **Salida escalonada.** En `game.js`, añadir `elapsedMs`, `releaseAt` y el filtro que impide actualizar fantasmas no liberados. Calcular el tiempo con `performance.now()` dentro de `update`, limitando el delta a 100 ms para evitar saltos. Reiniciar el contador en `resetPositions`. Prueba manual: al empezar solo se mueve uno; los demás salen a los 1.5, 3.0 y 4.5 s.
3. **BFS y fantasma directo.** Añadir el helper `nextDirToward(grid, from, target)` basado en campo de distancias BFS y usarlo en `moveGhost` cuando el fantasma está alineado. Implementar `direct`. Prueba manual: el rojo rodea paredes y llega a Pac-Man sin atravesarlas.
4. **Emboscador.** Añadir el cálculo de objetivo 4 celdas por delante y conectarlo a `ambusher`. Prueba manual: el rosa se adelanta en la dirección en la que se mueve Pac-Man.
5. **Flanqueador.** Añadir el cálculo con el pivote y la posición del directo, conectado a `flanker`. Prueba manual: al mover al directo, el cian cambia su ruta de corte.
6. **Errático.** Implementar la elección aleatoria y la huida cuando Pac-Man está a 8 celdas o menos. Prueba manual: el naranja vaga lejos y se aleja al acercarse Pac-Man.
7. **Limpieza.** Eliminar las ramas `hunter` y `random`, actualizar comentarios y verificar una partida completa: comer todos los puntos, perder las tres vidas y reiniciar.

## Criterios de aceptación

- [ ] Se dibujan exactamente cuatro fantasmas, cada uno con un color distinto.
- [ ] El primer fantasma sale de inmediato y los otros a los 1.5, 3.0 y 4.5 s.
- [ ] Los fantasmas no liberados permanecen inmóviles dentro de la guarida.
- [ ] El directo llega a la celda de Pac-Man por el camino más corto y sin atravesar paredes.
- [ ] El emboscador apunta 4 celdas delante de la dirección actual de Pac-Man.
- [ ] El flanqueador cambia de ruta cuando cambia la posición del directo.
- [ ] El errático vaga cuando Pac-Man está lejos y se aleja cuando está a 8 celdas o menos.
- [ ] Los cuatro se mueven a `0.1` celda/frame y siguen alineados con las celdas.
- [ ] Colisiones, vidas, puntuación, victoria, derrota y reinicio funcionan igual que antes.
- [ ] El laberinto conserva 31 filas de 28 caracteres y no hay errores en consola.

## Decisiones tomadas y descartadas

- **Sí:** BFS con campo de distancias para los fantasmas con objetivo. Evita bucles y esquinas pegadas del greedy Manhattan; sobre 868 celdas el coste es despreciable y solo se recalcula al alinearse con una celda.
- **Sí:** tiempo real en milisegundos para la salida escalonada. Cumple el "1.5 s" aunque la tasa de refresco no sea 60 Hz.
- **No:** convertir también el movimiento a delta time. Es una limitación existente del juego y queda fuera de esta spec.
- **Sí:** velocidad común de `0.1` celda/frame. Mantiene la alineación cada 10 frames; la dificultad se diferencia por comportamiento.
- **Sí:** reset global al morir. La reentrada individual queda para otra spec.
- **Sí:** el flanqueador usa al directo como referencia. Es la versión clásica y no requiere estado adicional.
- **No:** modos asustado, scatter/chase por tiempo, niveles y power pellets. Cada uno merece su propia spec.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Cuatro fantasmas hacen el nivel injugable con 3 vidas | Salida escalonada y misma velocidad; ajustar tiempos o vidas tras jugar, en otra spec |
| BFS trata la puerta como muro y los fantasmas nunca salen | La puerta (`3`) debe ser transitable para `actor === 'ghost'`; verificarlo en el paso 3 |
| En monitores de más de 60 Hz el juego entero va más rápido | Limitación existente por movimiento basado en frames; la salida en ms mantiene su tiempo real |

## Lo que **no** entra en esta spec

- Modo asustado y power pellets.
- Ciclos scatter/chase por tiempo.
- Reentrada individual a la guarida tras morir.
- Niveles múltiples o dificultad progresiva.
- Sprites, sonidos o controles móviles.
- Migración del movimiento a delta time.

Cada uno, si llega, va en su propia spec.
