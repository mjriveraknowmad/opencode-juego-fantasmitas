// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame
const GHOST_FRIGHTENED_SPEED = 0.05; // mitad de velocidad mientras asustado
const GHOST_RELEASE_MS = 1500; // separacion entre salidas de la guarida
const MAX_DELTA_MS = 100;      // evita saltos si el navegador se bloquea
const POWER_PELLET_POINTS = 50;
const FRIGHTENED_MS = 6000;       // duracion total del modo asustado
const FRIGHTENED_FLASH_MS = 2000; // parpadeo final
const GHOST_COMBO_POINTS = [ 200, 400, 800, 1600 ];

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let items = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 || v === 4 ) items++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    itemsRemaining: items,
    grid,
    elapsedMs: 0,
    lastTickMs: null,
    frightenedUntilMs: 0, // 0 = inactivo; activo mientras supere elapsedMs
    ghostCombo: 0,        // fantasmas comidos con el pellet actual
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g, i ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      releaseAt: i * GHOST_RELEASE_MS, // 0, 1500, 3000, 4500
      home: { x: g.x, y: g.y },        // celda de la guarida a la que vuelve
      eaten: false,                    // esperando en la guarida tras ser comido
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot o power pellet.
    const tile = grid[ p.y ][ p.x ];
    if ( tile === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.itemsRemaining--;
    } else if ( tile === 4 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += POWER_PELLET_POINTS;
      game.itemsRemaining--;
      // Activar o renovar el modo asustado.
      game.frightenedUntilMs = game.elapsedMs + FRIGHTENED_MS;
      game.ghostCombo = 0;
      // Inversion inmediata de los fantasmas no comidos.
      for ( const g of game.ghosts ) {
        if ( g.eaten ) continue;
        g.dir = OPPOSITE[ g.dir ];
      }
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

// Orden fijo de desempate entre direcciones.
const TIE_ORDER = [ 'up', 'left', 'down', 'right' ];

// Vecino de (x,y) en la direccion dir, conectando los extremos del tunel
// de la fila 14. Devuelve null si sale del laberinto fuera del tunel.
function neighbor( grid, x, y, dir ) {
  const W = grid[ 0 ].length;
  const H = grid.length;
  const d = DIRS[ dir ];
  let nx = x + d.x;
  const ny = y + d.y;
  if ( ny < 0 || ny >= H ) return null;
  if ( nx < 0 || nx >= W ) {
    if ( ny !== TUNNEL_ROW ) return null;
    nx = nx < 0 ? W - 1 : 0;
  }
  return { x: nx, y: ny };
}

// Campo de distancias BFS desde target sobre las celdas transitables para
// fantasmas. Devuelve null si el objetivo no es una celda valida.
function distanceField( grid, target ) {
  const H = grid.length;
  const W = grid[ 0 ].length;
  const dist = Array.from( { length: H }, () => new Array( W ).fill( -1 ) );
  if ( !target || target.y < 0 || target.y >= H || target.x < 0 || target.x >= W ) {
    return null;
  }
  if ( isWall( grid, target.x, target.y, 'ghost' ) ) return null;

  dist[ target.y ][ target.x ] = 0;
  const queue = [ target ];
  for ( let head = 0; head < queue.length; head++ ) {
    const cell = queue[ head ];
    for ( const dir of TIE_ORDER ) {
      const n = neighbor( grid, cell.x, cell.y, dir );
      if ( !n || dist[ n.y ][ n.x ] !== -1 ) continue;
      if ( isWall( grid, n.x, n.y, 'ghost' ) ) continue;
      dist[ n.y ][ n.x ] = dist[ cell.y ][ cell.x ] + 1;
      queue.push( n );
    }
  }
  return dist;
}

// Direcciones validas desde la celda actual, sin el giro de 180 salvo que no
// quede otra salida. Mantiene el orden fijo de desempate.
function ghostOptions( grid, from ) {
  const options = TIE_ORDER.filter(
    ( dir ) => canMove( grid, from.x, from.y, dir, 'ghost' )
  );
  const forward = options.filter( ( dir ) => dir !== OPPOSITE[ from.dir ] );
  return forward.length ? forward : options;
}

// Siguiente direccion desde `from` para acercarse a target por el camino mas
// corto. `from` incluye x, y y la direccion actual.
function nextDirToward( grid, from, target ) {
  const dist = distanceField( grid, target );
  if ( !dist ) return null;

  const choices = ghostOptions( grid, from );
  if ( !choices.length ) return null;

  let best = null;
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const n = neighbor( grid, from.x, from.y, dir );
    if ( !n ) continue;
    const d = dist[ n.y ][ n.x ];
    if ( d === -1 ) continue;
    if ( d < bestDist ) {
      bestDist = d;
      best = dir;
    }
  }
  // Sin ruta conocida, mantener un rumbo valido con el desempate fijo.
  return best || choices[ 0 ];
}

