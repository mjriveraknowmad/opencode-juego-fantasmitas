# SPEC 02 — Power pellets y modo asustado

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-09
> **Objetivo:** Añadir cuatro power pellets que, al comerse, activan durante 6 segundos un modo en el que los fantasmas huyen, bajan de velocidad y pueden ser comidos por Pac-Man con puntuación en combo.

## Por qué existe esta spec

La SPEC 01 dejó fuera el modo asustado y los power pellets. Sin ellos Pac-Man solo puede huir de los fantasmas y el juego no tiene una mecánica de contraataque. Esta spec añade esa mecánica sin tocar los cuatro comportamientos normales ni el movimiento actual.

## Alcance

**Dentro:**

- Cuatro power pellets en las esquinas del laberinto: celdas `(1,1)`, `(26,1)`, `(1,29)` y `(26,29)`.
- Nuevo valor de tile `4` para el power pellet, escrito como `o` en `MAZE_STR`.
- Comer un pellet suma `50` puntos y activa el modo asustado durante 6 segundos de tiempo de juego.
- Los fantasmas asustados invierten la dirección al activarse, bajan a `0.05` celda/frame, huyen de Pac-Man y se dibujan en azul con parpadeo blanco en los últimos 2 segundos.
- Comer un fantasma asustado suma `200`, `400`, `800` y `1600` puntos según el orden dentro del mismo pellet.
- El fantasma comido desaparece, espera en la guarida hasta que termina el efecto y sale `1.5` s después.
- Los power pellets cuentan para la condición de victoria.
- Al perder una vida se conserva el progreso del laberinto y se corta el modo asustado.
- Actualizar `AGENTS.md` con el tile `4` y el contador `itemsRemaining`.

**Fuera de alcance (para futuras specs):**

- Ojos de fantasma comido recorriendo el laberinto hasta la guarida.
- Duración del efecto variable por nivel o dificultad progresiva.
- Niveles múltiples, ciclos scatter/chase y reentrada individual normal a la guarida.
- Sonidos, sprites nuevos, contador de tiempo en el HUD y pausa.
- Migración del movimiento a delta time.

## Modelo de datos

```js
// src/js/maze.js
// Valores de tile:
//   0 vacio · 1 pared · 2 dot · 3 puerta · 4 power pellet
// MAZE_STR usa 'o' para el tile 4 en las cuatro esquinas:
//   fila 1:  '#o...........##...........o#'
//   fila 29: '#o........................o#'

// src/js/game.js
const FRIGHTENED_MS = 6000;            // duracion total del efecto
const FRIGHTENED_FLASH_MS = 2000;      // parpadeo final
const GHOST_FRIGHTENED_SPEED = 0.05;   // mitad de GHOST_SPEED
const POWER_PELLET_POINTS = 50;
const GHOST_COMBO_POINTS = [ 200, 400, 800, 1600 ];

// Dentro de createGame():
game.itemsRemaining;      // dots (2) + power pellets (4); sustituye a dotsRemaining
game.frightenedUntilMs = 0; // 0 = inactivo; efecto activo si es mayor que elapsedMs
game.ghostCombo = 0;        // fantasmas comidos con el pellet actual

// Cada fantasma añade a su estructura actual:
//   home: { x, y }  celda de GHOST_STARTS a la que vuelve si lo comen
//   eaten: false    true mientras espera en la guarida tras ser comido

// Exportados a window para render.js:
window.isFrightened = isFrightened;
window.FRIGHTENED_FLASH_MS = FRIGHTENED_FLASH_MS;
```

Convenciones:

- El tiempo del efecto se mide con `game.elapsedMs`, el mismo reloj que la salida escalonada de la SPEC 01.
- `isFrightened(game)` devuelve `game.frightenedUntilMs > game.elapsedMs`.
- El estado asustado se deriva del tiempo; no se guarda un booleano aparte.
- `GHOST_SPEED` sigue siendo `0.1` celda/frame.

## Comportamientos

### Power pellet

- Pac-Man come un pellet cuando su celda redondeada contiene un tile `4`.
- Al comerlo: `grid[y][x] = 0`, `score += 50`, `itemsRemaining--`.
- Activar el efecto fija `frightenedUntilMs = elapsedMs + FRIGHTENED_MS` y reinicia `ghostCombo = 0`.
- Comer otro pellet mientras el efecto está activo vuelve a fijar los 6 segundos completos y reinicia el combo a `200`.
- En cada activación, todos los fantasmas no comidos invierten su `dir` inmediatamente. Los que están en la guarida invierten sin efecto visible.

### Fantasmas asustados

