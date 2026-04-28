const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const ui = {
  status: document.querySelector("#statusText"),
  hpText: document.querySelector("#hpText"),
  hpBar: document.querySelector("#hpBar"),
  bossHpText: document.querySelector("#bossHpText"),
  bossHpBar: document.querySelector("#bossHpBar"),
  roomText: document.querySelector("#roomText"),
  buildPanel: document.querySelector("#buildPanel"),
  armory: document.querySelector("#armory"),
  bossSelector: document.querySelector("#bossSelector"),
  floatText: document.querySelector("#floatText"),
  potionButton: document.querySelector("#potionButton"),
  resetButton: document.querySelector("#resetButton"),
};

const world = {
  width: 1680,
  height: 900,
  wall: 36,
  starter: { x: 80, y: 120, w: 560, h: 660 },
  arena: { x: 760, y: 90, w: 820, h: 720 },
  gate: { x: 610, y: 390, w: 150, h: 130 },
};

const gear = {
  weapon: {
    ironBlade: { slot: "weapon", name: "Sword", tag: "Melee", damage: 46, range: 54, speed: 1.05, moveSpeedBonus: 30, color: "#d8d1c4" },
    emberBow: { slot: "weapon", name: "Bow", tag: "Ranged", damage: 27, range: 230, speed: 0.78, color: "#e0a14e" },
    pulseStaff: { slot: "weapon", name: "Staff", tag: "Magic", damage: 46, range: 170, speed: 1.55, color: "#8ec7ff" },
  },
  armor: {
    duelistCoat: { slot: "armor", name: "Light Armor", tag: "Fast", armor: 2, maxHp: 115, speed: 250, color: "#557d61" },
    bulwarkPlate: { slot: "armor", name: "Heavy Armor", tag: "Tank", armor: 8, maxHp: 160, speed: 195, color: "#8d8f92" },
    channelerRobe: { slot: "armor", name: "Mage Armor", tag: "Glass", armor: 0, maxHp: 75, speed: 270, damageMultiplier: 1.5, color: "#6f75b8" },
  },
};

const combatTuning = {
  incomingDamageMultiplier: 1.8975,
};

const stands = [
  { x: 205, y: 270, type: "weapon", id: "ironBlade" },
  { x: 340, y: 270, type: "weapon", id: "emberBow" },
  { x: 475, y: 270, type: "weapon", id: "pulseStaff" },
  { x: 205, y: 520, type: "armor", id: "duelistCoat" },
  { x: 340, y: 520, type: "armor", id: "bulwarkPlate" },
  { x: 475, y: 520, type: "armor", id: "channelerRobe" },
];

const saveKey = "boss-fight-save-v1";
const playerSprite = new Image();
let cleanedPlayerSprite = null;
playerSprite.src = "./assets/player-spritesheet.png";
playerSprite.addEventListener("load", () => {
  cleanedPlayerSprite = createTransparentSprite(playerSprite);
});
const curlyFriesSprite = new Image();
let cleanedCurlyFriesSprite = null;
curlyFriesSprite.src = "./assets/curly-fries-spritesheet.png";
curlyFriesSprite.addEventListener("load", () => {
  cleanedCurlyFriesSprite = createTransparentSprite(curlyFriesSprite);
});

let player = createPlayer();
let boss = createBoss("cola");
let condimentBosses = [];
let hazards = [];
let playerProjectiles = [];
let particles = [];
let camera = { x: 0, y: 0 };
const movementKeys = { up: false, down: false, left: false, right: false };
const keyDirections = {
  w: "up",
  a: "left",
  s: "down",
  d: "right",
};
let selectedBoss = null;
let floatTimer = 0;
let fightStartedAt = 0;
let lastTime = performance.now();
let logLines = ["Choose gear, use WASD to cross the gate, click to shoot."];

function createPlayer() {
  return {
    x: 300,
    y: 685,
    radius: 18,
    destination: null,
    hp: 115,
    maxHp: 115,
    potions: 3,
    attackCooldown: 0,
    gateCooldown: 0,
    room: "starter",
    dead: false,
    won: false,
    freezeTimer: 0,
    chillStacks: 0,
    chillTimer: 0,
    facing: "down",
    animationTime: 0,
    moving: false,
    lastMoveX: 0,
    lastMoveY: 1,
    greaseCooldown: 0,
    slide: null,
    gear: { weapon: "ironBlade", armor: "duelistCoat" },
    stats: { damage: 26, range: 54, speed: 250, armor: 2 },
  };
}

function createBoss(kind = "burger") {
  const bosses = {
    burger: {
      kind: "burger",
      name: "Big Burger",
      radius: 58,
      maxHp: 600,
      color: "#a76e3e",
      enrageColor: "#b94835",
      attackTimer: 1.8,
      swingTimer: 1.2,
    },
    fries: {
      kind: "fries",
      name: "Curly Fries",
      radius: 48,
      maxHp: 1440,
      color: "#d9aa4f",
      enrageColor: "#f0c95d",
      attackTimer: 1.2,
      swingTimer: 1.1,
    },
    trio: {
      kind: "trio",
      name: "Condiment Trio",
      radius: 1,
      maxHp: 840,
      color: "#f2d087",
      enrageColor: "#f2d087",
      attackTimer: 1,
      swingTimer: 1,
    },
    sauce: {
      kind: "sauce",
      name: "Special Sauce",
      radius: 66,
      maxHp: 650,
      color: "#df6f3f",
      enrageColor: "#f0c95d",
      attackTimer: 1.15,
      swingTimer: 1.15,
    },
    cola: {
      kind: "cola",
      name: "Big Cola",
      radius: 62,
      maxHp: 1400,
      color: "#3d2419",
      enrageColor: "#6f2f22",
      attackTimer: 1.2,
      swingTimer: 1.2,
    },
    shake: {
      kind: "shake",
      name: "Peanut Buster Shake",
      radius: 72,
      maxHp: 560,
      color: "#f1e2c9",
      enrageColor: "#d18b43",
      attackTimer: 1.2,
      swingTimer: 1.2,
    },
    nacho: {
      kind: "nacho",
      name: "Nacho Libre",
      radius: 70,
      maxHp: 1800,
      color: "#d8a231",
      enrageColor: "#ffb12f",
      attackTimer: 1.2,
      swingTimer: 1.2,
    },
  };
  const template = bosses[kind];
  return {
    ...template,
    x: 1180,
    y: 450,
    hp: template.maxHp,
    phase: 1,
    totalPhases: kind === "shake" || kind === "nacho" ? 3 : 1,
    enraged: false,
    animation: "idle",
    animationTime: 0,
    mode: "red",
    modeTimer: 3,
    pressureTimer: 7,
    shieldTimer: 0,
    state: "moving",
    stateTimer: 0,
    quadrantMode: "idle",
    quadrantTimer: 0,
    quadrantDuration: 10,
    nextWallTimer: 3.2,
    cheeseDropTimer: 0,
    playerQuadrant: null,
    chipTimer: 4.8,
    picoTimer: 0.15,
    picoIndex: 0,
    cheeseWaveActive: false,
    finalEnrageStarted: false,
    invulnerableTimer: 0,
    enrageTextTimer: 0,
  };
}

function createCondimentBosses() {
  return [
    createCondiment("ketchup", "Ketchup", 1045, 330, "#cf3b2f", 260, 1.55),
    createCondiment("mustard", "Mustard", 1305, 450, "#e3bf34", 230, 1.1),
    createCondiment("mayo", "Mayo", 1055, 610, "#f3ead2", 220, 3.7),
  ];
}

function createCondiment(kind, name, x, y, color, maxHp, attackTimer) {
  return {
    kind,
    name,
    x,
    y,
    radius: 34,
    hp: maxHp,
    maxHp,
    color,
    attackTimer,
    baseAttackTimer: attackTimer,
    shieldTimer: 0,
    moveTimer: 0,
    destination: null,
    state: "moving",
    stateTimer: 0,
  };
}

function applyGear() {
  const weapon = gear.weapon[player.gear.weapon];
  const armor = gear.armor[player.gear.armor];
  player.stats = {
    damage: Math.round(weapon.damage * (armor.damageMultiplier || 1)),
    range: weapon.range,
    speed: armor.speed + (weapon.moveSpeedBonus || 0),
    armor: armor.armor,
  };
  const hpPercent = player.hp / player.maxHp || 1;
  player.maxHp = armor.maxHp;
  player.hp = Math.min(player.maxHp, Math.max(1, Math.round(player.maxHp * hpPercent)));
}

function loadGame() {
  const raw = localStorage.getItem(saveKey);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    player.gear = saved.gear || player.gear;
    applyGear();
  } catch {
    localStorage.removeItem(saveKey);
  }
}

