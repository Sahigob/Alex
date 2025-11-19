/* Frogger Retro - Logic Refined */
document.addEventListener('DOMContentLoaded', () => {
  // --- Configuración Canvas ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const W = 800, H = 600;
  canvas.width = W;
  canvas.height = H;
  const COLS = 20, ROWS = 15;
  const TILE = Math.floor(W / COLS);

  // --- Elementos del DOM ---
  const scoreVal = document.getElementById('score-value');
  const livesVal = document.getElementById('lives-value');
  const overlay = document.getElementById('overlay');
  const finalScore = document.getElementById('final-score');
  const btnRestart = document.getElementById('btn-restart');

  // --- Estado del Juego ---
  let frog = { x: 10, y: 14, anim: false }; // Posición inicial
  let score = 0;
  let lives = 3;
  let gameOver = false;
  
  // ➡️ NUEVO: Array para guardar qué casillas de meta están ocupadas (indices X)
  // Las casillas visualmente están en X = 1, 5, 9, 13, 17
  let filledHomes = []; 

  // --- Carriles (Lanes) ---
  const lanes = [];
  for (let r = 0; r < ROWS; r++) {
    if (r === 0) lanes.push({ type: 'goal' }); // La meta
    else if (r >= 1 && r <= 5) lanes.push({ type: 'river' });
    else if (r === 6 || r === 12) lanes.push({ type: 'safe' });
    else if (r >= 7 && r <= 11) lanes.push({ type: 'road' });
    else lanes.push({ type: 'start' });
  }

  // --- Obstáculos ---
  let obstacles = [];
  const laneConfigs = {
    rivers: {
      1: { speed: 0.06, dir: 1, count: 2, length: 4 },
      2: { speed: 0.04, dir: -1, count: 2, length: 3 },
      3: { speed: 0.07, dir: 1, count: 2, length: 4 },
      4: { speed: 0.05, dir: -1, count: 2, length: 3 },
      5: { speed: 0.03, dir: 1, count: 2, length: 4 }
    },
    roads: {
      7: { speed: 0.09, dir: 1, count: 2, length: 3 },
      8: { speed: 0.07, dir: -1, count: 2, length: 2 },
      9: { speed: 0.08, dir: 1, count: 2, length: 2 },
      10:{ speed: 0.06, dir: -1, count: 2, length: 3 },
      11:{ speed: 0.05, dir: 1, count: 1, length: 4 }
    }
  };

  function spawnObstacles() {
    obstacles = [];
    // Ríos
    Object.keys(laneConfigs.rivers).forEach(r => {
      const cfg = laneConfigs.rivers[r];
      const gap = Math.floor(COLS / cfg.count);
      for (let i = 0; i < cfg.count; i++) {
        const x = i * gap + Math.random() * Math.max(1, gap - cfg.length - 1);
        const type = Math.random() > 0.6 ? 'croc' : 'log';
        obstacles.push({ x, y: parseInt(r), length: type==='log'?cfg.length:Math.min(2,cfg.length-1), speed: cfg.speed*cfg.dir, type, zone:'river' });
      }
    });
    // Carreteras
    Object.keys(laneConfigs.roads).forEach(r => {
      const cfg = laneConfigs.roads[r];
      const gap = Math.floor(COLS / Math.max(1,cfg.count));
      for (let i = 0; i < cfg.count; i++) {
        const x = i*gap + Math.random()*Math.max(1,gap-cfg.length-1);
        const type = Math.random() > 0.5 ? 'truck':'car';
        obstacles.push({ x, y: parseInt(r), length: type==='car'?Math.max(2,cfg.length-1):cfg.length, speed: cfg.speed*cfg.dir, type, zone:'road' });
      }
    });
  }
  spawnObstacles();

  // --- Dibujo ---
  function drawPixelRect(x,y,w,h,color,stroke){
    ctx.fillStyle = color; ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
    if(stroke){ ctx.strokeStyle = stroke; ctx.strokeRect(Math.round(x)+0.5,Math.round(y)+0.5,Math.round(w)-1,Math.round(h)-1); }
  }

  // Función auxiliar para pintar ranas (jugador o metas completadas)
  function renderFrogBody(cx, cy) {
    // Sombra
    drawPixelRect(cx-TILE*0.28, cy+TILE*0.22, TILE*0.56, TILE*0.16,'rgba(0,0,0,0.25)');
    // Cuerpo
    drawPixelRect(cx-TILE*0.28, cy-TILE*0.18, TILE*0.56, TILE*0.42,'#6fe9a0','#2f7f56');
    // Ojos
    drawPixelRect(cx-TILE*0.18,cy-TILE*0.32,TILE*0.12,TILE*0.12,'#fff');
    drawPixelRect(cx+TILE*0.06,cy-TILE*0.32,TILE*0.12,TILE*0.12,'#fff');
    // Pupilas
    drawPixelRect(cx-TILE*0.12,cy-TILE*0.28,TILE*0.06,TILE*0.06,'#001');
    drawPixelRect(cx+TILE*0.12,cy-TILE*0.28,TILE*0.06,TILE*0.06,'#001');
  }

  function drawScene(){
    for (let r=0;r<ROWS;r++){
      const lane = lanes[r];
      if(lane.type==='goal'){
        // Fondo verde oscuro (muros)
        drawPixelRect(0,r*TILE,W,TILE,'#2e8b57');
        // Bahías (Casillas meta)
        for(let j=1;j<COLS;j+=4){ 
            drawPixelRect(j*TILE+4,r*TILE+6,TILE*2-8,TILE-12,'#36b97a'); 
        }
      } else if(lane.type==='river'){
        drawPixelRect(0,r*TILE,W,TILE,'#1b83b6');
      } else if(lane.type==='safe' || lane.type==='start'){
        drawPixelRect(0,r*TILE,W,TILE,'#3a8b6e');
      } else if(lane.type==='road'){
        drawPixelRect(0,r*TILE,W,TILE,'#2b3b4b');
        // Líneas de carretera
        for(let j=0;j<COLS;j+=2){ drawPixelRect(j*TILE + TILE*0.45, r*TILE + TILE*0.45, TILE*0.2, TILE*0.1,'rgba(255,255,255,0.15)'); }
      }
    }
    
    // ➡️ DIBUJAR RANAS EN CASILLAS COMPLETADAS
    filledHomes.forEach(hx => {
        // La casilla empieza en hx, el centro es hx + 1 tile
        const cx = (hx * TILE) + TILE; 
        const cy = TILE/2;
        renderFrogBody(cx, cy);
    });
  }

  function drawObstacles(){
    obstacles.forEach(o=>{
      const xpx=o.x*TILE, ypx=o.y*TILE+4, wpx=o.length*TILE, hpx=TILE-8;
      if(o.zone==='road'){
        const color = o.type==='car'?'#ff5555':'#c44d33';
        drawPixelRect(xpx,ypx,wpx,hpx,color,'#2a2a2a');
      } else {
        if(o.type==='log'){ drawPixelRect(xpx,ypx,wpx,hpx,'#8b5e3c','#4a2f1c'); }
        else { drawPixelRect(xpx,ypx,wpx,hpx,'#2f9a46','#1d5b2b'); }
      }
    });
  }

  function drawPlayer(){
    if(gameOver) return;
    const cx=frog.x*TILE+TILE/2, cy=frog.y*TILE+TILE/2;
    renderFrogBody(cx, cy);
  }

  // --- Movimiento Suave ---
  let tween = null;
  function jumpTo(tx,ty){
    if(tween) cancelAnimationFrame(tween.raf);
    const sx=frog.x, sy=frog.y;
    frog.anim=true;
    let start=null;
    const duration = 100; // ms
    function step(ts){
      if(!start) start=ts;
      const t=Math.min(1,(ts-start)/duration);
      frog.x = sx + (tx-sx)*t;
      frog.y = sy + (ty-sy)*t;
      if(t<1) tween={raf: requestAnimationFrame(step)};
      else { frog.x=tx; frog.y=ty; frog.anim=false; tween=null; }
    }
    tween={raf: requestAnimationFrame(step)};
  }

  function moveFrog(dir){
    if(frog.anim || gameOver) return;
    let tx=frog.x, ty=frog.y;
    if(dir==='UP') ty=Math.max(0,frog.y-1);
    if(dir==='DOWN') ty=Math.min(ROWS-1,frog.y+1);
    if(dir==='LEFT') tx=Math.max(0,frog.x-1);
    if(dir==='RIGHT') tx=Math.min(COLS-1,frog.x+1);
    jumpTo(tx,ty);
  }

  // --- Lógica y Colisiones ---
  function rectsOverlap(ax,ay,aw,ah,bx,by,bw,bh){
    return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
  }

  function checkGoalLogic() {
    // Las casillas válidas empiezan en estas columnas X:
    const homesX = [1, 5, 9, 13, 17];
    let safe = false;

    // Verificamos si la rana está alineada con alguna casilla (margen de error pequeño)
    for(let hx of homesX) {
        // La casilla mide 2 tiles de ancho, revisamos si la rana está dentro
        if(frog.x >= hx - 0.2 && frog.x <= hx + 1.2) {
            if(filledHomes.includes(hx)) {
                // Casilla ocupada -> Muerte
                return loseLife(); 
            } else {
                // Casilla vacía -> Éxito
                filledHomes.push(hx);
                score += 200;
                safe = true;
                
                // ¿Nivel completado?
                if(filledHomes.length === 5) {
                    score += 1000;
                    filledHomes = []; // Limpiar para siguiente ronda
                    // Aquí podrías aumentar dificultad
                }
                respawnFrog();
                return;
            }
        }
    }
    // Si llega a la fila 0 pero no es 'safe' (chocó con muro verde)
    if(!safe) loseLife();
  }

  function updateLogic(){
    // Mover obstáculos
    obstacles.forEach(o=>{
      o.x += o.speed;
      if(o.speed>0 && o.x>COLS) o.x=-o.length;
      if(o.speed<0 && o.x<-o.length) o.x=COLS;
    });

    // No chequeamos colisiones mientras salta
    if(frog.anim) return;

    const fcx=frog.x*TILE+TILE/2;
    const fcy=frog.y*TILE+TILE/2;
    const rIndex = Math.floor(frog.y); // Fila actual
    const lane = lanes[rIndex];

    if(lane.type==='road'){
      const hit = obstacles.some(o=>o.zone==='road' && o.y===rIndex && rectsOverlap(
        fcx-TILE*0.3, fcy-TILE*0.3, TILE*0.6, TILE*0.6,
        o.x*TILE, o.y*TILE+4, o.length*TILE, TILE-8
      ));
      if(hit) loseLife();

    } else if(lane.type==='river'){
      const log = obstacles.find(o=>o.zone==='river' && o.y===rIndex && fcx<(o.x+o.length)*TILE && fcx+TILE>o.x*TILE);
      
      if(log){
        // Sobre tronco o cocodrilo -> Mover con él
        frog.x += log.speed;
      } else {
        // En el agua -> Muerte
        loseLife();
      }
      
      // Muerte si se sale de la pantalla por los lados en el río
      if(frog.x < -0.5 || frog.x > COLS-0.5) loseLife();

    } else if(lane.type==='goal'){
       // Lógica específica de llegar a meta
       checkGoalLogic();
    }

    // Actualizar HUD
    scoreVal.textContent = score;
    livesVal.textContent = lives;
  }

  function loseLife(){
    lives--;
    livesVal.textContent = lives;
    if(lives > 0){
        respawnFrog();
    } else {
        gameOver = true;
        finalScore.textContent = score;
        overlay.classList.remove('hidden');
    }
  }

  function respawnFrog(){
    frog.x = 10; 
    frog.y = 14; 
    frog.anim = false;
  }

  // --- Controles ---
  window.addEventListener('keydown', e=>{
    if(gameOver) return;
    const k = e.key;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)) e.preventDefault();
    if(k==='ArrowUp') moveFrog('UP');
    if(k==='ArrowDown') moveFrog('DOWN');
    if(k==='ArrowLeft') moveFrog('LEFT');
    if(k==='ArrowRight') moveFrog('RIGHT');
  });

  ['up','down','left','right'].forEach(id => {
    const btn = document.getElementById(id);
    if(btn){
        // Prevenir zoom y seleccionar texto
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); moveFrog(id.toUpperCase()); }, {passive: false});
        // Click para PC
        btn.addEventListener('click', (e) => { moveFrog(id.toUpperCase()); });
    }
  });

  btnRestart.addEventListener('click', ()=>{
    lives = 3; 
    score = 0; 
    filledHomes = [];
    gameOver = false;
    overlay.classList.add('hidden');
    respawnFrog();
    spawnObstacles();
    loop();
  });

  // --- Loop Principal ---
  function loop(){
    if(gameOver) return;
    updateLogic();
    ctx.clearRect(0,0,W,H);
    drawScene();
    drawObstacles();
    drawPlayer();
    requestAnimationFrame(loop);
  }

  // Iniciar
  loop();
});
