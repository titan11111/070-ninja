const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Canvas サイズ設定
function resizeCanvas() {
    const container = canvas.parentElement;
    const availableHeight = window.innerHeight - 160;
    canvas.width = container.clientWidth - 20;
    canvas.height = Math.min(availableHeight, container.clientWidth * 0.6);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ゲーム変数
let gameState = {
    currentStage: 1,
    player: {
        x: 100,
        y: 100,
        width: 30,
        height: 40,
        velX: 0,
        velY: 0,
        speed: 5,
        jumpPower: 15,
        onGround: false,
        hp: 5,
        maxHp: 5,
        invulnerable: 0,
        attackCooldown: 0,
        facing: 1
    },
    camera: { x: 0 },
    enemies: [],
    shurikens: [],
    enemyShurikens: [],
    items: [],
    platforms: [],
    score: 0,
    gameOver: false,
    stageClear: false,
    keys: {},
    goal: { x: 2000, y: 100, width: 60, height: 80 }
};

// 敵の種類定義
const enemyTypes = {
    // スライム（地面を跳ねる）
    slime: {
        width: 35,
        height: 30,
        color: '#44ff44',
        hp: 2,
        speed: 2,
        points: 100,
        ai: function(enemy) {
            enemy.velY += 0.8;
            enemy.x += enemy.velX;
            enemy.y += enemy.velY;
            
            if (enemy.onGround && Math.random() < 0.02) {
                enemy.velY = -10;
                enemy.velX = (Math.random() - 0.5) * 4;
            }
        }
    },
    // ゴースト（空中を浮遊）
    ghost: {
        width: 30,
        height: 35,
        color: '#ccccff',
        hp: 1,
        speed: 1.5,
        points: 150,
        ai: function(enemy) {
            enemy.floatTime = (enemy.floatTime || 0) + 0.05;
            enemy.y += Math.sin(enemy.floatTime) * 2;
            
            if (gameState.player.x < enemy.x) {
                enemy.x -= enemy.speed;
            } else {
                enemy.x += enemy.speed;
            }
        }
    },
    // 戦士（歩いて近づく）
    warrior: {
        width: 30,
        height: 45,
        color: '#ff8844',
        hp: 3,
        speed: 3,
        points: 200,
        ai: function(enemy) {
            enemy.velY += 0.8;
            enemy.y += enemy.velY;
            
            if (enemy.onGround) {
                if (Math.abs(gameState.player.x - enemy.x) < 300) {
                    if (gameState.player.x < enemy.x) {
                        enemy.x -= enemy.speed;
                    } else {
                        enemy.x += enemy.speed;
                    }
                }
            }
        }
    },
    // 忍者（手裏剣を投げる）
    ninja: {
        width: 28,
        height: 40,
        color: '#8844ff',
        hp: 2,
        speed: 2.5,
        points: 300,
        ai: function(enemy) {
            enemy.velY += 0.8;
            enemy.y += enemy.velY;
            enemy.shootCooldown = (enemy.shootCooldown || 0) - 1;
            
            if (enemy.onGround) {
                const distance = Math.abs(gameState.player.x - enemy.x);
                if (distance < 400 && distance > 100) {
                    if (enemy.shootCooldown <= 0) {
                        // 敵の手裏剣発射
                        const direction = gameState.player.x < enemy.x ? -1 : 1;
                        gameState.enemyShurikens.push({
                            x: enemy.x,
                            y: enemy.y + 10,
                            velX: direction * 8,
                            velY: 0,
                            width: 10,
                            height: 10
                        });
                        enemy.shootCooldown = 60;
                    }
                }
                
                if (distance < 80) {
                    enemy.x += (gameState.player.x < enemy.x ? 2 : -2);
                }
            }
        }
    }
};

// ステージ生成
function generateLevel(stageNum) {
    const platforms = [];
    const enemies = [];
    
    // 地面生成
    for (let i = 0; i < 70; i++) {
        platforms.push({
            x: i * 40,
            y: canvas.height - 40,
            width: 40,
            height: 40,
            type: 'ground'
        });
    }
    
    // 足場追加（ステージによって変化）
    for (let i = 0; i < 5 + stageNum * 2; i++) {
        platforms.push({
            x: 200 + i * 250,
            y: canvas.height - 120 - (i % 3) * 60,
            width: 80,
            height: 20,
            type: 'platform'
        });
    }
    
    // 敵配置（ステージが進むごとに増える）
    const enemyTypeList = ['slime', 'ghost', 'warrior', 'ninja'];
    const maxEnemyTypes = Math.min(stageNum, 4);
    
    for (let i = 0; i < 3 + stageNum * 2; i++) {
        const typeIndex = Math.floor(Math.random() * maxEnemyTypes);
        const type = enemyTypeList[typeIndex];
        const enemyData = enemyTypes[type];
        
        enemies.push({
            x: 300 + i * 200 + Math.random() * 100,
            y: 100,
            width: enemyData.width,
            height: enemyData.height,
            velX: 0,
            velY: 0,
            hp: enemyData.hp,
            maxHp: enemyData.hp,
            type: type,
            speed: enemyData.speed,
            onGround: false,
            points: enemyData.points
        });
    }
    
    gameState.platforms = platforms;
    gameState.enemies = enemies;
    gameState.goal.x = 2000 + stageNum * 500;
}

// 衝突検出
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// プレイヤー更新
function updatePlayer() {
    const player = gameState.player;
    
    if (player.invulnerable > 0) player.invulnerable--;
    if (player.attackCooldown > 0) player.attackCooldown--;
    
    // 移動処理
    player.velX *= 0.8;
    if (gameState.keys.left) {
        player.velX = -player.speed;
        player.facing = -1;
    }
    if (gameState.keys.right) {
        player.velX = player.speed;
        player.facing = 1;
    }
    
    // ジャンプ
    if (gameState.keys.jump && player.onGround) {
        player.velY = -player.jumpPower;
        player.onGround = false;
    }
    
    // 攻撃（手裏剣）
    if (gameState.keys.attack && player.attackCooldown <= 0) {
        gameState.shurikens.push({
            x: player.x + (player.facing > 0 ? player.width : 0),
            y: player.y + player.height / 2,
            velX: player.facing * 10,
            velY: 0,
            width: 12,
            height: 12
        });
        player.attackCooldown = 20;
        gameState.keys.attack = false;
    }
    
    // 重力
    player.velY += 0.8;
    player.x += player.velX;
    player.y += player.velY;
    
    // 地面判定
    player.onGround = false;
    for (let platform of gameState.platforms) {
        if (checkCollision(player, platform)) {
            if (player.velY > 0 && player.y < platform.y) {
                player.y = platform.y - player.height;
                player.velY = 0;
                player.onGround = true;
            }
        }
    }
    
    // 落下判定
    if (player.y > canvas.height) {
        player.hp = 0;
    }
    
    // ゴール判定
    if (checkCollision(player, gameState.goal)) {
        gameState.stageClear = true;
    }
    
    // HP0判定
    if (player.hp <= 0) {
        gameState.gameOver = true;
    }
    
    // カメラ更新
    gameState.camera.x = Math.max(0, player.x - canvas.width / 2);
}

// 敵更新
function updateEnemies() {
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const enemy = gameState.enemies[i];
        const enemyData = enemyTypes[enemy.type];
        
        // AI実行
        enemyData.ai(enemy);
        
        // 地面判定（ゴースト以外）
        if (enemy.type !== 'ghost') {
            enemy.onGround = false;
            for (let platform of gameState.platforms) {
                if (checkCollision(enemy, platform)) {
                    if (enemy.velY > 0 && enemy.y < platform.y) {
                        enemy.y = platform.y - enemy.height;
                        enemy.velY = 0;
                        enemy.onGround = true;
                    }
                }
            }
        }
        
        // プレイヤーとの衝突
        if (checkCollision(enemy, gameState.player) && gameState.player.invulnerable <= 0) {
            gameState.player.hp--;
            gameState.player.invulnerable = 60;
            gameState.player.velX = (gameState.player.x < enemy.x) ? -10 : 10;
            gameState.player.velY = -5;
        }
        
        // 画面外に落ちた敵を削除
        if (enemy.y > canvas.height + 100) {
            gameState.enemies.splice(i, 1);
        }
    }
}