function saveGear() {
  localStorage.setItem(saveKey, JSON.stringify({ gear: player.gear }));
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function resetFight(keepPosition = false) {
  const gearState = { ...player.gear };
  const bossKind = boss.kind;
  player = createPlayer();
  player.gear = gearState;
  applyGear();
  if (keepPosition) {
    player.x = 705;
    player.y = 455;
  }
  boss = createBoss(bossKind);
  condimentBosses = boss.kind === "trio" ? createCondimentBosses() : [];
  hazards = [];
  playerProjectiles = [];
  particles = [];
  selectedBoss = null;
  fightStartedAt = 0;
  logLines = ["Fight reset. Use WASD to cross the gate when ready."];
  showFloat("Fight reset");
}

function selectBoss(kind) {
  const gearState = { ...player.gear };
  player = createPlayer();
  player.gear = gearState;
  applyGear();
  player.room = "arena";
  player.x = world.arena.x + 130;
  player.y = world.arena.y + world.arena.h / 2;
  player.gateCooldown = 1.2;
  boss = createBoss(kind);
  condimentBosses = boss.kind === "trio" ? createCondimentBosses() : [];
  hazards = [];
  playerProjectiles = [];
  particles = [];
  selectedBoss = null;
  fightStartedAt = 0;
  ui.status.textContent = `${boss.name} selected for testing. WASD to dodge, click to shoot.`;
  showFloat(boss.name);
}

function startFight() {
  if (fightStartedAt) return;
  fightStartedAt = performance.now();
  log("Boss awakened.");
  ui.status.textContent = "Boss awakened. Use WASD to dodge and click to shoot.";
}

function log(text) {
  logLines = [text, ...logLines].slice(0, 5);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function isTypingTarget(element) {
  return ["INPUT", "TEXTAREA", "SELECT"].includes(element?.tagName) || element?.isContentEditable;
}

function currentBounds() {
  return player.room === "arena" ? world.arena : world.starter;
}

function nachoQuadrantBounds() {
  if (player.room !== "arena" || boss.kind !== "nacho" || boss.quadrantMode !== "active" || !boss.playerQuadrant) return null;
  const centerX = world.arena.x + world.arena.w / 2;
  const centerY = world.arena.y + world.arena.h / 2;
  const wallGap = 24;
  const left = world.arena.x;
  const right = world.arena.x + world.arena.w;
  const top = world.arena.y;
  const bottom = world.arena.y + world.arena.h;
  return {
    x: boss.playerQuadrant.includes("left") ? left : centerX + wallGap,
    y: boss.playerQuadrant.includes("top") ? top : centerY + wallGap,
    w: boss.playerQuadrant.includes("left") ? centerX - wallGap - left : right - centerX - wallGap,
    h: boss.playerQuadrant.includes("top") ? centerY - wallGap - top : bottom - centerY - wallGap,
  };
}

function handleCanvasClick(x, y) {
  if (player.dead || player.won) return;
  const stand = stands.find((item) => Math.hypot(item.x - x, item.y - y) < 48);
  if (stand && player.room === "starter") {
    equipFromStand(stand);
    return;
  }
  if (player.room !== "arena") {
    ui.status.textContent = "Use WASD to move through the gate.";
    return;
  }
  selectedBoss = null;
  shootAt(x, y);
}

function findClickedBoss(x, y) {
  return activeBosses().find((target) => target.hp > 0 && Math.hypot(target.x - x, target.y - y) < target.radius + 14);
}

function activeBosses() {
  return boss.kind === "trio" ? condimentBosses : [boss];
}

function livingBosses() {
  return activeBosses().filter((target) => target.hp > 0);
}

function constrainToRoom(x, y) {
  const bounds = nachoQuadrantBounds() || currentBounds();
  return {
    x: clamp(x, bounds.x + player.radius, bounds.x + bounds.w - player.radius),
    y: clamp(y, bounds.y + player.radius, bounds.y + bounds.h - player.radius),
  };
}

function equipFromStand(stand) {
  player.gear[stand.type] = stand.id;
  applyGear();
  player.hp = player.maxHp;
  saveGear();
  const item = gear[stand.type][stand.id];
  log(`Equipped ${item.name}.`);
  showFloat(item.name);
}

function movePlayer(dt) {
  player.moving = false;
  player.freezeTimer = Math.max(0, player.freezeTimer - dt);
  player.chillTimer = Math.max(0, player.chillTimer - dt);
  if (player.chillTimer <= 0) player.chillStacks = 0;
  if (player.freezeTimer > 0) {
    player.destination = null;
    player.slide = null;
    return;
  }
  player.greaseCooldown = Math.max(0, player.greaseCooldown - dt);
  if (player.slide) {
    moveSlidingPlayer(dt);
    return;
  }
  const dx = (movementKeys.right ? 1 : 0) - (movementKeys.left ? 1 : 0);
  const dy = (movementKeys.down ? 1 : 0) - (movementKeys.up ? 1 : 0);
  const dist = Math.hypot(dx, dy);
  if (dist < 0.1) return;
  player.facing = getFacing(dx, dy);
  player.moving = true;
  player.animationTime += dt;
  player.lastMoveX = dx / dist;
  player.lastMoveY = dy / dist;
  player.x += player.lastMoveX * player.stats.speed * dt;
  player.y += player.lastMoveY * player.stats.speed * dt;
  const point = constrainToRoom(player.x, player.y);
  player.x = point.x;
  player.y = point.y;
}

function moveSlidingPlayer(dt) {
  player.moving = true;
  player.animationTime += dt * 1.8;
  player.slide.timer -= dt;
  player.x += player.slide.vx * dt;
  player.y += player.slide.vy * dt;
  player.slide.vx *= Math.pow(0.82, dt * 6);
  player.slide.vy *= Math.pow(0.82, dt * 6);

  const bounds = currentBounds();
  const clampedX = clamp(player.x, bounds.x + player.radius, bounds.x + bounds.w - player.radius);
  const clampedY = clamp(player.y, bounds.y + player.radius, bounds.y + bounds.h - player.radius);
  if (clampedX !== player.x || clampedY !== player.y) {
    player.slide = null;
    player.x = clampedX;
    player.y = clampedY;
    return;
  }
  player.x = clampedX;
  player.y = clampedY;

  if (Math.hypot(player.slide.vx, player.slide.vy) > 20) {
    player.facing = getFacing(player.slide.vx, player.slide.vy);
    const slideSpeed = Math.hypot(player.slide.vx, player.slide.vy);
    player.lastMoveX = player.slide.vx / slideSpeed;
    player.lastMoveY = player.slide.vy / slideSpeed;
  }
  if (player.slide.timer <= 0) {
    player.slide = null;
  }
}

function startGreaseSlide(puddle) {
  if (player.greaseCooldown > 0 || player.room !== "arena" || player.dead || player.won) return;
  let dx = player.lastMoveX;
  let dy = player.lastMoveY;
  if (Math.hypot(dx, dy) < 0.1) {
    dx = player.x - puddle.x;
    dy = player.y - puddle.y;
  }
  if (Math.hypot(dx, dy) < 0.1) dx = 1;
  const angle = Math.atan2(dy, dx);
  const speed = player.stats.speed * 2.15;
  player.slide = {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    timer: 0.68,
  };
  player.destination = null;
  player.greaseCooldown = 0.85;
  showFloat("Grease boost");
}

function getFacing(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

function updateRoom(dt) {
  player.gateCooldown = Math.max(0, player.gateCooldown - dt);
  if (player.room === "starter" && pointInRect(player.x, player.y, world.gate)) {
    player.room = "arena";
    player.x = world.arena.x + 130;
    player.y = world.arena.y + world.arena.h / 2;
    player.destination = null;
    player.slide = null;
    player.gateCooldown = 1.2;
    startFight();
  }
  if (player.room === "arena" && player.x < world.arena.x + player.radius) {
    player.x = world.arena.x + player.radius;
    player.destination = null;
    player.slide = null;
  }
}

function updateCombat(dt) {
  if (player.room !== "arena" || player.dead || player.won) return;
  startFight();
  if (boss.kind === "trio") {
    updateTrioCombat(dt);
    return;
  }
  if (boss.kind === "sauce") {
    updateSpecialSauce(dt);
    return;
  }
  if (boss.kind === "cola") {
    updateBigCola(dt);
    return;
  }
  if (boss.kind === "shake") {
    updatePeanutBusterShake(dt);
    return;
  }
  if (boss.kind === "nacho") {
    updateNachoLibre(dt);
    return;
  }
  boss.animationTime += dt;
  player.attackCooldown -= dt;
  boss.swingTimer -= dt;
  boss.attackTimer -= dt;

  const phaseThreshold = boss.kind === "fries" ? 0.6 : 0.55;
  if (boss.hp <= boss.maxHp * phaseThreshold && boss.phase === 1) {
    boss.phase = 2;
    log(boss.kind === "fries" ? "Phase 2: grease storm." : "Phase 2: furnace vents opened.");
  }
  if (boss.hp <= boss.maxHp * 0.25 && !boss.enraged) {
    boss.enraged = true;
    log(`${boss.name} is enraged.`);
  }

  if (boss.swingTimer <= 0 && distance(player, boss) < boss.radius + 46) {
    damagePlayer(boss.enraged ? 18 : 13, "Crushing swing");
    boss.swingTimer = boss.enraged ? 0.9 : 1.25;
  }
  if (boss.attackTimer <= 0) {
    spawnBossPattern();
    if (boss.kind === "fries") {
      boss.attackTimer = boss.enraged ? 1.2 : boss.phase === 2 ? 1.25 : 1.55;
    } else {
      boss.attackTimer = boss.enraged ? 1.25 : boss.phase === 2 ? 1.65 : 2.1;
    }
  }
}

function updatePeanutBusterShake(dt) {
  boss.animationTime += dt;
  boss.shieldTimer = Math.max(0, boss.shieldTimer - dt);
  player.attackCooldown -= dt;
  boss.attackTimer -= dt;
  if (boss.phase === 3 && boss.hp <= boss.maxHp * 0.28 && !boss.enraged) {
    boss.enraged = true;
    log("Peanut Buster Shake enters final shake barrage.");
  }
  if (boss.attackTimer <= 0) {
    spawnShakePattern();
    boss.attackTimer = boss.enraged ? 0.75 : boss.phase === 3 ? 0.95 : boss.phase === 2 ? 1.12 : 1.3;
  }
}

function updateNachoLibre(dt) {
  boss.animationTime += dt;
  player.attackCooldown -= dt;
  boss.invulnerableTimer = Math.max(0, boss.invulnerableTimer - dt);
  boss.enrageTextTimer = Math.max(0, boss.enrageTextTimer - dt);
  updateNachoPhase();
  updateNachoPico(dt);
  if (boss.phase >= 2) ensureNachoCheeseWave();
  updateNachoQuadrant(dt);

  if (boss.phase === 1) {
    if (boss.quadrantMode === "idle") {
      boss.nextWallTimer -= dt;
      if (boss.nextWallTimer <= 0) startNachoQuadrants(1.35, 10);
    }
    return;
  }

  if (boss.phase === 2) {
    boss.chipTimer -= dt;
    if (boss.chipTimer <= 0) {
      spawnNachoChips();
      boss.chipTimer = 5;
    }
    return;
  }

  if (boss.quadrantMode === "idle") {
    boss.nextWallTimer -= dt;
    if (boss.nextWallTimer <= 0) startNachoQuadrants(boss.enraged ? 0.75 : 1.2, 10);
  }
  if (boss.enraged) {
    boss.chipTimer -= dt;
    if (boss.chipTimer <= 0) {
      spawnNachoChips();
      boss.chipTimer = 4.2;
    }
  }
}

function updateNachoPhase() {
  const hpPercent = boss.hp / boss.maxHp;
  if (hpPercent <= 0.66 && boss.phase === 1) {
    boss.phase = 2;
    clearNachoQuadrants();
    boss.chipTimer = 1.1;
    ensureNachoCheeseWave();
    log("Phase 2: tortilla chip shatter.");
    ui.status.textContent = "Nacho Libre starts shattering chips.";
  }
  if (hpPercent <= 0.33 && boss.phase < 3) {
    boss.phase = 3;
    clearNachoChipHazards();
    boss.nextWallTimer = 0.6;
    boss.chipTimer = 999;
    ensureNachoCheeseWave();
    log("Phase 3: cheese maze.");
    ui.status.textContent = "Nacho Libre drops the cheese maze.";
  }
  if (hpPercent <= 0.1 && !boss.finalEnrageStarted) {
    boss.finalEnrageStarted = true;
    boss.enraged = true;
    boss.invulnerableTimer = 2;
    boss.enrageTextTimer = 2.2;
    boss.chipTimer = 0.8;
    startNachoQuadrants(0.65, 10, true);
    log("Now I'm angry.");
    ui.status.textContent = "Now I'm angry.";
    showFloat("Now I'm angry.");
  }
}

function updateNachoPico(dt) {
  boss.picoTimer -= dt;
  while (boss.picoTimer <= 0) {
    spawnPicoPiece();
    boss.picoTimer += 0.11 + Math.random() * 0.14;
  }
}

function updateNachoQuadrant(dt) {
  if (boss.quadrantMode === "warning") {
    boss.quadrantTimer -= dt;
    if (boss.quadrantTimer <= 0) {
      boss.quadrantMode = "active";
      boss.quadrantTimer = boss.quadrantDuration;
      boss.playerQuadrant = quadrantForPoint(player.x, player.y);
      boss.cheeseDropTimer = 0.15;
      log("Nacho walls locked the arena.");
    }
    return;
  }
  if (boss.quadrantMode !== "active") return;
  boss.quadrantTimer -= dt;
  boss.cheeseDropTimer -= dt;
  while (boss.cheeseDropTimer <= 0 && boss.quadrantTimer > 0) {
    spawnNachoCheesePuddle(player.x, player.y, boss.quadrantTimer + 0.6);
    boss.cheeseDropTimer += boss.enraged ? 0.68 : boss.phase === 3 ? 0.82 : 0.95;
  }
  if (boss.quadrantTimer <= 0) {
    clearNachoQuadrants();
    boss.nextWallTimer = boss.phase === 1 ? 5.8 : boss.enraged ? 3.6 : 5.2;
    log("Nacho walls crumble.");
  }
}

function updateBigCola(dt) {
  boss.animationTime += dt;
  player.attackCooldown -= dt;
  boss.attackTimer -= dt;
  boss.pressureTimer -= dt;
  if (boss.hp <= boss.maxHp * 0.6 && boss.phase === 1) {
    boss.phase = 2;
    log("Big Cola starts fizzing harder.");
  }
  if (boss.hp <= boss.maxHp * 0.25 && !boss.enraged) {
    boss.enraged = true;
    log("Big Cola is over-carbonated.");
  }
  if (boss.pressureTimer <= 0) {
    spawnFizzBurst();
    boss.pressureTimer = boss.enraged ? 5.2 : boss.phase === 2 ? 6.4 : 8;
  }
  if (boss.attackTimer <= 0) {
    spawnBigColaPattern();
    boss.attackTimer = boss.enraged ? 1.0 : boss.phase === 2 ? 1.25 : 1.55;
  }
}

function updateSpecialSauce(dt) {
  boss.animationTime += dt;
  boss.modeTimer -= dt;
  boss.shieldTimer = Math.max(0, boss.shieldTimer - dt);
  player.attackCooldown -= dt;
  boss.attackTimer -= dt;
  updateSpecialSauceState(dt);
  if (boss.hp <= boss.maxHp * 0.3 && !boss.enraged) {
    boss.enraged = true;
    log("Special Sauce is fully mixed.");
  }
  if (boss.modeTimer <= 0) {
    cycleSauceMode();
  }
  if (boss.attackTimer <= 0) {
    spawnSpecialSaucePattern();
  }
}

function updateSpecialSauceState(dt) {
  boss.stateTimer = Math.max(0, boss.stateTimer - dt);
  if (boss.state === "winding" && boss.stateTimer <= 0) {
    spawnSauceRicochet();
    boss.state = "recovering";
    boss.stateTimer = 0.35;
    boss.attackTimer = boss.enraged ? 1.05 : 1.35;
    log("Special Sauce fires ricochet seeds.");
    return;
  }
  if (boss.state === "recovering" && boss.stateTimer <= 0) {
    boss.state = "moving";
  }
}

function cycleSauceMode() {
  const modes = ["red", "yellow", "white"];
  const index = modes.indexOf(boss.mode);
  boss.mode = modes[(index + 1) % modes.length];
  boss.modeTimer = boss.enraged ? 2.2 : 3;
  log(`Special Sauce shifts to ${boss.mode} mode.`);
}

function updateTrioCombat(dt) {
  player.attackCooldown -= dt;
  moveCondimentBosses(dt);
  condimentBosses.forEach((target) => {
    if (target.hp <= 0) return;
    target.attackTimer -= dt;
    target.shieldTimer = Math.max(0, target.shieldTimer - dt);
    if (target.kind === "mustard") {
      updateMustardAttackState(target, dt);
      return;
    }
    if (target.attackTimer > 0) return;
    if (target.kind === "ketchup") spawnKetchupAttack(target);
    if (target.kind === "mayo") spawnMayoHeal(target);
    const deadCount = condimentBosses.filter((item) => item.hp <= 0).length;
    target.attackTimer = Math.max(0.55, target.baseAttackTimer - deadCount * 0.18);
  });
}

function updateMustardAttackState(target, dt) {
  target.stateTimer = Math.max(0, target.stateTimer - dt);
  if (target.state === "winding" && target.stateTimer <= 0) {
    spawnMustardAttack(target);
    target.state = "recovering";
    target.destination = null;
    target.stateTimer = 0.4;
    return;
  }
  if (target.state === "recovering" && target.stateTimer <= 0) {
    target.state = "moving";
    const deadCount = condimentBosses.filter((item) => item.hp <= 0).length;
    target.attackTimer = Math.max(0.7, target.baseAttackTimer - deadCount * 0.18);
    return;
  }
  if (target.state === "moving" && target.attackTimer <= 0) {
    target.destination = null;
    target.state = "winding";
    target.stateTimer = 0.5;
    log("Mustard is aiming.");
  }
}

function moveCondimentBosses(dt) {
  const mayo = condimentBosses.find((target) => target.kind === "mayo" && target.hp > 0);
  condimentBosses.forEach((target) => {
    if (target.hp <= 0) return;
    if (target.kind === "mustard" && target.state !== "moving") return;
    target.moveTimer -= dt;
    if (target.kind === "mayo") updateMayoMovement(target);
    if (target.kind === "mustard") updateMustardMovement(target, mayo);
    if (target.kind === "ketchup") updateKetchupMovement(target);
    if (target.destination) moveCondimentToward(target, target.destination, condimentSpeed(target), dt);
  });
}

function updateMayoMovement(target) {
  if (target.moveTimer > 0 && target.destination) return;
  const awayAngle = Math.atan2(target.y - player.y, target.x - player.x);
  const erraticTurn = (Math.random() - 0.5) * 2.4;
  const badPanicTurn = Math.random() < 0.22 ? Math.PI * (Math.random() > 0.5 ? 0.55 : -0.55) : 0;
  const angle = awayAngle + erraticTurn + badPanicTurn;
  const distanceRoll = 130 + Math.random() * 160;
  target.destination = clampArenaPoint(target.x + Math.cos(angle) * distanceRoll, target.y + Math.sin(angle) * distanceRoll, target.radius);
  target.moveTimer = 0.28 + Math.random() * 0.34;
}

function updateMustardMovement(target, mayo) {
  if (target.moveTimer > 0 && target.destination) return;
  const defendTarget = mayo || player;
  const toPlayer = Math.atan2(player.y - defendTarget.y, player.x - defendTarget.x);
  const guardDistance = mayo ? 74 : 105;
  const sideStep = mayo ? (Math.random() - 0.5) * 36 : 0;
  target.destination = clampArenaPoint(
    defendTarget.x + Math.cos(toPlayer) * guardDistance + Math.cos(toPlayer + Math.PI / 2) * sideStep,
    defendTarget.y + Math.sin(toPlayer) * guardDistance + Math.sin(toPlayer + Math.PI / 2) * sideStep,
    target.radius,
  );
  target.moveTimer = mayo ? 0.25 : 0.55;
}

function updateKetchupMovement(target) {
  if (target.moveTimer > 0 && target.destination) return;
  if (distance(target, player) < 220) {
    const angle = Math.atan2(target.y - player.y, target.x - player.x);
    target.destination = clampArenaPoint(target.x + Math.cos(angle) * 150, target.y + Math.sin(angle) * 150, target.radius);
  } else {
    target.destination = clampArenaPoint(target.x + (Math.random() - 0.5) * 150, target.y + (Math.random() - 0.5) * 150, target.radius);
  }
  target.moveTimer = 1.1;
}

function moveCondimentToward(target, destination, speed, dt) {
  const dx = destination.x - target.x;
  const dy = destination.y - target.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) {
    target.destination = null;
    return;
  }
  const step = Math.min(dist, speed * dt);
  target.x += (dx / dist) * step;
  target.y += (dy / dist) * step;
}

function condimentSpeed(target) {
  if (target.kind === "mayo") return 175;
  if (target.kind === "mustard") return 150;
  return 100;
}

function clampArenaPoint(x, y, radius) {
  return {
    x: clamp(x, world.arena.x + radius + 24, world.arena.x + world.arena.w - radius - 24),
    y: clamp(y, world.arena.y + radius + 24, world.arena.y + world.arena.h - radius - 24),
  };
}

function shootAt(x, y) {
  if (player.attackCooldown > 0) return;
  const dx = x - player.x;
  const dy = y - player.y;
  if (Math.hypot(dx, dy) < 6) return;
  startFight();
  player.facing = getFacing(dx, dy);
  firePlayerProjectile(Math.atan2(dy, dx));
}

function firePlayerProjectile(angle) {
  if (player.attackCooldown > 0) return;
  const weapon = gear.weapon[player.gear.weapon];
  const speed = projectileSpeedForWeapon(weapon.tag);
  playerProjectiles.push({
    x: player.x + Math.cos(angle) * 24,
    y: player.y + Math.sin(angle) * 24,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: weapon.tag === "Magic" ? 8 : 6,
    damage: Math.round(player.stats.damage * (0.78 + Math.random() * 0.44)),
    color: weapon.color,
    ttl: projectileTravelTime(weapon, speed),
    tag: weapon.tag,
  });
  player.attackCooldown = weapon.speed;
  ui.status.textContent = `Firing ${weapon.name}.`;
}

function projectileSpeedForWeapon(tag) {
  if (tag === "Ranged") return 620;
  if (tag === "Magic") return 480;
  return 760;
}

function projectileTravelTime(weapon, speed) {
  const rangeBonus = weapon.tag === "Melee" ? 150 : 210;
  return (player.stats.range + rangeBonus) / speed;
}

function spawnBossPattern() {
  if (boss.kind === "fries") {
    spawnCurlyFriesPattern();
    return;
  }
  spawnFloorSlam();
  const pattern = boss.phase === 1 ? Math.random() : Math.random() * 1.2;
  if (pattern < 0.72) {
    const count = boss.enraged ? 14 : boss.phase === 2 ? 11 : 8;
    const volleyOffset = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i += 1) {
      const lane = (Math.PI * 2 * i) / count;
      const angle = volleyOffset + lane + (Math.random() - 0.5) * 0.55;
      const speed = (boss.enraged ? 300 : 255) + Math.random() * 85;
      hazards.push({
        type: "bolt",
        x: boss.x + (Math.random() - 0.5) * 28,
        y: boss.y + (Math.random() - 0.5) * 28,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 12,
        ttl: 2.75 + Math.random() * 0.55,
        damage: 14,
      });
    }
    log("Floor slam and arc bolts incoming.");
  } else {
    for (let i = 0; i < 7; i += 1) {
      hazards.push({
        type: "vent",
        x: world.arena.x + 140 + Math.random() * (world.arena.w - 280),
        y: world.arena.y + 110 + Math.random() * (world.arena.h - 220),
        r: 28,
        warn: 0.75 + i * 0.04,
        ttl: 1.3 + i * 0.04,
        damage: 17,
      });
    }
    log("Floor slam and furnace vents primed.");
  }
}

function spawnSpecialSaucePattern() {
  if (boss.mode === "red") {
    const count = boss.enraged ? 3 : 2;
    for (let i = 0; i < count; i += 1) spawnSauceMortar();
    boss.attackTimer = boss.enraged ? 0.95 : 1.25;
    log("Special Sauce launches splatter mortars.");
    return;
  }
  if (boss.mode === "yellow") {
    if (boss.state === "moving") {
      boss.state = "winding";
      boss.stateTimer = 0.55;
      boss.attackTimer = 999;
      log("Special Sauce is aiming.");
    }
    return;
  }
  boss.shieldTimer = 1.8;
  spawnSauceSpiral();
  boss.attackTimer = boss.enraged ? 0.95 : 1.25;
  log("Special Sauce shields and spirals.");
}

function spawnBigColaPattern() {
  const roll = Math.random();
  if (roll < 0.38) {
    spawnColaBubbles(boss.enraged ? 7 : boss.phase === 2 ? 6 : 5);
    log("Big Cola releases bubbles.");
  } else if (roll < 0.7) {
    spawnStrawSnipe();
    log("Big Cola lines up a straw snipe.");
  } else {
    spawnSodaSpill();
    log("Big Cola spills soda.");
  }
}

function spawnColaBubbles(count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 55 + Math.random() * 55;
    hazards.push({
      type: "colaBubble",
      x: boss.x + Math.cos(angle) * (boss.radius + 20),
      y: boss.y + Math.sin(angle) * (boss.radius + 20),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 15 + Math.random() * 8,
      ttl: 4,
      damage: boss.enraged ? 36 : 27,
    });
  }
}

