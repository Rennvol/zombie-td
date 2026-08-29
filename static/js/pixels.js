// pixel.js — procedural pixel art (zombie post-apocalyptic palette)
const PAL = {
  soil: ['#2a2018', '#241b14', '#33271c', '#1d1610'],
  road: ['#3a3d42', '#33363b', '#2a2d31', '#45484d'],
  grass: ['#2e3b2a', '#283326', '#35422f', '#223026'],
  blood: ['#5a1420', '#6d1a28', '#47101a'],
  zombie: ['#5e7a4a', '#6d8c54', '#4f6840', '#7fa064', '#3d5232', '#8aa86e'],
  armor: ['#4a5058', '#5a616a', '#3a4048'],
  tower: ['#7a7d80', '#8a8d90', '#5a5d60', '#6a6d70', '#9a9d9a'],
  fire: ['#ff6b35', '#ffa033', '#ffd033', '#c0392b'],
  light: ['#8fd14f', '#a6e35c', '#6faf3d'],
  bar: ['#2a2f2a', '#6faf3d', '#b03030'],
};

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function putPixel(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

// draw zombie at (cx, cy) center, scale s
function drawZombie(ctx, x, y, s, opts = {}) {
  const frame = opts.frame || 0; // 0|1 walk
  const hp = opts.hp || 1;      // 0..1
  const b = s / 16;             // base unit
  ctx.save();
  ctx.translate(x, y);
  // dark outline for contrast
  ctx.fillStyle = '#0a0d08';
  ctx.fillRect(-b * 8, -b * 13, b * 16, b * 21);
  const step = frame ? b * 2 : -b * 2;
  // legs
  px(ctx, -b * 4 + step * 0.5, b * 5, b * 3, b * 5, PAL.zombie[4]);
  px(ctx, b * 1 - step * 0.5, b * 5, b * 3, b * 5, PAL.zombie[4]);
  // body (tattered shirt)
  px(ctx, -b * 5, -b * 4, b * 10, b * 9, PAL.zombie[1]);
  px(ctx, -b * 4, -b * 2, b * 3, b * 3, PAL.blood[0]);
  px(ctx, b * 1, -b * 3, b * 3, b * 2, PAL.blood[1]);
  // arms — zombie reach forward
  px(ctx, -b * 7, -b * 2, b * 3, b * 4, PAL.zombie[0]);
  px(ctx, b * 4, -b * 3, b * 4, b * 3, PAL.zombie[0]);
  // head — tilted
  px(ctx, -b * 3, -b * 10, b * 6, b * 6, PAL.zombie[0]);
  // eyes — empty white
  px(ctx, -b * 2, -b * 8, b, b * 1.5, '#d8d8d8');
  px(ctx, b, -b * 8, b, b * 1.5, '#d8d8d8');
  // mouth gash
  px(ctx, -b * 1, -b * 5, b * 2, b, PAL.blood[0]);
  // hp bar above
  if (hp < 1) {
    const w = b * 12;
    px(ctx, -w / 2, -b * 13, w, b * 1.5, PAL.bar[0]);
    px(ctx, -w / 2, -b * 13, w * hp, b * 1.5, hp > 0.5 ? PAL.bar[1] : PAL.bar[2]);
  }
  ctx.restore();
}

// placeholder tower post (phase 3 uses real towers)
function drawTowerSpot(ctx, x, y, s) {
  const b = s / 16;
  ctx.save();
  ctx.translate(x, y);
  px(ctx, -b * 4, b * 3, b * 8, b * 3, PAL.tower[2]);
  px(ctx, -b * 2, -b * 2, b * 4, b * 5, PAL.tower[0]);
  px(ctx, -b * 1, -b * 5, b * 2, b * 3, PAL.tower[1]);
  ctx.restore();
}

// procedural ground tile for stage — 32x32 at (gx,gy)
function drawGround(ctx, gx, gy, size, seed) {
  const r = (a) => ((seed >> a) & 1);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = PAL.grass[(r(x) ^ r(y) ^ r(x + y) ^ r((x * 7 + y * 13) & 15)) % PAL.grass.length];
      px(ctx, gx + x, gy + y, 1, 1, c);
    }
  }
  // tufts / cracks
  for (let i = 0; i < 6; i++) {
    const tx = ((seed * 13 + i * 7) % (size - 6)) + 2;
    const ty = ((seed * 31 + i * 11) % (size - 6)) + 2;
    px(ctx, gx + tx, gy + ty, 1, 2, PAL.grass[2]);
    px(ctx, gx + tx + 2, gy + ty + 1, 1, 1, PAL.grass[2]);
  }
}

// draw road segment between two waypoints
function drawRoad(ctx, a, b, cell) {
  ctx.fillStyle = PAL.road[1];
  ctx.beginPath();
  ctx.lineWidth = cell * 0.9;
  ctx.lineCap = 'round';
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  // center dashed line
  ctx.strokeStyle = PAL.road[0];
  ctx.setLineDash([cell * 0.5, cell * 0.5]);
  ctx.lineWidth = cell * 0.12;
  ctx.stroke();
  ctx.setLineDash([]);
}
