export const GAME_THEMES = [
  'abstract', 'secret-agents', 'animals', 'arab', 'arena', 'murder',
  'adventure', 'aviation', 'civilization', 'city-building', 'racing', 'economic',
  'energy', 'space', 'sports', 'fantasy', 'gladiators', 'war',
  'historical', 'horror', 'humor', 'investigation', 'labyrinth', 'medical',
  'medieval', 'mystery', 'music', 'nature', 'pirates', 'transport',
  'trains', 'wild-west', 'zombie-terror',
];

export const GAME_MECHANICS = [
  'simultaneous-action', 'alliances', 'dice-allocation', 'worker-placement',
  'acting-mime', 'bluffing', 'campaign', 'cards', 'tile-placement',
  'deck-building', 'area-control', 'coop-mechanic', 'drafting',
  'player-elimination', 'engine-building', 'resource-management', 'legacy',
  'auction', 'modular-map', 'miniatures', 'grid-movement', 'negotiation',
  'action-points', 'push-your-luck', 'rpg', 'dice-rolling', 'storytelling',
  'bribery', 'betrayal', 'voting',
];

export const GAME_CATEGORIES = [
  'competitive', 'cooperative', 'semi-coop', 'solo', 'pairs', 'party',
  'family', 'heavy', 'casual', 'narrative',
];

export const THEME_LABEL_KEYS = Object.fromEntries(
  GAME_THEMES.map((k) => [k, `game.theme.${k}`])
);

export const MECHANIC_LABEL_KEYS = Object.fromEntries(
  GAME_MECHANICS.map((k) => [k, `game.mechanic.${k}`])
);

export const GAMETYPE_LABEL_KEYS = Object.fromEntries(
  GAME_CATEGORIES.map((k) => [k, `game.gameCat.${k}`])
);
