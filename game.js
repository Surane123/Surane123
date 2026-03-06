const GRID_SIZE = 20;
const TILE_COUNT = 20;
const START_SPEED = 130;
const MIN_SPEED = 70;
const SPEED_STEP = 3;
const ROCK_COUNT = 14;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("high-score");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");

let snake;
let direction;
let pendingDirection;
let food;
let rocks;
let score;
let highScore;
let speed;
let gameTimer = null;
let running = false;
let paused = false;

const terrainMarks = Array.from({ length: 70 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  r: 1 + Math.random() * 2.2,
  alpha: 0.08 + Math.random() * 0.12,
}));

function loadHighScore() {
  const value = localStorage.getItem("snake_high_score");
  return value ? Number.parseInt(value, 10) || 0 : 0;
}

function saveHighScore() {
  localStorage.setItem("snake_high_score", String(highScore));
}

function isTileOccupied(x, y) {
  const inSnake = snake?.some((part) => part.x === x && part.y === y);
  const inRocks = rocks?.some((rock) => rock.x === x && rock.y === y);
  return Boolean(inSnake || inRocks);
}

function randomFreeTile() {
  const freeTiles = [];

  for (let y = 0; y < TILE_COUNT; y += 1) {
    for (let x = 0; x < TILE_COUNT; x += 1) {
      if (!isTileOccupied(x, y)) {
        freeTiles.push({ x, y });
      }
    }
  }

  if (freeTiles.length === 0) {
    return { x: 0, y: 0 };
  }

  return freeTiles[Math.floor(Math.random() * freeTiles.length)];
}

function generateRocks() {
  rocks = [];

  while (rocks.length < ROCK_COUNT) {
    const tile = {
      x: Math.floor(Math.random() * TILE_COUNT),
      y: Math.floor(Math.random() * TILE_COUNT),
    };

    const nearSpawn = tile.y === 10 && tile.x >= 6 && tile.x <= 12;
    if (nearSpawn) {
      continue;
    }

    const occupied = isTileOccupied(tile.x, tile.y);
    if (!occupied) {
      rocks.push(tile);
    }
  }
}

function resetGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
    { x: 7, y: 10 },
  ];

  direction = { x: 1, y: 0 };
  pendingDirection = null;
  score = 0;
  speed = START_SPEED;
  running = true;
  paused = false;

  generateRocks();
  food = randomFreeTile();

  updateHud();
  draw();

  if (gameTimer) {
    clearInterval(gameTimer);
  }

  gameTimer = setInterval(tick, speed);
}

function updateHud() {
  scoreEl.textContent = String(score);
  highScoreEl.textContent = String(highScore);
}

function setDirection(nextX, nextY) {
  if (!running || paused) {
    return;
  }

  const current = pendingDirection || direction;
  const isReverse = current.x + nextX === 0 && current.y + nextY === 0;
  if (isReverse) {
    return;
  }

  pendingDirection = { x: nextX, y: nextY };
}

function togglePause() {
  if (!running) {
    return;
  }

  paused = !paused;
  pauseBtn.textContent = paused ? "Resume (P)" : "Pause (P)";

  if (paused) {
    drawOverlay("Paused");
  } else {
    draw();
  }
}

function tick() {
  if (!running || paused) {
    return;
  }

  if (pendingDirection) {
    direction = pendingDirection;
    pendingDirection = null;
  }

  const head = snake[0];
  const nextHead = {
    x: head.x + direction.x,
    y: head.y + direction.y,
  };

  const hitWall =
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= TILE_COUNT ||
    nextHead.y >= TILE_COUNT;

  const hitSelf = snake.some((part) => part.x === nextHead.x && part.y === nextHead.y);
  const hitRock = rocks.some((rock) => rock.x === nextHead.x && rock.y === nextHead.y);

  if (hitWall || hitSelf || hitRock) {
    gameOver();
    return;
  }

  snake.unshift(nextHead);

  const ateFood = nextHead.x === food.x && nextHead.y === food.y;
  if (ateFood) {
    score += 1;
    if (score > highScore) {
      highScore = score;
      saveHighScore();
    }

    food = randomFreeTile();
    speed = Math.max(MIN_SPEED, speed - SPEED_STEP);
    clearInterval(gameTimer);
    gameTimer = setInterval(tick, speed);
  } else {
    snake.pop();
  }

  updateHud();
  draw();

  if (snake.length + rocks.length === TILE_COUNT * TILE_COUNT) {
    running = false;
    clearInterval(gameTimer);
    drawOverlay("You Survived");
  }
}

function gameOver() {
  running = false;
  clearInterval(gameTimer);
  drawOverlay("Game Over");
}

