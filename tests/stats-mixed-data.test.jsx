import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Stats } from '../components/Stats';

// Mock useLanguage hook
const mockT = (key) => {
  const translations = {
    'stats.title': 'Statistics',
    'stats.competitive': 'Competitive',
    'stats.cooperative': 'Cooperative',
    'stats.totalGames': 'Total Games',
    'stats.gameStats': 'Unique Games',
    'stats.playerStats': 'Total Players',
    'stats.topWinnersLabel': 'Top Winners',
    'history.filterCompetitive': 'Competitive games',
    'stats.winRateLabel': 'Win Rate',
    'stats.mostPlayedLabel': 'Most Played',
    'stats.successRateLabel': 'Success Rate',
    'common.back': 'Back',
    'home.newGame': 'New Game',
  };
  return translations[key] || key;
};

vi.mock('../hooks/useLanguage', () => ({
  useLanguage: () => ({
    language: 'pt-BR',
    changeLanguage: vi.fn(),
    t: mockT,
  }),
}));

describe('Stats Component - Mixed Data', () => {
  const mockOnNavigate = vi.fn();
  
  const stats = {
    totalGames: 5,
    uniqueGames: 3,
    totalPlayers: 3,
    topWinner: 'Alice',
    topWinnerWins: 2,
    mostPlayedGame: 'Catan',
    mostPlayedGameCount: 2,
  };

  const mixedGames = [
    {
      id: '1',
      game: 'Catan',
      gameType: 'competitive',
      players: ['Alice', 'Bob'],
      winner: 'Alice',
      coopResult: null,
      duration: 60,
      date: new Date('2024-01-01').toISOString(),
    },
    {
      id: '2',
      game: 'Gloomhaven',
      gameType: 'cooperative',
      players: ['Alice', 'Bob'],
      winner: null,
      coopResult: 'win',
      duration: 120,
      date: new Date('2024-01-02').toISOString(),
    },
    {
      id: '3',
      game: 'Catan',
      gameType: 'competitive',
      players: ['Bob', 'Charlie'],
      winner: 'Bob',
      coopResult: null,
      duration: 45,
      date: new Date('2024-01-03').toISOString(),
    },
    {
      id: '4',
      game: 'Pandemic',
      gameType: 'cooperative',
      players: ['Alice', 'Charlie'],
      winner: null,
      coopResult: 'loss',
      duration: 90,
      date: new Date('2024-01-04').toISOString(),
    },
  ];

  it('should render summary cards with mixed data', () => {
    render(
      <Stats 
        onNavigate={mockOnNavigate} 
        games={mixedGames} 
        stats={stats}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument(); // totalGames
    expect(screen.getByText('3')).toBeInTheDocument(); // uniqueGames/totalPlayers
  });

  it('should render both tabs', () => {
    render(
      <Stats 
        onNavigate={mockOnNavigate} 
        games={mixedGames} 
        stats={stats}
      />
    );

    expect(screen.getByText('Competitive')).toBeInTheDocument();
    expect(screen.getByText('Cooperative')).toBeInTheDocument();
  });

  it('should render competitive stats content by default', () => {
    render(
      <Stats 
        onNavigate={mockOnNavigate} 
        games={mixedGames} 
        stats={stats}
      />
    );

    // Should show competitive stats sections
    expect(screen.getByText('🥇 Top Winners')).toBeInTheDocument();
    expect(screen.getByText('📊 Win Rate')).toBeInTheDocument();
    expect(screen.getByText('🎲 Most Played')).toBeInTheDocument();
  });

  it('should handle empty competitive data', () => {
    const onlyCoopGames = mixedGames.filter(g => g.gameType === 'cooperative');
    
    render(
      <Stats 
        onNavigate={mockOnNavigate} 
        games={onlyCoopGames} 
        stats={stats}
      />
    );

    // Even with no competitive data, should still render tabs
    expect(screen.getByText('Competitive')).toBeInTheDocument();
  });

  it('should handle null games array', () => {
    const { container } = render(
      <Stats 
        onNavigate={mockOnNavigate} 
        games={null} 
        stats={stats}
      />
    );

    // Should not crash, render error message or empty state
    expect(container).toBeInTheDocument();
  });

  it('should handle undefined games array', () => {
    const { container } = render(
      <Stats 
        onNavigate={mockOnNavigate} 
        games={undefined} 
        stats={stats}
      />
    );

    // Should not crash
    expect(container).toBeInTheDocument();
  });
});