// Celda redondeada que ocupa Pac-Man.
function pacmanCell( game ) {
  const p = game.pacman;
  return { x: Math.round( p.x ), y: Math.round( p.y ) };
}

// Recorta una celda a los limites del laberinto.
function clipToMaze( grid, cell ) {
  return {
    x: Math.max( 0, Math.min( grid[ 0 ].length - 1, cell.x ) ),
    y: Math.max( 0, Math.min( grid.length - 1, cell.y ) ),
  };
}

// Celda `cells` por delante de Pac-Man en su direccion actual, recortada.
function aheadOfPacman( game, cells ) {
  const base = pacmanCell( game );
  const d = DIRS[ game.pacman.dir ];
  return clipToMaze( game.grid, {
    x: base.x + d.x * cells,
    y: base.y + d.y * cells,
  } );
}

// Hay ruta desde `from` hasta `target`?
function reachable( grid, from, target ) {
  const dist = distanceField( grid, target );
  if ( !dist ) return false;
  const x = Math.round( from.x );
  const y = Math.round( from.y );
  return dist[ y ] !== undefined && dist[ y ][ x ] !== -1;
}

// Celda objetivo segun el comportamiento. El erratico no tiene objetivo.
function ghostTarget( game, g ) {
  const grid = game.grid;
  const pac = pacmanCell( game );

  if ( g.kind === 'direct' ) return pac;

  if ( g.kind === 'ambusher' ) {
    const target = aheadOfPacman( game, 4 );
    // Si el objetivo cae en pared o no hay ruta, apunta a Pac-Man.
    if ( !isWall( grid, target.x, target.y, 'ghost' ) && reachable( grid, g, target ) ) {
      return target;
    }
    return pac;
  }

  if ( g.kind === 'flanker' ) {
    const pivot = aheadOfPacman( game, 2 );
    const direct = game.ghosts.find( ( gh ) => gh.kind === 'direct' );
    const directCell = direct
      ? { x: Math.round( direct.x ), y: Math.round( direct.y ) }
      : pac;
    // Simetria del pivote respecto al fantasma directo.
    const target = clipToMaze( grid, {
      x: 2 * pivot.x - directCell.x,
      y: 2 * pivot.y - directCell.y,
    } );
    if ( !isWall( grid, target.x, target.y, 'ghost' ) && reachable( grid, g, target ) ) {
      return target;
    }
    return pac;
  }

  return null;
}

// Distancia Manhattan entre dos celdas.
function manhattan( a, b ) {
  return Math.abs( a.x - b.x ) + Math.abs( a.y - b.y );
}

// Erratico: vaga al azar cuando Pac-Man esta lejos y huye cuando se acerca.
const WANDERER_ALERT_DISTANCE = 8;

function decideWanderer( game, g ) {
  const grid = game.grid;
  const choices = ghostOptions( grid, g );
  if ( !choices.length ) return;

  const pac = pacmanCell( game );
  const current = { x: Math.round( g.x ), y: Math.round( g.y ) };

  if ( manhattan( current, pac ) > WANDERER_ALERT_DISTANCE ) {
    g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
    return;
  }

  // Cerca de Pac-Man: la direccion valida que mas lo aleja.
  let best = choices[ 0 ];
  let bestDist = -Infinity;
  for ( const dir of choices ) {
    const n = neighbor( grid, current.x, current.y, dir );
    if ( !n ) continue;
    const d = manhattan( n, pac );
    if ( d > bestDist ) {
      bestDist = d;
      best = dir;
    }
  }
  g.dir = best;
}

