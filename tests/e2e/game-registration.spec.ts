import { test, expect, type Page } from '@playwright/test';

async function bootstrapApp(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.evaluate(() => {
    localStorage.setItem('meeplemind-primary-player', 'Alice');
    localStorage.setItem('meeplemind-language', 'pt-BR');
    localStorage.setItem('meeplemind_games', '[]');
    localStorage.setItem('meeplemind_library', '[]');
  });

  await page.reload();
  await page.waitForLoadState('networkidle');
}

async function goToNewGameWizard(page: Page) {
  await page.goto('/#newgame');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('h1')).toContainText('Nova Partida');
}

async function clickNextStep(page: Page, expectedStepIndex?: number) {
  const nextButton = page.getByTestId('newgame-next-step');
  await expect(nextButton).toBeVisible();
  await expect(nextButton).toBeEnabled();
  await nextButton.click();

  await expect
    .poll(async () => page.evaluate(() => window.location.hash))
    .toContain('newgame');

  if (expectedStepIndex) {
    await expect(page.locator('.wizard-card')).toHaveAttribute('data-step-index', String(expectedStepIndex));
  }
}

async function registerCompetitiveGame(page: Page, gameName: string, winnerName: string) {
  await goToNewGameWizard(page);

  await page.locator('input#game').fill(gameName);
  await clickNextStep(page, 2);
  await expect(page.locator('input#player')).toBeVisible();

  const playerInput = page.locator('input#player');
  for (const player of ['Bob', 'Charlie', 'Diana', 'Eve']) {
    await playerInput.fill(player);
    await page.locator('.btn-add-player').click();
  }

  await expect(page.locator('.player-item')).toHaveCount(5);
  await clickNextStep(page, 3);
  await expect(page.locator('.game-type-buttons')).toBeVisible();

  await page.locator('.game-type-buttons .game-type-btn').first().click();

  const winnerRow = page.locator('.score-row', { hasText: winnerName }).first();
  await expect(winnerRow).toBeVisible();
  await winnerRow.locator('.score-input').fill('42');
  const winnerSelector = `.winner-crown[aria-label="Selecionar ${winnerName} como vencedor"]`;
  await page.locator(winnerSelector).click();

  await clickNextStep(page, 4);

  await expect(page.locator('input#date')).toBeVisible();
  await expect(page.locator('input#date')).not.toHaveValue('');
  await page.locator('.duration-btn').nth(2).click();
  await clickNextStep(page, 5);

  const submitButton = page.getByTestId('newgame-submit');
  await expect(submitButton).toBeVisible();
  await expect(submitButton).toBeEnabled();
  await submitButton.click();
  await page.waitForLoadState('networkidle');
}

test.describe('MeepleMind - Wizard and Library flows', () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapApp(page);
  });

  test('should register a competitive game through all 5 steps', async ({ page }) => {
    await registerCompetitiveGame(page, 'Catan', 'Diana');

    await expect
      .poll(async () => page.evaluate(() => window.location.hash))
      .toContain('home');
    await expect(page.locator('.home-container')).toBeVisible();

    const games = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('meeplemind_games') || '[]');
    });

    expect(games.length).toBeGreaterThan(0);
    expect(games[0].game).toBe('Catan');
    expect(games[0].winner).toBe('Diana');
    expect(games[0].players).toEqual(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']);
    expect(games[0].duration).toBe(90);
  });

  test('should show game in history after wizard registration', async ({ page }) => {
    await registerCompetitiveGame(page, 'Ticket to Ride', 'Bob');

    await page.goto('/#history');
    await expect(page.locator('h1')).toContainText('Histórico');
    await expect(page.locator('.game-card .card-header-title h3', { hasText: 'Ticket to Ride' }).first()).toBeVisible();
    await expect(page.locator('.game-card .result-badge', { hasText: 'Bob' }).first()).toBeVisible();
  });

  test('should add game manually in library and edit game name/metadata', async ({ page }) => {
    await page.goto('/#library');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Minha Biblioteca');

    await page.getByTestId('library-open-add-manual').click();
    const addModal = page.locator('.lib-edit-modal').first();

    await addModal.locator('input#add-name').fill('Terraforming Mars');
    await addModal.getByRole('button', { name: 'Fantasia' }).click();
    await addModal.getByRole('button', { name: 'Cartas' }).click();
    await addModal.getByRole('button', { name: 'Construção de Baralho' }).click();
    await addModal.getByRole('button', { name: 'Gerenciamento de Mão' }).click();
    await addModal.locator('select#add-game-type').selectOption('eurogame');
    await addModal.locator('input#add-min').fill('1');
    await addModal.locator('input#add-max').fill('5');
    await addModal.locator('textarea#add-description').fill('Jogo de motor de cartas em Marte.');
    await addModal.locator('input#add-cover').fill('https://example.com/terraforming-mars.jpg');
    await addModal.locator('input#add-owned').check();
    await addModal.getByRole('button', { name: 'Adicionar Jogo' }).click();

    await expect(page.locator('text=Terraforming Mars')).toBeVisible();

    const card = page.locator('article.library-game-card', { hasText: 'Terraforming Mars' }).first();
    await card.locator('.btn-edit-lib').click();
    const editModal = page.locator('.lib-edit-modal').first();

    await editModal.locator('input#edit-name').fill('Terraforming Mars - Corrigido');
    await editModal.getByRole('button', { name: 'Guerra' }).click();
    await editModal.locator('select#edit-game-type').selectOption('hybrid');
    await editModal.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.locator('text=Terraforming Mars - Corrigido')).toBeVisible();

    const library = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('meeplemind_library') || '[]');
    });

    const game = library.find((entry: any) => entry.name === 'Terraforming Mars - Corrigido');
    expect(game).toBeTruthy();
    expect(game.categories).toEqual(expect.arrayContaining(['fantasy', 'cards', 'war']));
    expect(game.mechanics).toEqual(expect.arrayContaining(['deck-building', 'hand-management']));
    expect(game.gameType).toBe('hybrid');
    expect(game.minPlayers).toBe(1);
    expect(game.maxPlayers).toBe(5);
    expect(game.owned).toBe(true);
  });
});