- Se dibujan con cuerpo azul `#2121ff` y ojos blancos sin pupila orientada.
- Durante los últimos `FRIGHTENED_FLASH_MS` del efecto parpadean a blanco cada 250 ms.
- Su velocidad es `GHOST_FRIGHTENED_SPEED` y solo se aplica al llegar a una celda alineada, para no romper la alineación.
- En cada celda alineada calculan un campo de distancias BFS desde la celda actual de Pac-Man sobre celdas transitables para fantasmas.
- Eligen la dirección válida cuyo vecino tenga la mayor distancia. El desempate usa el orden `up`, `left`, `down`, `right`.
- Se permite el giro de 180° también cuando existe otra salida, porque huir puede requerirlo.
- Si no hay campo de distancias, eligen una dirección válida al azar.
- Un fantasma que sale de la guarida durante el efecto lo hace asustado.
- Un fantasma comido no se actualiza ni se dibuja mientras está en la guarida.

### Colisiones

- La detección de colisión no cambia: `|dx| < 0.5` y `|dy| < 0.5`.
- Si el efecto está activo, el fantasma es comido: no se pierde vida.
- Al comer un fantasma: suma `GHOST_COMBO_POINTS[ghostCombo]` (máximo `1600`), incrementa `ghostCombo`, marca `eaten = true` y lo coloca en su `home` con `dir = 'up'`.
- Si el efecto no está activo, la colisión resta una vida y reinicia posiciones como hasta ahora.
- Varios fantasmas pueden ser comidos en el mismo frame; se procesan en el orden del array `game.ghosts`.
- Al terminar el efecto: `frightenedUntilMs = 0`, `ghostCombo = 0` y cada fantasma con `eaten = true` pasa a `eaten = false` con `releaseAt = elapsedMs + GHOST_RELEASE_MS`.

### Victoria y reinicio

- `itemsRemaining` cuenta los tiles `2` y `4`; la victoria ocurre cuando llega a `0`.
- `resetPositions()` fija `frightenedUntilMs = 0`, `ghostCombo = 0` y `eaten = false` en todos los fantasmas.
- Los dots y pellets ya comidos siguen comidos tras perder una vida.
- `createGame()` reconstruye el grid desde `MAZE`, así que reiniciar la partida devuelve los cuatro pellets.

## Plan de implementación

1. **Tile 4 y dibujo.** En `maze.js`, documentar el tile `4`, añadir `'o'` en las esquinas de las filas 1 y 29 y parsearlo a `4`. En `render.js`, dibujar el tile `4` como un punto grande de radio `6` con `DOT_COLOR`. Prueba manual: se ven cuatro pellets grandes en las esquinas y no hay errores en consola.
2. **Comer pellets.** En `game.js`, contar los tiles `2` y `4` en `itemsRemaining`, sumar `50` y borrar el tile al comerlo, y usar `itemsRemaining` para la victoria. Prueba manual: comer un pellet suma 50, desaparece y comer los cuatro más todos los dots gana la partida.
3. **Temporizador y estado visual.** Añadir `frightenedUntilMs`, `isFrightened` y las constantes de duración. Activar el efecto al comer un pellet y exportar `isFrightened` y `FRIGHTENED_FLASH_MS`. En `render.js`, pintar de azul y parpadear en los últimos 2 s. Prueba manual: el efecto dura 6 s y los fantasmas azules parpadean al final.
4. **Huida y velocidad.** Añadir la elección de dirección por máxima distancia BFS y la inversión inicial. Aplicar `GHOST_FRIGHTENED_SPEED` solo en celdas alineadas. Prueba manual: los fantasmas giran al comer el pellet, huyen de Pac-Man y siguen alineados con las celdas.
5. **Comer fantasmas.** Añadir la rama de colisión con efecto activo, el combo de puntos, el regreso a `home` con `eaten = true`, la omisión de dibujo y actualización, y la reactivación al terminar el efecto. Prueba manual: comer un fantasma suma 200, desaparece y vuelve a salir 1.5 s después del efecto.
6. **Reinicio y documentación.** Limpiar `resetPositions`, actualizar comentarios, `AGENTS.md` y verificar una partida completa: perder vidas, comer todos los items, ganar y reiniciar. Prueba manual: tras perder una vida no quedan fantasmas azules ni comidos, y los pellets comidos siguen comidos.

## Criterios de aceptación