// 手裏剣更新
function updateShurikens() {
    // プレイヤーの手裏剣
    for (let i = gameState.shurikens.length - 1; i >= 0; i--) {
        const shuriken = gameState.shurikens[i];
        shuriken.x += shuriken.velX;
        shuriken.y += shuriken.velY;
        
        // 敵との衝突判定
        for (let j = gameState.enemies.length - 1; j >= 0; j--) {
            const enemy = gameState.enemies[j];
            if (checkCollision(shuriken, enemy)) {
                enemy.hp--;
                gameState.shurikens.splice(i, 1);
                
                if (enemy.hp <= 0) {
                    gameState.score += enemy.points;
                    gameState.enemies.splice(j, 1);
                }
                break;
            }
        }
        
        // 画面外判定
        if (shuriken.x < gameState.camera.x - 100 || 
            shuriken.x > gameState.camera.x + canvas.width + 100) {
            gameState.shurikens.splice(i, 1);
        }
    }
    
    // 敵の手裏剣
    for (let i = gameState.enemyShurikens.length - 1; i >= 0; i--) {
        const shuriken = gameState.enemyShurikens[i];
        shuriken.x += shuriken.velX;
        shuriken.y += shuriken.velY;
        
        // プレイヤーとの衝突判定
        if (checkCollision(shuriken, gameState.player) && gameState.player.invulnerable <= 0) {
            gameState.player.hp--;
            gameState.player.invulnerable = 60;
            gameState.enemyShurikens.splice(i, 1);
        }
        
        // 画面外判定
        if (shuriken.x < gameState.camera.x - 100 || 
            shuriken.x > gameState.camera.x + canvas.width + 100) {
            gameState.enemyShurikens.splice(i, 1);
        }
    }
}

