// ==========================
// ファミコン風RPG game.js
// ==========================

// --------- 基本定義（タイル／マップ） ---------
const TILE_SIZE = 64;          // 1タイルのピクセル
const MAP_W = 5;               // タイル横数
const MAP_H = 5;               // タイル縦数

// タイル種別（数値で管理）
const T = {
  GRASS: 0,     // 草原
  FOREST: 1,    // 森
  WATER: 2,     // 湖・水
  VILLAGE: 3,   // 村
  CASTLE: 4,    // 城
  DESERT: 5,    // 砂漠
  MOUNTAIN: 6   // 山
};

// 地形ごとの色（ベース）
const TILE_COLORS = {
  [T.GRASS]:   "#1f8f2e",
  [T.FOREST]:  "#0f5f20",
  [T.WATER]:   "#1173c2",
  [T.VILLAGE]: "#3a2a15",
  [T.CASTLE]:  "#666666",
  [T.DESERT]:  "#c8b26a",
  [T.MOUNTAIN]:"#7b4a2b"
};

// --------- DOM取得 ---------
const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");

const enemyArea    = document.getElementById("enemyArea");
const enemySprite  = document.getElementById("enemySprite");
const enemyStatus  = document.getElementById("enemyStatus");
const playerStatus = document.getElementById("playerStatus");
const commands     = document.getElementById("commands");
const battleLog    = document.getElementById("battleLog");

// --------- プレイヤー ---------
const player = {
  x: 2, y: 2,            // タイル座標（0..4）
  hp: 30, maxHp: 30,
  mp: 10, maxMp: 10,
  atk: 6, def: 2,
  level: 1,
  exp: 0, nextExp: 20,
  gold: 0
};

// --------- マップ（2列 × 3行 = 6面） ---------
// 各要素は 5x5 の数値タイル
const m11 = [ // (row0,col0)
  [T.GRASS,T.GRASS, T.FOREST,T.FOREST,T.VILLAGE],
  [T.GRASS,T.GRASS, T.FOREST,T.FOREST,T.VILLAGE],
  [T.GRASS,T.GRASS, T.GRASS, T.GRASS, T.GRASS ],
  [T.GRASS,T.FOREST,T.FOREST,T.GRASS, T.GRASS ],
  [T.DESERT,T.DESERT,T.GRASS, T.GRASS, T.CASTLE]
];
const m12 = [ // (row0,col1)
  [T.WATER, T.WATER, T.GRASS, T.GRASS, T.GRASS ],
  [T.WATER, T.GRASS, T.GRASS, T.FOREST,T.FOREST],
  [T.GRASS, T.GRASS, T.GRASS, T.GRASS, T.GRASS ],
  [T.FOREST,T.FOREST,T.GRASS, T.CASTLE,T.CASTLE],
  [T.GRASS, T.GRASS, T.GRASS, T.CASTLE,T.CASTLE]
];

const m21 = [ // (row1,col0)
  [T.FOREST,T.FOREST,T.FOREST,T.GRASS ,T.GRASS ],
  [T.FOREST,T.VILLAGE,T.GRASS ,T.GRASS ,T.GRASS ],
  [T.FOREST,T.GRASS ,T.GRASS ,T.GRASS ,T.DESERT],
  [T.FOREST,T.GRASS ,T.GRASS ,T.GRASS ,T.DESERT],
  [T.GRASS ,T.GRASS ,T.GRASS ,T.GRASS ,T.CASTLE]
];
const m22 = [ // (row1,col1)
  [T.CASTLE,T.CASTLE,T.GRASS ,T.GRASS ,T.GRASS ],
  [T.CASTLE,T.CASTLE,T.GRASS ,T.FOREST,T.FOREST],
  [T.GRASS ,T.GRASS ,T.GRASS ,T.FOREST,T.FOREST],
  [T.GRASS ,T.GRASS ,T.GRASS ,T.GRASS ,T.GRASS ],
  [T.GRASS ,T.GRASS ,T.VILLAGE,T.GRASS ,T.GRASS ]
];

