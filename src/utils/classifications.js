export const GAME_THEMES = [
  'fantasy', 'sci-fi', 'medieval', 'historical', 'war', 'space',
  'pirates', 'horror', 'investigation', 'economic',
  'secret-agents', 'adventure', 'transport',
  'city-building', 'nature', 'animals', 'civilization', 'abstract', 'humor',
];

export const GAME_MECHANICS = [
  'worker-placement', 'deck-building', 'area-control', 'resource-management',
  'drafting', 'tile-placement', 'dice-rolling', 'cards', 'bluffing', 'coop-mechanic',
  'player-elimination', 'auction', 'grid-movement', 'push-your-luck',
  'engine-building', 'legacy', 'modular-map', 'storytelling', 'rpg',
  'miniatures', 'campaign', 'betrayal', 'action-points',
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
