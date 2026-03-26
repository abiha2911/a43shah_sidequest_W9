/*
  Week 6 — Example 3: Expanded Tile-Based Level with Camera Follow, Fall Reset, and Scrolling Background

  Course: GBDA302 | Instructors: Dr. Karen Cochrane & David Han
  Date: Feb. 26, 2026

  Controls:
    A or D (Left / Right Arrow)   Horizontal movement
    W (Up Arrow)                  Jump
    Space Bar                     Attack

  Debug Controls:
    M                             Toggle moon gravity
    B                             Toggle hitboxes
    R                             Reset player

  Tile key:
    g = groundTile.png       (surface ground)
    d = groundTileDeep.png   (deep ground, below surface)
    L = platformLC.png       (platform left cap)
    R = platformRC.png       (platform right cap)
    [ = wallL.png            (wall left side)
    ] = wallR.png            (wall right side)
      = empty (no sprite)
*/

let player, sensor;
let bgLayers = [];
let playerImg, bgForeImg, bgMidImg, bgFarImg;

let playerAnis = {
  idle: { row: 0, frames: 4, frameDelay: 10 },
  run: { row: 1, frames: 4, frameDelay: 3 },
  jump: { row: 2, frames: 3, frameDelay: Infinity, frame: 0 },
  attack: { row: 3, frames: 6, frameDelay: 2 },
};

let ground, groundDeep, platformsL, platformsR, wallsL, wallsR;
let groundTile1Img,
  groundTile2Img,
  platformTileLImg,
  platformTileRImg,
  wallTileLImg,
  wallTileRImg;

let attacking = false;
let attackFrameCounter = 0;

// --- DEBUG VARIABLES ---
let debugMode = true;
let moonGravityOn = false;
let showHitboxes = false;

// --- TILE MAP ---
let level = [
  "                    g                   ",
  "                                        ",
  "                LggR                    ",
  "     LR   LgR          LR               ",
  "                                        ",
  "   LgggR       LR   LgR                 ",
  "         LgR            g   LggggR      ",
  "               LgR                      ",
  "                                    LggR",
  "          LgR               LR  LR  [dd]",
  "          [d]        gggg           [dd]",
  "ggggg  gggggggg   ggggggg  g ggggggggggg",
  "ddddd  dddddddd   ddddddd    ddddddddddd",
];

// --- LEVEL CONSTANTS ---
const TILE_W = 24;
const TILE_H = 24;

const FRAME_W = 32;
const FRAME_H = 32;

const LEVELW = TILE_W * level[0].length;
const LEVELH = TILE_H * level.length;

const VIEWTILE_W = 10;
const VIEWTILE_H = 8;
const VIEWW = TILE_W * VIEWTILE_W;
const VIEWH = TILE_H * VIEWTILE_H;

const PLAYER_START_Y = LEVELH - TILE_H * 4;

const GRAVITY = 10;
const MOON_GRAVITY = 1.6;

function preload() {
  playerImg = loadImage("assets/foxSpriteSheet.png");
  bgFarImg = loadImage("assets/background_layer_1.png");
  bgMidImg = loadImage("assets/background_layer_2.png");
  bgForeImg = loadImage("assets/background_layer_3.png");
  groundTile1Img = loadImage("assets/groundTile.png");
  groundTile2Img = loadImage("assets/groundTileDeep.png");
  platformTileLImg = loadImage("assets/platformLC.png");
  platformTileRImg = loadImage("assets/platformRC.png");
  wallTileLImg = loadImage("assets/wallL.png");
  wallTileRImg = loadImage("assets/wallR.png");
}

function setup() {
  new Canvas(VIEWW, VIEWH, "pixelated");
  noSmooth();

  applyIntegerScale();
  window.addEventListener("resize", applyIntegerScale);

  allSprites.pixelPerfect = true;

  world.gravity.y = GRAVITY;

  // --- TILE GROUPS ---
  ground = new Group();
  ground.physics = "static";
  ground.img = groundTile1Img;
  ground.tile = "g";

  groundDeep = new Group();
  groundDeep.physics = "static";
  groundDeep.img = groundTile2Img;
  groundDeep.tile = "d";

  platformsL = new Group();
  platformsL.physics = "static";
  platformsL.img = platformTileLImg;
  platformsL.tile = "L";

  platformsR = new Group();
  platformsR.physics = "static";
  platformsR.img = platformTileRImg;
  platformsR.tile = "R";

  wallsL = new Group();
  wallsL.physics = "static";
  wallsL.img = wallTileLImg;
  wallsL.tile = "[";

  wallsR = new Group();
  wallsR.physics = "static";
  wallsR.img = wallTileRImg;
  wallsR.tile = "]";

  new Tiles(level, 0, 0, TILE_W, TILE_H);

  // --- PLAYER ---
  player = new Sprite(FRAME_W, PLAYER_START_Y, FRAME_W, FRAME_H);
  player.spriteSheet = playerImg;
  player.rotationLock = true;
  player.anis.w = FRAME_W;
  player.anis.h = FRAME_H;
  player.anis.offset.y = -8;
  player.addAnis(playerAnis);

  player.ani = "idle";
  player.w = 18;
  player.h = 12;
  player.friction = 0;
  player.bounciness = 0;

  // --- GROUND SENSOR ---
  sensor = new Sprite();
  sensor.x = player.x;
  sensor.y = player.y + player.h / 2;
  sensor.w = player.w;
  sensor.h = 2;
  sensor.mass = 0.01;
  sensor.removeColliders();
  sensor.visible = false;

  let sensorJoint = new GlueJoint(player, sensor);
  sensorJoint.visible = false;

  // --- BACKGROUND ---
  bgLayers = [
    { img: bgFarImg, speed: 0.2 },
    { img: bgMidImg, speed: 0.4 },
    { img: bgForeImg, speed: 0.6 },
  ];

  world.autoStep = false;
}