function drawBoard() {
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#8dc977");
  g.addColorStop(1, "#6cab58");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  terrainMarks.forEach((mark) => {
    ctx.fillStyle = `rgba(38, 94, 34, ${mark.alpha})`;
    ctx.beginPath();
    ctx.arc(mark.x, mark.y, mark.r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= TILE_COUNT; i += 1) {
    const offset = i * GRID_SIZE;
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, offset);
    ctx.lineTo(canvas.width, offset);
    ctx.stroke();
  }
}

function drawRock(tile) {
  const px = tile.x * GRID_SIZE;
  const py = tile.y * GRID_SIZE;

  ctx.fillStyle = "#5f665e";
  ctx.beginPath();
  ctx.roundRect(px + 2, py + 3, GRID_SIZE - 4, GRID_SIZE - 6, 6);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.roundRect(px + 5, py + 5, GRID_SIZE - 11, 5, 4);
  ctx.fill();
}

function drawApple(tile) {
  const cx = tile.x * GRID_SIZE + GRID_SIZE / 2;
  const cy = tile.y * GRID_SIZE + GRID_SIZE / 2;

  ctx.fillStyle = "#c5232f";
  ctx.beginPath();
  ctx.arc(cx, cy + 1, 6.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#5a2a16";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx + 0.8, cy - 11);
  ctx.stroke();

  ctx.fillStyle = "#3f8b45";
  ctx.beginPath();
  ctx.ellipse(cx + 3.8, cy - 9.5, 3.2, 2, -0.45, 0, Math.PI * 2);
  ctx.fill();
}

function drawSnakeSegment(segment, index) {
  const cx = segment.x * GRID_SIZE + GRID_SIZE / 2;
  const cy = segment.y * GRID_SIZE + GRID_SIZE / 2;
  const radius = index === 0 ? 8.2 : 7.2;

  const gradient = ctx.createRadialGradient(cx - 2, cy - 2, 2, cx, cy, radius);
  if (index === 0) {
    gradient.addColorStop(0, "#5ba34d");
    gradient.addColorStop(1, "#2f6f36");
  } else {
    gradient.addColorStop(0, "#4f9345");
    gradient.addColorStop(1, "#2d7032");
  }

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 2, 1.8, 0, Math.PI * 2);
  ctx.fill();

  if (index === 0) {
    const eyeOffsetX = direction.y !== 0 ? 3.2 : 2.6;
    const eyeOffsetY = direction.x !== 0 ? 3.2 : 2.6;

    ctx.fillStyle = "#f8f8f8";
    ctx.beginPath();
    ctx.arc(cx - eyeOffsetX, cy - eyeOffsetY, 1.7, 0, Math.PI * 2);
    ctx.arc(cx + eyeOffsetX, cy + eyeOffsetY, 1.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0f1a0e";
    ctx.beginPath();
    ctx.arc(cx - eyeOffsetX, cy - eyeOffsetY, 0.9, 0, Math.PI * 2);
    ctx.arc(cx + eyeOffsetX, cy + eyeOffsetY, 0.9, 0, Math.PI * 2);
    ctx.fill();

    const tongueX = cx + direction.x * 8;
    const tongueY = cy + direction.y * 8;
    ctx.strokeStyle = "#d04c66";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + direction.x * 6, cy + direction.y * 6);
    ctx.lineTo(tongueX, tongueY);
    ctx.stroke();
  }
}

function draw() {
  drawBoard();

  rocks?.forEach(drawRock);
  if (food) {
    drawApple(food);
  }

  snake?.forEach((segment, index) => {
    drawSnakeSegment(segment, index);
  });
}

function drawOverlay(text) {
  draw();

  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 - 4);

  ctx.font = "bold 16px Trebuchet MS";
  ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 28);
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (key === "arrowup" || key === "w") setDirection(0, -1);
  if (key === "arrowdown" || key === "s") setDirection(0, 1);
  if (key === "arrowleft" || key === "a") setDirection(-1, 0);
  if (key === "arrowright" || key === "d") setDirection(1, 0);

  if (key === "r") {
    resetGame();
    pauseBtn.textContent = "Pause (P)";
  }

  if (key === "p") {
    togglePause();
  }
});

startBtn.addEventListener("click", () => {
  resetGame();
  pauseBtn.textContent = "Pause (P)";
});

pauseBtn.addEventListener("click", togglePause);

document.querySelectorAll("[data-dir]").forEach((button) => {
  button.addEventListener("click", () => {
    const dir = button.getAttribute("data-dir");
    if (dir === "up") setDirection(0, -1);
    if (dir === "down") setDirection(0, 1);
    if (dir === "left") setDirection(-1, 0);
    if (dir === "right") setDirection(1, 0);
  });
});

highScore = loadHighScore();
score = 0;
updateHud();
drawOverlay("Press Start");