- [ ] Se dibujan exactamente cuatro power pellets grandes en `(1,1)`, `(26,1)`, `(1,29)` y `(26,29)`.
- [ ] Comer un power pellet suma exactamente 50 puntos y lo elimina del grid.
- [ ] El modo asustado dura 6 segundos de `game.elapsedMs` desde la última activación.
- [ ] Los fantasmas asustados se dibujan azules y parpadean a blanco durante los últimos 2 segundos.
- [ ] Los fantasmas asustados se mueven a `0.05` celda/frame y siguen alineados con las celdas.
- [ ] Todos los fantasmas no comidos invierten su dirección al activarse el efecto.
- [ ] Los fantasmas asustados eligen la dirección válida que más los aleja de Pac-Man.
- [ ] Comer fantasmas en un mismo pellet suma 200, 400, 800 y 1600 en ese orden.
- [ ] Comer un segundo pellet reinicia el temporizador a 6 segundos y el combo a 200.
- [ ] Un fantasma comido no se dibuja ni puede volver a colisionar mientras espera en la guarida.
- [ ] El fantasma comido reaparece al terminar el efecto y sale 1.5 segundos después.
- [ ] Perder una vida conserva los dots y pellets comidos y corta el modo asustado.
- [ ] Todos los fantasmas vuelven a su comportamiento y velocidad normales al terminar el efecto.
- [ ] La partida se gana al comer todos los dots y los cuatro power pellets.
- [ ] Reiniciar la partida devuelve los cuatro power pellets y deja `ghostCombo = 0`.
- [ ] El laberinto conserva 31 filas de 28 caracteres y no hay errores en consola.

## Decisiones tomadas y descartadas

- **Sí:** tile `4` con carácter `o`. Reutiliza el grid existente y el estado de comido, igual que los dots.
- **No:** array de coordenadas separado. Obligaría a mantener un estado paralelo de pellets comidos.
- **Sí:** cuatro esquinas. Son celdas con dot ya existentes y quedan lejos del centro, como en el arcade.
- **Sí:** 6 segundos medidos con `elapsedMs`. Mantiene el mismo reloj que la salida escalonada y evita una segunda fuente de tiempo.
- **Sí:** azul con parpadeo final. Comunica cuánto queda sin añadir un contador al HUD.
- **Sí:** huida por máxima distancia BFS. Es determinista, no deja fantasmas atascados contra paredes y reutiliza `distanceField`.
- **Sí:** media velocidad aplicada solo en celdas alineadas. Cambiar la velocidad a mitad de celda rompería la alineación y con ella los giros.
- **Sí:** combo clásico 200-400-800-1600 reiniciado con cada pellet. Es reconocible y solo requiere un contador.
- **Sí:** el fantasma comido espera en la guarida hasta el final del efecto. Evita que vuelva a ser comido inmediatamente.
- **No:** ojos recorriendo el laberinto por BFS. Es más fiel pero añade un estado de retorno y su propio movimiento.
- **Sí:** renombrar `dotsRemaining` a `itemsRemaining`. El contador ya no mide solo dots.
- **Sí:** los pellets cuentan para la victoria. El nivel no termina mientras quede un item por comer.
- **Sí:** un segundo pellet reinicia el temporizador y el combo. Es la regla clásica y evita acumular efectos.
- **Sí:** un fantasma que sale de la guarida durante el efecto lo hace asustado. No hay razón para tratarlo distinto.
- **No:** sonidos, HUD con segundos restantes y duración variable. Cada uno iría en su propia spec.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Cambiar la velocidad a mitad de celda rompe la alineación y los fantasmas atraviesan giros | Aplicar `GHOST_FRIGHTENED_SPEED` solo dentro del bloque de celda alineada de `moveGhost` |
| Los fantasmas asustados pueden cruzar la puerta `3` y entrar en la guarida, porque ya es transitable para ellos | Aceptado: la guarida no es un callejón sin salida y el juego sigue siendo jugable; bloquearla requeriría cambiar las reglas de la SPEC 01 |
| El final del efecto y una colisión ocurren en el mismo frame | Evaluar `isFrightened` una vez al inicio de la comprobación de colisiones y aplicar el fin del efecto después de mover y colisionar |
| El efecto dura más de 6 s reales si la pestaña se oculta, porque `elapsedMs` limita el delta a 100 ms | Aceptado: el efecto se mide en tiempo de juego acumulado, coherente con la salida escalonada existente |
| El combo se incrementa de más si varios fantasmas colisionan en el mismo frame | Incrementar `ghostCombo` una vez por fantasma procesado y limitar el índice con `Math.min` |

## Lo que **no** entra en esta spec

- Ojos de fantasma comido recorriendo el laberinto hasta la guarida.
- Duración del efecto variable por nivel o dificultad progresiva.
- Niveles múltiples y ciclos scatter/chase por tiempo.
- Reentrada individual normal a la guarida tras morir.
- Sonidos, sprites nuevos, contador de tiempo en el HUD y pausa.
- Cambiar el movimiento basado en frames por delta time.

Cada uno, si llega, va en su propia spec.
