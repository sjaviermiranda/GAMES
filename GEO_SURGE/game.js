"use strict";

/* ════════════════════════════════════════
   CONSTANTES
════════════════════════════════════════ */
const CANVAS_SIZE      = 500;
const PLAYER_SIZE      = 22;       // cubo (mitad del lado)
const PLAYER_SPEED     = 6;
const ENEMY_SIZE       = 13;       // diamante (radio)
const BASE_ENEMY_SPEED = 5;
const LEVEL_INTERVAL   = 10;
const LEVEL_MSG_FRAMES = 90;
const TRAIL_MAX        = 40;
const TRAIL_LIFE       = 18;
const TOP_SCORES       = 10;
const SCORES_KEY       = "geosurge_scores";

// Paleta neón
const COL = {
  cyan:    "#00fff7",
  yellow:  "#ffe600",
  orange:  "#ff8c00",
  red:     "#ff2244",
  magenta: "#ff00cc",
  white:   "#ffffff",
};

/* ════════════════════════════════════════
   FONDO ANIMADO (bgCanvas)
════════════════════════════════════════ */
const BgScene = (() => {
  const canvas = document.getElementById("bgCanvas");
  const ctx    = canvas.getContext("2d");
  let shapes   = [];
  let raf;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function randomShape() {
    const types = ["triangle", "square", "diamond"];
    return {
      type:    types[Math.floor(Math.random() * types.length)],
      x:       Math.random() * canvas.width,
      y:       Math.random() * canvas.height,
      size:    12 + Math.random() * 28,
      angle:   Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.015,
      vx:      (Math.random() - 0.5) * 0.4,
      vy:      (Math.random() - 0.5) * 0.4,
      alpha:   0.08 + Math.random() * 0.18,
      color:   [COL.cyan, COL.yellow, COL.magenta, COL.orange][Math.floor(Math.random() * 4)],
    };
  }

  function drawShape(s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.strokeStyle = s.color;
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = s.alpha;
    ctx.shadowColor  = s.color;
    ctx.shadowBlur   = 8;
    ctx.beginPath();
    const r = s.size;
    if (s.type === "square") {
      ctx.rect(-r, -r, r * 2, r * 2);
    } else if (s.type === "diamond") {
      ctx.moveTo(0, -r); ctx.lineTo(r, 0);
      ctx.lineTo(0, r);  ctx.lineTo(-r, 0);
      ctx.closePath();
    } else {
      // triangle
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.866, r * 0.5);
      ctx.lineTo(-r * 0.866, r * 0.5);
      ctx.closePath();
    }
    ctx.stroke();
    ctx.restore();
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    shapes.forEach(s => {
      s.x     += s.vx;
      s.y     += s.vy;
      s.angle += s.rotSpeed;
      if (s.x < -60)              s.x = canvas.width  + 60;
      if (s.x > canvas.width + 60) s.x = -60;
      if (s.y < -60)              s.y = canvas.height + 60;
      if (s.y > canvas.height + 60) s.y = -60;
      drawShape(s);
    });
    raf = requestAnimationFrame(tick);
  }

  function init() {
    resize();
    window.addEventListener("resize", resize);
    shapes = Array.from({ length: 35 }, randomShape);
    tick();
  }

  function stop() { cancelAnimationFrame(raf); }

  return { init, stop };
})();

/* ════════════════════════════════════════
   SCORES
════════════════════════════════════════ */
const Scores = {
  load() {
    return JSON.parse(localStorage.getItem(SCORES_KEY)) || [];
  },
  save(score) {
    const s = this.load();
    s.push(score);
    s.sort((a, b) => b - a);
    localStorage.setItem(SCORES_KEY, JSON.stringify(s.slice(0, TOP_SCORES)));
  },
  render(targetId) {
    const list = document.getElementById(targetId);
    if (!list) return;
    const scores = this.load();
    list.innerHTML = scores.length
      ? scores.map(s => `<li>${s}s</li>`).join("")
      : `<li style="color:rgba(255,255,255,0.3);border-left:3px solid #333">sin puntajes aún</li>`;
  },
};

