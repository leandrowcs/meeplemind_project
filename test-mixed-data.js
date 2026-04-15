// Script to test Stats page with mixed game data
// Run this in browser console to populate localStorage with test data

const testGames = [
  {
    id: '1',
    game: 'Catan',
    gameType: 'competitive',
    players: ['Alice', 'Bob', 'Charlie'],
    points: [10, 8, 6],
    winner: 'Alice',
    coopResult: null,
    duration: 60,
    date: new Date('2024-01-01').toISOString(),
    rating: 4,
    notes: 'Test competitive game 1'
  },
  {
    id: '2',
    game: 'Gloomhaven',
    gameType: 'cooperative',
    players: ['Alice', 'Bob'],
    points: [],
    winner: null,
    coopResult: 'win',
    duration: 120,
    date: new Date('2024-01-02').toISOString(),
    rating: 5,
    notes: 'Test cooperative game'
  },
  {
    id: '3',
    game: 'Catan',
    gameType: 'competitive',
    players: ['Alice', 'Charlie'],
    points: [12, 9],
    winner: 'Alice',
    coopResult: null,
    duration: 45,
    date: new Date('2024-01-03').toISOString(),
    rating: 3,
    notes: 'Test competitive game 2'
  },
  {
    id: '4',
    game: 'Pandemic',
    gameType: 'cooperative',
    players: ['Bob', 'Charlie', 'Alice'],
    points: [],
    winner: null,
    coopResult: 'loss',
    duration: 90,
    date: new Date('2024-01-04').toISOString(),
    rating: 4,
    notes: 'Test cooperative game 2'
  },
  {
    id: '5',
    game: 'Ticket to Ride',
    gameType: 'competitive',
    players: ['Bob', 'Charlie'],
    points: [150, 140],
    winner: 'Bob',
    coopResult: null,
    duration: 75,
    date: new Date('2024-01-05').toISOString(),
    rating: 3,
    notes: 'Test competitive game 3'
  }
];

// Save to localStorage
localStorage.setItem('meeplemind_games', JSON.stringify(testGames));
console.log('✅ Test data saved! Games:', testGames.length);
console.log('Competitive games:', testGames.filter(g => g.gameType === 'competitive').length);
console.log('Cooperative games:', testGames.filter(g => g.gameType === 'cooperative').length);
console.log('Refresh the page to see the data in Stats');
