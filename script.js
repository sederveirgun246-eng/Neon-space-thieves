alert("Hello!");
/* =====================================================
NEON SPACE THIEVES — script.js  [FIXED]
Zero external assets. Pure Canvas2D drawing only.
Auto-starts via window.onload at the bottom.
===================================================== */

// ─────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────
var CANVAS_W   = 800;
var CANVAS_H   = 600;

var ARENA_X    = 40;
var ARENA_Y    = 80;
var ARENA_W    = 720;
var ARENA_H    = 480;

var SHIP_SIZE  = 18;
var COIN_R     = 12;
var METEOR_R   = 22;
var WIN_SCORE  = 15;
var FREEZE_MS  = 2000;

var ACCEL      = 0.55;
var FRICTION   = 0.88;
var MAX_SPEED  = 4.5;

var P1_COLOR   = “#00ffff”;
var P2_COLOR   = “#ff44aa”;

// ─────────────────────────────────────────────────────
//  CANVAS + DOM REFS
// ─────────────────────────────────────────────────────
var canvas  = document.getElementById(“gameCanvas”);
var ctx     = canvas.getContext(“2d”);
var overlay = document.getElementById(“overlay”);
var oTitle  = document.getElementById(“overlay-title”);
var oWinner = document.getElementById(“overlay-winner”);
var oBtn    = document.getElementById(“replay-btn”);

// ─────────────────────────────────────────────────────
//  STATIC BACKGROUND OBJECTS  (generated once)
// ─────────────────────────────────────────────────────
var STARS = [];
for (var _s = 0; _s < 120; _s++) {
STARS.push({
x:     Math.random() * CANVAS_W,
y:     Math.random() * CANVAS_H,
r:     Math.random() * 1.4 + 0.3,
phase: Math.random() * Math.PI * 2,
speed: Math.random() * 0.02 + 0.008
});
}

var NEBULAS = [];
for (var _n = 0; _n < 6; _n++) {
NEBULAS.push({
x:     Math.random() * CANVAS_W,
y:     Math.random() * CANVAS_H,
r:     100 + Math.random() * 130,
hue:   Math.random() > 0.5 ? 270 : 220,
alpha: 0.04 + Math.random() * 0.05
});
}

// ─────────────────────────────────────────────────────
//  INPUT
// ─────────────────────────────────────────────────────
var keys = {};
window.addEventListener(“keydown”, function (e) {
keys[e.code] = true;
if (e.code === “ArrowUp” || e.code === “ArrowDown” ||
e.code === “ArrowLeft” || e.code === “ArrowRight”) {
e.preventDefault();
}
});
window.addEventListener(“keyup”, function (e) {
keys[e.code] = false;
});

// ─────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────
function randArena(margin) {
margin = margin || 40;
return {
x: ARENA_X + margin + Math.random() * (ARENA_W - margin * 2),
y: ARENA_Y + margin + Math.random() * (ARENA_H - margin * 2)
};
}

function circlesHit(ax, ay, ar, bx, by, br) {
var dx = ax - bx;
var dy = ay - by;
return (dx * dx + dy * dy) < (ar + br) * (ar + br);
}

function clamp(v, lo, hi) {
return v < lo ? lo : (v > hi ? hi : v);
}

// ─────────────────────────────────────────────────────
//  GAME STATE VARIABLES
// ─────────────────────────────────────────────────────
var p1, p2, coin, meteors, gameRunning, coinSpin, coinPulse;

function makeMeteors() {
var arr = [];
for (var i = 0; i < 4; i++) {
var pos   = randArena(60);
var angle = (Math.PI * 2 * i / 4) + Math.random() * 0.5;
arr.push({
x:        pos.x,
y:        pos.y,
vx:       Math.cos(angle) * 1.8,
vy:       Math.sin(angle) * 1.8,
rot:      Math.random() * Math.PI * 2,
rotSpeed: (Math.random() - 0.5) * 0.04
});
}
return arr;
}