/* ════════════════════════════════════════
   PARTICLES  (explosión al morir)
════════════════════════════════════════ */
const Particles = {
  list: [],

  spawn(x, y, count = 20) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
      const speed = 2 + Math.random() * 4;
      this.list.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 40 + Math.random() * 30,
        maxLife: 0,
        size: 3 + Math.random() * 4,
        color: [COL.cyan, COL.yellow, COL.red, COL.magenta][Math.floor(Math.random() * 4)],
        shape: Math.random() > 0.5 ? "square" : "diamond",
      });
      this.list[this.list.length - 1].maxLife = this.list[this.list.length - 1].life;
    }
  },

  update() {
    this.list.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.93;
      p.vy *= 0.93;
      p.life--;
    });
    this.list = this.list.filter(p => p.life > 0);
  },

  draw(ctx) {
    this.list.forEach(p => {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha  = alpha;
      ctx.fillStyle    = p.color;
      ctx.shadowColor  = p.color;
      ctx.shadowBlur   = 10;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.life * 0.1);
      const s = p.size;
      ctx.beginPath();
      if (p.shape === "square") {
        ctx.rect(-s / 2, -s / 2, s, s);
      } else {
        ctx.moveTo(0, -s); ctx.lineTo(s, 0);
        ctx.lineTo(0, s);  ctx.lineTo(-s, 0);
        ctx.closePath();
      }
      ctx.fill();
      ctx.restore();
    });
  },

  clear() { this.list = []; },
};