function spawnStrawSnipe() {
  const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
  hazards.push({
    type: "strawSnipe",
    x: boss.x,
    y: boss.y,
    angle,
    warn: boss.enraged ? 0.45 : 0.65,
    ttl: boss.enraged ? 0.8 : 1,
    damage: boss.enraged ? 84 : 66,
    hit: false,
  });
}

function spawnFizzBurst() {
  hazards.push({
    type: "fizzBurst",
    x: boss.x,
    y: boss.y,
    r: boss.enraged ? 225 : boss.phase === 2 ? 205 : 185,
    warn: 1,
    ttl: 1.25,
    damage: boss.enraged ? 72 : 54,
    hit: false,
  });
  log("Big Cola pressure is about to burst.");
}

function spawnSodaSpill() {
  const point = randomArenaPointNearPlayer(180);
  hazards.push({
    type: "sodaPuddle",
    x: point.x,
    y: point.y,
    r: 45,
    ttl: boss.enraged ? 6 : 5,
    damageTimer: 0,
    damage: 12,
  });
}

function startNachoQuadrants(warn = 1.25, duration = 10, force = false) {
  if (!force && boss.quadrantMode !== "idle") return;
  clearNachoQuadrantPuddles();
  boss.quadrantMode = "warning";
  boss.quadrantTimer = warn;
  boss.quadrantDuration = duration;
  boss.playerQuadrant = null;
  boss.cheeseDropTimer = warn + 0.2;
  log("Nacho walls are forming.");
}

function clearNachoQuadrants() {
  boss.quadrantMode = "idle";
  boss.quadrantTimer = 0;
  boss.playerQuadrant = null;
  clearNachoQuadrantPuddles();
}

function clearNachoQuadrantPuddles() {
  hazards = hazards.filter((hazard) => !hazard.quadrantCheese);
}

function clearNachoChipHazards() {
  hazards = hazards.filter((hazard) => hazard.type !== "nachoChip" && hazard.type !== "nachoCrumb");
}

function quadrantForPoint(x, y) {
  const centerX = world.arena.x + world.arena.w / 2;
  const centerY = world.arena.y + world.arena.h / 2;
  return `${x < centerX ? "left" : "right"}-${y < centerY ? "top" : "bottom"}`;
}

function ensureNachoCheeseWave() {
  if (hazards.some((hazard) => hazard.type === "cheeseWave")) return;
  const fromLeft = player.x > world.arena.x + world.arena.w / 2;
  hazards.push({
    type: "cheeseWave",
    x: fromLeft ? world.arena.x + 80 : world.arena.x + world.arena.w - 80,
    y: clamp(player.y, world.arena.y + 100, world.arena.y + world.arena.h - 100),
    r: 76,
    ttl: Number.POSITIVE_INFINITY,
    damage: 9,
    damageTimer: 0,
  });
  boss.cheeseWaveActive = true;
}

function spawnPicoPiece() {
  const colors = ["#f7f3e8", "#cf3b2f", "#3ca45e"];
  const angle = boss.picoIndex * 2.399963 + Math.sin(boss.animationTime * 2.2) * 0.18;
  const speed = 90 + (boss.picoIndex % 5) * 18 + Math.random() * 28;
  hazards.push({
    type: "pico",
    x: boss.x + Math.cos(angle) * (boss.radius * 0.65),
    y: boss.y + Math.sin(angle) * (boss.radius * 0.45),
    vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 45,
    vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 45,
    r: 4 + Math.random() * 2.5,
    ttl: 1.15 + Math.random() * 0.55,
    color: colors[boss.picoIndex % colors.length],
  });
  boss.picoIndex += 1;
}

function spawnNachoCheesePuddle(x, y, ttl) {
  hazards.push({
    type: "nachoCheesePuddle",
    x: clamp(x, world.arena.x + 70, world.arena.x + world.arena.w - 70),
    y: clamp(y, world.arena.y + 70, world.arena.y + world.arena.h - 70),
    r: boss.enraged ? 68 : 62,
    warn: 0.38,
    ttl,
    damage: boss.enraged ? 8 : 6,
    damageTimer: 0,
    quadrantCheese: true,
  });
}

function spawnNachoChips() {
  const count = 6;
  const offset = Math.random() * Math.PI * 2;
  for (let i = 0; i < count; i += 1) {
    const angle = offset + (Math.PI * 2 * i) / count;
    const speed = boss.enraged ? 265 : 235;
    hazards.push({
      type: "nachoChip",
      x: boss.x + Math.cos(angle) * (boss.radius + 18),
      y: boss.y + Math.sin(angle) * (boss.radius + 18),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle,
      r: 24,
      ttl: 2.4,
      traveled: 0,
      shatterDistance: 330,
      damage: 15,
    });
  }
  log("Tortilla chips fly out.");
}