function makePlayer(startX, startY, startAngle) {
return {
x:           startX,
y:           startY,
vx:          0,
vy:          0,
angle:       startAngle,
score:       0,
frozen:      false,
frozenUntil: 0
};
}

function initGame() {
p1          = makePlayer(ARENA_X + 120,              ARENA_Y + ARENA_H / 2, 0);
p2          = makePlayer(ARENA_X + ARENA_W - 120,    ARENA_Y + ARENA_H / 2, Math.PI);
coin        = randArena();
meteors     = makeMeteors();
coinSpin    = 0;
coinPulse   = 0;
gameRunning = true;
overlay.classList.add(“hidden”);
}

// ─────────────────────────────────────────────────────
//  UPDATE LOGIC
// ─────────────────────────────────────────────────────
function movePlayer(p, upKey, downKey, leftKey, rightKey) {
if (p.frozen) {
if (Date.now() > p.frozenUntil) p.frozen = false;
return;
}

if (keys[upKey])    p.vy -= ACCEL;
if (keys[downKey])  p.vy += ACCEL;
if (keys[leftKey])  p.vx -= ACCEL;
if (keys[rightKey]) p.vx += ACCEL;

p.vx *= FRICTION;
p.vy *= FRICTION;

var spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
if (spd > MAX_SPEED) {
p.vx = (p.vx / spd) * MAX_SPEED;
p.vy = (p.vy / spd) * MAX_SPEED;
}
if (spd > 0.1) p.angle = Math.atan2(p.vy, p.vx);

p.x += p.vx;
p.y += p.vy;
p.x  = clamp(p.x, ARENA_X + SHIP_SIZE, ARENA_X + ARENA_W - SHIP_SIZE);
p.y  = clamp(p.y, ARENA_Y + SHIP_SIZE, ARENA_Y + ARENA_H - SHIP_SIZE);
}

function checkCoin(p) {
if (!p.frozen && circlesHit(p.x, p.y, SHIP_SIZE - 4, coin.x, coin.y, COIN_R)) {
p.score++;
coin = randArena();
return p.score >= WIN_SCORE;
}
return false;
}

function checkMeteors(p) {
if (p.frozen) return;
for (var i = 0; i < meteors.length; i++) {
var m = meteors[i];
if (circlesHit(p.x, p.y, SHIP_SIZE - 6, m.x, m.y, METEOR_R - 4)) {
p.frozen      = true;
p.frozenUntil = Date.now() + FREEZE_MS;
p.vx = 0;
p.vy = 0;
return;
}
}
}

function update() {
if (!gameRunning) return;

coinSpin  += 0.06;
coinPulse += 0.08;

// Move meteors
for (var i = 0; i < meteors.length; i++) {
var m = meteors[i];
m.x   += m.vx;
m.y   += m.vy;
m.rot += m.rotSpeed;
if (m.x - METEOR_R < ARENA_X)           { m.x = ARENA_X + METEOR_R;           m.vx *= -1; }
if (m.x + METEOR_R > ARENA_X + ARENA_W) { m.x = ARENA_X + ARENA_W - METEOR_R; m.vx *= -1; }
if (m.y - METEOR_R < ARENA_Y)           { m.y = ARENA_Y + METEOR_R;           m.vy *= -1; }
if (m.y + METEOR_R > ARENA_Y + ARENA_H) { m.y = ARENA_Y + ARENA_H - METEOR_R; m.vy *= -1; }
}

// Move players
movePlayer(p1, “KeyW”,    “KeyS”,     “KeyA”,    “KeyD”);
movePlayer(p2, “ArrowUp”, “ArrowDown”,“ArrowLeft”,“ArrowRight”);

// Coin scoring
if (checkCoin(p1)) { endGame(1); return; }
if (checkCoin(p2)) { endGame(2); return; }

// Meteor freeze
checkMeteors(p1);
checkMeteors(p2);
}

