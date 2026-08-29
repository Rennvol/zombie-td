// wave.js — wave data for each stage
// Zombie types: 'normal', 'fast', 'tank', 'armored'

const STAGE_WAVES = {
  1: [
    { zombieCount: 8,  zombieType: 'normal',  hp: 30,  speed: 0.6, spawnInterval: 1500, goldReward: 5  },
    { zombieCount: 10, zombieType: 'normal',  hp: 35,  speed: 0.6, spawnInterval: 1400, goldReward: 5  },
    { zombieCount: 8,  zombieType: 'fast',    hp: 20,  speed: 1.0, spawnInterval: 1200, goldReward: 7  },
    { zombieCount: 12, zombieType: 'normal',  hp: 40,  speed: 0.6, spawnInterval: 1300, goldReward: 5  },
    { zombieCount: 15, zombieType: 'mix',     hp: 35,  speed: 0.7, spawnInterval: 1100, goldReward: 6  },
  ],
  2: [
    { zombieCount: 12, zombieType: 'normal',  hp: 45,  speed: 0.6, spawnInterval: 1400, goldReward: 6  },
    { zombieCount: 10, zombieType: 'fast',    hp: 25,  speed: 1.0, spawnInterval: 1100, goldReward: 8  },
    { zombieCount: 8,  zombieType: 'tank',    hp: 100, speed: 0.4, spawnInterval: 2000, goldReward: 12 },
    { zombieCount: 14, zombieType: 'mix',     hp: 40,  speed: 0.7, spawnInterval: 1200, goldReward: 7  },
    { zombieCount: 18, zombieType: 'normal',  hp: 50,  speed: 0.65, spawnInterval: 1000, goldReward: 7  },
  ],
  3: [
    { zombieCount: 15, zombieType: 'normal',  hp: 55,  speed: 0.6, spawnInterval: 1300, goldReward: 7  },
    { zombieCount: 12, zombieType: 'fast',    hp: 30,  speed: 1.1, spawnInterval: 1000, goldReward: 9  },
    { zombieCount: 10, zombieType: 'armored', hp: 80,  speed: 0.5, spawnInterval: 1800, goldReward: 14 },
    { zombieCount: 10, zombieType: 'tank',    hp: 120, speed: 0.4, spawnInterval: 2000, goldReward: 15 },
    { zombieCount: 20, zombieType: 'mix',     hp: 50,  speed: 0.7, spawnInterval: 900,  goldReward: 8  },
  ],
  4: [
    { zombieCount: 18, zombieType: 'normal',  hp: 60,  speed: 0.6, spawnInterval: 1200, goldReward: 8 },
    { zombieCount: 14, zombieType: 'armored', hp: 90,  speed: 0.5, spawnInterval: 1600, goldReward: 15 },
    { zombieCount: 12, zombieType: 'fast',    hp: 35,  speed: 1.2, spawnInterval: 900,  goldReward: 10 },
    { zombieCount: 10, zombieType: 'tank',    hp: 150, speed: 0.4, spawnInterval: 2000, goldReward: 18 },
    { zombieCount: 25, zombieType: 'mix',     hp: 55,  speed: 0.7, spawnInterval: 800,  goldReward: 9 },
  ],
  5: [
    { zombieCount: 20, zombieType: 'normal',  hp: 70,  speed: 0.6, spawnInterval: 1100, goldReward: 9  },
    { zombieCount: 15, zombieType: 'armored', hp: 100, speed: 0.5, spawnInterval: 1500, goldReward: 16 },
    { zombieCount: 12, zombieType: 'tank',    hp: 180, speed: 0.4, spawnInterval: 2000, goldReward: 20 },
    { zombieCount: 15, zombieType: 'fast',    hp: 40,  speed: 1.2, spawnInterval: 800,  goldReward: 12 },
    { zombieCount: 30, zombieType: 'mix',     hp: 65,  speed: 0.7, spawnInterval: 700,  goldReward: 10 },
  ],
};

// help: zombie type look
function getZombieTypeConfig(type) {
  switch (type) {
    case 'normal':  return { color: '#5e7a4a', speed: 0.6, hpMult: 1 };
    case 'fast':    return { color: '#7a4a7a', speed: 1.0, hpMult: 0.6 };
    case 'tank':    return { color: '#4a5058', speed: 0.4, hpMult: 2.5 };
    case 'armored':  return { color: '#6a6158', speed: 0.5, hpMult: 1.8 };
    case 'mix':     return null; // random
    default:        return { color: '#5e7a4a', speed: 0.6, hpMult: 1 };
  }
}

// stage config
const STAGE_CONFIG = {
  1: { name: 'QUARANTINE ZONE',   lives: 20, startGold: 200, reward: 100 },
  2: { name: 'FALLEN DISTRICT',   lives: 20, startGold: 300, reward: 150 },
  3: { name: 'SEWER ENTRANCE',    lives: 18, startGold: 400, reward: 200 },
  4: { name: 'DECAY STATION',     lives: 16, startGold: 500, reward: 300 },
  5: { name: 'BARRICADE HQ',      lives: 15, startGold: 600, reward: 400 },
};