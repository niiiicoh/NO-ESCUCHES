import { test, expect, type Page } from '@playwright/test';

const gameKey = 'no-escuches:game:v1',
  prefsKey = 'no-escuches:preferences:v1';
async function stored(page: Page) {
  return page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), gameKey);
}
async function prepare(page: Page, motion = 'none', money = 20) {
  await page.addInitScript(
    ({ key, motion }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({ version: 1, soundEnabled: false, volume: 35, motion }),
        );
    },
    { key: prefsKey, motion },
  );
  await page.goto('/game/new');
  await page.getByLabel('Jugador 1', { exact: true }).fill('Nicolás');
  await page.getByLabel('Jugador 2', { exact: true }).fill('Bastián');
  await page.getByLabel('Dinero por jugador', { exact: true }).fill(String(money));
  await page.getByRole('button', { name: 'Comenzar partida', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Girar ruleta' })).toBeVisible();
}
async function open(page: Page) {
  await page.getByRole('button', { name: 'Girar ruleta' }).click();
  await page.getByRole('button', { name: 'Comenzar subasta' }).click();
}
async function purchase(page: Page, name = 'Nicolás') {
  await page.getByRole('button', { name: new RegExp(`Jugador.*${name}`) }).click();
  await page.getByRole('button', { name: `Asignar a ${name} por $1`, exact: true }).click();
}

test('ruleta guardada antes de animar, recarga sin sortear, compra $1 y undo', async ({ page }) => {
  await prepare(page, 'system');
  await expect(page.locator('.current-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Girar ruleta' }).dblclick();
  const drawn = (await stored(page)).currentGame;
  expect(drawn.openingAuction.startingPlayerId).toBeTruthy();
  expect(drawn.openingAuction.confirmed).toBe(false);
  expect(drawn.items.every((i: { assignedPlayerId: string | null }) => !i.assignedPlayerId)).toBe(
    true,
  );
  await expect(page.getByRole('button', { name: 'Comenzar subasta' })).toBeDisabled();
  await page.reload();
  const recovered = (await stored(page)).currentGame;
  expect(recovered.openingAuction).toEqual(drawn.openingAuction);
  await expect(page.getByRole('button', { name: 'Girar ruleta' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Comenzar subasta' })).toBeEnabled();
  const winner = drawn.players.findIndex(
    (p: { id: string }) => p.id === drawn.openingAuction.startingPlayerId,
  );
  await expect(page.locator('.wheel-result h2')).toHaveText(
    `${drawn.players[winner].name} comienza ofreciendo $1`,
  );
  const position = await page.locator('.wheel-face').evaluate((el) => {
    const m = new DOMMatrix(getComputedStyle(el).transform);
    return Math.round(((Math.atan2(m.b, m.a) * 180) / Math.PI + 360) % 360);
  });
  expect(position).toBe(winner === 0 ? 270 : 90);
  await page.getByRole('button', { name: 'Comenzar subasta' }).click();
  await expect(page.getByLabel('Otro monto', { exact: true })).toHaveValue('1');
  await expect(page.getByRole('button', { name: '$0', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /Jugador.*Nicolás/ }).click();
  await page.getByLabel('Otro monto', { exact: true }).fill('0');
  await expect(page.getByText('La apuesta mínima es $1.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Asignar ítem', exact: true })).toBeDisabled();
  await page.getByLabel('Otro monto', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Asignar a Nicolás por $1', exact: true }).dblclick();
  await expect(page.getByText('Ítem 2 de 8')).toBeVisible();
  expect(
    (await stored(page)).currentGame.items.filter(
      (i: { assignedPlayerId: string | null }) => i.assignedPlayerId,
    ),
  ).toHaveLength(1);
  await expect(page.locator('.player-1 .player-stats strong')).toHaveText('$19');
  await expect(page.getByLabel('Otro monto', { exact: true })).toHaveValue('1');
  await expect(page.getByRole('button', { name: 'Asignar ítem', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  expect((await stored(page)).currentGame.openingAuction).toEqual({
    ...drawn.openingAuction,
    confirmed: true,
  });
  await expect(page.getByText('Ítem 1 de 8')).toBeVisible();
  await expect(page.locator('.player-1 .player-stats strong')).toHaveText('$20');
  await expect(page.getByRole('button', { name: 'Girar ruleta' })).toHaveCount(0);
});

test('saldo agotado bloquea compras sin repartir ni terminar', async ({ page }) => {
  await prepare(page, 'none', 1);
  await open(page);
  await purchase(page);
  await purchase(page, 'Bastián');
  await expect(page.getByText('No hay saldo para otra compra.', { exact: true })).toBeVisible();
  const game = (await stored(page)).currentGame;
  expect(game.status).toBe('PLAYING');
  expect(game.currentItemIndex).toBe(2);
  expect(game.items.filter((i: { autoAssigned: boolean }) => i.autoAssigned)).toHaveLength(0);
  await expect(page.getByRole('button', { name: 'Ver resultados' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(page.getByText('No hay saldo para otra compra.', { exact: true })).toHaveCount(0);
  await expect(page.locator('.player-2 .player-stats strong')).toHaveText('$1');
});

test('preferencias accesibles, volumen persistente y sistema reduce durante giro', async ({
  page,
}) => {
  await prepare(page, 'system');
  await expect(
    page.locator('header').getByRole('button', { name: 'Activar sonidos' }),
  ).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Girar ruleta' }).click();
  await page.getByRole('button', { name: 'Preferencias', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Probar sonido' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Activar sonidos' }).click();
  await dialog.getByRole('button', { name: 'Probar sonido' }).click();
  await dialog.getByRole('slider').fill('60');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await dialog.getByLabel('Movimiento', { exact: true }).selectOption('reduced');
  await page.screenshot({ path: 'validation/preferences-1366.png', fullPage: true });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Preferencias', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Comenzar subasta' })).toBeEnabled();
  const preferences = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), prefsKey);
  expect(preferences).toMatchObject({ soundEnabled: true, volume: 60, motion: 'reduced' });
  // Remove preparation init script from this context by checking persistence in a fresh tab.
  const next = await page.context().newPage();
  await next.goto('/game/play');
  await expect(
    next.locator('header').getByRole('button', { name: 'Silenciar sonidos' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await next.getByRole('button', { name: 'Preferencias', exact: true }).click();
  await expect(next.getByRole('slider')).toHaveValue('60');
  await expect(next.getByLabel('Movimiento', { exact: true })).toHaveValue('reduced');
  await next.close();
});

test('ninguna espera artificial al usar sistema reducido y repetir renueva el sorteo', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepare(page, 'system');
  await open(page);
  for (let n = 0; n < 4; n++) await purchase(page);
  const finished = (await stored(page)).currentGame;
  await page.getByRole('button', { name: 'Ver resultados', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Ahora sí. Mira lo que compraste.' }),
  ).toBeVisible();
  const viewed = await stored(page);
  expect(viewed.resultsViewedGameId).toBe(finished.id);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Ahora sí. Mira lo que compraste.' }),
  ).toBeVisible();
  expect((await stored(page)).resultsViewedGameId).toBe(finished.id);
  await expect(page.locator('.result-items li').filter({ hasText: 'Automático · $0' })).toHaveCount(
    4,
  );
  await page.getByRole('button', { name: 'Repetir configuración', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Girar ruleta' })).toBeEnabled();
  const repeat = (await stored(page)).currentGame;
  expect(repeat.id).not.toBe(finished.id);
  expect(repeat.openingAuction).toEqual({ startingPlayerId: null, confirmed: false });
  await expect(page.getByRole('button', { name: 'Girar ruleta' })).toBeEnabled();
});

test('partida v1 conserva compra histórica $0 y undo no agrega una ruleta', async ({ page }) => {
  await prepare(page);
  await open(page);
  await purchase(page);
  await page.evaluate((k) => {
    const state = JSON.parse(localStorage.getItem(k)!);
    state.version = 1;
    delete state.resultsViewedGameId;
    delete state.currentGame.openingAuction;
    delete state.undoSnapshot.openingAuction;
    state.currentGame.items[0].price = 0;
    localStorage.setItem(k, JSON.stringify(state));
  }, gameKey);
  await page.reload();
  await expect(page.getByText('Ítem 2 de 8')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Girar ruleta' })).toHaveCount(0);
  await expect(page.locator('.player-1 .player-stats strong')).toHaveText('$20');
  await expect(page.locator('.history')).toContainText('$0');
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  const migrated = await stored(page);
  expect(migrated.version).toBe(2);
  expect(migrated.currentGame.openingAuction).toEqual({
    startingPlayerId: null,
    confirmed: true,
    legacySkipped: true,
  });
  await expect(page.getByText('Ítem 1 de 8')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Girar ruleta' })).toHaveCount(0);
  await purchase(page);
  await expect(page.locator('.player-1 .player-stats strong')).toHaveText('$19');
});

test('fallo de audio no bloquea guardado y no hay sonidos al recargar', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', {
      value: class {
        constructor() {
          throw new Error('audio blocked');
        }
      },
    });
  });
  await prepare(page);
  await page.locator('header').getByRole('button', { name: 'Activar sonidos' }).click();
  await expect(
    page.getByText('El navegador no pudo activar el audio. Puedes seguir jugando.'),
  ).toBeVisible();
  await open(page);
  await purchase(page);
  expect((await stored(page)).currentGame.currentItemIndex).toBe(1);
  await page.reload();
  await expect(page.getByText('Ítem 2 de 8')).toBeVisible();
  await expect(
    page.getByText('El navegador no pudo activar el audio. Puedes seguir jugando.'),
  ).toHaveCount(0);
});

for (const [random, winner] of [
  [0.25, 0],
  [0.75, 1],
] as const) {
  test(`giro completo aterriza en el segmento ${winner + 1} y habilita continuar`, async ({
    page,
  }) => {
    await page.addInitScript((value) => {
      Math.random = () => value;
    }, random);
    await prepare(page, 'system');
    await page.getByRole('button', { name: 'Girar ruleta' }).click();
    await expect(page.getByRole('button', { name: 'Comenzar subasta' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Comenzar subasta' })).toBeEnabled();
    const game = (await stored(page)).currentGame;
    expect(game.openingAuction.startingPlayerId).toBe(game.players[winner].id);
    await expect(page.locator('.wheel-result h2')).toHaveText(
      `${game.players[winner].name} comienza ofreciendo $1`,
    );
    const position = await page.locator('.wheel-face').evaluate((el) => {
      const m = new DOMMatrix(getComputedStyle(el).transform);
      return Math.round(((Math.atan2(m.b, m.a) * 180) / Math.PI + 360) % 360);
    });
    expect(position).toBe(winner === 0 ? 270 : 90);
    await page.screenshot({ path: `validation/wheel-result-${winner + 1}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Comenzar subasta' }).click();
    await expect(page.locator('.current-card')).toBeVisible();
  });
}

test('audio Web Audio real: selección silenciosa, secuencia cancelable y sin replay', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const starts: number[] = [],
      stops: number[] = [];
    Object.assign(window, { audioProbe: { starts, stops } });
    const create = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () {
      const osc = create.call(this),
        start = osc.start.bind(osc),
        stop = osc.stop.bind(osc);
      osc.start = (time?: number) => {
        starts.push(performance.now());
        start(time);
      };
      osc.stop = (time?: number) => {
        stops.push(performance.now());
        stop(time);
      };
      return osc;
    };
  });
  const count = () =>
    page.evaluate(
      () => (window as unknown as { audioProbe: { starts: number[] } }).audioProbe.starts.length,
    );
  await prepare(page);
  await page.locator('header').getByRole('button', { name: 'Activar sonidos' }).click();
  await open(page);
  await expect.poll(count).toBe(2);
  await page.getByRole('button', { name: /Jugador.*Nicolás/ }).click();
  await page.getByRole('button', { name: '$2', exact: true }).click();
  await page.getByLabel('Otro monto', { exact: true }).fill('1');
  expect(await count()).toBe(2);
  await page.getByRole('button', { name: 'Asignar a Nicolás por $1', exact: true }).click();
  await expect.poll(count).toBe(4);
  await page.reload();
  expect(await count()).toBe(0);
  await purchase(page);
  await purchase(page);
  const before = await count();
  await purchase(page);
  await page.locator('header').getByRole('button', { name: 'Silenciar sonidos' }).click();
  const muted = await count();
  expect(muted).toBeGreaterThanOrEqual(before + 2);
  await page.waitForTimeout(950);
  expect(await count()).toBe(muted);
  await page.getByRole('button', { name: 'Ver resultados', exact: true }).click();
  expect(await count()).toBe(muted);
  await page.reload();
  expect(await count()).toBe(0);
});