function shatterNachoChip(chip, targetList = hazards) {
  const points = [
    { distance: 26, angle: chip.angle },
    { distance: 20, angle: chip.angle + 2.32 },
    { distance: 20, angle: chip.angle - 2.32 },
  ];
  points.forEach((point, pointIndex) => {
    const x = chip.x + Math.cos(point.angle) * point.distance;
    const y = chip.y + Math.sin(point.angle) * point.distance;
    for (let i = 0; i < 5; i += 1) {
      const angle = chip.angle + (i - 2) * 0.42 + (pointIndex - 1) * 0.18;
      const speed = 220 + Math.random() * 95;
      targetList.push({
        type: "nachoCrumb",
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 6,
        ttl: 1.45,
        damage: 8,
        color: "#e8bd50",
      });
    }
  });
  particles.push({ x: chip.x, y: chip.y - 16, text: "crunch", color: "#ffd76a", ttl: 0.55 });
}

function spawnShakePattern() {
  const roll = Math.random();
  if (boss.phase === 1) {
    if (roll < 0.42) spawnPeanutFan(false);
    else if (roll < 0.74) spawnChocolateLines(roll < 0.58 ? "vertical" : "horizontal");
    else spawnScoopDrop(player.x, player.y, 0);
    return;
  }
  if (boss.phase === 2) {
    if (roll < 0.36) spawnPeanutFan(true);
    else if (roll < 0.62) spawnScoopDrop(player.x, player.y, 0);
    else if (roll < 0.82) spawnWhippedShield();
    else spawnChocolateLines(Math.random() > 0.5 ? "vertical" : "horizontal");
    return;
  }
  if (roll < 0.28) spawnCherryBombs();
  else if (roll < 0.52) spawnTripleScoopCombo();
  else if (roll < 0.76) spawnPeanutFan(true);
  else spawnChocolateLines(Math.random() > 0.5 ? "vertical" : "horizontal");
}

function spawnPeanutFan(canBounce) {
  const count = boss.phase === 3 ? 7 : 5;
  const base = Math.atan2(player.y - boss.y, player.x - boss.x);
  for (let i = 0; i < count; i += 1) {
    const angle = base + (i - (count - 1) / 2) * 0.12;
    hazards.push({
      type: "peanut",
      x: boss.x,
      y: boss.y,
      vx: Math.cos(angle) * (boss.phase === 3 ? 390 : 340),
      vy: Math.sin(angle) * (boss.phase === 3 ? 390 : 340),
      r: 8,
      ttl: canBounce ? 3.2 : 2.35,
      damage: 12,
      bounces: canBounce ? 1 : 0,
    });
  }
  log(canBounce ? "Ricochet peanuts fired." : "Peanut spread fired.");
}

function spawnChocolateLines(orientation) {
  const lines = boss.phase === 3 ? 4 : 3;
  for (let i = 0; i < lines; i += 1) {
    const position = orientation === "vertical"
      ? world.arena.x + 130 + Math.random() * (world.arena.w - 260)
      : world.arena.y + 115 + Math.random() * (world.arena.h - 230);
    const direction = Math.random() > 0.5 ? 1 : -1;
    const speed = boss.phase === 3 ? 470 : 410;
    const length = 118;
    const width = 34;
    hazards.push({
      type: "chocolateBar",
      orientation,
      position,
      x: orientation === "vertical"
        ? position
        : direction > 0 ? world.arena.x - length : world.arena.x + world.arena.w + length,
      y: orientation === "vertical"
        ? direction > 0 ? world.arena.y - length : world.arena.y + world.arena.h + length
        : position,
      vx: orientation === "vertical" ? 0 : direction * speed,
      vy: orientation === "vertical" ? direction * speed : 0,
      warn: 1.15,
      ttl: 3.7,
      width,
      length,
      damage: 30,
      fixedDamage: true,
      hit: false,
    });
  }
  log("Chocolate bars incoming.");
}

function spawnScoopDrop(x, y, delay) {
  hazards.push({
    type: "scoopDrop",
    x: clamp(x + (Math.random() - 0.5) * 90, world.arena.x + 90, world.arena.x + world.arena.w - 90),
    y: clamp(y + (Math.random() - 0.5) * 90, world.arena.y + 80, world.arena.y + world.arena.h - 80),
    delay,
    warn: 0.85 + delay,
    ttl: 1.1 + delay,
    r: 46,
    damage: boss.phase >= 2 ? 19 : 16,
    hit: false,
  });
  log("Ice cream scoop incoming.");
}

function spawnWhippedShield() {
  boss.shieldTimer = 2.1;
  spawnChocolateLines(Math.random() > 0.5 ? "vertical" : "horizontal");
  log("Whipped cream shield raised.");
}

function spawnCherryBombs() {
  for (let i = 0; i < 4; i += 1) {
    const edge = Math.floor(Math.random() * 4);
    const x = edge === 0 ? world.arena.x + 75 : edge === 1 ? world.arena.x + world.arena.w - 75 : world.arena.x + 130 + Math.random() * (world.arena.w - 260);
    const y = edge === 2 ? world.arena.y + 75 : edge === 3 ? world.arena.y + world.arena.h - 75 : world.arena.y + 100 + Math.random() * (world.arena.h - 200);
    hazards.push({
      type: "cherryBomb",
      x,
      y,
      warn: 1.25,
      ttl: 2.1,
      r: 26,
      damage: 20,
      hit: false,
      burstShots: 3,
      burstTimer: 0,
      burstDelay: 0.16,
    });
  }
  log("Cherry bombs armed.");
}

function spawnTripleScoopCombo() {
  spawnScoopDrop(player.x, player.y, 0);
  spawnScoopDrop(player.x, player.y, 0.38);
  spawnScoopDrop(player.x, player.y, 0.76);
  log("Triple scoop combo.");
}

function spawnSauceMortar() {
  const point = randomArenaPointNearPlayer(210);
  hazards.push({
    type: "ketchupMortar",
    x: boss.x,
    y: boss.y,
    startX: boss.x,
    startY: boss.y,
    targetX: point.x,
    targetY: point.y,
    age: 0,
    flightTime: 0.8,
    r: 38,
    ttl: 0.8,
    damage: boss.enraged ? 8 : 6,
  });
}

function spawnSauceRicochet() {
  const count = boss.enraged ? 6 : 5;
  const base = Math.atan2(player.y - boss.y, player.x - boss.x);
  for (let i = 0; i < count; i += 1) {
    const angle = base + (i - (count - 1) / 2) * 0.22;
    hazards.push({
      type: "mustardSeed",
      x: boss.x,
      y: boss.y,
      vx: Math.cos(angle) * 390,
      vy: Math.sin(angle) * 390,
      r: 8,
      ttl: boss.enraged ? 3.5 : 2.8,
      damage: 11,
      bounces: boss.enraged ? 2 : 1,
    });
  }
}

function spawnSauceSpiral() {
  const colors = ["#cf3b2f", "#e3bf34", "#f3ead2"];
  const count = boss.enraged ? 15 : 10;
  const offset = Math.random() * Math.PI * 2;
  for (let i = 0; i < count; i += 1) {
    const angle = offset + (Math.PI * 2 * i) / count;
    hazards.push({
      type: "sauceBlob",
      x: boss.x,
      y: boss.y,
      vx: Math.cos(angle) * 235,
      vy: Math.sin(angle) * 235,
      r: 10,
      ttl: 2.4,
      damage: 10,
      color: colors[i % colors.length],
    });
  }
}

function spawnCurlyFriesPattern() {
  if (Math.random() < (boss.enraged ? 0.55 : boss.phase === 2 ? 0.55 : 0.35)) {
    spawnGreasePuddles(1);
  }
  if (Math.random() < 0.68) {
    spawnFryMachineGun();
  } else {
    spawnCurlySpiral();
  }
}

function spawnGreasePuddles(count) {
  for (let i = 0; i < count; i += 1) {
    const point = randomArenaPointAwayFromPlayer(170);
    hazards.push({
      type: "grease",
      x: point.x,
      y: point.y,
      r: 46,
      ttl: boss.enraged ? 6.6 : 6.2,
      explodeTimer: 1 + i * 0.15,
      exploded: false,
      burstCount: boss.enraged ? 14 : boss.phase === 2 ? 14 : 10,
    });
  }
  log("Grease circles are about to burst.");
}

function randomArenaPointAwayFromPlayer(minDistance) {
  let point = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    point = {
      x: world.arena.x + 130 + Math.random() * (world.arena.w - 260),
      y: world.arena.y + 120 + Math.random() * (world.arena.h - 240),
    };
    if (distance(point, player) >= minDistance) return point;
  }
  const angle = Math.random() * Math.PI * 2;
  return {
    x: clamp(player.x + Math.cos(angle) * minDistance, world.arena.x + 130, world.arena.x + world.arena.w - 130),
    y: clamp(player.y + Math.sin(angle) * minDistance, world.arena.y + 120, world.arena.y + world.arena.h - 120),
  };
}

function spawnFryMachineGun() {
  const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
  hazards.push({
    type: "machineGun",
    x: boss.x,
    y: boss.y,
    angle,
    sweepSpeed: (Math.random() > 0.5 ? 1 : -1) * (boss.enraged ? 0.55 : 0.48),
    warn: 0.65,
    ttl: boss.enraged ? 2.45 : 2.35,
    fireTimer: 0,
    damageTimer: 0,
    damage: 13,
  });
  setBossAnimation("machineGun");
  log("French fry machine gun charging.");
}

function spawnCurlySpiral() {
  const count = boss.enraged ? 15 : boss.phase === 2 ? 14 : 10;
  const twist = Math.random() > 0.5 ? 1 : -1;
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    hazards.push({
      type: "fry",
      x: boss.x,
      y: boss.y,
      vx: Math.cos(angle) * 185,
      vy: Math.sin(angle) * 185,
      turn: twist * 1.25,
      r: 10,
      ttl: 4.2,
      damage: 12,
    });
  }
  setBossAnimation("spiral");
  log("Curly spiral fired.");
}

function spawnKetchupAttack(source) {
  const point = randomArenaPointNearPlayer(140);
  const mayoDead = isCondimentDead("mayo");
  hazards.push({
    type: "ketchupMortar",
    x: source.x,
    y: source.y,
    startX: source.x,
    startY: source.y,
    targetX: point.x,
    targetY: point.y,
    age: 0,
    flightTime: 0.95,
    r: 42,
    ttl: 0.95,
    damage: 7,
    permanentAfterLanding: mayoDead,
  });
  log("Ketchup mortar launched.");
}

function spawnMustardAttack(source) {
  const count = condimentBosses.filter((item) => item.hp <= 0).length > 0 ? 5 : 3;
  const mayoDead = condimentBosses.some((item) => item.kind === "mayo" && item.hp <= 0);
  const bounces = mayoDead ? (condimentBosses.filter((item) => item.hp > 0).length === 1 ? 2 : 1) : 0;
  const base = Math.atan2(player.y - source.y, player.x - source.x);
  for (let i = 0; i < count; i += 1) {
    const angle = base + (i - (count - 1) / 2) * 0.18;
    hazards.push({
      type: "mustardSeed",
      x: source.x,
      y: source.y,
      vx: Math.cos(angle) * 320,
      vy: Math.sin(angle) * 320,
      r: 8,
      ttl: bounces > 0 ? 3.2 : 2.1,
      damage: 10,
      bounces,
    });
  }
  log(bounces > 0 ? "Bouncing mustard seeds fired." : "Mustard seeds fired.");
}

function spawnMayoHeal(source) {
  const wounded = livingBosses()
    .filter((target) => target !== source && target.hp < target.maxHp)
    .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  if (!wounded) {
    source.shieldTimer = 1.8;
    log("Mayo shields itself.");
    return;
  }
  const heal = condimentBosses.filter((item) => item.hp <= 0).length > 0 ? 42 : 30;
  wounded.hp = Math.min(wounded.maxHp, wounded.hp + heal);
  wounded.shieldTimer = 2.2;
  particles.push({ x: wounded.x, y: wounded.y - 38, text: `+${heal}`, color: "#f7efd9", ttl: 0.9 });
  log(`Mayo healed ${wounded.name}.`);
}

function randomArenaPointNearPlayer(spread) {
  return {
    x: clamp(player.x + (Math.random() - 0.5) * spread * 2, world.arena.x + 110, world.arena.x + world.arena.w - 110),
    y: clamp(player.y + (Math.random() - 0.5) * spread * 2, world.arena.y + 95, world.arena.y + world.arena.h - 95),
  };
}

function setBossAnimation(animation) {
  boss.animation = animation;
  boss.animationTime = 0;
}

function spawnFloorSlam() {
  hazards.push({
    type: "slam",
    x: player.x,
    y: player.y,
    r: boss.enraged ? 42 : 36,
    warn: boss.enraged ? 0.68 : 0.82,
    ttl: boss.enraged ? 1.05 : 1.2,
    damage: boss.enraged ? 29 : 24,
  });
}