function endGame(playerNum) {
gameRunning = false;
var col            = playerNum === 1 ? P1_COLOR : P2_COLOR;
oTitle.style.color = col;
oTitle.style.textShadow = “0 0 30px “ + col + “, 0 0 60px “ + col;
oWinner.textContent     = “PLAYER “ + playerNum + “ WINS!”;
overlay.classList.remove(“hidden”);
}

// ─────────────────────────────────────────────────────
//  DRAW: BACKGROUND
// ─────────────────────────────────────────────────────
function drawBackground(t) {
ctx.fillStyle = “#050510”;
ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

// Nebula blobs
for (var i = 0; i < NEBULAS.length; i++) {
var n    = NEBULAS[i];
var grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
grad.addColorStop(0,   “hsla(” + n.hue + “,80%,50%,” + (n.alpha * 2).toFixed(3) + “)”);
grad.addColorStop(1,   “hsla(” + n.hue + “,80%,30%,0)”);
ctx.fillStyle = grad;
ctx.beginPath();
ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
ctx.fill();
}

// Twinkling stars
for (var j = 0; j < STARS.length; j++) {
var s     = STARS[j];
var alpha = 0.4 + 0.6 * Math.abs(Math.sin(s.phase + t * s.speed));
ctx.fillStyle = “rgba(255,255,255,” + alpha.toFixed(3) + “)”;
ctx.beginPath();
ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
ctx.fill();
}
}

// ─────────────────────────────────────────────────────
//  DRAW: ARENA BORDER
// ─────────────────────────────────────────────────────
function drawArena() {
ctx.save();
ctx.shadowColor = “#cc00ff”;
ctx.shadowBlur  = 22;
ctx.strokeStyle = “#cc00ff”;
ctx.lineWidth   = 3;
ctx.strokeRect(ARENA_X, ARENA_Y, ARENA_W, ARENA_H);
ctx.shadowBlur  = 6;
ctx.strokeStyle = “#ff66ff”;
ctx.lineWidth   = 1;
ctx.strokeRect(ARENA_X + 4, ARENA_Y + 4, ARENA_W - 8, ARENA_H - 8);
ctx.restore();
}

// ─────────────────────────────────────────────────────
//  DRAW: HUD
// ─────────────────────────────────────────────────────
function drawHUD() {
// Header background
ctx.fillStyle = “rgba(0,0,5,0.88)”;
ctx.fillRect(0, 0, CANVAS_W, 72);
ctx.strokeStyle = “#440066”;
ctx.lineWidth   = 1;
ctx.beginPath();
ctx.moveTo(0, 71);
ctx.lineTo(CANVAS_W, 71);
ctx.stroke();

// P1 score  (cyan, left)
ctx.save();
ctx.shadowColor  = P1_COLOR;
ctx.shadowBlur   = 14;
ctx.fillStyle    = P1_COLOR;
ctx.font         = “bold 22px ‘Courier New’, monospace”;
ctx.textAlign    = “left”;
ctx.textBaseline = “alphabetic”;
ctx.fillText(“P1 SCORE: “ + p1.score, 60, 46);
ctx.restore();

// P2 score  (magenta, right)
ctx.save();
ctx.shadowColor  = P2_COLOR;
ctx.shadowBlur   = 14;
ctx.fillStyle    = P2_COLOR;
ctx.font         = “bold 22px ‘Courier New’, monospace”;
ctx.textAlign    = “right”;
ctx.textBaseline = “alphabetic”;
ctx.fillText(“P2 SCORE: “ + p2.score, 740, 46);
ctx.restore();

// Game title
ctx.save();
ctx.shadowColor  = “#aa44ff”;
ctx.shadowBlur   = 8;
ctx.fillStyle    = “#cc88ff”;
ctx.font         = “bold 13px ‘Courier New’, monospace”;
ctx.textAlign    = “center”;
ctx.textBaseline = “alphabetic”;
ctx.fillText(”\u2605 NEON SPACE THIEVES \u2605”, 400, 28);
ctx.restore();

// Controls hint
ctx.save();
ctx.fillStyle    = “#664488”;
ctx.font         = “10px ‘Courier New’, monospace”;
ctx.textAlign    = “center”;
ctx.textBaseline = “alphabetic”;
ctx.fillText(“P1: WASD  |  P2: ARROWS  |  First to 15 wins!”, 400, 56);
ctx.restore();
}

