// メインゲームロジック

// 定数定義
const TILE_WALL = 0;
const TILE_FLOOR = 1;
const TILE_STAIRS_DOWN = 2;
const TILE_STAIRS_UP = 3;

// プレイヤーや敵の表示色
// カラー定数は従来のバックアップとして残しておくが、
// 描画ではテクスチャやアイコンを使用する
const COLOR_WALL = '#303040';
const COLOR_FLOOR = '#55556d';
const COLOR_STAIRS_DOWN = '#4c6ef5';
const COLOR_STAIRS_UP = '#38a169';
const COLOR_PLAYER = '#facc15';
const COLOR_ENEMY = '#e74c3c';
const COLOR_ITEM_GOLD = '#f5d742';
const COLOR_ITEM_FOOD = '#7ac74f';

// 画像ロード
// ゲームで使用するテクスチャやアイコンをロードするためのオブジェクト。
// assets ディレクトリ内の画像ファイルを参照する。
const images = {};
function loadGameImages() {
  const assetPath = 'assets/';
  images.floor = new Image();
  images.floor.src = assetPath + 'floor_tile.png';
  images.wall = new Image();
  images.wall.src = assetPath + 'wall_tile.png';
  images.gold = new Image();
  images.gold.src = assetPath + 'gold_icon.png';
  images.food = new Image();
  images.food.src = assetPath + 'food_icon.png';
  images.player = new Image();
  images.player.src = assetPath + 'player.png';
  images.enemy = new Image();
  images.enemy.src = assetPath + 'enemy.png';
}
// 即時ロードを開始
loadGameImages();

// マップ生成関連
function createEmptyGrid(w, h, value) {
  const grid = new Array(h);
  for (let y = 0; y < h; y++) {
    grid[y] = new Array(w).fill(value);
  }
  return grid;
}

// ランダムな整数 [min, max] を返す
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// マップ生成：ランダムな部屋とドランカーウォークを組み合わせる
function generateFloor(width, height, hasStairsUp = false) {
  const grid = createEmptyGrid(width, height, TILE_WALL);
  const rooms = [];
  const roomCount = randInt(4, 6);
  // ランダムな部屋を生成
  for (let i = 0; i < roomCount; i++) {
    const w = randInt(4, 7);
    const h = randInt(4, 7);
    const x = randInt(1, width - w - 1);
    const y = randInt(1, height - h - 1);
    rooms.push({ x, y, w, h });
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        grid[y + dy][x + dx] = TILE_FLOOR;
      }
    }
  }
  // 部屋同士を接続する：中心点間をL字の廊下でつなぐ
  function center(room) {
    return { cx: Math.floor(room.x + room.w / 2), cy: Math.floor(room.y + room.h / 2) };
  }
  for (let i = 1; i < rooms.length; i++) {
    const { cx: x1, cy: y1 } = center(rooms[i - 1]);
    const { cx: x2, cy: y2 } = center(rooms[i]);
    // 横方向
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
      grid[y1][x] = TILE_FLOOR;
    }
    // 縦方向
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      grid[y][x2] = TILE_FLOOR;
    }
  }
  // ドランカーウォークで追加の床タイルを生成
  let floorTiles = 0;
  const target = Math.floor(width * height * 0.2);
  let px = Math.floor(width / 2);
  let py = Math.floor(height / 2);
  grid[py][px] = TILE_FLOOR;
  floorTiles++;
  while (floorTiles < target) {
    const dir = randInt(0, 3);
    if (dir === 0) py = Math.max(1, py - 1);
    else if (dir === 1) py = Math.min(height - 2, py + 1);
    else if (dir === 2) px = Math.max(1, px - 1);
    else if (dir === 3) px = Math.min(width - 2, px + 1);
    if (grid[py][px] === TILE_WALL) {
      grid[py][px] = TILE_FLOOR;
      floorTiles++;
    }
  }
  // ステージの上下階段の配置
  let stairsDown, stairsUp;
  // 下り階段: 随機な床タイルに置く
  let sx, sy;
  do {
    sx = randInt(1, width - 2);
    sy = randInt(1, height - 2);
  } while (grid[sy][sx] !== TILE_FLOOR);
  grid[sy][sx] = TILE_STAIRS_DOWN;
  stairsDown = { x: sx, y: sy };
  // 上り階段（必要なら）
  if (hasStairsUp) {
    let ux, uy;
    do {
      ux = randInt(1, width - 2);
      uy = randInt(1, height - 2);
    } while (grid[uy][ux] !== TILE_FLOOR || (ux === sx && uy === sy));
    grid[uy][ux] = TILE_STAIRS_UP;
    stairsUp = { x: ux, y: uy };
  }
  // 敵やアイテムの配置情報を持つリスト
  const enemies = [];
  const items = [];
  // 敵配置: 5〜8体
  const enemyCount = randInt(5, 8);
  for (let i = 0; i < enemyCount; i++) {
    let ex, ey;
    do {
      ex = randInt(1, width - 2);
      ey = randInt(1, height - 2);
    } while (grid[ey][ex] !== TILE_FLOOR || (stairsUp && ex === stairsUp.x && ey === stairsUp.y) || (ex === stairsDown.x && ey === stairsDown.y));
    enemies.push({ x: ex, y: ey, hp: randInt(4, 8), maxHp: 8, attack: randInt(1, 3), xp: randInt(5, 10) });
  }
  // アイテム配置: 金貨や食料
  const itemCount = randInt(5, 8);
  for (let i = 0; i < itemCount; i++) {
    let ix, iy;
    do {
      ix = randInt(1, width - 2);
      iy = randInt(1, height - 2);
    } while (grid[iy][ix] !== TILE_FLOOR || (stairsUp && ix === stairsUp.x && iy === stairsUp.y) || (ix === stairsDown.x && iy === stairsDown.y));
    const type = Math.random() < 0.6 ? 'gold' : 'food';
    const amount = type === 'gold' ? randInt(5, 20) : randInt(5, 15);
    items.push({ x: ix, y: iy, type, amount });
  }
  return { grid, stairsDown, stairsUp, enemies, items };
}