function updateHazards(dt) {
  const spawnedHazards = [];
  hazards = hazards.filter((hazard) => {
    if (hazard.type === "grease") {
      hazard.ttl -= dt;
      hazard.explodeTimer = Math.max(0, (hazard.explodeTimer ?? 0) - dt);
      if (!hazard.exploded && hazard.explodeTimer <= 0) {
        hazard.exploded = true;
        spawnGreaseExplosion(hazard, spawnedHazards);
      }
      if (distance(player, hazard) < player.radius + hazard.r * 0.72) startGreaseSlide(hazard);
    } else if (hazard.type === "machineGun") {
      hazard.ttl -= dt;
      hazard.warn -= dt;
      if (hazard.warn <= 0) {
        hazard.angle += hazard.sweepSpeed * dt;
        hazard.fireTimer -= dt;
        hazard.damageTimer -= dt;
        while (hazard.fireTimer <= 0) {
          spawnFryShot(hazard, spawnedHazards);
          hazard.fireTimer += boss.enraged ? 0.045 : 0.048;
        }
        if (isPlayerInMachineGun(hazard) && hazard.damageTimer <= 0) {
          damagePlayer(boss.enraged ? 16 : 14, "French fry machine gun");
          hazard.damageTimer = boss.enraged ? 0.14 : 0.12;
        }
      }
    } else if (hazard.type === "pico") {
      hazard.ttl -= dt;
      hazard.x += hazard.vx * dt;
      hazard.y += hazard.vy * dt;
      hazard.vx *= Math.pow(0.84, dt * 4);
      hazard.vy *= Math.pow(0.84, dt * 4);
    } else if (hazard.type === "nachoCheesePuddle") {
      hazard.ttl -= dt;
      hazard.warn -= dt;
      if (hazard.warn <= 0 && distance(player, hazard) < player.radius + hazard.r) {
        hazard.damageTimer -= dt;
        if (hazard.damageTimer <= 0) {
          damagePlayer(hazard.damage, "Melted cheese");
          hazard.damageTimer = 0.45;
        }
      }
    } else if (hazard.type === "cheeseWave") {
      const slow = hazards.some((item) => item.type === "nachoCheesePuddle" && item.warn <= 0 && distance(item, hazard) < item.r + hazard.r * 0.7);
      const speed = (slow ? 46 : 78) + (boss.enraged ? 12 : 0);
      const angle = Math.atan2(player.y - hazard.y, player.x - hazard.x);
      hazard.x += Math.cos(angle) * speed * dt;
      hazard.y += Math.sin(angle) * speed * dt;
      hazard.damageTimer -= dt;
      if (distance(player, hazard) < player.radius + hazard.r && hazard.damageTimer <= 0) {
        damagePlayer(hazard.damage, "Nacho cheese wave");
        hazard.damageTimer = 0.38;
      }
    } else if (hazard.type === "nachoChip") {
      hazard.ttl -= dt;
      const dx = hazard.vx * dt;
      const dy = hazard.vy * dt;
      hazard.x += dx;
      hazard.y += dy;
      hazard.traveled += Math.hypot(dx, dy);
      if (distance(player, hazard) < player.radius + hazard.r && !player.dead) {
        damagePlayer(hazard.damage, "Tortilla chip");
        hazard.ttl = 0;
      } else if (hazard.traveled >= hazard.shatterDistance) {
        shatterNachoChip(hazard, spawnedHazards);
        hazard.ttl = 0;
      }
    } else if (hazard.type === "colaBubble") {
      hazard.ttl -= dt;
      hazard.x += hazard.vx * dt;
      hazard.y += hazard.vy * dt;
      hazard.vx += (Math.random() - 0.5) * 22 * dt;
      hazard.vy += (Math.random() - 0.5) * 22 * dt;
      if (distance(player, hazard) < player.radius + hazard.r && !player.dead) {
        popColaBubble(hazard);
        hazard.ttl = 0;
      } else if (hazard.ttl <= 0) {
        popColaBubble(hazard);
      }
    } else if (hazard.type === "strawSnipe") {
      hazard.ttl -= dt;
      hazard.warn -= dt;
      if (hazard.warn <= 0 && !hazard.hit) {
        hazard.hit = true;
        if (isPlayerInLine(hazard.x, hazard.y, hazard.angle, 780, player.radius + 11)) {
          damagePlayer(hazard.damage, "Straw snipe");
        }
      }
    } else if (hazard.type === "fizzBurst") {
      hazard.ttl -= dt;
      hazard.warn -= dt;
      if (hazard.warn <= 0 && !hazard.hit) {
        hazard.hit = true;
        if (distance(player, hazard) < hazard.r) {
          damagePlayer(hazard.damage, "Fizz burst");
          knockPlayerFrom(hazard.x, hazard.y, boss.enraged ? 360 : 285);
        }
      }
    } else if (hazard.type === "sodaPuddle") {
      hazard.ttl -= dt;
      if (distance(player, hazard) < player.radius + hazard.r) {
        hazard.damageTimer -= dt;
        if (hazard.damageTimer <= 0) {
          damagePlayer(hazard.damage, "Soda spill");
          hazard.damageTimer = 0.5;
        }
      }
    } else if (hazard.type === "chocolateBar") {
      hazard.ttl -= dt;
      hazard.warn -= dt;
      if (hazard.warn <= 0) {
        hazard.x += hazard.vx * dt;
        hazard.y += hazard.vy * dt;
        if (!hazard.hit && isPlayerInChocolateBar(hazard)) {
          hazard.hit = true;
          damagePlayer(hazard.damage, "Chocolate bar", { fixed: hazard.fixedDamage });
        }
      }
    } else if (hazard.type === "scoopDrop") {
      hazard.ttl -= dt;
      hazard.warn -= dt;
      if (hazard.warn <= 0 && !hazard.hit) {
        hazard.hit = true;
        if (distance(player, hazard) < player.radius + hazard.r) {
          damagePlayer(hazard.damage, "Ice cream scoop");
          addChillStack();
        }
        hazard.type = "frozenPuddle";
        hazard.ttl = 4.8;
        hazard.damageTimer = 0;
      }
    } else if (hazard.type === "frozenPuddle") {
      hazard.ttl -= dt;
      if (distance(player, hazard) < player.radius + hazard.r) {
        hazard.damageTimer -= dt;
        if (hazard.damageTimer <= 0) {
          addChillStack();
          hazard.damageTimer = 0.85;
        }
      }
    } else if (hazard.type === "cherryBomb") {
      hazard.ttl -= dt;
      hazard.warn -= dt;
      if (hazard.warn <= 0) {
        if (!hazard.hit) {
          hazard.hit = true;
          hazard.burstTimer = 0;
          particles.push({ x: hazard.x, y: hazard.y - 18, text: "burst", color: "#ff5d73", ttl: 0.6 });
        }
        hazard.burstTimer -= dt;
        while (hazard.burstShots > 0 && hazard.burstTimer <= 0) {
          spawnCherryBurst(hazard, spawnedHazards);
          hazard.burstShots -= 1;
          hazard.burstTimer += hazard.burstDelay;
        }
        if (hazard.burstShots <= 0 && hazard.burstTimer <= 0) hazard.ttl = 0;
      }
    } else if (hazard.type === "ketchupMortar") {
      hazard.age += dt;
      const progress = clamp(hazard.age / hazard.flightTime, 0, 1);
      hazard.x = hazard.startX + (hazard.targetX - hazard.startX) * progress;
      hazard.y = hazard.startY + (hazard.targetY - hazard.startY) * progress;
      if (progress >= 1) {
        hazard.type = "ketchupPuddle";
        hazard.x = hazard.targetX;
        hazard.y = hazard.targetY;
        hazard.ttl = hazard.permanentAfterLanding ? Number.POSITIVE_INFINITY : 5.2;
        hazard.warn = 0;
        hazard.damageTimer = 0;
      }
    } else if (hazard.type === "ketchupPuddle") {
      hazard.ttl -= dt;
      hazard.warn -= dt;
      if (hazard.warn <= 0 && distance(player, hazard) < player.radius + hazard.r) {
        hazard.damageTimer -= dt;
        if (hazard.damageTimer <= 0) {
          damagePlayer(hazard.damage, "Ketchup puddle");
          hazard.damageTimer = 0.35;
        }
      }
    } else if (hazard.type === "bolt" || hazard.type === "fry" || hazard.type === "mustardSeed" || hazard.type === "sauceBlob" || hazard.type === "peanut" || hazard.type === "cherryShot" || hazard.type === "nachoCrumb") {
      hazard.ttl -= dt;
      if (hazard.turn) {
        const speed = Math.hypot(hazard.vx, hazard.vy);
        const angle = Math.atan2(hazard.vy, hazard.vx) + hazard.turn * dt;
        hazard.vx = Math.cos(angle) * speed;
        hazard.vy = Math.sin(angle) * speed;
      }
      hazard.x += hazard.vx * dt;
      hazard.y += hazard.vy * dt;
      if ((hazard.type === "mustardSeed" || hazard.type === "peanut") && hazard.bounces > 0) {
        bounceProjectileInArena(hazard);
      }
      if (distance(player, hazard) < player.radius + hazard.r && !player.dead) {
        const source = hazard.type === "fry" ? "French fry" : hazard.type === "mustardSeed" ? "Mustard seed" : hazard.type === "sauceBlob" ? "Special sauce" : hazard.type === "peanut" ? "Peanut" : hazard.type === "cherryShot" ? "Cherry shot" : hazard.type === "nachoCrumb" ? "Nacho crumb" : "Arc bolt";
        damagePlayer(hazard.damage, source, { fixed: hazard.fixedDamage });
        if (hazard.type === "peanut" && boss.kind === "shake" && boss.phase >= 2) addChillStack();
        hazard.ttl = 0;
      }
    } else {
      hazard.ttl -= dt;
      hazard.warn -= dt;
      if (hazard.warn <= 0 && !hazard.hit && distance(player, hazard) < player.radius + hazard.r) {
        hazard.hit = true;
        damagePlayer(hazard.damage, hazard.type === "slam" ? "Ground slam" : "Furnace vent");
      }
    }
    if (hazard.type === "chocolateBar") return hazard.ttl > 0 && (hazard.warn > 0 || chocolateBarTouchesArena(hazard));
    return hazard.ttl > 0 && pointInRect(hazard.x, hazard.y, world.arena);
  });
  hazards.push(...spawnedHazards);
}

function popColaBubble(hazard) {
  particles.push({ x: hazard.x, y: hazard.y - 16, text: "pop", color: "#b9f4ff", ttl: 0.55 });
  if (distance(player, hazard) < player.radius + hazard.r + 22 && !player.dead) {
    damagePlayer(hazard.damage, "Bubble pop");
  }
}

function isPlayerInChocolateBar(hazard) {
  const halfWidth = hazard.width / 2 + player.radius;
  const halfLength = hazard.length / 2 + player.radius;
  if (hazard.orientation === "vertical") {
    return Math.abs(player.x - hazard.x) < halfWidth && Math.abs(player.y - hazard.y) < halfLength;
  }
  return Math.abs(player.x - hazard.x) < halfLength && Math.abs(player.y - hazard.y) < halfWidth;
}

function chocolateBarTouchesArena(hazard) {
  if (hazard.orientation === "vertical") {
    return hazard.y + hazard.length / 2 > world.arena.y && hazard.y - hazard.length / 2 < world.arena.y + world.arena.h;
  }
  return hazard.x + hazard.length / 2 > world.arena.x && hazard.x - hazard.length / 2 < world.arena.x + world.arena.w;
}

function isPlayerInCherryCross(hazard) {
  const inVertical = Math.abs(player.x - hazard.x) < 18 && Math.abs(player.y - hazard.y) < 360;
  const inHorizontal = Math.abs(player.y - hazard.y) < 18 && Math.abs(player.x - hazard.x) < 360;
  return distance(player, hazard) < hazard.r + player.radius || inVertical || inHorizontal;
}

function addChillStack() {
  if (player.freezeTimer > 0) return;
  player.chillStacks = Math.min(3, player.chillStacks + 1);
  player.chillTimer = 4;
  if (player.chillStacks >= 3) {
    player.freezeTimer = 0.7;
    player.chillStacks = 0;
    player.chillTimer = 0;
    showFloat("Brain freeze");
  } else {
    showFloat(`Chill ${player.chillStacks}/3`);
  }
}

function isPlayerInLine(x, y, angle, length, width) {
  const dx = player.x - x;
  const dy = player.y - y;
  const forward = Math.cos(angle) * dx + Math.sin(angle) * dy;
  if (forward < 0 || forward > length) return false;
  const side = Math.abs(-Math.sin(angle) * dx + Math.cos(angle) * dy);
  return side < width;
}

function knockPlayerFrom(x, y, speed) {
  const angle = Math.atan2(player.y - y, player.x - x);
  player.slide = {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    timer: 0.42,
  };
  player.destination = null;
}

function bounceProjectileInArena(hazard) {
  const left = world.arena.x + hazard.r;
  const right = world.arena.x + world.arena.w - hazard.r;
  const top = world.arena.y + hazard.r;
  const bottom = world.arena.y + world.arena.h - hazard.r;
  let bounced = false;
  if (hazard.x <= left || hazard.x >= right) {
    hazard.x = clamp(hazard.x, left, right);
    hazard.vx *= -1;
    bounced = true;
  }
  if (hazard.y <= top || hazard.y >= bottom) {
    hazard.y = clamp(hazard.y, top, bottom);
    hazard.vy *= -1;
    bounced = true;
  }
  if (bounced) {
    hazard.bounces -= 1;
    particles.push({ x: hazard.x, y: hazard.y - 8, text: "bounce", color: "#e3bf34", ttl: 0.45 });
  }
}