const m31 = [ // (row2,col0)
  [T.GRASS ,T.GRASS ,T.GRASS ,T.GRASS ,T.GRASS ],
  [T.GRASS ,T.FOREST,T.FOREST,T.GRASS ,T.GRASS ],
  [T.GRASS ,T.GRASS ,T.GRASS ,T.GRASS ,T.GRASS ],
  [T.VILLAGE,T.GRASS ,T.MOUNTAIN,T.MOUNTAIN,T.GRASS ],
  [T.CASTLE,T.CASTLE,T.MOUNTAIN,T.GRASS ,T.GRASS ]
];
const m32 = [ // (row2,col1)
  [T.GRASS ,T.GRASS ,T.GRASS ,T.GRASS ,T.GRASS ],
  [T.FOREST,T.FOREST,T.FOREST,T.FOREST,T.FOREST],
  [T.GRASS ,T.GRASS ,T.GRASS ,T.GRASS ,T.GRASS ],
  [T.GRASS ,T.DESERT,T.DESERT,T.VILLAGE,T.VILLAGE],
  [T.GRASS ,T.DESERT,T.DESERT,T.CASTLE ,T.CASTLE ]
];

// 2D配置
const WORLD = [
  [m11, m12],
  [m21, m22],
  [m31, m32]
];

// 現在のマップ座標（ワールド内）
let mapRow = 0;
let mapCol = 0;
let mapData = WORLD[mapRow][mapCol];

// --------- 村・城のSVGをImage化（8bit簡易） ---------
function svgVillage() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
    <rect x="1" y="7" width="6" height="6" fill="#c49a6c"/>
    <rect x="1" y="5" width="6" height="2" fill="#8b0000"/>
    <rect x="3" y="9" width="2" height="4" fill="#5b3a29"/>
    <rect x="9" y="6" width="6" height="7" fill="#c49a6c"/>
    <rect x="9" y="5" width="6" height="2" fill="#b22222"/>
    <rect x="11" y="9" width="2" height="4" fill="#5b3a29"/>
  </svg>`;
}
function svgCastle() {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
    <rect x="0" y="6" width="4" height="9" fill="#6e6e6e"/>
    <rect x="12" y="6" width="4" height="9" fill="#6e6e6e"/>
    <rect x="4" y="8" width="8" height="7" fill="#808080"/>
    <rect x="6" y="11" width="4" height="4" fill="#000"/>
    <rect x="1" y="5" width="2" height="1" fill="#d00"/>
    <rect x="13" y="5" width="2" height="1" fill="#06f"/>
  </svg>`;
}

const villageImg = new Image();
villageImg.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgVillage());
const castleImg = new Image();
castleImg.src  = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgCastle());

// --------- マップ描画 ---------
function drawMap() {
  if (!ctx) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  for (let y=0; y<MAP_H; y++) {
    for (let x=0; x<MAP_W; x++) {
      const tile = mapData[y][x];
      drawTile(x, y, tile);
    }
  }

  // プレイヤー（黄色い四角）
  ctx.fillStyle = "#ffd800";
  ctx.fillRect(player.x*TILE_SIZE + 8, player.y*TILE_SIZE + 8, TILE_SIZE-16, TILE_SIZE-16);
}

