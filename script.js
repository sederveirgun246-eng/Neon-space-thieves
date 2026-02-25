/* =====================================================
NEON SPACE THIEVES — script.js
Pure vanilla JS — no frameworks required.
===================================================== */

// ─────────────────────────────────────────────────────
//  GAME DATA  (previously stored as JSON)
// ─────────────────────────────────────────────────────
const GAME_DATA = {
arena:    { x: 40, y: 80, w: 720, h: 480 },
ships: [
{ id: “p1”, color: “#00ffff”, cockpit: “#004466”, wing: “#66ffff”,
startX: 160, startY: 320, startAngle: 0,
controls: { up: “KeyW”, down: “KeyS”, left: “KeyA”, right: “KeyD” } },
{ id: “p2”, color: “#ff44aa”, cockpit: “#440020”, wing: “#ff66cc”,
startX: 640, startY: 320, startAngle: Math.PI,
controls: { up: “ArrowUp”, down: “ArrowDown”, left: “ArrowLeft”, right: “ArrowRight” } }
],
physics: {
accel:    0.55,
friction: 0.88,
maxSpeed: 4.5,
shipSize: 18
},
coin: {
radius:      12,
spinSpeed:   0.06,
pulseSpeed:  0.08
},
meteors: {
count:       4,
radius:      22,
speed:       1.8,
rotSpeedMax: 0.04
},
rules: {
winScore:        15,
freezeDuration:  2000   /* ms */
},
visuals: {
starCount:  120,
nebulaCount: 6
}
};

// ─────────────────────────────────────────────────────
//  CANVAS SETUP
// ─────────────────────────────────────────────────────
const canvas  = document.getElementById(“gameCanvas”);
const ctx     = canvas.getContext(“2d”);
const overlay = document.getElementById(“overlay”);
const overlayTitle  = document.getElementById(“overlay-title”);
const overlayWinner = document.getElementById(“overlay-winner”);
const replayBtn     = document.getElementById(“replay-btn”);

const { arena, physics, coin: coinCfg, meteors: meteorCfg, rules, visuals } = GAME_DATA;

// ─────────────────────────────────────────────────────
//  STATIC BACKGROUND ASSETS  (generated once)
// ─────────────────────────────────────────────────────
const STARS = Array.from({ length: visuals.starCount }, () => ({
x:       Math.random() * canvas.width,
y:       Math.random() * canvas.height,
r:       Math.random() * 1.5 + 0.3,
twinkle: Math.random() * Math.PI * 2,
speed:   Math.random() * 0.02 + 0.01
}));

const NEBULAS = Array.from({ length: visuals.nebulaCount }, () => ({
x:     Math.random() * canvas.width,
y:     Math.random() * canvas.height,
rx:    80  + Math.random() * 120,
ry:    50  + Math.random() * 100,
hue:   Math.random() > 0.5 ? 270 : 220,
alpha: 0.03 + Math.random() * 0.05
}));

// ─────────────────────────────────────────────────────
//  INPUT
// ─────────────────────────────────────────────────────
const keys = {};
window.addEventListener(“keydown”, e => {
keys[e.code] = true;
if ([“ArrowUp”,“ArrowDown”,“ArrowLeft”,“ArrowRight”].includes(e.code)) e.preventDefault();
});
window.addEventListener(“keyup”, e => { keys[e.code] = false; });

// ─────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────
function randArena(margin = 40) {
return {
x: arena.x + margin + Math.random() * (arena.w - margin * 2),
y: arena.y + margin + Math.random() * (arena.h - margin * 2)
};
}

function circlesOverlap(ax, ay, ar, bx, by, br) {
const dx = ax - bx, dy = ay - by;
return dx * dx + dy * dy < (ar + br) * (ar + br);
}

// ─────────────────────────────────────────────────────
//  GAME STATE
// ─────────────────────────────────────────────────────
let state = {};