function isPlayerInMachineGun(emitter) {
  const dx = player.x - emitter.x;
  const dy = player.y - emitter.y;
  const forward = Math.cos(emitter.angle) * dx + Math.sin(emitter.angle) * dy;
  if (forward < 0 || forward > 820) return false;
  const side = Math.abs(-Math.sin(emitter.angle) * dx + Math.cos(emitter.angle) * dy);
  return side < player.radius + (boss.enraged ? 34 : 26);
}

function spawnFryShot(emitter, targetList = hazards) {
  const spread = (Math.random() - 0.5) * 0.16;
  const angle = emitter.angle + spread;
  const speed = (boss.enraged ? 850 : 760) + Math.random() * 90;
  targetList.push({
    type: "fry",
    x: emitter.x + Math.cos(angle) * (boss.radius + 10),
    y: emitter.y + Math.sin(angle) * (boss.radius + 10),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: 8,
    ttl: 1.25,
    damage: emitter.damage,
  });
}

function spawnGreaseExplosion(source, targetList = hazards) {
  const count = source.burstCount || 12;
  const offset = Math.random() * Math.PI * 2;
  for (let i = 0; i < count; i += 1) {
    const angle = offset + (Math.PI * 2 * i) / count;
    const speed = (boss.enraged ? 320 : 305) + Math.random() * 70;
    targetList.push({
      type: "fry",
      x: source.x + Math.cos(angle) * (source.r * 0.45),
      y: source.y + Math.sin(angle) * (source.r * 0.45),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 8,
      ttl: boss.enraged ? 1.75 : 1.7,
      damage: boss.enraged ? 15 : 14,
      color: "#ffd15f",
    });
  }
  particles.push({ x: source.x, y: source.y - 20, text: "burst", color: "#ffd15f", ttl: 0.65 });
}

function spawnCherryBurst(source, targetList = hazards) {
  const directions = 8;
  const offset = (source.burstShots % 2) * 0.06;
  for (let i = 0; i < directions; i += 1) {
    const angle = offset + (Math.PI * 2 * i) / directions;
    targetList.push({
      type: "cherryShot",
      x: source.x + Math.cos(angle) * (source.r + 8),
      y: source.y + Math.sin(angle) * (source.r + 8),
      vx: Math.cos(angle) * 355,
      vy: Math.sin(angle) * 355,
      r: 7,
      ttl: 2.1,
      damage: 20,
      fixedDamage: true,
      color: "#ff3f5f",
    });
  }
}

function damagePlayer(amount, source, options = {}) {
  const hit = options.fixed ? amount : Math.max(1, Math.ceil(amount * combatTuning.incomingDamageMultiplier - player.stats.armor));
  player.hp = Math.max(0, player.hp - hit);
  particles.push({ x: player.x, y: player.y - 35, text: `-${hit}`, color: "#ff8f7e", ttl: 0.8 });
  if (player.hp <= 0) {
    player.dead = true;
    selectedBoss = null;
    log(`${source} defeated you.`);
    ui.status.textContent = "Defeated. Reset the fight or tweak your gear.";
  }
}

function drinkPotion() {
  if (player.potions <= 0 || player.hp >= player.maxHp || player.dead || player.won) return;
  player.potions -= 1;
  player.hp = Math.min(player.maxHp, player.hp + Math.ceil(player.maxHp * 0.6));
  showFloat("Potion used");
  log("Potion restored health.");
}

function winFight() {
  selectedBoss = null;
  hazards = [];
  playerProjectiles = [];
  const seconds = fightStartedAt ? Math.max(1, Math.round((performance.now() - fightStartedAt) / 1000)) : 0;
  if (boss.kind === "shake" && boss.phase < boss.totalPhases) {
    boss.phase += 1;
    boss.maxHp = boss.phase === 2 ? 650 : 750;
    boss.hp = boss.maxHp;
    boss.enraged = false;
    boss.attackTimer = 1.2;
    boss.shieldTimer = 0;
    boss.state = "moving";
    boss.stateTimer = 0;
    player.hp = Math.min(player.maxHp, player.hp + 30);
    player.destination = null;
    player.slide = null;
    const phaseName = boss.phase === 2 ? "Brain Freeze" : "The Buster Cup";
    ui.status.textContent = `${phaseName}: Peanut Buster Shake refills.`;
    showFloat(phaseName);
    log(`${phaseName} begins.`);
    return;
  }
  log(`Victory in ${seconds}s.`);
  if (boss.kind === "cola") {
    boss = createBoss("burger");
    condimentBosses = [];
    fightStartedAt = 0;
    player.hp = player.maxHp;
    player.potions = 3;
    player.destination = null;
    player.slide = null;
    ui.status.textContent = "Big Cola defeated. Big Burger enters next.";
    showFloat("Next boss: Big Burger");
    return;
  }
  if (boss.kind === "burger") {
    boss = createBoss("fries");
    condimentBosses = [];
    fightStartedAt = 0;
    player.hp = player.maxHp;
    player.potions = 3;
    player.destination = null;
    player.slide = null;
    ui.status.textContent = "Big Burger defeated. Curly Fries enters next.";
    showFloat("Next boss: Curly Fries");
    return;
  }
  if (boss.kind === "fries") {
    boss = createBoss("trio");
    condimentBosses = createCondimentBosses();
    fightStartedAt = 0;
    player.hp = player.maxHp;
    player.potions = 3;
    player.destination = null;
    player.slide = null;
    ui.status.textContent = "Curly Fries defeated. Condiment Trio enters next.";
    showFloat("Next boss: Condiment Trio");
    return;
  }
  if (boss.kind === "sauce") {
    boss = createBoss("shake");
    condimentBosses = [];
    fightStartedAt = 0;
    player.hp = player.maxHp;
    player.potions = 3;
    player.destination = null;
    player.slide = null;
    ui.status.textContent = "Special Sauce defeated. Peanut Buster Shake enters next.";
    showFloat("Next boss: Peanut Buster Shake");
    return;
  }
  if (boss.kind === "shake") {
    boss = createBoss("nacho");
    condimentBosses = [];
    fightStartedAt = 0;
    player.hp = player.maxHp;
    player.potions = 3;
    player.destination = null;
    player.slide = null;
    ui.status.textContent = "Peanut Buster Shake defeated. Nacho Libre enters next.";
    showFloat("Next boss: Nacho Libre");
    return;
  }
  player.won = true;
  ui.status.textContent = "Victory. Reset to test another build.";
  showFloat(boss.kind === "nacho" ? "Nacho Libre defeated" : "Boss defeated");
}

function update(dt) {
  movePlayer(dt);
  updateRoom(dt);
  updateCombat(dt);
  updateHazards(dt);
  updatePlayerProjectiles(dt);
  particles = particles.filter((particle) => {
    particle.ttl -= dt;
    particle.y -= 28 * dt;
    return particle.ttl > 0;
  });
  floatTimer -= dt;
  if (floatTimer <= 0) ui.floatText.textContent = "";
  camera.x = clamp(player.x - canvas.clientWidth / 2, 0, world.width - canvas.clientWidth);
  camera.y = clamp(player.y - canvas.clientHeight / 2, 0, world.height - canvas.clientHeight);
}

function updatePlayerProjectiles(dt) {
  playerProjectiles = playerProjectiles.filter((projectile) => {
    projectile.ttl -= dt;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    const hitBoss = livingBosses().find((target) => distance(projectile, target) < target.radius + projectile.r);
    if (hitBoss) {
      if (hitBoss.kind === "nacho" && hitBoss.invulnerableTimer > 0) {
        particles.push({ x: hitBoss.x, y: hitBoss.y - 44, text: "immune", color: "#fff2c6", ttl: 0.75 });
        return false;
      }
      const damage = hitBoss.shieldTimer > 0 ? Math.ceil(projectile.damage * 0.5) : projectile.damage;
      hitBoss.hp = Math.max(0, hitBoss.hp - damage);
      particles.push({ x: hitBoss.x, y: hitBoss.y - 40, text: `-${damage}`, color: "#ffe08a", ttl: 0.8 });
      if (hitBoss.hp <= 0) {
        particles.push({ x: hitBoss.x, y: hitBoss.y - 62, text: `${hitBoss.name} down`, color: "#ffd27a", ttl: 1.2 });
        if (hitBoss === selectedBoss) selectedBoss = null;
        if (hitBoss.kind === "ketchup") clearKetchupHazards();
        if (hitBoss.kind === "mayo") makeKetchupPuddlesPermanent();
        if (livingBosses().length === 0) {
          if (boss.kind === "trio") spawnSpecialSauce();
          else winFight();
        }
      }
      return false;
    }
    return projectile.ttl > 0 && pointInRect(projectile.x, projectile.y, world.arena);
  });
}

function clearKetchupHazards() {
  hazards = hazards.filter((hazard) => hazard.type !== "ketchupMortar" && hazard.type !== "ketchupPuddle");
}

function makeKetchupPuddlesPermanent() {
  hazards.forEach((hazard) => {
    if (hazard.type === "ketchupPuddle") hazard.ttl = Number.POSITIVE_INFINITY;
    if (hazard.type === "ketchupMortar") hazard.permanentAfterLanding = true;
  });
  log("Mayo is down. Ketchup puddles now linger.");
}

function isCondimentDead(kind) {
  return condimentBosses.some((target) => target.kind === kind && target.hp <= 0);
}

function spawnSpecialSauce() {
  selectedBoss = null;
  hazards = [];
  playerProjectiles = [];
  condimentBosses = [];
  boss = createBoss("sauce");
  fightStartedAt = performance.now();
  player.hp = Math.min(player.maxHp, player.hp + 25);
  ui.status.textContent = "The trio combines into Special Sauce.";
  showFloat("Special Sauce appears");
}

function draw() {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  drawRooms();
  drawStands();
  drawBoss();
  drawHazards();
  drawPlayerProjectiles();
  drawPlayer();
  drawParticles();
  ctx.restore();
}

function drawRooms() {
  ctx.fillStyle = "#141917";
  ctx.fillRect(0, 0, world.width, world.height);
  drawRoom(world.starter, "#27362f", "#a6b9a2");
  drawRoom(world.arena, "#30292b", "#c89b62");
  ctx.fillStyle = "#755b36";
  ctx.fillRect(world.gate.x, world.gate.y, world.gate.w, world.gate.h);
  ctx.fillStyle = "#d8c693";
  ctx.font = "16px sans-serif";
  ctx.fillText("GATE", world.gate.x + 24, world.gate.y + 72);

  ctx.fillStyle = "rgba(238, 228, 188, 0.1)";
  for (let x = world.arena.x + 70; x < world.arena.x + world.arena.w; x += 92) {
    ctx.fillRect(x, world.arena.y + 30, 2, world.arena.h - 60);
  }
  for (let y = world.arena.y + 70; y < world.arena.y + world.arena.h; y += 92) {
    ctx.fillRect(world.arena.x + 30, y, world.arena.w - 60, 2);
  }
}

function drawRoom(rect, fill, trim) {
  ctx.fillStyle = fill;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = trim;
  ctx.lineWidth = world.wall;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
}

