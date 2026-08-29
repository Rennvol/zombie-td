// stage.js — stage select screen + results overlay

const STAGE_LIST = [1, 2, 3, 4, 5];

function stageUnlocked(stageId, state) {
  return stageId <= (state.stage_open || 1);
}

function stageStars(stageId, state) {
  const stars = (state.stars || {})[stageId];
  return stars || 0;
}

function stageName(stageId) {
  return (STAGE_CONFIG[stageId] || {}).name || 'UNKNOWN';
}

function stageReward(stageId) {
  return (STAGE_CONFIG[stageId] || {}).reward || 0;
}