function buildMeteors() {
return Array.from({ length: meteorCfg.count }, (_, i) => {
const pos   = randArena(60);
const angle = (Math.PI * 2 * i) / meteorCfg.count + Math.random() * 0.5;
return {
x:        pos.x,
y:        pos.y,
vx:       Math.cos(angle) * meteorCfg.speed,
vy:       Math.sin(angle) * meteorCfg.speed,
rot:      Math.random() * Math.PI * 2,
rotSpeed: (Math.random() - 0.5) * meteorCfg.rotSpeedMax
};
});
}

function buildPlayer(shipDef) {
return {
x:           shipDef.startX,
y:           shipDef.startY,
vx:          0,
vy:          0,
angle:       shipDef.startAngle,
score:       0,
frozen:      false,
frozenUntil: 0,
def:         shipDef          // reference to static config
};
}

function initState() {
state = {
players:   GAME_DATA.ships.map(buildPlayer),
coin:      randArena(),
meteors:   buildMeteors(),
coinSpin:  0,
coinPulse: 0,
winner:    null,
running:   true
};
overlay.classList.add(“hidden”);
}

// ─────────────────────────────────────────────────────
//  UPDATE
// ─────────────────────────────────────────────────────
function update() {
if (!state.running) return;

const now = Date.now();

// Coin animation
state.coinSpin  += coinCfg.spinSpeed;
state.coinPulse += coinCfg.pulseSpeed;

// ── Meteors ──
for (const m of state.meteors) {
m.x   += m.vx;
m.y   += m.vy;
m.rot += m.rotSpeed;

```
if (m.x - meteorCfg.radius < arena.x)              { m.x = arena.x + meteorCfg.radius;              m.vx *= -1; }
if (m.x + meteorCfg.radius > arena.x + arena.w)    { m.x = arena.x + arena.w - meteorCfg.radius;    m.vx *= -1; }
if (m.y - meteorCfg.radius < arena.y)              { m.y = arena.y + meteorCfg.radius;              m.vy *= -1; }
if (m.y + meteorCfg.radius > arena.y + arena.h)    { m.y = arena.y + arena.h - meteorCfg.radius;    m.vy *= -1; }
```

}

// ── Players ──
for (const p of state.players) {
// Unfreeze check
if (p.frozen) {
if (now > p.frozenUntil) p.frozen = false;
continue;
}

```
const ctrl = p.def.controls;
if (keys[ctrl.up])    p.vy -= physics.accel;
if (keys[ctrl.down])  p.vy += physics.accel;
if (keys[ctrl.left])  p.vx -= physics.accel;
if (keys[ctrl.right]) p.vx += physics.accel;

p.vx *= physics.friction;
p.vy *= physics.friction;

const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
if (spd > physics.maxSpeed) {
  p.vx = (p.vx / spd) * physics.maxSpeed;
  p.vy = (p.vy / spd) * physics.maxSpeed;
}
if (spd > 0.1) p.angle = Math.atan2(p.vy, p.vx);

p.x += p.vx;
p.y += p.vy;

// Clamp inside arena
p.x = Math.max(arena.x + physics.shipSize, Math.min(arena.x + arena.w - physics.shipSize, p.x));
p.y = Math.max(arena.y + physics.shipSize, Math.min(arena.y + arena.h - physics.shipSize, p.y));

// ── Coin collection ──
if (circlesOverlap(p.x, p.y, physics.shipSize - 4, state.coin.x, state.coin.y, coinCfg.radius)) {
  p.score++;
  state.coin = randArena();
  if (p.score >= rules.winScore) {
    endGame(p);
    return;
  }
}

// ── Meteor collisions ──
for (const m of state.meteors) {
  if (circlesOverlap(p.x, p.y, physics.shipSize - 6, m.x, m.y, meteorCfg.radius - 4)) {
    p.frozen      = true;
    p.frozenUntil = now + rules.freezeDuration;
    p.vx = 0;
    p.vy = 0;
    break;
  }
}
```

}
}

function endGame(winner) {
state.running = false;
state.winner  = winner;

const col = winner.def.color;
overlayTitle.style.color  = col;
overlayTitle.style.textShadow = `0 0 30px ${col}`;
const num = state.players.indexOf(winner) + 1;
overlayWinner.textContent = `PLAYER ${num} WINS!`;
overlay.classList.remove(“hidden”);
}

