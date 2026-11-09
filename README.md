## PacMan like

Vamos a crear un juego de PacMan como el juego de PacMan original, pero con una interfaz gráfica más moderna y sencilla.

## Skill usada para el uso de SDD

`npx skills add klerith/fernando-skills`



## Tecnologías

- Vanilla JS
- HTML
- CSS

## Spec Driven Development

El proyecto sirve para aprender este enfoque de desarrollo.


### Cuaderno bitácora

#### Spec 1
Pusimos en modo plan y escribimos:

/spec Ocupamos cuatro fantasmas en el juego de Pac-Man.
Cada uno debe de tener su propia forma de actuar para que se comporte de forma diferente.
Uno de esos fantasmas debe de perseguir agresivamente a Pac-Man.



Luego respondimos: 

¿Qué cuatro comportamientos quieres? Los nombres son orientativos; lo que importa es la mecánica.
Clásicos: directo, emboscador, flanqueador, errático (Recomendada)
El hunter actual elige el paso que más acerca en distancia Manhattan, lo que puede dejarlo pegado a paredes o en bucles. ¿Cómo debe perseguir el fantasma agresivo?
BFS en la cuadrícula, recalculado al llegar a cada celda (Recomendada)
¿Cuándo salen los cuatro fantasmas de la guarida (pen) y cómo reaparecen?
Uno cada 1.5 segundos
¿Los cuatro fantasmas comparten velocidad?
Sí, 0.1 celda/frame para todos (Recomendada)
Marca lo que debe quedar explícitamente fuera de esta spec (lo no marcado se consideraría dentro).
Modo asustado y power pellets, Ciclos scatter/chase por tiempo, Reentrada a la guarida tras morir, Niveles múltiples o dificultad progresiva



Luego pasamos a modo build y escribimos:

Sí, me vale, crea el spec.



Releí la spec, abrí el 01-cuatro-fantasmas.md y cambié el texto 
**Estado:** Draft  
por 
**Estado:** Aprobado


Ejecuté :

/spec-impl 01-cuatro-fantasmas



Luego:

Sí, empieza con el Paso 1

Sí, continúa con el Paso 2

Sí, continúa con el Paso 3

Sí, continúa con el Paso 4

Sí, continúa con el Paso 5

Sí, continúa con el Paso 6

Sí, continúa con el Paso 7

Por el medio fui haciendo commits.


Abrí el 01-cuatro-fantasmas.md y cambié el texto 
**Estado:** Aprobado  
por 
**Estado:** Implementado



Subimos todo al github, hicimos el PR y mergeamos a main



#### Spec 2

Pusimos en modo plan y escribimos:

/spec Ocupamos añadir los power pellets en el juego de Pac-Man.
Esto le va a permitir a pacman poder comer fantasmas.



Luego respondimos a cada pregunta: 

Ubicación pellets: Cuatro esquinas (Recomendada)
Representación: Tile 4 con 'o' (Recomendada)
Duración: 6 segundos (Recomendada)
Fantasmas asustados: Huir, media velocidad y giro inicial (Recomendada)
Fantasma comido: Vuelve a la guarida y espera (Recomendada)



Luego respondimos a otra batería de preguntas:

Puntos por pellet: 50 puntos (Recomendada)
Puntos por fantasma: Combo 200-400-800-1600 (Recomendada)
Victoria: Sí, cuentan para ganar (Recomendada)
Aviso de fin: Parpadeo final (Recomendada)
Al perder una vida: Conserva progreso y corta efecto (Recomendada)



Luego pasamos a modo build (teclas mayúsculas+tab) y escribimos:

Sí, me vale, crea el spec.



Releí la spec, abrí el 02-power-pellets.md y cambié el texto 
**Estado:** Draft  
por 
**Estado:** Aprobado


Ejecuté :

/spec-impl 02-power-pellets



Luego:

Sí, empieza con el Paso 1

Sí, continúa con el Paso 2

Sí, continúa con el Paso 3

Sí, continúa con el Paso 4

Sí, continúa con el Paso 5

Sí, continúa con el Paso 6

Sí, continúa con el Paso 7

Por el medio de cada paso fui haciendo commits.


Abrí el 02-power-pellets.md y cambié el texto 
**Estado:** Aprobado  
por 
**Estado:** Implementado