// Asustado: elige la direccion valida que mas lo aleja de Pac-Man.
function decideFrightened( game, g ) {
  const grid = game.grid;
  const from = { x: Math.round( g.x ), y: Math.round( g.y ) };
  const choices = TIE_ORDER.filter(
    ( dir ) => canMove( grid, from.x, from.y, dir, 'ghost' )
  );
  if ( !choices.length ) return;

  const dist = distanceField( grid, pacmanCell( game ) );
  if ( !dist ) {
    g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
    return;
  }

  // Se permite el giro de 180: huir puede requerirlo.
  let best = null;
  let bestDist = -Infinity;
  for ( const dir of choices ) {
    const n = neighbor( grid, from.x, from.y, dir );
    if ( !n ) continue;
    const d = dist[ n.y ][ n.x ];
    if ( d > bestDist ) {
      bestDist = d;
      best = dir;
    }
  }
  if ( best ) g.dir = best;
}

function decideGhost( game, g ) {
  const grid = game.grid;

  if ( isFrightened( game ) ) {
    decideFrightened( game, g );
    return;
  }

  if ( g.kind === 'wanderer' ) {
    decideWanderer( game, g );
    return;
  }

  const target = ghostTarget( game, g );
  if ( target ) {
    const dir = nextDirToward( grid, g, target );
    if ( dir ) {
      g.dir = dir;
      return;
    }
  }

  // Sin objetivo (o sin ruta): direccion valida al azar.
  const choices = ghostOptions( grid, g );
  if ( choices.length ) {
    g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
  }
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    // La velocidad solo cambia en celdas alineadas para no romper la rejilla.
    g.speed = isFrightened( game ) ? GHOST_FRIGHTENED_SPEED : GHOST_SPEED;
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.elapsedMs = 0; // la salida escalonada vuelve a empezar
  game.frightenedUntilMs = 0; // perder una vida corta el modo asustado
  game.ghostCombo = 0;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.speed = GHOST_SPEED;
    g.releaseAt = i * GHOST_RELEASE_MS;
    g.eaten = false;
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

// El modo asustado se deriva del tiempo de juego transcurrido.
function isFrightened( game ) {
  return game.frightenedUntilMs > game.elapsedMs;
}

function update( game ) {
  // Tiempo real en ms; el delta se limita para evitar saltos.
  const now = performance.now();
  const last = game.lastTickMs === null ? now : game.lastTickMs;
  game.lastTickMs = now;
  game.elapsedMs += Math.min( now - last, MAX_DELTA_MS );

  movePacman( game );
  // Un fantasma no liberado permanece inmóvil en su celda de salida.
  // Un fantasma comido espera en la guarida hasta el fin del efecto.
  game.ghosts.forEach( ( g ) => {
    if ( g.eaten ) return;
    if ( game.elapsedMs >= g.releaseAt ) moveGhost( game, g );
  } );

  // El estado del efecto se fija una vez por frame para toda la colision.
  const frightened = isFrightened( game );

  for ( const g of game.ghosts ) {
    if ( g.eaten || !collides( game.pacman, g ) ) continue;

    if ( frightened ) {
      // Comer fantasma: combo, vuelta a la guarida y espera.
      const index = Math.min( game.ghostCombo, GHOST_COMBO_POINTS.length - 1 );
      game.score += GHOST_COMBO_POINTS[ index ];
      game.ghostCombo++;
      g.eaten = true;
      g.x = g.home.x;
      g.y = g.home.y;
      g.dir = 'up';
      g.speed = GHOST_SPEED;
      continue;
    }

    game.lives--;
    if ( game.lives <= 0 ) {
      game.state = 'lost';
      return;
    }
    resetPositions( game );
    break;
  }

  // Fin del modo asustado: se apaga el efecto y salen los comidos.
  if ( game.frightenedUntilMs > 0 && !isFrightened( game ) ) {
    game.frightenedUntilMs = 0;
    game.ghostCombo = 0;
    for ( const g of game.ghosts ) {
      if ( !g.eaten ) continue;
      g.eaten = false;
      g.releaseAt = game.elapsedMs + GHOST_RELEASE_MS;
    }
  }

  if ( game.itemsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
window.isFrightened = isFrightened;
window.FRIGHTENED_FLASH_MS = FRIGHTENED_FLASH_MS;