// ─────────────────────────────────────────────────────
//  DRAW: SPACESHIP  (pure paths — no images, no ellipse)
// ─────────────────────────────────────────────────────
function drawShip(x, y, angle, color, frozen) {
ctx.save();
ctx.translate(x, y);
ctx.rotate(angle);

var c = frozen ? “#888888” : color;

ctx.shadowColor = frozen ? “#333333” : color;
ctx.shadowBlur  = frozen ? 5 : 16;

// ── Main body (arrow pointing along +x) ──
ctx.fillStyle = c;
ctx.beginPath();
ctx.moveTo( 18,  0);   // nose tip
ctx.lineTo(-10, -9);   // top-rear corner
ctx.lineTo( -5,  0);   // rear centre notch
ctx.lineTo(-10,  9);   // bottom-rear corner
ctx.closePath();
ctx.fill();

// ── Top wing ──
ctx.fillStyle = frozen ? “#777777” : color;
ctx.beginPath();
ctx.moveTo(  0, -8);
ctx.lineTo(-10, -9);
ctx.lineTo( -8, -17);
ctx.lineTo(  2, -11);
ctx.closePath();
ctx.fill();

// ── Bottom wing ──
ctx.beginPath();
ctx.moveTo(  0,  8);
ctx.lineTo(-10,  9);
ctx.lineTo( -8, 17);
ctx.lineTo(  2, 11);
ctx.closePath();
ctx.fill();

// ── Cockpit window (fillRect — zero risk of API issues) ──
ctx.fillStyle = frozen ? “#444444” : (color === P1_COLOR ? “#003344” : “#330011”);
ctx.fillRect(3, -3, 9, 6);

// ── Cockpit glint ──
ctx.fillStyle = frozen ? “#555555” : (color === P1_COLOR ? “#88ffff” : “#ffaacc”);
ctx.fillRect(5, -2, 4, 2);

// ── Freeze rings (pulsing circles around hull) ──
if (frozen) {
ctx.lineWidth = 1;
for (var i = 0; i < 3; i++) {
ctx.strokeStyle = “rgba(140,190,255,” + (0.4 - i * 0.1).toFixed(2) + “)”;
ctx.globalAlpha = 0.4 - i * 0.1;
ctx.beginPath();
ctx.arc(0, 0, 15 + i * 7, 0, Math.PI * 2);
ctx.stroke();
}
ctx.globalAlpha = 1;
}

ctx.restore();
}

// ─────────────────────────────────────────────────────
//  DRAW: COIN
// ─────────────────────────────────────────────────────
function drawCoin() {
var x     = coin.x;
var y     = coin.y;
var spin  = coinSpin;
var pulse = coinPulse;

ctx.save();
ctx.translate(x, y);

// Outer glow halo
var halo = ctx.createRadialGradient(0, 0, 0, 0, 0, COIN_R * 2.5);
halo.addColorStop(0, “rgba(255,220,0,0.35)”);
halo.addColorStop(1, “rgba(255,160,0,0)”);
ctx.fillStyle = halo;
ctx.beginPath();
ctx.arc(0, 0, COIN_R * 2.5, 0, Math.PI * 2);
ctx.fill();

// Spinning squish on X axis
var sx = Math.abs(Math.cos(spin)) * 0.9 + 0.1;
ctx.scale(sx, 1);

// Shadow glow
ctx.shadowColor = “#ffdd00”;
ctx.shadowBlur  = 8 + Math.sin(pulse) * 6;

// Coin disc
var lum = Math.floor(52 + Math.sin(pulse) * 10);
ctx.fillStyle = “hsl(45,100%,” + lum + “%)”;
ctx.beginPath();
ctx.arc(0, 0, COIN_R, 0, Math.PI * 2);
ctx.fill();

// Coin rim
ctx.strokeStyle = “#fff8a0”;
ctx.lineWidth   = 2;
ctx.stroke();

// Dollar sign
ctx.shadowBlur   = 0;
ctx.fillStyle    = “#7a5500”;
ctx.font         = “bold 12px ‘Courier New’, monospace”;
ctx.textAlign    = “center”;
ctx.textBaseline = “middle”;
ctx.fillText(”$”, 0, 1);

ctx.restore();
}