// ─────────────────────────────────────────────────────
//  RENDER HELPERS
// ─────────────────────────────────────────────────────
function drawBackground(t) {
ctx.fillStyle = “#050510”;
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Nebula clouds
for (const n of NEBULAS) {
ctx.save();
ctx.scale(1, n.ry / n.rx);
const ny = n.y * (n.rx / n.ry);
const grad = ctx.createRadialGradient(n.x, ny, 0, n.x, ny, n.rx);
grad.addColorStop(0, `hsla(${n.hue},80%,50%,${n.alpha * 2})`);
grad.addColorStop(1, `hsla(${n.hue},80%,30%,0)`);
ctx.fillStyle = grad;
ctx.beginPath();
ctx.arc(n.x, ny, n.rx, 0, Math.PI * 2);
ctx.fill();
ctx.restore();
}

// Stars
for (const s of STARS) {
const alpha = 0.5 + 0.5 * Math.sin(s.twinkle + t * s.speed);
ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
ctx.beginPath();
ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
ctx.fill();
}
}

function drawArena() {
ctx.shadowColor = “#cc00ff”;
ctx.shadowBlur  = 20;
ctx.strokeStyle = “#cc00ff”;
ctx.lineWidth   = 3;
ctx.strokeRect(arena.x, arena.y, arena.w, arena.h);

ctx.shadowBlur  = 8;
ctx.strokeStyle = “#ff66ff”;
ctx.lineWidth   = 1;
ctx.strokeRect(arena.x + 4, arena.y + 4, arena.w - 8, arena.h - 8);
ctx.shadowBlur  = 0;
}

function drawHUD() {
// Background bar
ctx.fillStyle = “rgba(0,0,5,0.85)”;
ctx.fillRect(0, 0, canvas.width, 72);
ctx.strokeStyle = “#440066”;
ctx.lineWidth   = 1;
ctx.strokeRect(0, 70, canvas.width, 1);

const [p1, p2] = state.players;

// P1 score
ctx.font        = “bold 22px ‘Courier New’, monospace”;
ctx.shadowColor = p1.def.color;
ctx.shadowBlur  = 12;
ctx.fillStyle   = p1.def.color;
ctx.textAlign   = “left”;
ctx.fillText(`P1 SCORE: ${p1.score}`, 60, 44);

// P2 score
ctx.shadowColor = p2.def.color;
ctx.shadowBlur  = 12;
ctx.fillStyle   = p2.def.color;
ctx.textAlign   = “right”;
ctx.fillText(`P2 SCORE: ${p2.score}`, 740, 44);

// Title
ctx.shadowColor = “#aa44ff”;
ctx.shadowBlur  = 8;
ctx.fillStyle   = “#cc88ff”;
ctx.font        = “bold 13px ‘Courier New’, monospace”;
ctx.textAlign   = “center”;
ctx.fillText(“★ NEON SPACE THIEVES ★”, 400, 28);

// Subtitle
ctx.font      = “10px ‘Courier New’, monospace”;
ctx.fillStyle = “#6644aa”;
ctx.shadowBlur = 0;
ctx.fillText(“P1: WASD  |  P2: ARROWS  |  First to 15 wins!”, 400, 54);
}

