import { test, expect } from '@playwright/test';

test.describe('MeepleMind - Game Registration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should register a game with 5 players', async ({ page }) => {
    // Click "Nova Partida" button
    await page.click('text=Nova Partida');
    await page.waitForLoadState('networkidle');

    // Verify we're on the New Game page
    await expect(page.locator('h1')).toContainText('Nova Partida');

    // Fill game name
    const gameInput = page.getByLabel('Qual jogo?');
    await gameInput.fill('Catan');

    // Accept game suggestion if available, otherwise continue
    const suggestions = page.locator('.suggestion-item');
    if (await suggestions.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await suggestions.first().click();
    } else {
      await gameInput.press('Enter');
    }

    // Add 5 players
    const playerInput = page.locator('input[id="player"]');
    const players = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
    
    for (const player of players) {
      await playerInput.fill(player);
      await page.locator('.btn-add-player').click();
    }

    // Verify all players added
    const playerItems = page.locator('.player-item');
    await expect(playerItems).toHaveCount(5);

    // Verify date field is visible and has value
    const dateInput = page.locator('input[id="date"]');
    await expect(dateInput).toBeVisible();
    const dateValue = await dateInput.inputValue();
    expect(dateValue).toBeTruthy();

    // Select winner (Diana)
    await page.getByRole('button', { name: 'Diana', exact: true }).click();

    // Verify submit button is enabled
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled();

    // Submit form
    await submitBtn.click();
    await page.waitForLoadState('networkidle');

    // Verify navigation back to home
    await expect(page.locator('.logo-image')).toBeVisible();

    // Verify game was saved to localStorage
    const games = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('meeplemind_games') || '[]');
    });
    
    expect(games.length).toBeGreaterThan(0);
    const lastGame = games[0];
    expect(lastGame.game).toBe('Catan');
    expect(lastGame.players).toEqual(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']);
    expect(lastGame.winner).toBe('Diana');
    expect(lastGame.rating).toBe(0);
  });

  test('should show game in history after registration', async ({ page }) => {
    // Register a game first
    await page.click('text=Nova Partida');
    
    const gameInput = page.locator('input[id="game"]');
    await gameInput.fill('Ticket to Ride');
    
    const playerInput = page.locator('input[id="player"]');
    await playerInput.fill('Player 1');
    await page.locator('.btn-add-player').click();
    
    await playerInput.fill('Player 2');
    await page.locator('.btn-add-player').click();
    
    // Select winner
    await page.click('.winner-btn:has-text("Player 1")');
    
    // Submit
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');

    // Navigate to history
    await page.click('text=Histórico');
    await expect(page.locator('h1')).toContainText('Histórico');

    // Verify game appears in history
    await expect(page.locator('text=Ticket to Ride')).toBeVisible();
    await expect(page.locator('text=Player 1')).toBeVisible();
  });

  test('should delete a game from history', async ({ page }) => {
    // Register a game
    await page.goto('/');
    await page.click('text=Nova Partida');
    
    const gameInput = page.locator('input[id="game"]');
    await gameInput.fill('Monopoly');
    
    const playerInput = page.locator('input[id="player"]');
    await playerInput.fill('Alice');
    await page.locator('.btn-add-player').click();
    
    await playerInput.fill('Bob');
    await page.locator('.btn-add-player').click();
    
    // Select winner
    await page.click('.winner-btn:has-text("Alice")');
    
    // Submit
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');

    // Navigate to history
    await page.click('text=Histórico');
    
    // Count games before delete
    const gamesBefore = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('meeplemind_games') || '[]').length;
    });

    // Delete the game
    const deleteBtn = page.locator('button:has-text("✕")').first();
    await deleteBtn.click();

    // Wait for the game item to disappear instead of hard timeout
    await expect(page.locator('text=Monopoly')).not.toBeVisible();

    // Verify game was deleted
    const gamesAfter = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('meeplemind_games') || '[]').length;
    });

    expect(gamesAfter).toBe(gamesBefore - 1);
  });

  test('should toggle rating on a game', async ({ page }) => {
    // Register a game
    await page.goto('/');
    await page.click('text=Nova Partida');
    
    const gameInput = page.locator('input[id="game"]');
    await gameInput.fill('Test Game');
    
    const playerInput = page.locator('input[id="player"]');
    await playerInput.fill('Player 1');
    await page.locator('.btn-add-player').click();
    
    await playerInput.fill('Player 2');
    await page.locator('.btn-add-player').click();
    
    await page.click('.winner-btn:has-text("Player 1")');
    
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');

    // Go to history
    await page.click('text=Histórico');
    
    // Click edit button to open modal
    const editBtn = page.locator('button:has-text("✏️")').first();
    await editBtn.click();

    // Wait for modal to appear
    const modal = page.locator('.modal');
    await expect(modal).toBeVisible();

    // Click 4 stars to rate
    const stars = page.locator('.star-btn');
    if (await stars.count() >= 4) {
      await stars.nth(3).click(); // 4th star
    }

    // Save changes
    const saveBtn = page.locator('button:has-text("Salvar")').first();
    await saveBtn.click();

    // Verify rating was saved
    const games = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('meeplemind_games') || '[]');
    });

    const game = games.find(g => g.game === 'Test Game');
    expect(game?.rating).toBeGreaterThan(0);
  });

  test('should export data to CSV', async ({ page }) => {
    // Register a game first
    await page.goto('/');
    await page.click('text=Nova Partida');
    
    const gameInput = page.locator('input[id="game"]');
    await gameInput.fill('Export Test');
    
    const playerInput = page.locator('input[id="player"]');
    await playerInput.fill('Player 1');
    await page.locator('.btn-add-player').click();
    
    await playerInput.fill('Player 2');
    await page.locator('.btn-add-player').click();
    
    await page.click('.winner-btn:has-text("Player 1")');
    
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');

    // Go to home
    await page.click('text=Home');
    
    // Find and click CSV export button
    const exportCsvBtn = page.locator('button:has-text("Exportar CSV")');
    
    // Listen for download
    const downloadPromise = page.waitForEvent('download');
    await exportCsvBtn.click();
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toMatch(/meeplemind_partidas.*\.csv/);
  });

  test('should show statistics correctly', async ({ page }) => {
    // Register a game
    await page.goto('/');
    await page.click('text=Nova Partida');
    
    const gameInput = page.locator('input[id="game"]');
    await gameInput.fill('Stats Test');
    
    const playerInput = page.locator('input[id="player"]');
    await playerInput.fill('Winner');
    await page.locator('.btn-add-player').click();
    
    await playerInput.fill('Loser');
    await page.locator('.btn-add-player').click();
    
    await page.click('.winner-btn:has-text("Winner")');
    
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');

    // Check stats on home page
    const partidas = page.locator('#stat-games');
    await expect(partidas).toContainText('1');

    // Go to statistics page
    await page.click('text=Estatísticas');
    await expect(page.locator('h1')).toContainText('Estatísticas');

    // Verify statistics loaded
    const stats = page.locator('.stat-item');
    await expect(stats.first()).toBeVisible();
  });

  test('should switch between light and dark theme', async ({ page }) => {
    await page.goto('/');

    // Check initial theme (dark)
    let html = page.locator('html');
    let theme = await html.getAttribute('data-theme');
    
    // Click theme toggle
    await page.click('.theme-toggle-btn');

    // Verify theme changed
    await expect(html).not.toHaveAttribute('data-theme', theme || '');

    // Toggle back
    await page.click('.theme-toggle-btn');

    if (theme) {
      await expect(html).toHaveAttribute('data-theme', theme);
    }
  });
});