/* ════════════════════════════════════════
   RENDERER  (canvas del juego)
════════════════════════════════════════ */
const Renderer = {
  canvas: null,
  ctx:    null,

  init(canvasEl) {
    this.canvas = canvasEl;
    this.ctx    = canvasEl.getContext("2d");
  },

  clear() { this.ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE); },

  /* Fondo con cuadrícula neón */
  drawBackground() {
    const ctx = this.ctx;
    // fondo oscuro
    ctx.fillStyle = "#08080f";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // cuadrícula
    ctx.strokeStyle = "rgba(0,255,247,0.07)";
    ctx.lineWidth   = 1;
    const GRID = 40;
    for (let x = 0; x <= CANVAS_SIZE; x += GRID) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_SIZE); ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_SIZE; y += GRID) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_SIZE, y); ctx.stroke();
    }

    // borde interior luminoso
    ctx.strokeStyle = "rgba(0,255,247,0.3)";
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(1, 1, CANVAS_SIZE - 2, CANVAS_SIZE - 2);
  },

  /* Estela: cubos transparentes */
  drawTrail(trail) {
    const ctx = this.ctx;
    trail.forEach(t => {
      const alpha = (t.life / TRAIL_LIFE) * 0.5;
      const s     = PLAYER_SIZE;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.angle);
      ctx.fillStyle   = `rgba(0,255,247,${alpha})`;
      ctx.shadowColor = COL.cyan;
      ctx.shadowBlur  = 6;
      ctx.fillRect(-s, -s, s * 2, s * 2);
      ctx.restore();
    });
  },

  /* Jugador: cubo neón con borde y glow */
  drawPlayer(player) {
    const ctx = this.ctx;
    const s   = PLAYER_SIZE;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    // glow exterior
    ctx.shadowColor = COL.cyan;
    ctx.shadowBlur  = 20;

    // relleno
    const grad = ctx.createLinearGradient(-s, -s, s, s);
    grad.addColorStop(0, "rgba(0,255,247,0.9)");
    grad.addColorStop(1, "rgba(0,180,220,0.6)");
    ctx.fillStyle = grad;
    ctx.fillRect(-s, -s, s * 2, s * 2);

    // borde brillante
    ctx.strokeStyle = COL.white;
    ctx.lineWidth   = 2;
    ctx.shadowBlur  = 30;
    ctx.strokeRect(-s, -s, s * 2, s * 2);

    // detalle interior (X)
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth   = 1;
    ctx.shadowBlur  = 0;
    ctx.beginPath();
    ctx.moveTo(-s + 4, -s + 4); ctx.lineTo(s - 4, s - 4);
    ctx.moveTo(s - 4,  -s + 4); ctx.lineTo(-s + 4, s - 4);
    ctx.stroke();

    ctx.restore();
  },

  /* Enemigos: diamantes rojos/naranjas con glow */
  drawEnemies(enemies) {
    const ctx = this.ctx;
    enemies.forEach((e, i) => {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle);

      const hue   = i % 2 === 0 ? COL.red : COL.orange;
      ctx.shadowColor = hue;
      ctx.shadowBlur  = 18;

      const r = ENEMY_SIZE;
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      grad.addColorStop(0, "rgba(255,80,80,0.95)");
      grad.addColorStop(1, "rgba(200,0,30,0.7)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = COL.red;
      ctx.lineWidth   = 1.5;
      ctx.stroke();

      ctx.restore();
    });
  },

  /* Destellos de rebote */
  drawLightEffects(effects) {
    const ctx = this.ctx;
    effects.forEach(ef => {
      const alpha = ef.life / 20;
      const g = ctx.createRadialGradient(ef.x, ef.y, 0, ef.x, ef.y, 35);
      g.addColorStop(0, `rgba(255,230,0,${alpha * 0.9})`);
      g.addColorStop(1, `rgba(255,140,0,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, 35, 0, Math.PI * 2);
      ctx.fill();
    });
  },

  /* HUD: nivel y tiempo con fuente Orbitron */
  drawHUD(level, elapsed) {
    const ctx = this.ctx;

    // Panel izquierdo
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(8, 8, 130, 62);

    ctx.font      = "bold 11px 'Orbitron', monospace";
    ctx.fillStyle = "rgba(0,255,247,0.5)";
    ctx.fillText("NIVEL", 16, 26);
    ctx.font      = "bold 22px 'Orbitron', monospace";
    ctx.fillStyle = COL.yellow;
    ctx.shadowColor = COL.yellow;
    ctx.shadowBlur  = 10;
    ctx.fillText(level, 16, 52);

    ctx.shadowBlur  = 0;
    ctx.font      = "bold 11px 'Orbitron', monospace";
    ctx.fillStyle = "rgba(0,255,247,0.5)";
    ctx.fillText("TIEMPO", 70, 26);
    ctx.font      = "bold 22px 'Orbitron', monospace";
    ctx.fillStyle = COL.cyan;
    ctx.shadowColor = COL.cyan;
    ctx.shadowBlur  = 10;
    ctx.fillText(elapsed + "s", 70, 52);
    ctx.shadowBlur  = 0;
  },

  /* Mensaje de nivel */
  drawLevelUpMessage(msg, timer) {
    if (timer <= 0) return;
    const ctx   = this.ctx;
    const alpha = Math.min(1, timer / 20);
    ctx.save();
    ctx.globalAlpha  = alpha;
    ctx.font         = "bold 36px 'Orbitron', monospace";
    ctx.textAlign    = "center";
    ctx.fillStyle    = COL.yellow;
    ctx.shadowColor  = COL.yellow;
    ctx.shadowBlur   = 30;
    ctx.fillText(msg, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 10);

    ctx.font      = "bold 13px 'Orbitron', monospace";
    ctx.fillStyle = COL.cyan;
    ctx.shadowColor = COL.cyan;
    ctx.shadowBlur  = 12;
    ctx.fillText("VELOCIDAD AUMENTADA", CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 20);
    ctx.restore();
  },
};

/* ════════════════════════════════════════
   GAME
════════════════════════════════════════ */
const Game = {
  running:       false,
  level:         1,
  startTime:     null,
  player:        { x: 250, y: 250, r: PLAYER_SIZE, angle: 0, speed: PLAYER_SPEED },
  enemies:       [],
  keys:          {},
  trail:         [],
  lightEffects:  [],
  levelUpMsg:    "",
  levelUpTimer:  0,
  dying:         false,   // true mientras se reproduce la animación de muerte

  /* ── Init ─────────────────────────── */
  init() {
    Renderer.init(document.getElementById("gameCanvas"));
    document.addEventListener("keydown", e => { this.keys[e.key] = true; });
    document.addEventListener("keyup",   e => { this.keys[e.key] = false; });
    BgScene.init();
    Scores.render("scoreListStart");
  },

  /* ── Start ────────────────────────── */
  start() {
    document.getElementById("startScreen").style.display    = "none";
    document.getElementById("gameOverScreen").style.display = "none";
    Renderer.canvas.style.display = "block";

    Object.assign(this.player, { x: 250, y: 250, angle: 0 });
    this.level        = 1;
    this.trail        = [];
    this.lightEffects = [];
    this.enemies      = [];
    this.levelUpMsg   = "";
    this.levelUpTimer = 0;
    this.dying        = false;
    Particles.clear();

    this.spawnEnemies();
    this.startTime = Date.now();
    this.running   = true;

    GameAudio.playMusic();
    this.loop();
  },

  /* ── Spawn ────────────────────────── */
  spawnEnemies() {
    this.enemies = [];
    const speed  = BASE_ENEMY_SPEED + this.level * 0.8;
    for (let i = 0; i < this.level + 1; i++) {
      let x, y;
      // Evitar spawn encima del jugador
      do {
        x = Math.random() * (CANVAS_SIZE - 40) + 20;
        y = Math.random() * (CANVAS_SIZE - 40) + 20;
      } while (Math.hypot(x - this.player.x, y - this.player.y) < 80);

      const angle = Math.random() * Math.PI * 2;
      this.enemies.push({
        x, y,
        r: ENEMY_SIZE,
        dx:    Math.cos(angle) * speed,
        dy:    Math.sin(angle) * speed,
        angle: 0,
      });
    }
  },

  /* ── Update ───────────────────────── */
  update() {
    if (!this.running) return;

    // Si está muriendo solo actualiza partículas
    if (this.dying) {
      Particles.update();
      return;
    }

    this._movePlayer();
    this._updateTrail();
    this._moveEnemies();
    this._resolveEnemyCollisions();
    this._checkPlayerCollision();
    this._checkLevelUp();
    Particles.update();
  },

  _movePlayer() {
    const { player, keys } = this;
    const moving = keys["w"] || keys["s"] || keys["a"] || keys["d"];
    if (keys["w"] && player.y - player.r > 0)            player.y -= player.speed;
    if (keys["s"] && player.y + player.r < CANVAS_SIZE)  player.y += player.speed;
    if (keys["a"] && player.x - player.r > 0)            player.x -= player.speed;
    if (keys["d"] && player.x + player.r < CANVAS_SIZE)  player.x += player.speed;
    // El cubo rota suavemente al moverse
    if (moving) player.angle += 0.06;
  },

  _updateTrail() {
    this.trail.push({ x: this.player.x, y: this.player.y, angle: this.player.angle, life: TRAIL_LIFE });
    if (this.trail.length > TRAIL_MAX) this.trail.shift();
  },

  _moveEnemies() {
    this.enemies.forEach(e => {
      e.x += e.dx;
      e.y += e.dy;
      e.angle += 0.04; // los diamantes rotan

      if (e.x - e.r < 0 || e.x + e.r > CANVAS_SIZE) {
        e.dx *= -1;
        this.lightEffects.push({ x: e.x, y: e.y, life: 20 });
      }
      if (e.y - e.r < 0 || e.y + e.r > CANVAS_SIZE) {
        e.dy *= -1;
        this.lightEffects.push({ x: e.x, y: e.y, life: 20 });
      }
    });
  },

  _resolveEnemyCollisions() {
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const a = this.enemies[i], b = this.enemies[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r) {
          [a.dx, b.dx] = [b.dx, a.dx];
          [a.dy, b.dy] = [b.dy, a.dy];
        }
      }
    }
  },

  _checkPlayerCollision() {
    const hit = this.enemies.some(
      e => Math.hypot(this.player.x - e.x, this.player.y - e.y) < this.player.r + e.r
    );
    if (hit) {
      GameAudio.playHit();
      // Explotar partículas desde el jugador
      Particles.spawn(this.player.x, this.player.y, 28);
      this.dying = true;
      // Esperar a que terminen las partículas y luego ir a gameOver
      setTimeout(() => this.gameOver(), 800);
    }
  },

  _checkLevelUp() {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    if (elapsed > 0 && elapsed % LEVEL_INTERVAL === 0 &&
        Math.floor(elapsed / LEVEL_INTERVAL) > this.level - 1) {
      this.level++;
      this.spawnEnemies();
      GameAudio.playLevelUp();
      this.levelUpMsg   = "NIVEL " + this.level;
      this.levelUpTimer = LEVEL_MSG_FRAMES;
    }
  },

  /* ── Draw ─────────────────────────── */
  draw() {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);

    Renderer.clear();
    Renderer.drawBackground();

    // Estela
    Renderer.drawTrail(this.trail);
    this.trail.forEach(t => t.life--);
    this.trail = this.trail.filter(t => t.life > 0);

    if (!this.dying) Renderer.drawPlayer(this.player);
    Renderer.drawEnemies(this.enemies);

    // Efectos de luz
    Renderer.drawLightEffects(this.lightEffects);
    this.lightEffects.forEach(ef => ef.life--);
    this.lightEffects = this.lightEffects.filter(ef => ef.life > 0);

    // Partículas
    Particles.draw(Renderer.ctx);

    Renderer.drawHUD(this.level, elapsed);
    Renderer.drawLevelUpMessage(this.levelUpMsg, this.levelUpTimer);
    if (this.levelUpTimer > 0) this.levelUpTimer--;
  },

  /* ── Loop ─────────────────────────── */
  loop() {
    this.update();
    this.draw();
    if (this.running) requestAnimationFrame(() => this.loop());
  },

  /* ── Game Over ────────────────────── */
  gameOver() {
    this.running = false;
    GameAudio.pauseMusic();
    Renderer.canvas.style.display = "none";

    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    document.getElementById("timeSurvived").textContent = elapsed + "s";

    Scores.save(elapsed);
    Scores.render("scoreListGameOver");

    const goScreen = document.getElementById("gameOverScreen");
    goScreen.style.display = "flex";
    goScreen.classList.remove("active");
    void goScreen.offsetWidth; // fuerza reflow para reiniciar animación
    goScreen.classList.add("active");
  },
};

/* ════════════════════════════════════════
   VISITOR COUNTER  (countapi.xyz)
   Namespace único para este juego.
════════════════════════════════════════ */
const VisitorCounter = (() => {
  // Namespace y key únicos — si publicás el juego cambiá "geosurge-demo" por tu dominio
  const NAMESPACE = "geosurge-game";
  const KEY       = "visitors";
  const API       = `https://api.countapi.xyz/hit/${NAMESPACE}/${KEY}`;

  const EL_IDS = ["visitCounter", "visitCounterGO"]; // ids en pantalla inicio y game over

  function setAll(text) {
    EL_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    });
  }

  async function hit() {
    setAll("...");
    try {
      const res  = await fetch(API);
      const data = await res.json();
      const num  = Number(data.value).toLocaleString("es-AR");
      setAll(num);
    } catch {
      setAll("—");
    }
  }

  return { hit };
})();

/* ════════════════════════════════════════
   ARRANQUE
════════════════════════════════════════ */
function startGame() { Game.start(); }
window.addEventListener("DOMContentLoaded", () => {
  Game.init();
  VisitorCounter.hit();
});
