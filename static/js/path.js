// path.js — waypoint definitions per stage (960x540 grid, cell=32px)
// Each path = array of [x, y] waypoints in pixel coords
// Zombie spawns at first waypoint, follows sequentially to last

const STAGE_PATHS = {
  // Stage 1: straight-ish road, one bend
  1: [
    [0, 120],
    [160, 120],
    [320, 120],
    [480, 120],
    [640, 120],
    [800, 120],
    [960, 120],
  ],
  // Stage 2: S-curve
  2: [
    [0, 200],
    [160, 200],
    [320, 260],
    [480, 320],
    [640, 260],
    [800, 200],
    [960, 200],
  ],
  // Stage 3: zigzag
  3: [
    [0, 80],
    [160, 80],
    [160, 200],
    [320, 200],
    [320, 80],
    [480, 80],
    [480, 200],
    [640, 200],
    [640, 80],
    [800, 80],
    [800, 200],
    [960, 200],
  ],
  // Stage 4: long diagonal
  4: [
    [0, 400],
    [120, 340],
    [240, 280],
    [360, 220],
    [480, 160],
    [600, 100],
    [720, 60],
    [960, 60],
  ],
  // Stage 5: fortress approach (more complex)
  5: [
    [0, 60],
    [120, 60],
    [240, 60],
    [360, 60],
    [360, 180],
    [240, 180],
    [240, 300],
    [360, 300],
    [480, 300],
    [600, 300],
    [600, 180],
    [600, 60],
    [720, 60],
    [840, 60],
    [960, 60],
  ],
};

// Tower grid coordinates (valid placement spots)
// grid = array of {x, y} in pixel centers, grid cell = 32px
function getTowerGrid(stageId) {
  const grid = [];
  // Most stages have standard 30-col x 16-row grid (960/32=30, 540/32=16)
  for (let row = 1; row < 15; row++) {
    for (let col = 1; col < 29; col++) {
      const cx = col * 32 + 16;
      const cy = row * 32 + 16;
      // Skip positions too close to the path
      if (!isNearPath(stageId, cx, cy, 48)) {
        grid.push({ x: cx, y: cy });
      }
    }
  }
  return grid;
}

function isNearPath(stageId, x, y, margin) {
  const pts = STAGE_PATHS[stageId] || STAGE_PATHS[1];
  for (let i = 0; i < pts.length; i++) {
    const dx = Math.abs(x - pts[i][0]);
    const dy = Math.abs(y - pts[i][1]);
    if (dx + dy < margin) return true;
    // also check segment midpoint
    if (i > 0) {
      const mx = (pts[i-1][0] + pts[i][0]) / 2;
      const my = (pts[i-1][1] + pts[i][1]) / 2;
      if (Math.abs(x - mx) + Math.abs(y - my) < margin) return true;
    }
  }
  return false;
}