// プレイヤークラス
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.maxHp = 20;
    this.hp = 20;
    this.hunger = 100; // %
    this.gold = 0;
    this.xp = 0;
    this.level = 1;
    this.nextLevelXp = 20;
    this.attack = 3;
    this.defense = 1;
    this.foodItems = [];
  }
  move(dx, dy, map) {
    const newX = this.x + dx;
    const newY = this.y + dy;
    if (newX < 0 || newY < 0 || newY >= map.grid.length || newX >= map.grid[0].length) return false;
    const tile = map.grid[newY][newX];
    // 壁なら移動不可
    if (tile === TILE_WALL) {
      return false;
    }
    // 敵チェック
    const enemy = map.enemies.find(e => e.x === newX && e.y === newY);
    if (enemy) {
      // 攻撃
      this.attackEnemy(enemy, map);
      return true;
    }
    // アイテム取得
    const itemIndex = map.items.findIndex(i => i.x === newX && i.y === newY);
    if (itemIndex >= 0) {
      const item = map.items[itemIndex];
      if (item.type === 'gold') {
        this.gold += item.amount;
        logMessage(`金貨${item.amount}Gを拾った！`);
      } else if (item.type === 'food') {
        this.hunger = Math.min(100, this.hunger + item.amount);
        logMessage(`食料を食べて満腹度が${item.amount}%回復！`);
      }
      map.items.splice(itemIndex, 1);
    }
    // 階段の場合
    if (tile === TILE_STAIRS_DOWN || tile === TILE_STAIRS_UP) {
      // 階段上は移動先として扱い、階層遷移はゲームクラス側で処理する
    }
    // 移動
    this.x = newX;
    this.y = newY;
    // 空腹度減少
    this.hunger = Math.max(0, this.hunger - 0.5);
    return true;
  }
  attackEnemy(enemy, map) {
    // プレイヤー攻撃
    const damage = Math.max(1, this.attack + randInt(0, 2) - enemy.attack * 0);
    enemy.hp -= damage;
    logMessage(`敵に${damage}ダメージ！`);
    if (enemy.hp <= 0) {
      // 敵撃破
      this.xp += enemy.xp;
      logMessage(`敵を倒した！経験値${enemy.xp}を獲得。`);
      // ドロップとして金貨
      const goldAmount = randInt(3, 10);
      this.gold += goldAmount;
      logMessage(`${goldAmount}Gを拾った。`);
      // 敵リストから削除
      const index = map.enemies.indexOf(enemy);
      if (index >= 0) map.enemies.splice(index, 1);
      // レベルアップ判定
      this.checkLevelUp();
    } else {
      // 敵の反撃
      const enemyDamage = Math.max(1, enemy.attack + randInt(0, 1) - this.defense);
      this.hp -= enemyDamage;
      logMessage(`敵の反撃！${enemyDamage}ダメージを受けた。`);
      if (this.hp <= 0) {
        this.hp = 0;
      }
    }
  }
  checkLevelUp() {
    while (this.xp >= this.nextLevelXp) {
      this.xp -= this.nextLevelXp;
      this.level++;
      this.nextLevelXp = Math.floor(this.nextLevelXp * 1.5);
      this.maxHp += 4;
      this.hp = this.maxHp;
      this.attack += 1;
      this.defense += 1;
      logMessage(`レベル${this.level}に上がった！最大HPと攻撃力、防御力が上昇！`);
    }
  }
}