// 描画
function draw() {
    // 背景クリア
    ctx.fillStyle = '#0f3460';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(-gameState.camera.x, 0);
    
    // プラットフォーム描画
    for (let platform of gameState.platforms) {
        if (platform.type === 'ground') {
            ctx.fillStyle = '#4a4a4a';
        } else {
            ctx.fillStyle = '#6a6a6a';
        }
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    }
    
    // ゴール描画
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(gameState.goal.x, gameState.goal.y, gameState.goal.width, gameState.goal.height);
    ctx.fillStyle = '#FFA500';
    ctx.fillRect(gameState.goal.x + 10, gameState.goal.y + 20, 40, 60);
    
    // 敵描画
    for (let enemy of gameState.enemies) {
        ctx.fillStyle = enemyTypes[enemy.type].color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        // HP表示
        if (enemy.hp < enemy.maxHp) {
            ctx.fillStyle = 'red';
            ctx.fillRect(enemy.x, enemy.y - 10, enemy.width * (enemy.hp / enemy.maxHp), 3);
        }
    }
    
    // プレイヤー描画
    if (gameState.player.invulnerable % 4 < 2) {
        ctx.fillStyle = '#000080';
        ctx.fillRect(gameState.player.x, gameState.player.y, 
                    gameState.player.width, gameState.player.height);
        
        // 顔
        ctx.fillStyle = '#FFE4C4';
        ctx.fillRect(gameState.player.x + 5, gameState.player.y + 5, 20, 15);
    }
    
    // 手裏剣描画
    ctx.fillStyle = '#C0C0C0';
    for (let shuriken of gameState.shurikens) {
        ctx.save();
        ctx.translate(shuriken.x + 6, shuriken.y + 6);
        ctx.rotate(Date.now() * 0.01);
        ctx.fillRect(-6, -2, 12, 4);
        ctx.fillRect(-2, -6, 4, 12);
        ctx.restore();
    }
    
    // 敵の手裏剣描画
    ctx.fillStyle = '#FF4444';
    for (let shuriken of gameState.enemyShurikens) {
        ctx.save();
        ctx.translate(shuriken.x + 5, shuriken.y + 5);
        ctx.rotate(Date.now() * 0.01);
        ctx.fillRect(-5, -2, 10, 4);
        ctx.fillRect(-2, -5, 4, 10);
        ctx.restore();
    }
    
    ctx.restore();
}

// UI更新
function updateUI() {
    const heartsElement = document.getElementById('hearts');
    heartsElement.innerHTML = '';
    for (let i = 0; i < gameState.player.maxHp; i++) {
        const heart = document.createElement('span');
        heart.className = 'heart';
        heart.textContent = i < gameState.player.hp ? '♥' : '♡';
        heartsElement.appendChild(heart);
    }
    
    document.getElementById('score').textContent = 
        gameState.score.toString().padStart(4, '0');
    document.getElementById('stage').textContent = gameState.currentStage;
}