// 各タイルの表現（8bit簡易）
function drawTile(tx, ty, tile) {
  const px = tx * TILE_SIZE;
  const py = ty * TILE_SIZE;

  // ベース
  ctx.fillStyle = TILE_COLORS[tile] || "#000";
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // 模様
  switch(tile) {
    case T.GRASS: {
      // 明るい点で芝っぽさ
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      for (let i=0;i<12;i++){
        const rx = px + Math.random()*TILE_SIZE;
        const ry = py + Math.random()*TILE_SIZE;
        ctx.fillRect(rx, ry, 2, 2);
      }
      break;
    }
    case T.FOREST: {
      // 小さな丸で樹木感
      ctx.fillStyle = "#1d7a2b";
      for (let i=0;i<6;i++){
        ctx.beginPath();
        ctx.arc(px + 10 + i*8%TILE_SIZE, py + 10 + ((i*13)%TILE_SIZE), 4, 0, Math.PI*2);
        ctx.fill();
      }
      break;
    }
    case T.WATER: {
      // さざ波
      ctx.strokeStyle = "#8bd0ff";
      ctx.lineWidth = 2;
      for (let i=0;i<3;i++){
        ctx.beginPath();
        ctx.moveTo(px+6, py+16+i*12);
        ctx.quadraticCurveTo(px+32, py+10+i*12, px+58, py+16+i*12);
        ctx.stroke();
      }
      break;
    }
    case T.DESERT: {
      // 砂模様
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      for (let i=0;i<14;i++){
        const rx = px + Math.random()*TILE_SIZE;
        const ry = py + Math.random()*TILE_SIZE;
        ctx.fillRect(rx, ry, 2, 2);
      }
      break;
    }
    case T.MOUNTAIN: {
      // 三角形の山
      ctx.fillStyle = "#5a331e";
      ctx.beginPath();
      ctx.moveTo(px+8,  py+TILE_SIZE-8);
      ctx.lineTo(px+TILE_SIZE/2, py+8);
      ctx.lineTo(px+TILE_SIZE-8, py+TILE_SIZE-8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#8c5a3a";
      ctx.fillRect(px+TILE_SIZE/2-2, py+TILE_SIZE/2, 4, TILE_SIZE/2-8);
      break;
    }
    case T.VILLAGE: {
      // 下地は草
      ctx.fillStyle = TILE_COLORS[T.GRASS];
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      // 村アイコン
      ctx.drawImage(villageImg, px+8, py+8, TILE_SIZE-16, TILE_SIZE-16);
      break;
    }
    case T.CASTLE: {
      // 下地は石
      ctx.fillStyle = "#7b7b7b";
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      // 城アイコン
      ctx.drawImage(castleImg, px+8, py+6, TILE_SIZE-16, TILE_SIZE-16);
      break;
    }
    default: break;
  }

  // タイル境界の細い線（軽いドット感）
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(px+0.5, py+0.5, TILE_SIZE-1, TILE_SIZE-1);
}

// --------- 敵データ ---------
const ENEMIES = {
  slime:   { id: "slime",   name: "スライム",  hp: 10, atk: 3, exp: 5,  gold: 3 },
  goblin:  { id: "goblin",  name: "ゴブリン",  hp: 16, atk: 4, exp: 8,  gold: 6 },
  mushroom:{ id: "mushroom",name: "毒きのこ",  hp: 14, atk: 4, exp: 10, gold: 7 },
  demon:   { id: "demon",   name: "魔族",      hp: 22, atk: 6, exp: 16, gold: 12 },
  octopus: { id: "octopus", name: "たこ入道",  hp: 24, atk: 6, exp: 18, gold: 14 },
  dragon:  { id: "dragon",  name: "ドラゴン",  hp: 40, atk: 9, exp: 35, gold: 30 },
  devil:   { id: "devil",   name: "悪魔",      hp: 28, atk: 7, exp: 22, gold: 18 }
};

// 敵ドット絵（SVG文字列）
const ENEMY_SVG = {
  slime: `
    <svg width="64" height="64" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <rect width="16" height="16" fill="#000"/>
      <circle cx="8" cy="10" r="5" fill="deepskyblue"/>
      <rect x="5" y="8" width="2" height="2" fill="#fff"/>
      <rect x="9" y="8" width="2" height="2" fill="#fff"/>
    </svg>`,
  goblin: `
    <svg width="64" height="64" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <rect width="16" height="16" fill="#000"/>
      <rect x="4" y="4" width="8" height="8" fill="green"/>
      <rect x="5" y="6" width="1" height="1" fill="#fff"/>
      <rect x="10" y="6" width="1" height="1" fill="#fff"/>
      <rect x="7" y="9" width="2" height="1" fill="red"/>
    </svg>`,
  mushroom: `
    <svg width="64" height="64" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <rect width="16" height="16" fill="#000"/>
      <ellipse cx="8" cy="6" rx="5" ry="3" fill="purple"/>
      <rect x="7" y="9" width="2" height="4" fill="#fff"/>
    </svg>`,
  demon: `
    <svg width="64" height="64" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <rect width="16" height="16" fill="#000"/>
      <rect x="4" y="4" width="8" height="8" fill="darkred"/>
      <rect x="5" y="6" width="1" height="1" fill="yellow"/>
      <rect x="10" y="6" width="1" height="1" fill="yellow"/>
      <rect x="7" y="9" width="2" height="1" fill="#fff"/>
    </svg>`,
  octopus: `
    <svg width="64" height="64" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <rect width="16" height="16" fill="#000"/>
      <circle cx="8" cy="8" r="5" fill="pink"/>
      <rect x="5" y="12" width="1" height="3" fill="pink"/>
      <rect x="7" y="12" width="1" height="3" fill="pink"/>
      <rect x="9" y="12" width="1" height="3" fill="pink"/>
      <rect x="11" y="12" width="1" height="3" fill="pink"/>
    </svg>`,
  dragon: `
    <svg width="64" height="64" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <rect width="16" height="16" fill="#000"/>
      <rect x="3" y="4" width="10" height="8" fill="darkgreen"/>
      <rect x="5" y="6" width="2" height="2" fill="#fff"/>
      <rect x="9" y="6" width="2" height="2" fill="#fff"/>
      <rect x="6" y="9" width="4" height="1" fill="red"/>
    </svg>`,
  devil: `
    <svg width="64" height="64" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <rect width="16" height="16" fill="#000"/>
      <rect x="4" y="4" width="8" height="8" fill="purple"/>
      <rect x="5" y="6" width="1" height="1" fill="#fff"/>
      <rect x="10" y="6" width="1" height="1" fill="#fff"/>
      <rect x="7" y="9" width="2" height="1" fill="red"/>
    </svg>`
};

// --------- 戦闘制御 ---------
let inBattle = false;
let enemy = null;

// 内部ログ（保持は複数、表示は1行）
const logs = [];
function setLog(msg) {
  logs.push(msg);
  battleLog.innerText = msg;
}

// UI表示/非表示
function showBattleUI(flag) {
  const disp = flag ? "block" : "none";
  enemyArea.style.display    = disp;
  enemySprite.style.display  = disp;
  enemyStatus.style.display  = disp;
  playerStatus.style.display = disp;
  commands.style.display     = disp;
  battleLog.style.display    = disp;
}

// 敵ランダム（地形で重み付け可：簡易）
function pickEnemyByTile(tile) {
  const poolGrass  = ["slime","goblin","mushroom"];
  const poolForest = ["goblin","mushroom","demon"];
  const poolDesert = ["mushroom","octopus","devil"];
  const poolMount  = ["goblin","devil","dragon"];
  const poolWater  = ["octopus","mushroom"];
  const poolTown   = []; // 村・城は原則エンカウントなし

  let pool = poolGrass;
  if (tile === T.FOREST)  pool = poolForest;
  if (tile === T.DESERT)  pool = poolDesert;
  if (tile === T.MOUNTAIN)pool = poolMount;
  if (tile === T.WATER)   pool = poolWater;
  if (tile === T.VILLAGE || tile === T.CASTLE) pool = poolTown;

  if (pool.length === 0) return null;
  const id = pool[Math.floor(Math.random()*pool.length)];
  return { ...ENEMIES[id] }; // コピー
}

// エンカウント率（地形別）
function getEncounterRate(tile) {
  switch(tile) {
    case T.GRASS:   return 0.14;
    case T.FOREST:  return 0.22;
    case T.DESERT:  return 0.18;
    case T.MOUNTAIN:return 0.12;
    case T.WATER:   return 0.06;
    case T.VILLAGE: return 0.00;
    case T.CASTLE:  return 0.00;
    default:        return 0.12;
  }
}

// 戦闘開始
function startBattle(tile) {
  const e = pickEnemyByTile(tile);
  if (!e) return; // 村・城など
  inBattle = true;
  enemy = e;

  enemyArea.textContent = `${enemy.name} があらわれた！`;
  enemySprite.innerHTML = ENEMY_SVG[enemy.id] || "";
  enemyStatus.textContent = `HP:${enemy.hp}`;
  updatePlayerStatus();

  showBattleUI(true);
  setLog(`${enemy.name} が あらわれた！`);
}

// 戦闘終了
function endBattle(message) {
  setLog(message);
  setTimeout(()=>{
    inBattle = false;
    enemy = null;
    showBattleUI(false);
    drawMap(); // フィールド復帰
  }, 700);
}

// プレイヤー・敵のターン
function playerAttack() {
  if (!inBattle) return;
  const dmg = Math.max(1, player.atk - 1 + Math.floor(Math.random()*3));
  enemy.hp -= dmg;
  setLog(`勇者のこうげき！ ${dmg}ダメージ！`);
  enemyStatus.textContent = `HP:${Math.max(0,enemy.hp)}`;
  if (enemy.hp <= 0) {
    player.exp += enemy.exp;
    player.gold += enemy.gold;
    levelUpCheck();
    endBattle(`${enemy.name} を たおした！`);
    return;
  }
  setTimeout(enemyAttack, 650);
}

function playerMagic() {
  if (!inBattle) return;
  if (player.mp < 3) { setLog("MPが たりない！"); return; }
  player.mp -= 3;
  const dmg = 6 + Math.floor(Math.random()*4);
  enemy.hp -= dmg;
  setLog(`まほう！ ${dmg}ダメージ！`);
  enemyStatus.textContent = `HP:${Math.max(0,enemy.hp)}`;
  updatePlayerStatus();
  if (enemy.hp <= 0) {
    player.exp += enemy.exp;
    player.gold += enemy.gold;
    levelUpCheck();
    endBattle(`${enemy.name} は きえさった！`);
    return;
  }
  setTimeout(enemyAttack, 650);
}

function playerRun() {
  if (!inBattle) return;
  if (Math.random() < 0.55) {
    endBattle("うまく にげきれた！");
  } else {
    setLog("にげられない！");
    setTimeout(enemyAttack, 600);
  }
}

function enemyAttack() {
  if (!inBattle || !enemy) return;
  const dmg = Math.max(1, enemy.atk - player.def + Math.floor(Math.random()*3));
  player.hp -= dmg;
  if (player.hp < 0) player.hp = 0;
  setLog(`${enemy.name} のこうげき！ ${dmg}ダメージ！`);
  updatePlayerStatus();
  if (player.hp <= 0) {
    endBattle("勇者は たおれた…");
  }
}

// レベルアップ
function levelUpCheck() {
  if (player.exp >= player.nextExp) {
    player.level++;
    player.exp = 0;
    player.nextExp += 20;
    player.maxHp += 6;
    player.maxMp += 2;
    player.atk   += 2;
    player.def   += 1;
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    setLog("レベルが あがった！");
    updatePlayerStatus();
  }
}

function updatePlayerStatus() {
  playerStatus.textContent = `LV:${player.level} HP:${player.hp}/${player.maxHp} MP:${player.mp}/${player.maxMp} EXP:${player.exp}/${player.nextExp} G:${player.gold}`;
}

// --------- 移動とマップ切替 ---------
function movePlayer(dx, dy) {
  if (inBattle) return;

  let nx = player.x + dx;
  let ny = player.y + dy;

  // 端でマップ切替
  if (nx < 0) {
    if (mapCol > 0) { mapCol--; mapData = WORLD[mapRow][mapCol]; nx = MAP_W-1; }
    else return;
  } else if (nx >= MAP_W) {
    if (mapCol < WORLD[0].length-1) { mapCol++; mapData = WORLD[mapRow][mapCol]; nx = 0; }
    else return;
  }

  if (ny < 0) {
    if (mapRow > 0) { mapRow--; mapData = WORLD[mapRow][mapCol]; ny = MAP_H-1; }
    else return;
  } else if (ny >= MAP_H) {
    if (mapRow < WORLD.length-1) { mapRow++; mapData = WORLD[mapRow][mapCol]; ny = 0; }
    else return;
  }

  // 反映
  player.x = nx; player.y = ny;
  drawMap();

  // エンカウント判定（地形依存）
  const tile = mapData[player.y][player.x];
  const rate = getEncounterRate(tile);
  if (Math.random() < rate) startBattle(tile);
}

// --------- 入力（キーボード／タッチ／補助ボタン） ---------
document.addEventListener("keydown", (e)=>{
  if (e.key === "ArrowUp")    movePlayer(0,-1);
  if (e.key === "ArrowDown")  movePlayer(0, 1);
  if (e.key === "ArrowLeft")  movePlayer(-1,0);
  if (e.key === "ArrowRight") movePlayer(1, 0);
});

// スワイプ
let touchSX=null, touchSY=null;
canvas.addEventListener("touchstart", (e)=>{
  if (inBattle) return;
  const t = e.changedTouches[0];
  touchSX = t.clientX; touchSY = t.clientY;
},{passive:true});
canvas.addEventListener("touchend", (e)=>{
  if (inBattle) return;
  if (touchSX==null || touchSY==null) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchSX;
  const dy = t.clientY - touchSY;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 30) movePlayer(1,0);
    else if (dx < -30) movePlayer(-1,0);
  } else {
    if (dy > 30) movePlayer(0,1);
    else if (dy < -30) movePlayer(0,-1);
  }
  touchSX = touchSY = null;
},{passive:true});

// 画面上の補助ボタン
(function attachMobileDpad(){
  const pad = document.querySelectorAll(".dir-btn");
  pad.forEach(b=>{
    b.addEventListener("click", ()=>{
      const dir = b.dataset.dir;
      if (dir==="up")    movePlayer(0,-1);
      if (dir==="down")  movePlayer(0, 1);
      if (dir==="left")  movePlayer(-1,0);
      if (dir==="right") movePlayer(1, 0);
    });
  });
})();

// 戦闘コマンド
document.getElementById("attackBtn").addEventListener("click", ()=>playerAttack());
document.getElementById("magicBtn").addEventListener("click",  ()=>playerMagic());
document.getElementById("runBtn").addEventListener("click",    ()=>playerRun());

// --------- 初期描画 ---------
drawMap();
showBattleUI(false);
updatePlayerStatus();