// グローバルログ
const logEl = document.createElement('div');
logEl.id = 'log';
logEl.style.position = 'fixed';
logEl.style.right = '8px';
logEl.style.bottom = '8px';
logEl.style.maxWidth = '40%';
logEl.style.maxHeight = '30%';
logEl.style.overflowY = 'auto';
logEl.style.padding = '8px';
logEl.style.backgroundColor = 'rgba(0,0,0,0.6)';
logEl.style.color = '#eee';
logEl.style.fontSize = '12px';
logEl.style.borderRadius = '4px';
document.body.appendChild(logEl);

function logMessage(msg) {
  const p = document.createElement('div');
  p.textContent = msg;
  logEl.appendChild(p);
  // スクロール最下部に
  logEl.scrollTop = logEl.scrollHeight;
  // 古いログを削除
  if (logEl.children.length > 50) {
    logEl.removeChild(logEl.firstChild);
  }
}

// ゲームクラス
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.mapWidth = 24;
    this.mapHeight = 24;
    // 各階層のデータ
    this.floors = [];
    this.currentFloorIndex = 0;
    // プレイヤー
    this.player = new Player(0, 0);
    // 時間と税金
    this.day = 1;
    this.movesThisDay = 0;
    this.taxInterval = 5; // 5日ごとに税金
    this.taxDueAmount = 30;
    // ゲーム状態
    this.gameOver = false;
    // 初期フロア生成
    this.initFloor();
    // UI表示更新
    this.updateHUD();
    // 入力イベント登録
    this.registerControls();
    // 描画ループ開始
    requestAnimationFrame(() => this.render());
  }
  initFloor(hasStairsUp = false, enteringViaStairsUp = false) {
    const floor = generateFloor(this.mapWidth, this.mapHeight, hasStairsUp);
    if (enteringViaStairsUp) {
      // 前の階層に戻る時は既存のフロアを取得するので生成しない
    }
    this.floors.push(floor);
    this.currentFloorIndex = this.floors.length - 1;
    // プレイヤーの配置: 上り階段がある場合はその位置に置く。それ以外は部屋の中心
    let startX, startY;
    if (hasStairsUp && floor.stairsUp) {
      startX = floor.stairsUp.x;
      startY = floor.stairsUp.y;
    } else {
      // ランダムな床タイル
      let px, py;
      do {
        px = randInt(1, this.mapWidth - 2);
        py = randInt(1, this.mapHeight - 2);
      } while (floor.grid[py][px] !== TILE_FLOOR);
      startX = px;
      startY = py;
    }
    this.player.x = startX;
    this.player.y = startY;
  }
  // 階層遷移：下り階段で新規階層生成
  goDown() {
    // 既存の次階層がある場合はそれを使用
    if (this.currentFloorIndex < this.floors.length - 1) {
      this.currentFloorIndex++;
      const floor = this.floors[this.currentFloorIndex];
      // プレイヤー位置を上り階段の位置に合わせる
      if (floor.stairsUp) {
        this.player.x = floor.stairsUp.x;
        this.player.y = floor.stairsUp.y;
      }
    } else {
      // 新しい階層を作成
      const newFloor = generateFloor(this.mapWidth, this.mapHeight, true);
      this.floors.push(newFloor);
      this.currentFloorIndex++;
      // プレイヤー位置を新階層の上り階段にセット
      if (newFloor.stairsUp) {
        this.player.x = newFloor.stairsUp.x;
        this.player.y = newFloor.stairsUp.y;
      }
    }
    logMessage(`階層を降りた。現在の階層: ${this.currentFloorIndex + 1}`);
  }
  // 階層遷移：上り階段で戻る
  goUp() {
    if (this.currentFloorIndex > 0) {
      this.currentFloorIndex--;
      const floor = this.floors[this.currentFloorIndex];
      // プレイヤー位置を下り階段の位置に合わせる
      if (floor.stairsDown) {
        this.player.x = floor.stairsDown.x;
        this.player.y = floor.stairsDown.y;
      }
      logMessage(`階層を上がった。現在の階層: ${this.currentFloorIndex + 1}`);
    }
  }
  // 各ターンでの時間経過処理
  nextTurn() {
    this.movesThisDay++;
    if (this.movesThisDay >= 50) {
      this.day++;
      this.movesThisDay = 0;
      logMessage(`日付が${this.day}日目になった。`);
      // 税金支払いチェック
      if (this.day % this.taxInterval === 0) {
        if (this.player.gold >= this.taxDueAmount) {
          this.player.gold -= this.taxDueAmount;
          logMessage(`税金${this.taxDueAmount}Gを支払った。`);
          // 次の税金金額を上げる
          this.taxDueAmount = Math.floor(this.taxDueAmount * 1.4);
        } else {
          this.gameOver = true;
          logMessage('税金を支払えなかったため処刑された…ゲームオーバー');
        }
      }
    }
    // 空腹度が0でターンが進むとHP減少
    if (this.player.hunger <= 0) {
      this.player.hp -= 1;
      if (this.player.hp <= 0) {
        this.gameOver = true;
        logMessage('餓死した…ゲームオーバー');
      }
    }
    // HUD更新
    this.updateHUD();
    // 敵行動
    this.enemyAct();
  }
  enemyAct() {
    const floor = this.floors[this.currentFloorIndex];
    for (const enemy of floor.enemies) {
      // ランダムに1マス移動または攻撃
      // プレイヤーが隣接している場合攻撃
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      if (Math.abs(dx) + Math.abs(dy) === 1) {
        // 攻撃
        const dmg = Math.max(1, enemy.attack + randInt(0,1) - this.player.defense);
        this.player.hp -= dmg;
        logMessage(`敵が攻撃！${dmg}ダメージを受けた。`);
        if (this.player.hp <= 0) {
          this.gameOver = true;
          logMessage('あなたは力尽きた…ゲームオーバー');
          return;
        }
      } else {
        // プレイヤーに近づく行動をとる確率を上げる
        let directions = [
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 }
        ];
        // シャッフル
        for (let i = directions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [directions[i], directions[j]] = [directions[j], directions[i]];
        }
        // 近い方向を優先して試行
        directions.sort((a, b) => {
          const aDist = Math.abs((enemy.x + a.dx) - this.player.x) + Math.abs((enemy.y + a.dy) - this.player.y);
          const bDist = Math.abs((enemy.x + b.dx) - this.player.x) + Math.abs((enemy.y + b.dy) - this.player.y);
          return aDist - bDist;
        });
        for (const dir of directions) {
          const nx = enemy.x + dir.dx;
          const ny = enemy.y + dir.dy;
          if (nx < 0 || ny < 0 || ny >= this.mapHeight || nx >= this.mapWidth) continue;
          // 他の敵または壁は不可
          if (floor.grid[ny][nx] === TILE_WALL) continue;
          if (floor.enemies.some(e => e !== enemy && e.x === nx && e.y === ny)) continue;
          // プレイヤー位置は攻撃で処理済み
          // 移動
          enemy.x = nx;
          enemy.y = ny;
          break;
        }
      }
    }
  }
  updateHUD() {
    document.getElementById('hp').textContent = Math.floor(this.player.hp);
    document.getElementById('maxHp').textContent = this.player.maxHp;
    document.getElementById('hunger').textContent = Math.floor(this.player.hunger);
    document.getElementById('gold').textContent = this.player.gold;
    document.getElementById('xp').textContent = this.player.xp;
    document.getElementById('level').textContent = this.player.level;
    document.getElementById('day').textContent = this.day;
    document.getElementById('taxDue').textContent = this.taxDueAmount;
    document.getElementById('taxTimer').textContent = this.taxInterval - (this.day % this.taxInterval);
  }
  registerControls() {
    const buttons = document.querySelectorAll('.control-button');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (this.gameOver) return;
        const action = btn.dataset.action;
        if (action === 'up') this.handleMove(0, -1);
        if (action === 'down') this.handleMove(0, 1);
        if (action === 'left') this.handleMove(-1, 0);
        if (action === 'right') this.handleMove(1, 0);
        if (action === 'action') this.handleAttack();
      });
    });
    // キーボード入力
    window.addEventListener('keydown', (e) => {
      if (this.gameOver) return;
      let handled = false;
      if (e.key === 'ArrowUp' || e.key === 'w') { this.handleMove(0, -1); handled = true; }
      else if (e.key === 'ArrowDown' || e.key === 's') { this.handleMove(0, 1); handled = true; }
      else if (e.key === 'ArrowLeft' || e.key === 'a') { this.handleMove(-1, 0); handled = true; }
      else if (e.key === 'ArrowRight' || e.key === 'd') { this.handleMove(1, 0); handled = true; }
      else if (e.key === ' ') { this.handleAttack(); handled = true; }
      if (handled) {
        e.preventDefault();
      }
    });
    // インベントリ
    document.getElementById('inventoryBtn').addEventListener('click', () => {
      this.openInventory();
    });
    document.getElementById('restBtn').addEventListener('click', () => {
      if (this.gameOver) return;
      // 休憩でHP回復（少量）し、時間が経過する
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2);
      logMessage('少し休んだ。HPが2回復。');
      this.nextTurn();
    });
    document.getElementById('closeInventory').addEventListener('click', () => {
      document.getElementById('inventoryModal').classList.add('hidden');
    });
  }
  openInventory() {
    const modal = document.getElementById('inventoryModal');
    const list = document.getElementById('inventoryList');
    list.innerHTML = '';
    // 現在は食料やポーションといった消耗品を実装していないので空
    if (this.player.foodItems && this.player.foodItems.length > 0) {
      this.player.foodItems.forEach((item, idx) => {
        const li = document.createElement('li');
        li.textContent = `${item.name} (${item.amount})`;
        li.addEventListener('click', () => {
          if (item.type === 'food') {
            this.player.hunger = Math.min(100, this.player.hunger + item.amount);
            logMessage(`${item.name}を食べた。満腹度が${item.amount}%回復。`);
          }
          this.player.foodItems.splice(idx, 1);
          this.openInventory();
        });
        list.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'アイテムなし';
      list.appendChild(li);
    }
    modal.classList.remove('hidden');
  }
  handleMove(dx, dy) {
    if (this.gameOver) return;
    const floor = this.floors[this.currentFloorIndex];
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    if (nx < 0 || ny < 0 || ny >= this.mapHeight || nx >= this.mapWidth) return;
    const tile = floor.grid[ny][nx];
    // 敵処理はプレイヤーのmove内部で行う
    const moved = this.player.move(dx, dy, floor);
    if (moved) {
      // 移動後にタイルを再取得
      const currTile = floor.grid[this.player.y][this.player.x];
      // 階段処理
      if (currTile === TILE_STAIRS_DOWN) {
        this.goDown();
      } else if (currTile === TILE_STAIRS_UP) {
        this.goUp();
      }
      this.nextTurn();
    }
  }
  handleAttack() {
    if (this.gameOver) return;
    const floor = this.floors[this.currentFloorIndex];
    // 隣接している敵に攻撃
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ];
    for (const dir of directions) {
      const nx = this.player.x + dir.dx;
      const ny = this.player.y + dir.dy;
      const enemy = floor.enemies.find(e => e.x === nx && e.y === ny);
      if (enemy) {
        this.player.attackEnemy(enemy, floor);
        this.nextTurn();
        return;
      }
    }
    logMessage('攻撃できる敵が周囲にいない。');
  }
  render() {
    // 描画
    const ctx = this.ctx;
    const tileW = this.canvas.width / this.mapWidth;
    const tileH = this.canvas.height / this.mapHeight;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const floor = this.floors[this.currentFloorIndex];
    // 背景描画
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tile = floor.grid[y][x];
        const px = x * tileW;
        const py = y * tileH;
        // 壁と床はテクスチャで描画
        if (tile === TILE_WALL) {
          if (images.wall && images.wall.complete) {
            ctx.drawImage(images.wall, px, py, tileW, tileH);
          } else {
            // フォールバック
            ctx.fillStyle = COLOR_WALL;
            ctx.fillRect(px, py, tileW, tileH);
          }
        } else {
          // 床と階段は床テクスチャ
          if (images.floor && images.floor.complete) {
            ctx.drawImage(images.floor, px, py, tileW, tileH);
          } else {
            ctx.fillStyle = COLOR_FLOOR;
            ctx.fillRect(px, py, tileW, tileH);
          }
        }
      }
    }
    // 階段アイコンを描画
    // ダウン階段
    if (floor.stairsDown) {
      const { x: sx, y: sy } = floor.stairsDown;
      const centerX = sx * tileW + tileW / 2;
      const centerY = sy * tileH + tileH / 2;
      ctx.fillStyle = COLOR_STAIRS_DOWN;
      ctx.beginPath();
      ctx.moveTo(centerX - tileW * 0.25, centerY - tileH * 0.15);
      ctx.lineTo(centerX + tileW * 0.25, centerY - tileH * 0.15);
      ctx.lineTo(centerX, centerY + tileH * 0.25);
      ctx.closePath();
      ctx.fill();
    }
    // アップ階段
    if (floor.stairsUp) {
      const { x: ux, y: uy } = floor.stairsUp;
      const centerX = ux * tileW + tileW / 2;
      const centerY = uy * tileH + tileH / 2;
      ctx.fillStyle = COLOR_STAIRS_UP;
      ctx.beginPath();
      ctx.moveTo(centerX - tileW * 0.25, centerY + tileH * 0.15);
      ctx.lineTo(centerX + tileW * 0.25, centerY + tileH * 0.15);
      ctx.lineTo(centerX, centerY - tileH * 0.25);
      ctx.closePath();
      ctx.fill();
    }
    // アイテム描画
    for (const item of floor.items) {
      const ix = item.x * tileW;
      const iy = item.y * tileH;
      const img = item.type === 'gold' ? images.gold : images.food;
      if (img && img.complete) {
        // 描画サイズを少し小さくして余白を持たせる
        const marginX = tileW * 0.15;
        const marginY = tileH * 0.15;
        ctx.drawImage(img, ix + marginX, iy + marginY, tileW - 2 * marginX, tileH - 2 * marginY);
      } else {
        // フォールバック: 円で描画
        ctx.fillStyle = item.type === 'gold' ? COLOR_ITEM_GOLD : COLOR_ITEM_FOOD;
        ctx.beginPath();
        ctx.arc(ix + tileW / 2, iy + tileH / 2, Math.min(tileW, tileH) / 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // 敵描画
    for (const enemy of floor.enemies) {
      const ex = enemy.x * tileW;
      const ey = enemy.y * tileH;
      if (images.enemy && images.enemy.complete) {
        const marginX = tileW * 0.1;
        const marginY = tileH * 0.1;
        ctx.drawImage(images.enemy, ex + marginX, ey + marginY, tileW - 2 * marginX, tileH - 2 * marginY);
      } else {
        ctx.fillStyle = COLOR_ENEMY;
        ctx.fillRect(ex + tileW * 0.1, ey + tileH * 0.1, tileW * 0.8, tileH * 0.8);
      }
    }
    // プレイヤー描画
    const px = this.player.x * tileW;
    const py = this.player.y * tileH;
    if (images.player && images.player.complete) {
      const marginX = tileW * 0.05;
      const marginY = tileH * 0.05;
      ctx.drawImage(images.player, px + marginX, py + marginY, tileW - 2 * marginX, tileH - 2 * marginY);
    } else {
      ctx.fillStyle = COLOR_PLAYER;
      ctx.beginPath();
      ctx.arc(px + tileW / 2, py + tileH / 2, Math.min(tileW, tileH) / 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // ゲームオーバー表示
    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ゲームオーバー', this.canvas.width / 2, this.canvas.height / 2);
    }
    requestAnimationFrame(() => this.render());
  }
}

// ゲーム開始
window.addEventListener('load', () => {
  const game = new Game();
});
