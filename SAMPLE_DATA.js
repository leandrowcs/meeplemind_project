// 📌 Instruções para testar com dados de exemplo
// Cole este código no console do navegador (F12) e execute

const sampleGames = [
  {
    id: "1",
    game: "Terraforming Mars",
    players: ["Leandro", "João", "Maria"],
    points: [120, 95, 88],
    winner: "Leandro",
    duration: 150,
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "2",
    game: "Ticket to Ride",
    players: ["Leandro", "Pedro"],
    points: [85, 72],
    winner: "Leandro",
    duration: 45,
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "3",
    game: "Terraforming Mars",
    players: ["João", "Maria", "Paulo"],
    points: [110, 130, 95],
    winner: "Maria",
    duration: 160,
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "4",
    game: "7 Wonders",
    players: ["Leandro", "João", "Maria", "Pedro"],
    points: [65, 58, 72, 61],
    winner: "Maria",
    duration: 90,
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "5",
    game: "Catan",
    players: ["Pedro", "Paulo", "Leandro"],
    points: [10, 8, 9],
    winner: "Pedro",
    duration: 75,
    date: new Date().toISOString()
  }
];

// Executar:
localStorage.setItem('meeplemind_games', JSON.stringify(sampleGames));
console.log('✅ Dados de exemplo carregados! Atualize a página para ver.');
