/* Frogger Retro - Logic Refined */
document.addEventListener('DOMContentLoaded', () => {
  // --- Canvas setup ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const W = 800, H = 600;
  canvas.width = W;
  canvas.height = H;
  const COLS = 20, ROWS = 15;
  const TILE = Math.floor(W / COLS);

  // --- DOM Elements ---
  const scoreValue = document.getElementById('score-value');
  const livesValue = document.getElementById('lives-value');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const finalScore = document.getElementById('final-score');
  const btnRestart = document.getElementById('btn-restart');

  // --- Game state ---
  let frog = { x: 10, y: 14, anim: false };
  let score = 0;
  let lives = 3;
  let gameOver = false;
  
  // ➡️ NUEVO: Array para guardar qué casillas (homes) están ocupadas
  // Guardamos la posición X de la casilla ocupada (1, 5, 9, 13, 17)
  let filledHomes = []; 

  // --- Lanes ---
  const lanes = [];
  for (let r = 0; r < ROWS; r++) {
    if (r === 0) lanes.push({ type: 'goal' });
    else if (r >= 1 && r <= 5) lanes.push({ type: 'river' });
    else if (r === 6 || r === 12) lanes.push({ type: 'safe' });
    else if (r >= 7 && r <= 11) lanes.push({ type: 'road' });
    else lanes.push({ type: 'start' });
  }

  // --- Obstacles ---
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
    // rivers
    Object.keys(laneConfigs.rivers).forEach(r => {
      const cfg = laneConfigs.rivers[r];
      const gap = Math.floor(COLS / cfg.count);
      for (let i = 0; i < cfg.count; i++) {
        const x = i * gap + Math.random() * Math.max(1, gap - cfg.length - 1);
        const type = Math.random() > 0.6 ? 'croc' : 'log';
        obstacles.push({ x, y: parseInt(r), length: type==='log'?cfg.length:Math.min(2,cfg.length-1), speed: cfg.speed*cfg.dir, type, zone:'river' });
      }
    });
    // roads
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

  // --- Drawing ---
  function drawPixelRect(x,y,w,h,color,stroke){
    ctx.fillStyle = color; ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
    if(stroke){ ctx.strokeStyle = stroke; ctx.strokeRect(Math.round(x)+0.5,Math.round(y)+0.5,Math.round(w)-1,Math.round(h)-1); }
  }

  // Función auxiliar para dibujar una rana (usada para el jugador y las metas)
  function renderFrogBody(cx, cy) {
    drawPixelRect(cx-TILE*0.28, cy+TILE*0.22, TILE*0.56, TILE*0.16,'rgba(0,0,0,0.25)');
    drawPixelRect(cx-TILE*0.28, cy-TILE*0.18, TILE*0.56, TILE*0.42,'#6fe9a0','#2f7f56');
    drawPixelRect(cx-TILE*0.18,cy-TILE*0.32,TILE*0.12,TILE*0.12,'#fff');
    drawPixelRect(cx+TILE*0.06,cy-TILE*0.32,TILE*0.12,TILE*0.12,'#fff');
    drawPixelRect(cx-TILE*0.12,cy-TILE*0.28,TILE*0.06,TILE*0.06,'#001');
    drawPixelRect(cx+TILE*0.12,cy-TILE*0.28,TILE*0.06,TILE*0.06,'#001');
  }

  function drawScene(){
    for (let r=0;r<ROWS;r++){
      const lane = lanes[r];
      if(lane.type==='goal'){
        drawPixelRect(0,r*TILE,W,TILE,'#2e8b57');
        // Dibuja las bahías (casillas meta) en posiciones 1, 5, 9, 13, 17
        for(let j=1;j<COLS;j+=4){ 
            drawPixelRect(j*TILE+4,r*TILE+6,TILE*2-8,TILE-12,'#36b97a'); 
        }
      } else if(lane.type==='river'){
        drawPixelRect(0,r*TILE,W,TILE,'#1b83b6');
      } else if(lane.type==='safe' || lane.type==='start'){
        drawPixelRect(0,r*TILE,W,TILE,'#3a8b6e');
      } else if(lane.type==='road'){
        drawPixelRect(0,r*TILE,W,TILE,'#2b3b4b');
        for(let j=0;j<COLS;j+=2){ drawPixelRect(j*TILE + TILE*0.45, r*TILE + TILE*0.45, TILE*0.2, TILE*0.1,'rgba(255,255,255,0.15)'); }
      }
    }
    
    // ➡️ NUEVO: Dibujar las ranas que ya han llegado a casa
    filledHomes.forEach(homeX => {
        // El centro de la casilla meta. Las casillas tienen ancho 2 tiles.
        // homeX es el inicio (ej: 1), el centro es 1 + 1 = 2 tiles en X
        const cx = (homeX * TILE) + TILE; 
        const cy = (0 * TILE) + TILE/2;
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

  function drawFrog(){
    if (gameOver) return;
    const cx=frog.x*TILE+TILE/2, cy=frog.y*TILE+TILE/2;
    renderFrogBody(cx, cy);
  }

  // --- Movement ---
  let tween = null;
  function jumpTo(tx,ty,duration=100){
    if(tween) cancelAnimationFrame(tween.raf);
    const sx=frog.x, sy=frog.y;
    frog.anim=true;
    let start=null;
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

  // --- Update logic ---
  function rectsOverlap(ax,ay,aw,ah,bx,by,bw,bh){
    return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
  }

  function updateLogic(){
    obstacles.forEach(o=>{
      o.x += o.speed;
      if(o.speed>0 && o.x>COLS) o.x=-o.length;
      if(o.speed<0 && o.x<-o.length) o.x=COLS;
    });

    if(frog.anim) return; // Esperar a que termine el salto para comprobar colisiones

    const fcx=frog.x*TILE+TILE/2;
    const fcy=frog.y*TILE+TILE/2;
    const laneIndex = Math.floor(frog.y);
    const lane = lanes[laneIndex];

    if(lane.type==='road'){
      const dead = obstacles.some(o=>o.zone==='road' && o.y===laneIndex && rectsOverlap(
        fcx-TILE*0.36, fcy-TILE*0.36, TILE*0.72, TILE*0.72,
        o.x*TILE, o.y*TILE+4, o.length*TILE, TILE-8
      ));
      if(dead) loseLife();

    } else if(lane.type==='river'){
      const under = obstacles.find(o=>o.zone==='river' && o.y===laneIndex && fcx<(o.x+o.length)*TILE && fcx+TILE>o.x*TILE);
      if(under){
        if(under.type==='log' || under.type==='croc'){ frog.x += under.speed; }
      } else { loseLife(); }
      
      // Límites laterales en el río
      if(frog.x < 0 || frog.x > COLS-1) loseLife();

    } else if(lane.type==='goal'){
       // ➡️ NUEVO: Lógica de Llegada a Meta
       // Las metas están visualmente en x = 1, 5, 9, 13, 17. Tienen ancho de 2 tiles.
       // Comprobamos si la rana está alineada con alguna de estas "bahías".
       const validSlots = [1, 5, 9, 13, 17];
       let landedSafe = false;

       for(let slotX of validSlots) {
           // Margen de error: Si la rana está dentro de la casilla (ancho 2)
           if (frog.x >= slotX - 0.5 && frog.x <= slotX + 1.5) {
               if (filledHomes.includes(slotX)) {
                   // Casilla ocupada -> Muerte
                   loseLife();
               } else {
                   // Casilla vacía -> Éxito
                   filledHomes.push(slotX);
                   score += 200; // Puntos por llegar
                   landedSafe = true;
                   
                   // Verificar si completó las 5 casillas
                   if (filledHomes.length === 5) {
                       score += 1000; // Bonus de nivel
                       filledHomes = []; // Limpiar casillas
                       // Aquí podrías aumentar la velocidad de los obstáculos si quisieras
                   }
                   respawnFrog();
               }
               break;
           }
       }

       if (!landedSafe && !gameOver) {
           // Si llegó a la fila 0 pero no entró en una bahía (chocó con el muro verde)
           loseLife();
       }
    }

    // ➡️ Actualizar marcadores HTML
    if(scoreValue) scoreValue.textContent = score;
    if(livesValue) livesValue.textContent = lives;
  }

  function loseLife(){
    lives = Math.max(0, lives-1);
    if(livesValue) livesValue.textContent = lives;
    
    if(lives > 0){ 
        respawnFrog(); 
    } else {
      if(finalScore) finalScore.textContent = score;
      if(overlayTitle) overlayTitle.textContent = "GAME OVER";
      if(overlay) overlay.classList.remove('hidden');
      gameOver = true;
    }
  }

  function respawnFrog(){ 
      frog.x = 10; 
      frog.y = 14; 
      frog.anim = false; 
  }

  // --- Keyboard ---
  window.addEventListener('keydown', e=>{
    if(gameOver) return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
    if(e.key==='ArrowUp') moveFrog('UP');
    if(e.key==='ArrowDown') moveFrog('DOWN');
    if(e.key==='ArrowLeft') moveFrog('LEFT');
    if(e.key==='ArrowRight') moveFrog('RIGHT');
  });

  // --- Touch Controls ---
  ['up','down','left','right'].forEach(dir => {
    const btn = document.getElementById(dir);
    if(!btn) return;
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault(); 
        moveFrog(dir.toUpperCase());
    }, {passive: false});
    btn.addEventListener('click', (e) => {
        if (e.pointerType === 'mouse' || e.detail === 0) moveFrog(dir.toUpperCase());
    });
  });

  // --- Restart ---
  if(btnRestart) {
      btnRestart.addEventListener('click', ()=>{
        overlay.classList.add('hidden');
        lives=3; score=0; gameOver=false;
        filledHomes = []; // Reiniciar casillas
        spawnObstacles(); respawnFrog();
        scoreValue.textContent=score;
        livesValue.textContent=lives;
        requestAnimationFrame(loop);
      });
  }

  // --- Main loop ---
  function loop(){
    if(gameOver) return;
    updateLogic();
    ctx.clearRect(0,0,W,H);
    drawScene();
    drawObstacles();
    drawFrog();
    requestAnimationFrame(loop);
  }

  // --- Start ---
  if(scoreValue) scoreValue.textContent=score;
  if(livesValue) livesValue.textContent=lives;
  requestAnimationFrame(loop);
});