function draw() {
  background(69, 61, 79);

  world.step();

  // --- CAMERA ---
  camera.width = VIEWW;
  camera.height = VIEWH;

  let targetX = constrain(player.x, VIEWW / 2, LEVELW - VIEWW / 2 - TILE_W / 2);
  let targetY = constrain(
    player.y,
    VIEWH / 2 - TILE_H * 2,
    LEVELH - VIEWH / 2 - TILE_H,
  );

  camera.x = Math.round(lerp(camera.x || targetX, targetX, 0.1));
  camera.y = Math.round(lerp(camera.y || targetY, targetY, 0.1));

  // --- PLAYER CONTROLS ---
  let grounded =
    sensor.overlapping(ground) ||
    sensor.overlapping(platformsL) ||
    sensor.overlapping(platformsR);

  // --- DEBUG TOGGLES ---
  if (kb.presses("m")) {
    toggleMoonGravity();
  }

  if (kb.presses("b")) {
    showHitboxes = !showHitboxes;
    allSprites.debug = showHitboxes;
  }

  if (kb.presses("r")) {
    resetPlayer();
  }

  // --- ATTACK INPUT ---
  if (grounded && !attacking && kb.presses("space")) {
    attacking = true;
    attackFrameCounter = 0;
    player.vel.x = 0;
    player.ani.frame = 0;
    player.ani = "attack";
    player.ani.play();
  }

  // --- JUMP ---
  if (grounded && kb.presses("up")) {
    player.vel.y = -4.5;
  }

  // --- STATE MACHINE ---
  if (attacking) {
    attackFrameCounter++;
    if (attackFrameCounter > 12) {
      attacking = false;
      attackFrameCounter = 0;
    }
  } else if (!grounded) {
    player.ani = "jump";
    player.ani.frame = player.vel.y < 0 ? 0 : 1;
  } else {
    player.ani = kb.pressing("left") || kb.pressing("right") ? "run" : "idle";
  }

  // --- MOVEMENT ---
  if (!attacking) {
    player.vel.x = 0;

    if (kb.pressing("left")) {
      player.vel.x = -1.5;
      player.mirror.x = true;
    } else if (kb.pressing("right")) {
      player.vel.x = 1.5;
      player.mirror.x = false;
    }
  }

  // --- PLAYER BOUNDS ---
  player.x = constrain(player.x, FRAME_W / 2, LEVELW - FRAME_W / 2);

  // --- BACKGROUNDS ---
  camera.off();
  imageMode(CORNER);
  drawingContext.imageSmoothingEnabled = false;

  for (const layer of bgLayers) {
    const img = layer.img;
    const w = img.width;

    let x = Math.round((-camera.x * layer.speed) % w);

    if (x > 0) x -= w;

    for (let tx = x; tx < VIEWW + w; tx += w) {
      image(img, tx, 0);
    }
  }

  camera.on();

  // --- PLAYER LOSE STATE ---
  if (player.y > LEVELH + TILE_H * 3) {
    resetPlayer();
  }

  // --- PIXEL SNAP ---
  const px = player.x,
    py = player.y;
  const sx = sensor.x,
    sy = sensor.y;

  player.x = Math.round(player.x);
  player.y = Math.round(player.y);
  sensor.x = Math.round(sensor.x);
  sensor.y = Math.round(sensor.y);

  allSprites.draw();

  if (debugMode) {
    drawDebugScreen(grounded);
  }

  player.x = px;
  player.y = py;
  sensor.x = sx;
  sensor.y = sy;
}

function toggleMoonGravity() {
  moonGravityOn = !moonGravityOn;
  world.gravity.y = moonGravityOn ? MOON_GRAVITY : GRAVITY;
}

function resetPlayer() {
  player.x = FRAME_W;
  player.y = PLAYER_START_Y;
  player.vel.x = 0;
  player.vel.y = 0;
}

function drawDebugScreen(grounded) {
  camera.off();

  push();
  fill(0, 160);
  noStroke();

  // smaller box on top right
  rect(width - 170, 10, 160, 70, 6);

  fill(255);
  textSize(10);

  let x = width - 160;
  let y = 25;

  text("DEBUG", x, y);
  text("M: Gravity " + (moonGravityOn ? "ON" : "OFF"), x, y + 15);
  text("B: Hitbox " + (showHitboxes ? "ON" : "OFF"), x, y + 30);
  text("R: Reset", x, y + 45);

  pop();

  camera.on();
}

function applyIntegerScale() {
  const c = document.querySelector("canvas");
  const scale = Math.max(
    1,
    Math.floor(Math.min(window.innerWidth / VIEWW, window.innerHeight / VIEWH)),
  );
  c.style.width = VIEWW * scale + "px";
  c.style.height = VIEWH * scale + "px";
}