// ─────────────────────────────────────────────────────
//  DRAW: METEOR
// ─────────────────────────────────────────────────────
var METEOR_OFFSETS = [0.85, 0.95, 0.75, 1.0, 0.82, 0.92, 0.70, 0.96];

function drawMeteor(m) {
ctx.save();
ctx.translate(m.x, m.y);
ctx.rotate(m.rot);

ctx.shadowColor = “#aa7755”;
ctx.shadowBlur  = 8;

ctx.beginPath();
for (var i = 0; i < 8; i++) {
var a  = (Math.PI * 2 * i) / 8;
var r  = METEOR_R * METEOR_OFFSETS[i];
var px = Math.cos(a) * r;
var py = Math.sin(a) * r;
if (i === 0) ctx.moveTo(px, py);
else         ctx.lineTo(px, py);
}
ctx.closePath();

var grad = ctx.createRadialGradient(0, 0, 2, 0, 0, METEOR_R);
grad.addColorStop(0,   “#c0a080”);
grad.addColorStop(0.5, “#7a5a40”);
grad.addColorStop(1,   “#3a2010”);
ctx.fillStyle = grad;
ctx.fill();

ctx.strokeStyle = “#c8a878”;
ctx.lineWidth   = 1.5;
ctx.stroke();

// Surface crack marks
ctx.strokeStyle = “rgba(30,15,5,0.55)”;
ctx.lineWidth   = 1;
ctx.shadowBlur  = 0;
ctx.beginPath();
ctx.moveTo(-6, -4); ctx.lineTo(2,  4);
ctx.moveTo( 4, -6); ctx.lineTo(0,  2);
ctx.stroke();

ctx.restore();
}

// ─────────────────────────────────────────────────────
//  MAIN RENDER  (called every frame)
// ─────────────────────────────────────────────────────
function render(timestamp) {
var t = timestamp / 100;   // slow-moving time for star twinkle

drawBackground(t);
drawArena();
drawHUD();

for (var i = 0; i < meteors.length; i++) {
drawMeteor(meteors[i]);
}

drawCoin();
drawShip(p1.x, p1.y, p1.angle, P1_COLOR, p1.frozen);
drawShip(p2.x, p2.y, p2.angle, P2_COLOR, p2.frozen);
}

// ─────────────────────────────────────────────────────
//  GAME LOOP
// ─────────────────────────────────────────────────────
var rafId = null;

function loop(timestamp) {
update();
render(timestamp);
rafId = requestAnimationFrame(loop);
}

function startGame() {
if (rafId !== null) cancelAnimationFrame(rafId);
initGame();
rafId = requestAnimationFrame(loop);
}

// ─────────────────────────────────────────────────────
//  REPLAY BUTTON
// ─────────────────────────────────────────────────────
oBtn.addEventListener(“click”, function () {
startGame();
});

// ─────────────────────────────────────────────────────
//  AUTO-START  (fires when page finishes loading)
// ─────────────────────────────────────────────────────
window.onload = function () {
startGame();
};
