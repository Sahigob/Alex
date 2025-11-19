document.addEventListener('DOMContentLoaded', () => {
  // --- 1. Configuración Canvas ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const W = 800, H = 600;
  canvas.width = W;
  canvas.height = H;
  const COLS = 20, ROWS = 15;
  const TILE = Math.floor(W / COLS);

  // --- 2. Referencias al HTML ---
  const uiScore = document.getElementById('score-value');
  const uiLives = document.getElementById('lives-value');
  const overlay = document.getElementById('overlay');
  // Necesitamos referencia al título y al botón para ocultarlo al terminar
  const overlayTitle = document.getElementById('overlay-title'); 
  const finalScore = document.getElementById('final-score');
  const btnRestart = document.getElementById('btn-restart');

  // --- 3. Estado del Juego ---
  let frog = { x: 10, y: 14, anim: false };
  let score = 0;
  let lives = 3;
  let gameOver = false;
  let filledHomes = []; 

  // --- 4. Carriles (Lanes) ---
  const lanes = [];
  for (let r = 0; r < ROWS; r++) {
    if (r === 0) lanes.push({ type: 'goal' });
    else if (r >= 1 && r <= 5) lanes.push({ type: 'river' });
    else if (r === 6 || r === 12) lanes.push({ type: 'safe' });
    else if (r >= 7 && r <= 11) lanes.push({ type: 'road' });
    else lanes.push({ type: 'start' });
  }

  // --- 5. Obstáculos ---
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
    Object.keys(laneConfigs.rivers).forEach(r => {
      const cfg = laneConfigs.rivers[r];
      const gap = Math.floor(COLS / cfg.count);
      for (let i = 0; i < cfg.count; i++) {
        const x = i * gap + Math.random() * Math.max(1, gap - cfg.length - 1);
        const type = Math.random() > 0.6 ? 'croc' : 'log';
        obstacles.push({ x, y: parseInt(r), length: type==='log'?cfg.length:Math.min(2,cfg.length-1), speed: cfg.speed*cfg.dir, type, zone:'river' });
      }
    });
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

  // --- 6. Dibujo ---
  function drawPixelRect(x,y,w,h,color,stroke){
    ctx.fillStyle = color; ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
    if(stroke){ ctx.strokeStyle = stroke; ctx.strokeRect(Math.round(x)+0.5,Math.round(y)+0.5,Math.round(w)-1,Math.round(h)-1); }
  }

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
    filledHomes.forEach(hx => {
        renderFrogBody((hx * TILE) + TILE, TILE/2);
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
    renderFrogBody(frog.x*TILE+TILE/2, frog.y*TILE+TILE/2);
  }

  // --- 7. Movimiento ---
  let tween = null;
  function jumpTo(tx,ty){
    if(tween) cancelAnimationFrame(tween.raf);
    const sx=frog.x, sy=frog.y;
    frog.anim=true;
    let start=null;
    const duration = 100;
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

  // --- 8. Lógica y Colisiones ---
  function rectsOverlap(ax,ay,aw,ah,bx,by,bw,bh){
    return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
  }

  // ➡️ NUEVA FUNCIÓN PARA FINALIZAR Y SALIR
  function finishGame(win) {
      if (gameOver) return;
      gameOver = true;

      // Actualizamos la interfaz del Overlay
      if (overlay) {
          overlay.classList.remove('hidden');
          if (finalScore) finalScore.textContent = score;
          
          if (overlayTitle) {
              overlayTitle.textContent = win ? "¡VICTORIA!" : "GAME OVER";
              overlayTitle.style.color = win ? "#00dd99" : "#ff5555";
          }
          
          // Ocultar botón reiniciar para evitar clicks mientras nos vamos
          if(btnRestart) btnRestart.style.display = 'none';
      }

      // Esperamos 2.5s y llamamos al padre (Lógica del Arkanoid)
      setTimeout(() => {
          try {
              // 1. Intenta llamar a la función en la ventana padre
              if (window.parent && window.parent !== window && typeof window.parent.endGame === 'function') {
                  window.parent.endGame(win);
              } else {
                  // 2. Fallback seguro: Redirige
                  window.location.href = '/'; 
              }
          } catch (e) {
              // 3. Fallback si hay error
              window.location.href = '/';
          }
      }, 2500);
  }

  function checkGoalLogic() {
    const homesX = [1, 5, 9, 13, 17];
    let safe = false;

    for(let hx of homesX) {
        if(frog.x >= hx - 0.2 && frog.x <= hx + 1.2) {
            if(filledHomes.includes(hx)) {
                return loseLife(); 
            } else {
                filledHomes.push(hx);
                score += 200;
                safe = true;
                
                // ➡️ Si llenamos las 5 casillas, GANAMOS y salimos
                if(filledHomes.length === 5) {
                    score += 1000;
                    finishGame(true); // True = Win
                    return;
                }
                
                respawnFrog();
                return;
            }
        }
    }
    if(!safe) loseLife();
  }

  function updateLogic(){
    obstacles.forEach(o=>{
      o.x += o.speed;
      if(o.speed>0 && o.x>COLS) o.x=-o.length;
      if(o.speed<0 && o.x<-o.length) o.x=COLS;
    });

    if(frog.anim) return;

    const fcx=frog.x*TILE+TILE/2;
    const fcy=frog.y*TILE+TILE/2;
    const rIndex = Math.floor(frog.y);
    const lane = lanes[rIndex];

    if(lane.type==='road'){
      const hit = obstacles.some(o=>o.zone==='road' && o.y===rIndex && rectsOverlap(
        fcx-TILE*0.3, fcy-TILE*0.3, TILE*0.6, TILE*0.6,
        o.x*TILE, o.y*TILE+4, o.length*TILE, TILE-8
      ));
      if(hit) loseLife();

    } else if(lane.type==='river'){
      const log = obstacles.find(o=>o.zone==='river' && o.y===rIndex && fcx<(o.x+o.length)*TILE && fcx+TILE>o.x*TILE);
      if(log) frog.x += log.speed;
      else loseLife();
      
      if(frog.x < -0.5 || frog.x > COLS-0.5) loseLife();

    } else if(lane.type==='goal'){
       checkGoalLogic();
    }

    if(uiScore) uiScore.textContent = score;
    if(uiLives) uiLives.textContent = lives;
  }

  function loseLife(){
    lives--;
    if(uiLives) uiLives.textContent = lives;
    if(lives > 0){
        respawnFrog();
    } else {
        // ➡️ Si mueres definitivamente, llamas al endGame con False (Derrota)
        finishGame(false);
    }
  }

  function respawnFrog(){
    frog.x = 10; frog.y = 14; frog.anim = false;
  }

  // --- 9. Inputs ---
  window.addEventListener('keydown', e=>{
    if(gameOver) return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
    if(e.key==='ArrowUp') moveFrog('UP');
    if(e.key==='ArrowDown') moveFrog('DOWN');
    if(e.key==='ArrowLeft') moveFrog('LEFT');
    if(e.key==='ArrowRight') moveFrog('RIGHT');
  });

  ['up','down','left','right'].forEach(id => {
    const btn = document.getElementById(id);
    if(btn){
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); moveFrog(id.toUpperCase()); }, {passive: false});
        btn.addEventListener('click', (e) => { moveFrog(id.toUpperCase()); });
    }
  });

  // El botón restart ahora solo sirve si quisieras jugar antes de que el temporizador te saque, 
  // pero por diseño lo he ocultado en finishGame. 
  if(btnRestart){
      btnRestart.addEventListener('click', ()=>{
        // Reinicio local (solo útil si no ha saltado el endGame aun)
        lives = 3; score = 0; filledHomes = []; gameOver = false;
        overlay.classList.add('hidden');
        respawnFrog();
        spawnObstacles();
        loop();
      });
  }

  // --- 10. Bucle Principal ---
  function loop(){
    // Nota: Seguimos dibujando incluso en GameOver para que no se borre la pantalla,
    // pero la lógica (updateLogic) se detiene dentro de la función si gameOver es true.
    if(!gameOver) updateLogic();
    
    ctx.clearRect(0,0,W,H);
    drawScene();
    drawObstacles();
    drawPlayer();
    requestAnimationFrame(loop);
  }

  if(uiScore) uiScore.textContent = score;
  if(uiLives) uiLives.textContent = lives;
  loop();
});