function drawShip(p) {
const frozen = p.frozen;
const col    = frozen ? “#888” : p.def.color;

ctx.save();
ctx.translate(p.x, p.y);
ctx.rotate(p.angle);

ctx.shadowColor = frozen ? “#444” : p.def.color;
ctx.shadowBlur  = frozen ? 4 : 14;

// Body
ctx.fillStyle = col;
ctx.beginPath();
ctx.moveTo(18,  0);
ctx.lineTo(-10, -10);
ctx.lineTo(-6,   0);
ctx.lineTo(-10,  10);
ctx.closePath();
ctx.fill();

// Cockpit
ctx.fillStyle = frozen ? “#555” : p.def.cockpit;
ctx.beginPath();
ctx.ellipse(4, 0, 6, 4, 0, 0, Math.PI * 2);
ctx.fill();

// Wing accents
ctx.strokeStyle = frozen ? “#666” : p.def.wing;
ctx.lineWidth   = 1.5;
ctx.beginPath();
ctx.moveTo( 0, -10); ctx.lineTo(-8, -14); ctx.lineTo(-10, -10);
ctx.moveTo( 0,  10); ctx.lineTo(-8,  14); ctx.lineTo(-10,  10);
ctx.stroke();

// Freeze rings
if (frozen) {
ctx.strokeStyle = “rgba(150,200,255,0.5)”;
ctx.lineWidth   = 1;
ctx.globalAlpha = 0.35;
for (let i = 0; i < 4; i++) {
ctx.beginPath();
ctx.arc(0, 0, 14 + i * 5, 0, Math.PI * 2);
ctx.stroke();
}
ctx.globalAlpha = 1;
}

ctx.restore();
}

function drawCoin() {
const { x, y } = state.coin;
const spin  = state.coinSpin;
const pulse = state.coinPulse;

ctx.save();
ctx.translate(x, y);

const glow   = 8 + Math.sin(pulse) * 6;
ctx.shadowColor = “#ffdd00”;
ctx.shadowBlur  = glow * 2;

const scaleX = Math.abs(Math.cos(spin)) + 0.1;
ctx.scale(scaleX, 1);

const hue  = 45 + Math.sin(pulse) * 10;
const lum  = 55 + Math.sin(pulse) * 10;
ctx.fillStyle = `hsl(${hue}, 100%, ${lum}%)`;
ctx.beginPath();
ctx.arc(0, 0, coinCfg.radius, 0, Math.PI * 2);
ctx.fill();

ctx.strokeStyle = “#fff8a0”;
ctx.lineWidth   = 2;
ctx.stroke();

ctx.fillStyle      = “#fffde0”;
ctx.shadowBlur     = 0;
ctx.font           = “bold 11px monospace”;
ctx.textAlign      = “center”;
ctx.textBaseline   = “middle”;
ctx.fillText(”$”, 0, 1);

ctx.restore();
}

function drawMeteor(m) {
ctx.save();
ctx.translate(m.x, m.y);
ctx.rotate(m.rot);

ctx.shadowColor = “#a87050”;
ctx.shadowBlur  = 6;

const pts = 8;
ctx.beginPath();
for (let i = 0; i < pts; i++) {
const a = (Math.PI * 2 * i) / pts;
const r = meteorCfg.radius * (0.7 + 0.3 * ((i * 7919) % 13) / 13);
const px = Math.cos(a) * r;
const py = Math.sin(a) * r;
i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
}
ctx.closePath();

const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, meteorCfg.radius);
grad.addColorStop(0,   “#b09070”);
grad.addColorStop(0.5, “#7a5a40”);
grad.addColorStop(1,   “#3a2a1a”);
ctx.fillStyle = grad;
ctx.fill();

ctx.strokeStyle = “#c0a080”;
ctx.lineWidth   = 1;
ctx.stroke();

ctx.restore();
}

// ─────────────────────────────────────────────────────
//  MAIN RENDER
// ─────────────────────────────────────────────────────
function render(timestamp) {
const t = timestamp / 100; // slow-moving time value for star twinkle

drawBackground(t);
drawArena();
drawHUD();

for (const m of state.meteors) drawMeteor(m);
drawCoin();
for (const p of state.players) drawShip(p);
}

// ─────────────────────────────────────────────────────
//  GAME LOOP
// ─────────────────────────────────────────────────────
let animId = null;

function loop(timestamp) {
update();
render(timestamp);
animId = requestAnimationFrame(loop);
}

function startGame() {
if (animId) cancelAnimationFrame(animId);
initState();
animId = requestAnimationFrame(loop);
}

// ─────────────────────────────────────────────────────
//  REPLAY BUTTON
// ─────────────────────────────────────────────────────
replayBtn.addEventListener(“click”, startGame);

// ─────────────────────────────────────────────────────
//  KICK OFF
// ─────────────────────────────────────────────────────
startGame();