// ゲームオーバー表示
function showGameOver() {
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalStage').textContent = gameState.currentStage;
    document.getElementById('gameOverMessage').textContent = 
        gameState.player.hp <= 0 ? 'Game Over' : '全ステージクリア！';
    document.getElementById('gameOver').style.display = 'block';
}

// ステージクリア表示
function showStageClear() {
    document.getElementById('stageScore').textContent = gameState.score;
    document.getElementById('stageClear').style.display = 'block';
}

// 次のステージへ
function nextStage() {
    document.getElementById('stageClear').style.display = 'none';
    gameState.currentStage++;
    
    if (gameState.currentStage > 5) {
        gameState.gameOver = true;
        showGameOver();
        return;
    }
    
    // プレイヤーリセット
    gameState.player.x = 100;
    gameState.player.y = 100;
    gameState.player.velX = 0;
    gameState.player.velY = 0;
    gameState.player.hp = gameState.player.maxHp;
    gameState.player.invulnerable = 0;
    
    // ステージリセット
    gameState.shurikens = [];
    gameState.enemyShurikens = [];
    gameState.stageClear = false;
    
    generateLevel(gameState.currentStage);
}

// ゲーム再開
function restartGame() {
    location.reload();
}

// ゲームループ
function gameLoop() {
    if (!gameState.gameOver && !gameState.stageClear) {
        updatePlayer();
        updateEnemies();
        updateShurikens();
    } else if (gameState.stageClear && !gameState.gameOver) {
        showStageClear();
    } else if (gameState.gameOver) {
        showGameOver();
    }
    
    draw();
    updateUI();
    requestAnimationFrame(gameLoop);
}

// コントロール設定
function setupControls() {
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    const jumpBtn = document.getElementById('jumpBtn');
    const attackBtn = document.getElementById('attackBtn');
    
    // タッチ/マウス対応
    function handleStart(key, btn) {
        gameState.keys[key] = true;
        if (btn) btn.classList.add('pressed');
    }
    
    function handleEnd(key, btn) {
        gameState.keys[key] = false;
        if (btn) btn.classList.remove('pressed');
    }
    
    // ボタンイベント（タッチとマウス両対応）
    ['touchstart', 'mousedown'].forEach(event => {
        leftBtn.addEventListener(event, (e) => {
            e.preventDefault();
            handleStart('left', leftBtn);
        });
        rightBtn.addEventListener(event, (e) => {
            e.preventDefault();
            handleStart('right', rightBtn);
        });
        jumpBtn.addEventListener(event, (e) => {
            e.preventDefault();
            handleStart('jump', jumpBtn);
        });
        attackBtn.addEventListener(event, (e) => {
            e.preventDefault();
            handleStart('attack', attackBtn);
        });
    });
    
    ['touchend', 'mouseup', 'touchcancel', 'mouseleave'].forEach(event => {
        leftBtn.addEventListener(event, () => handleEnd('left', leftBtn));
        rightBtn.addEventListener(event, () => handleEnd('right', rightBtn));
        jumpBtn.addEventListener(event, () => handleEnd('jump', jumpBtn));
        attackBtn.addEventListener(event, () => handleEnd('attack', attackBtn));
    });
    
    // キーボード操作
    document.addEventListener('keydown', (e) => {
        if (e.code === 'ArrowLeft') gameState.keys.left = true;
        if (e.code === 'ArrowRight') gameState.keys.right = true;
        if (e.code === 'Space') gameState.keys.jump = true;
        if (e.code === 'KeyX' || e.code === 'KeyZ') gameState.keys.attack = true;
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowLeft') gameState.keys.left = false;
        if (e.code === 'ArrowRight') gameState.keys.right = falseif (e.code === 'Space') gameState.keys.jump = false;
        if (e.code === 'KeyX' || e.code === 'KeyZ') gameState.keys.attack = false;
    });
    
    // タッチイベントの重複防止
    document.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });
}

// ゲーム初期化
function init() {
    generateLevel(1);
    setupControls();
    gameLoop();
}

// ゲーム開始
init();