function drawStands() {
  stands.forEach((stand) => {
    const item = gear[stand.type][stand.id];
    const selected = player.gear[stand.type] === stand.id;
    ctx.fillStyle = selected ? "#f0d47c" : "#1b211e";
    ctx.fillRect(stand.x - 42, stand.y - 42, 84, 84);
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(stand.x, stand.y - 10, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f4f1e6";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(item.tag, stand.x, stand.y + 28);
    ctx.textAlign = "left";
  });
}

function drawBoss() {
  if (boss.kind === "trio") {
    condimentBosses.forEach(drawCondimentBoss);
    return;
  }
  if (boss.hp <= 0) return;
  if (selectedBoss === boss) drawRing(boss.x, boss.y, boss.radius + 12, "#ffe082");
  if (boss.kind === "fries") {
    drawCurlyFriesBoss();
  } else if (boss.kind === "sauce") {
    drawSpecialSauceBoss();
  } else if (boss.kind === "cola") {
    drawBigColaBoss();
  } else if (boss.kind === "shake") {
    drawPeanutBusterShakeBoss();
  } else if (boss.kind === "nacho") {
    drawNachoLibreBoss();
  } else {
    drawBurgerBoss();
  }
  ctx.fillStyle = "#f2d087";
  ctx.fillRect(boss.x - 58, boss.y - boss.radius - 24, 116 * (boss.hp / boss.maxHp), 9);
  ctx.fillStyle = "#fff2c6";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  const phaseText = boss.kind === "shake" ? ` ${boss.phase}/3` : boss.kind === "nacho" ? ` Phase ${boss.phase}` : "";
  ctx.fillText(`${boss.name}${phaseText}`, boss.x, boss.y - boss.radius - 38);
  if (boss.kind === "nacho" && boss.enrageTextTimer > 0) {
    ctx.fillStyle = "#ffda6b";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("Now I'm angry.", boss.x, boss.y + boss.radius + 30);
  }
  ctx.textAlign = "left";
}

function drawCondimentBoss(target) {
  if (target.hp <= 0) return;
  if (selectedBoss === target) drawRing(target.x, target.y, target.radius + 10, "#ffe082");
  if (target.kind === "mustard" && target.state === "winding") drawRing(target.x, target.y, target.radius + 18, "#fff08a");
  ctx.fillStyle = target.color;
  ctx.beginPath();
  ctx.roundRect(target.x - target.radius * 0.7, target.y - target.radius, target.radius * 1.4, target.radius * 2, 12);
  ctx.fill();
  ctx.fillStyle = target.kind === "mayo" ? "#443b31" : "#fff2c6";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(target.name, target.x, target.y - target.radius - 28);
  if (target.kind === "mustard" && target.state === "winding") {
    ctx.fillStyle = "#fff08a";
    ctx.fillText("Aiming", target.x, target.y + target.radius + 22);
  }
  ctx.fillStyle = "#141414";
  ctx.fillRect(target.x - 38, target.y - target.radius - 18, 76, 7);
  ctx.fillStyle = target.shieldTimer > 0 ? "#f6f0df" : "#f2d087";
  ctx.fillRect(target.x - 38, target.y - target.radius - 18, 76 * (target.hp / target.maxHp), 7);
  if (target.shieldTimer > 0) drawRing(target.x, target.y, target.radius + 16, "#f6f0df");
  ctx.textAlign = "left";
}

function drawBurgerBoss() {
  ctx.fillStyle = boss.enraged ? boss.enrageColor : boss.color;
  ctx.beginPath();
  ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#312923";
  ctx.fillRect(boss.x - 42, boss.y - 20, 84, 60);
}

function drawSpecialSauceBoss() {
  const colors = ["#cf3b2f", "#e3bf34", "#f3ead2"];
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.arc(
      boss.x + Math.cos(boss.animationTime * 2 + i * 2.09) * 18,
      boss.y + Math.sin(boss.animationTime * 2 + i * 2.09) * 14,
      boss.radius - i * 9,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = "rgba(40, 24, 18, 0.72)";
  ctx.beginPath();
  ctx.arc(boss.x, boss.y + 8, 28, 0, Math.PI * 2);
  ctx.fill();
  if (boss.shieldTimer > 0) drawRing(boss.x, boss.y, boss.radius + 16, "#f6f0df");
  if (boss.state === "winding") {
    drawRing(boss.x, boss.y, boss.radius + 24, "#fff08a");
    ctx.fillStyle = "#fff08a";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Aiming", boss.x, boss.y + boss.radius + 24);
    ctx.textAlign = "left";
  }
}

function drawBigColaBoss() {
  ctx.fillStyle = boss.enraged ? boss.enrageColor : boss.color;
  ctx.beginPath();
  ctx.roundRect(boss.x - 46, boss.y - 62, 92, 124, 16);
  ctx.fill();
  ctx.fillStyle = "#f4f1e6";
  ctx.fillRect(boss.x - 48, boss.y - 66, 96, 16);
  ctx.fillStyle = "#d64235";
  ctx.fillRect(boss.x - 35, boss.y - 44, 70, 30);
  ctx.fillStyle = "#f7f3e8";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("COLA", boss.x, boss.y - 24);
  ctx.strokeStyle = "#f7f3e8";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(boss.x + 24, boss.y - 68);
  ctx.lineTo(boss.x + 54, boss.y - 108);
  ctx.stroke();
  ctx.fillStyle = "rgba(185, 244, 255, 0.72)";
  for (let i = 0; i < 5; i += 1) {
    const angle = boss.animationTime * 1.4 + i * 1.25;
    ctx.beginPath();
    ctx.arc(boss.x + Math.cos(angle) * 58, boss.y - 55 + Math.sin(angle * 1.7) * 18, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = "left";
}

function drawPeanutBusterShakeBoss() {
  ctx.fillStyle = "#b65a34";
  ctx.beginPath();
  ctx.roundRect(boss.x - 52, boss.y - 36, 104, 96, 18);
  ctx.fill();
  ctx.fillStyle = boss.shieldTimer > 0 ? "#fff6df" : "#f1e2c9";
  ctx.beginPath();
  ctx.arc(boss.x, boss.y - 32, boss.radius * 0.86, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#7b3f23";
  for (let i = 0; i < 6; i += 1) {
    const angle = boss.animationTime * 1.2 + i * 1.05;
    ctx.beginPath();
    ctx.arc(boss.x + Math.cos(angle) * 42, boss.y - 28 + Math.sin(angle) * 24, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#c0182f";
  ctx.beginPath();
  ctx.arc(boss.x + 18, boss.y - 92, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6d2f1b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(boss.x - 38, boss.y - 62);
  ctx.bezierCurveTo(boss.x - 10, boss.y - 42, boss.x + 16, boss.y - 76, boss.x + 48, boss.y - 54);
  ctx.stroke();
  if (boss.shieldTimer > 0) drawRing(boss.x, boss.y - 10, boss.radius + 12, "#fff6df");
}

function drawNachoLibreBoss() {
  const pulse = Math.sin(boss.animationTime * 5) * 3;
  ctx.fillStyle = boss.enraged ? boss.enrageColor : boss.color;
  ctx.beginPath();
  ctx.arc(boss.x, boss.y, boss.radius + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2c95f";
  for (let i = 0; i < 10; i += 1) {
    const angle = boss.animationTime * 0.8 + (Math.PI * 2 * i) / 10;
    ctx.beginPath();
    ctx.moveTo(boss.x + Math.cos(angle) * 16, boss.y + Math.sin(angle) * 12);
    ctx.lineTo(boss.x + Math.cos(angle + 0.22) * 64, boss.y + Math.sin(angle + 0.22) * 52);
    ctx.lineTo(boss.x + Math.cos(angle - 0.22) * 64, boss.y + Math.sin(angle - 0.22) * 52);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#4b2b1a";
  ctx.beginPath();
  ctx.arc(boss.x - 22, boss.y - 7, 7, 0, Math.PI * 2);
  ctx.arc(boss.x + 22, boss.y - 7, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1f1712";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(boss.x - 42, boss.y - 22);
  ctx.lineTo(boss.x - 8, boss.y - 4);
  ctx.moveTo(boss.x + 42, boss.y - 22);
  ctx.lineTo(boss.x + 8, boss.y - 4);
  ctx.stroke();
  ctx.strokeStyle = "#e64635";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(boss.x, boss.y - 4, boss.radius * 0.78, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();
  if (boss.invulnerableTimer > 0) drawRing(boss.x, boss.y, boss.radius + 18, "#fff2c6");
}

function drawCurlyFriesBoss() {
  if (curlyFriesSprite.complete && curlyFriesSprite.naturalWidth > 0) {
    drawCurlyFriesSprite();
    return;
  }
  ctx.strokeStyle = boss.enraged ? boss.enrageColor : boss.color;
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  for (let i = 0; i < 5; i += 1) {
    const offset = (i - 2) * 13;
    ctx.beginPath();
    for (let t = 0; t < Math.PI * 1.7; t += 0.18) {
      const r = 12 + t * 12;
      const x = boss.x + offset + Math.cos(t + i * 0.7) * r;
      const y = boss.y + Math.sin(t + i * 0.7) * r * 0.62;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  ctx.fillStyle = "#6b4226";
  ctx.beginPath();
  ctx.arc(boss.x, boss.y + 8, 18, 0, Math.PI * 2);
  ctx.fill();
}

function drawCurlyFriesSprite() {
  const sprite = cleanedCurlyFriesSprite || curlyFriesSprite;
  const frameWidth = sprite.width / 4;
  const frameHeight = sprite.height / 3;
  const rows = { idle: 0, machineGun: 1, spiral: 2 };
  const animationDuration = boss.animation === "idle" ? 999 : boss.animation === "machineGun" ? 1.15 : 1.0;
  if (boss.animation !== "idle" && boss.animationTime > animationDuration) boss.animation = "idle";
  const row = rows[boss.animation] ?? 0;
  const frame = Math.floor(boss.animationTime * 8) % 4;
  const crop = {
    x: frameWidth * 0.08,
    y: frameHeight * 0.08,
    w: frameWidth * 0.84,
    h: frameHeight * 0.82,
  };
  const drawWidth = 156;
  const drawHeight = 128;
  ctx.drawImage(
    sprite,
    frame * frameWidth + crop.x,
    row * frameHeight + crop.y,
    crop.w,
    crop.h,
    boss.x - drawWidth / 2,
    boss.y - drawHeight * 0.58,
    drawWidth,
    drawHeight,
  );
}

function drawNachoWalls() {
  if (boss.kind !== "nacho" || boss.quadrantMode === "idle") return;
  const centerX = world.arena.x + world.arena.w / 2;
  const centerY = world.arena.y + world.arena.h / 2;
  const warning = boss.quadrantMode === "warning";
  ctx.fillStyle = warning ? "rgba(255, 242, 182, 0.22)" : "rgba(95, 57, 22, 0.88)";
  ctx.strokeStyle = warning ? "rgba(255, 242, 182, 0.82)" : "#f0c35b";
  ctx.lineWidth = warning ? 3 : 4;
  ctx.fillRect(centerX - 18, world.arena.y + 18, 36, world.arena.h - 36);
  ctx.fillRect(world.arena.x + 18, centerY - 18, world.arena.w - 36, 36);
  ctx.strokeRect(centerX - 18, world.arena.y + 18, 36, world.arena.h - 36);
  ctx.strokeRect(world.arena.x + 18, centerY - 18, world.arena.w - 36, 36);
}

function drawHazards() {
  hazards.forEach((hazard) => {
    if (hazard.type === "grease") {
      ctx.fillStyle = "rgba(219, 174, 72, 0.24)";
      ctx.strokeStyle = "rgba(255, 226, 118, 0.65)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(hazard.x, hazard.y, hazard.r, hazard.r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (!hazard.exploded) {
        const pulse = 1 - clamp(hazard.explodeTimer ?? 0, 0, 1);
        ctx.strokeStyle = "rgba(255, 241, 150, 0.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(hazard.x, hazard.y, hazard.r * (0.52 + pulse * 0.52), 0, Math.PI * 2);
        ctx.stroke();
      }
      return;
    }
    if (hazard.type === "pico") {
      ctx.fillStyle = hazard.color;
      ctx.save();
      ctx.translate(hazard.x, hazard.y);
      ctx.rotate(hazard.ttl * 8);
      ctx.fillRect(-hazard.r, -hazard.r, hazard.r * 2, hazard.r * 2);
      ctx.restore();
      return;
    }
    if (hazard.type === "nachoCheesePuddle") {
      const warning = hazard.warn > 0;
      ctx.fillStyle = warning ? "rgba(255, 210, 73, 0.12)" : "rgba(255, 190, 35, 0.42)";
      ctx.strokeStyle = warning ? "#ffe7a0" : "#f2a91f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(hazard.x, hazard.y, hazard.r, hazard.r * 0.72, Math.sin(hazard.x) * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      return;
    }
    if (hazard.type === "cheeseWave") {
      ctx.fillStyle = "rgba(255, 189, 39, 0.5)";
      ctx.strokeStyle = "#ffd66b";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(hazard.x, hazard.y, hazard.r * 1.25, hazard.r * 0.82, Math.sin(boss.animationTime) * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 235, 145, 0.5)";
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.arc(hazard.x + Math.cos(boss.animationTime * 2 + i) * 42, hazard.y + Math.sin(boss.animationTime * 1.7 + i) * 26, 9, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    if (hazard.type === "nachoChip") {
      ctx.save();
      ctx.translate(hazard.x, hazard.y);
      ctx.rotate(hazard.angle);
      ctx.fillStyle = "#e7bd56";
      ctx.strokeStyle = "#8f5f20";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(27, 0);
      ctx.lineTo(-18, -20);
      ctx.lineTo(-18, 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (hazard.type === "colaBubble") {
      ctx.fillStyle = "rgba(185, 244, 255, 0.32)";
      ctx.strokeStyle = "#b9f4ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      return;
    }
    if (hazard.type === "strawSnipe") {
      const active = hazard.warn <= 0;
      ctx.strokeStyle = active ? "rgba(120, 55, 34, 0.85)" : "rgba(255, 245, 176, 0.45)";
      ctx.lineWidth = active ? 9 : 4;
      ctx.beginPath();
      ctx.moveTo(hazard.x, hazard.y);
      ctx.lineTo(hazard.x + Math.cos(hazard.angle) * 780, hazard.y + Math.sin(hazard.angle) * 780);
      ctx.stroke();
      return;
    }
    if (hazard.type === "fizzBurst") {
      const warning = hazard.warn > 0;
      ctx.fillStyle = warning ? "rgba(185, 244, 255, 0.08)" : "rgba(185, 244, 255, 0.24)";
      ctx.strokeStyle = warning ? "#b9f4ff" : "#ffffff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      return;
    }
    if (hazard.type === "sodaPuddle") {
      ctx.fillStyle = "rgba(86, 45, 24, 0.34)";
      ctx.strokeStyle = "rgba(185, 244, 255, 0.42)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(hazard.x, hazard.y, hazard.r, hazard.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      return;
    }
    if (hazard.type === "chocolateBar") {
      const active = hazard.warn <= 0;
      if (!active) {
        ctx.fillStyle = "rgba(255, 248, 232, 0.38)";
        if (hazard.orientation === "vertical") {
          ctx.fillRect(hazard.position - hazard.width / 2, world.arena.y + 40, hazard.width, world.arena.h - 80);
        } else {
          ctx.fillRect(world.arena.x + 40, hazard.position - hazard.width / 2, world.arena.w - 80, hazard.width);
        }
        return;
      }
      ctx.save();
      ctx.translate(hazard.x, hazard.y);
      if (hazard.orientation === "vertical") ctx.rotate(Math.PI / 2);
      ctx.fillStyle = "#6b351f";
      ctx.strokeStyle = "#2d1710";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-hazard.length / 2, -hazard.width / 2, hazard.length, hazard.width, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 221, 176, 0.26)";
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.roundRect(i * 32 - 12, -hazard.width / 2 + 6, 24, hazard.width - 12, 5);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    if (hazard.type === "scoopDrop" || hazard.type === "frozenPuddle") {
      const active = hazard.type === "frozenPuddle";
      ctx.fillStyle = active ? "rgba(170, 225, 255, 0.28)" : "rgba(170, 225, 255, 0.11)";
      ctx.strokeStyle = active ? "#aae1ff" : "#e8f8ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (hazard.type === "scoopDrop") {
        const progress = clamp(1 - hazard.warn / Math.max(0.1, 0.85 + hazard.delay), 0, 1);
        ctx.fillStyle = "#f1e2c9";
        ctx.beginPath();
        ctx.arc(hazard.x, hazard.y - 90 + progress * 90, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    if (hazard.type === "cherryBomb") {
      const active = hazard.warn <= 0;
      ctx.fillStyle = active ? "rgba(192, 24, 47, 0.32)" : "rgba(192, 24, 47, 0.12)";
      ctx.strokeStyle = "#ff5d73";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (active) {
        ctx.strokeStyle = "rgba(255, 214, 220, 0.75)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i += 1) {
          const angle = (Math.PI * 2 * i) / 8;
          ctx.beginPath();
          ctx.moveTo(hazard.x + Math.cos(angle) * 12, hazard.y + Math.sin(angle) * 12);
          ctx.lineTo(hazard.x + Math.cos(angle) * 44, hazard.y + Math.sin(angle) * 44);
          ctx.stroke();
        }
      }
      return;
    }
    if (hazard.type === "ketchupPuddle") {
      const warning = hazard.warn > 0;
      ctx.fillStyle = warning ? "rgba(210, 55, 45, 0.14)" : "rgba(210, 55, 45, 0.34)";
      ctx.strokeStyle = warning ? "#ff9b8d" : "#cf3b2f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      return;
    }
    if (hazard.type === "ketchupMortar") {
      const progress = clamp(hazard.age / hazard.flightTime, 0, 1);
      const arc = Math.sin(progress * Math.PI) * 72;
      ctx.fillStyle = "rgba(210, 55, 45, 0.12)";
      ctx.strokeStyle = "#ff9b8d";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hazard.targetX, hazard.targetY, hazard.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#cf3b2f";
      ctx.beginPath();
      ctx.arc(hazard.x, hazard.y - arc, 12 + progress * 5, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (hazard.type === "machineGun") {
      const active = hazard.warn <= 0;
      const length = 760;
      ctx.strokeStyle = active ? "rgba(255, 203, 85, 0.52)" : "rgba(255, 245, 176, 0.42)";
      ctx.lineWidth = active ? 14 : 8;
      ctx.beginPath();
      ctx.moveTo(hazard.x, hazard.y);
      ctx.lineTo(hazard.x + Math.cos(hazard.angle) * length, hazard.y + Math.sin(hazard.angle) * length);
      ctx.stroke();
      return;
    }
    if (hazard.type === "bolt" || hazard.type === "fry" || hazard.type === "mustardSeed" || hazard.type === "sauceBlob" || hazard.type === "peanut" || hazard.type === "cherryShot" || hazard.type === "nachoCrumb") {
      ctx.fillStyle = hazard.color || (hazard.type === "fry" ? "#f1c15d" : hazard.type === "mustardSeed" ? "#e3bf34" : hazard.type === "peanut" ? "#8b552f" : hazard.type === "cherryShot" ? "#ff3f5f" : hazard.type === "nachoCrumb" ? "#e8bd50" : "#8ad8ff");
      ctx.beginPath();
      if (hazard.type === "fry") {
        ctx.ellipse(hazard.x, hazard.y, hazard.r * 1.8, hazard.r * 0.75, Math.atan2(hazard.vy, hazard.vx), 0, Math.PI * 2);
      } else if (hazard.type === "peanut") {
        ctx.ellipse(hazard.x, hazard.y, hazard.r * 1.35, hazard.r * 0.82, Math.atan2(hazard.vy, hazard.vx), 0, Math.PI * 2);
      } else if (hazard.type === "nachoCrumb") {
        ctx.ellipse(hazard.x, hazard.y, hazard.r * 1.3, hazard.r * 0.8, Math.atan2(hazard.vy, hazard.vx), 0, Math.PI * 2);
      } else {
        ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
      }
      ctx.fill();
      return;
    }
    const warning = hazard.warn > 0;
    ctx.strokeStyle = warning ? "#ffda6b" : "#f06a4f";
    ctx.fillStyle = warning ? "rgba(255, 218, 107, 0.12)" : "rgba(240, 106, 79, 0.28)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  drawNachoWalls();
}

function drawPlayerProjectiles() {
  playerProjectiles.forEach((projectile) => {
    const angle = Math.atan2(projectile.vy, projectile.vx);
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(angle);
    if (projectile.tag === "Magic") {
      ctx.fillStyle = projectile.color;
      ctx.shadowColor = projectile.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, projectile.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (projectile.tag === "Ranged") {
      ctx.strokeStyle = projectile.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(12, 0);
      ctx.stroke();
    } else {
      ctx.fillStyle = projectile.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

function drawPlayer() {
  drawRing(player.x, player.y, player.radius + 7, player.dead ? "#c7443b" : "#92d4ff");
  if (playerSprite.complete && playerSprite.naturalWidth > 0) {
    drawPlayerSprite();
  } else {
    drawFallbackPlayer();
  }
  if (player.destination) drawRing(player.destination.x, player.destination.y, 11, "#e9f6df");
}

function drawPlayerSprite() {
  const sprite = cleanedPlayerSprite || playerSprite;
  const rows = { down: 0, left: 1, right: 2, up: 3 };
  const frameWidth = sprite.width / 4;
  const frameHeight = sprite.height / 4;
  const frame = player.moving ? Math.floor(player.animationTime * 8) % 4 : 1;
  const row = rows[player.facing] ?? 0;
  const topCrop = player.facing === "up" ? 0.04 : 0.1;
  const crop = {
    x: frameWidth * 0.2,
    y: frameHeight * topCrop,
    w: frameWidth * 0.56,
    h: frameHeight * (0.86 - topCrop),
  };
  const drawWidth = 58;
  const drawHeight = 74;
  ctx.drawImage(
    sprite,
    frame * frameWidth + crop.x,
    row * frameHeight + crop.y,
    crop.w,
    crop.h,
    player.x - drawWidth / 2,
    player.y - drawHeight * 0.66,
    drawWidth,
    drawHeight,
  );
}

function createTransparentSprite(image) {
  const buffer = document.createElement("canvas");
  buffer.width = image.naturalWidth;
  buffer.height = image.naturalHeight;
  const bufferCtx = buffer.getContext("2d");
  bufferCtx.drawImage(image, 0, 0);
  const pixels = bufferCtx.getImageData(0, 0, buffer.width, buffer.height);
  const data = pixels.data;

  for (let i = 0; i < data.length; i += 4) {
    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];
    const isLightBackground = red > 218 && green > 208 && blue > 190;
    const isGridLine = Math.abs(red - green) < 18 && Math.abs(green - blue) < 18 && red > 180;
    if (isLightBackground || isGridLine) data[i + 3] = 0;
  }

  bufferCtx.putImageData(pixels, 0, 0);
  return buffer;
}

function drawFallbackPlayer() {
  const armor = gear.armor[player.gear.armor];
  const weapon = gear.weapon[player.gear.weapon];
  ctx.fillStyle = "#d8a36f";
  ctx.beginPath();
  ctx.arc(player.x, player.y - 12, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = armor.color;
  ctx.fillRect(player.x - 14, player.y, 28, 30);
  ctx.strokeStyle = weapon.color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(player.x + 12, player.y + 4);
  ctx.lineTo(player.x + 34, player.y - 8);
  ctx.stroke();
}

function drawParticles() {
  particles.forEach((particle) => {
    ctx.fillStyle = particle.color;
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(particle.text, particle.x, particle.y);
    ctx.textAlign = "left";
  });
}

function drawRing(x, y, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function renderUi() {
  ui.roomText.textContent = player.room === "starter" ? "Starter Room" : player.won ? "Victory" : "Boss Arena";
  ui.hpText.textContent = `${Math.ceil(player.hp)}/${player.maxHp}`;
  ui.hpBar.style.width = `${(player.hp / player.maxHp) * 100}%`;
  const bossHp = bossHealthSummary();
  ui.bossHpText.textContent = boss.kind === "shake"
    ? `${Math.ceil(bossHp.hp)}/${bossHp.maxHp} Bar ${boss.phase}/3`
    : boss.kind === "nacho"
      ? `${Math.ceil(bossHp.hp)}/${bossHp.maxHp} Phase ${boss.phase}/3`
      : `${Math.ceil(bossHp.hp)}/${bossHp.maxHp}`;
  ui.bossHpBar.style.width = `${(bossHp.hp / bossHp.maxHp) * 100}%`;
  ui.potionButton.textContent = `Potion (${player.potions})`;
  const weapon = gear.weapon[player.gear.weapon];
  const armor = gear.armor[player.gear.armor];
  ui.buildPanel.innerHTML = `
    <div><span>Weapon</span><strong>${weapon.name}</strong></div>
    <div><span>Armor</span><strong>${armor.name}</strong></div>
    <div><span>Damage</span><strong>${player.stats.damage}</strong></div>
    <div><span>Range</span><strong>${player.stats.range}</strong></div>
    <div><span>Armor</span><strong>${player.stats.armor}</strong></div>
    <div><span>Speed</span><strong>${player.stats.speed}</strong></div>
  `;
  if (ui.armory) {
    ui.armory.innerHTML = [...Object.values(gear.weapon), ...Object.values(gear.armor)].map((item) => {
      const selected = player.gear[item.slot] && gear[item.slot][player.gear[item.slot]].name === item.name;
      return `<button class="choice ${selected ? "selected" : ""}" data-slot="${item.slot}" data-name="${item.name}"><span>${item.name}</span><small>${item.tag}</small></button>`;
    }).join("");
  }
  ui.bossSelector.querySelectorAll("[data-boss]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.boss === boss.kind);
  });
}

function bossHealthSummary() {
  if (boss.kind !== "trio") return { hp: boss.hp, maxHp: boss.maxHp };
  return {
    hp: condimentBosses.reduce((total, target) => total + Math.max(0, target.hp), 0),
    maxHp: condimentBosses.reduce((total, target) => total + target.maxHp, 0),
  };
}

function showFloat(text) {
  ui.floatText.textContent = text;
  floatTimer = 1.7;
}

function gameLoop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  renderUi();
  requestAnimationFrame(gameLoop);
}

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  handleCanvasClick(event.clientX - rect.left + camera.x, event.clientY - rect.top + camera.y);
});

if (ui.armory) {
  ui.armory.addEventListener("click", (event) => {
    const button = event.target.closest("[data-slot]");
    if (!button) return;
    const slot = button.dataset.slot;
    const entry = Object.entries(gear[slot]).find(([, item]) => item.name === button.dataset.name);
    if (!entry) return;
    equipFromStand({ type: slot, id: entry[0] });
  });
}

ui.bossSelector.addEventListener("click", (event) => {
  const button = event.target.closest("[data-boss]");
  if (!button) return;
  event.preventDefault();
  selectBoss(button.dataset.boss);
});

ui.potionButton.addEventListener("click", drinkPotion);
ui.resetButton.addEventListener("click", () => resetFight(false));
window.addEventListener("keydown", (event) => {
  if (isTypingTarget(document.activeElement)) return;
  const key = event.key.toLowerCase();
  const direction = keyDirections[key];
  if (direction) {
    event.preventDefault();
    movementKeys[direction] = true;
    return;
  }
  if (key !== "q") return;
  event.preventDefault();
  drinkPotion();
});
window.addEventListener("keyup", (event) => {
  const direction = keyDirections[event.key.toLowerCase()];
  if (!direction) return;
  event.preventDefault();
  movementKeys[direction] = false;
});
window.addEventListener("blur", () => {
  Object.keys(movementKeys).forEach((direction) => {
    movementKeys[direction] = false;
  });
});
window.addEventListener("resize", resizeCanvas);

loadGame();
applyGear();
resizeCanvas();
renderUi();
requestAnimationFrame(gameLoop);
