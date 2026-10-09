import { test, expect, type Page } from '@playwright/test';
async function setup(page: Page) {
  await page.goto('/game/new');
  await page.getByLabel('Jugador 1', { exact: true }).fill('Nicolás');
  await page.getByLabel('Jugador 2', { exact: true }).fill('Bastián');
}
async function buy(page: Page, name = 'Nicolás', price = 3) {
  await page.getByRole('button', { name: new RegExp(`Jugador.*${name}`) }).click();
  await page.getByRole('button', { name: `$${price}`, exact: true }).click();
  await page.getByRole('button', { name: `Asignar a ${name} por $${price}`, exact: true }).click();
}
test('categoría recién creada, mover ítems, copia de partida y repetición invalidada', async ({
  page,
}) => {
  await page.goto('/admin');
  await page.getByLabel('Nombre', { exact: true }).fill('Tema nuevo');
  await page.getByRole('button', { name: 'Crear categoría' }).click();
  const categoryUrl = page.url();
  await page
    .getByLabel('Nombre del ítem', { exact: true })
    .fill('Un objeto con un nombre muy largo que cabe completo en la carta del juego');
  await page.getByRole('button', { name: 'Añadir ítem', exact: true }).click();
  await page.getByLabel('Nombre del ítem', { exact: true }).fill('Idea mala');
  await page.getByLabel('Clasificación', { exact: true }).selectOption('BAD');
  await page.getByRole('button', { name: 'Añadir ítem', exact: true }).click();
  const id = categoryUrl.split('/').at(-1)!;
  await page.goto(`/game/new?category=${id}`);
  await page.getByLabel('Total de ítems', { exact: true }).fill('2');
  await page.getByRole('spinbutton', { name: 'Malos', exact: true }).fill('1');
  await page.getByRole('button', { name: 'Manual exacta', exact: true }).click();
  for (const checkbox of await page.getByRole('checkbox').all()) await checkbox.check();
  await page.getByLabel('Jugador 1', { exact: true }).fill('Nicolás');
  await page.getByLabel('Jugador 2', { exact: true }).fill('Bastián');
  await page.getByRole('button', { name: 'Comenzar partida' }).click();
  await page.setViewportSize({ width: 390, height: 650 });
  await page.screenshot({ path: 'validation/long-item-390.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await buy(page, 'Nicolás', 0);
  await page.getByRole('link', { name: 'Ver resultados' }).click();
  const original = await page.evaluate(() => localStorage.getItem('no-escuches:game:v1'));
  await page.goto(categoryUrl);
  await page
    .getByRole('button', {
      name: 'Editar Un objeto con un nombre muy largo que cabe completo en la carta del juego',
      exact: true,
    })
    .click();
  await page.getByLabel('Tipo', { exact: true }).selectOption('BAD');
  await page
    .getByLabel('Categoría', { exact: true })
    .selectOption({ label: 'Ingredientes de batido' });
  await page.getByRole('button', { name: 'Guardar ítem' }).click();
  await expect(page.locator('.admin-item')).toHaveCount(1);
  await page.getByRole('button', { name: 'Desactivar Idea mala', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('no-escuches:game:v1'))).toBe(original);
  await page.goto('/game/results');
  await page.getByRole('button', { name: 'Repetir configuración', exact: true }).click();
  await expect(page).toHaveURL(/game\/new/);
  await expect(page.locator('.error-notice')).toContainText('ya no está disponible');
  await page.getByRole('button', { name: 'Quitar selecciones no disponibles' }).click();
  await expect(page.getByText('0 de 2 seleccionados', { exact: true })).toBeVisible();
});
test('partida, doble clic, recarga, reparto, resultados y undo persistido', async ({ page }) => {
  await setup(page);
  await page.getByRole('spinbutton', { name: 'Malos', exact: true }).fill('6');
  await page.getByRole('button', { name: 'Comenzar partida' }).click();
  await expect(page).toHaveURL(/game\/play/);
  await expect(page.locator('main')).not.toContainText('Bueno');
  await expect(page.locator('main')).not.toContainText('Malo');
  await page.getByRole('button', { name: /Jugador.*Nicolás/ }).click();
  await page.getByRole('button', { name: '$3', exact: true }).click();
  await page.getByRole('button', { name: 'Asignar a Nicolás por $3', exact: true }).dblclick();
  await expect(page.getByText('Ítem 2 de 8')).toBeVisible();
  const before = await page.locator('.current-card h1').innerText();
  await page.reload();
  await expect(page.locator('.current-card h1')).toHaveText(before);
  await expect(page.locator('.player-1 .player-stats strong')).toHaveText('$17');
  await expect(page.getByRole('button', { name: 'Deshacer', exact: true })).toBeEnabled();
  for (let n = 0; n < 3; n++) await buy(page);
  await expect(page.getByRole('heading', { name: 'Partida terminada.' })).toBeVisible();
  await expect(page.locator('.finished-card')).toContainText('4 ítems restantes');
  await page.getByRole('link', { name: 'Ver resultados' }).click();
  await expect(page.locator('.result-items li')).toHaveCount(8);
  await page.reload();
  await page.getByRole('button', { name: 'Deshacer última acción' }).click();
  await expect(page.getByText('Ítem 4 de 8')).toBeVisible();
  await expect(page.locator('.player-1 .player-stats strong')).toHaveText('$11');
  await expect(page.locator('.player-2 .player-stats strong')).toHaveText('$20');
  await expect(page.getByRole('button', { name: 'Deshacer', exact: true })).toBeDisabled();
});
test('composición extrema, selección manual, personalizado y límites', async ({ page }) => {
  await setup(page);
  await page.getByLabel('Límite por jugador', { exact: true }).fill('3');
  await expect(page.getByText('Se necesita un límite entre 4 y 8.')).toBeVisible();
  await page.getByRole('button', { name: 'Comenzar partida' }).click();
  await expect(page).toHaveURL(/game\/new/);
  await page.getByLabel('Límite por jugador', { exact: true }).fill('5');
  for (const bad of [0, 8]) {
    await page.getByRole('spinbutton', { name: 'Malos', exact: true }).fill(String(bad));
    await page.getByRole('button', { name: 'Comenzar partida' }).click();
    if (await page.getByRole('button', { name: 'Crear nueva partida', exact: true }).isVisible())
      await page.getByRole('button', { name: 'Crear nueva partida', exact: true }).click();
    await expect(page).toHaveURL(/game\/play/);
    const stored = await page.evaluate(
      () => JSON.parse(localStorage.getItem('no-escuches:game:v1')!).currentGame,
    );
    expect(stored.items.filter((i: { type: string }) => i.type === 'BAD').length).toBe(bad);
    await page.goto('/game/new');
  }
  await page.getByRole('button', { name: 'Manual exacta', exact: true }).click();
  await page.getByRole('checkbox', { name: /Pepperoni/ }).check();
  for (const bad of [
    'Clavos oxidados',
    'Vello púbico',
    'Sudor de axila',
    'Quesillo del pico',
    'Arena',
    'Pasta dental',
    'Aceite de motor',
  ])
    await page.getByRole('checkbox', { name: new RegExp(bad) }).check();
  await page.getByRole('button', { name: 'Comenzar partida' }).click();
  await page.getByRole('button', { name: 'Crear nueva partida', exact: true }).click();
  await expect(page).toHaveURL(/game\/play/);
  await page.goto('/game/new');
  await page.getByRole('button', { name: 'Personalizada', exact: true }).click();
  await page.getByLabel('Total de ítems', { exact: true }).fill('2');
  await page.getByLabel('Nombre de la temática', { exact: true }).fill('Mi mezcla');
  for (let n = 0; n < 2; n++) {
    await page.getByRole('button', { name: 'Añadir bueno', exact: true }).click();
    await page.getByLabel(`Bueno ${n + 1}`, { exact: true }).fill(`Idea ${n}`);
  }
  await page.getByRole('button', { name: 'Comenzar partida' }).click();
  await page.getByRole('button', { name: 'Crear nueva partida', exact: true }).click();
  await expect(page).toHaveURL(/game\/play/);
  expect(await page.evaluate(() => localStorage.getItem('no-escuches:catalog:v1'))).not.toContain(
    'Mi mezcla',
  );
});
test('administración completa y catálogo persistente', async ({ page }) => {
  await page.goto('/admin');
  await page.getByLabel('Nombre', { exact: true }).fill('Camping');
  await page.getByLabel('Descripción (opcional)').fill('Bajo las estrellas');
  await page.getByRole('button', { name: 'Crear categoría' }).click();
  await expect(page.getByRole('heading', { name: 'Camping', exact: true })).toBeVisible();
  await page.getByLabel('Nombre del ítem', { exact: true }).fill('Carpa nueva');
  await page.getByRole('button', { name: 'Añadir ítem', exact: true }).click();
  await expect(page.locator('.admin-item')).toContainText('Carpa nueva');
  await page.getByRole('button', { name: 'Editar Carpa nueva', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Carpa mejorada');
  await page.getByRole('button', { name: 'Guardar ítem' }).click();
  await page.getByRole('button', { name: 'Desactivar Carpa mejorada', exact: true }).click();
  await expect(page.locator('.admin-item')).toContainText('Inactivo');
  await page.reload();
  await expect(page.locator('.admin-item')).toContainText('Carpa mejorada');
  await page.getByRole('button', { name: 'Activar Carpa mejorada', exact: true }).click();
  await page.goto('/admin');
  const card = page
    .locator('.admin-category')
    .filter({ has: page.getByRole('heading', { name: 'Camping', exact: true }) });
  await card.getByRole('button', { name: 'Duplicar' }).click();
  await expect(page.getByRole('heading', { name: 'Camping (copia 1)', exact: true })).toBeVisible();
  await expect(page.locator('.admin-item')).toContainText('Carpa mejorada');
  await page.getByRole('button', { name: 'Eliminar Carpa mejorada', exact: true }).click();
  await page.getByRole('button', { name: 'Eliminar ítem', exact: true }).click();
  await expect(page.locator('.admin-item')).toHaveCount(0);
  await page.goto('/admin');
  await page
    .locator('.admin-category')
    .filter({ has: page.getByRole('heading', { name: 'Camping (copia 1)', exact: true }) })
    .getByRole('button', { name: 'Eliminar', exact: true })
    .click();
  await page.getByRole('button', { name: 'Eliminar categoría', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Camping (copia 1)', exact: true })).toHaveCount(
    0,
  );
});
test('datos dañados se recuperan por área y el fallo de escritura es visible', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('no-escuches:game:v1', '{roto'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('No se pudo abrir la partida');
  await page.getByRole('button', { name: 'Restablecer partida', exact: true }).click();
  await page.getByRole('button', { name: 'Restablecer', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await setup(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error('quota');
    };
  });
  await page.getByRole('button', { name: 'Comenzar partida' }).click();
  await expect(page.getByRole('alert')).toContainText('No se pudo guardar');
  await expect(page).toHaveURL(/game\/new/);
});
test('responsive, capturas, texto largo, foco y movimiento reducido', async ({ page }) => {
  for (const width of [360, 390, 768, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'NO ESCUCHES, inicio' })).toBeVisible();
    await page.screenshot({ path: `validation/home-${width}.png`, fullPage: true });
    await setup(page);
    await page
      .getByLabel('Jugador 1', { exact: true })
      .fill('Nicolás con un nombre excepcionalmente largo');
    await page.screenshot({ path: `validation/setup-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Comenzar partida' }).click();
    if (await page.getByRole('button', { name: 'Crear nueva partida', exact: true }).isVisible())
      await page.getByRole('button', { name: 'Crear nueva partida', exact: true }).click();
    await expect(page).toHaveURL(/game\/play/);
    await page.screenshot({ path: `validation/play-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    for (let n = 0; n < 4; n++) await buy(page, 'Nicolás con un nombre excepcionalmente largo', 0);
    await page.getByRole('link', { name: 'Ver resultados' }).click();
    await page.screenshot({ path: `validation/results-${width}.png`, fullPage: true });
    await page.goto('/admin');
    await page.screenshot({ path: `validation/admin-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Ir al contenido' })).toBeFocused();
});
test('repetición directa, navegación protegida y foco de confirmación', async ({ page }) => {
  await page.goto('/game/results');
  await expect(page.getByText('Todavía no hay resultados.')).toBeVisible();
  await setup(page);
  await page.getByRole('button', { name: 'Comenzar partida' }).click();
  await page.goto('/game/results');
  await expect(page).toHaveURL(/game\/play/);
  for (let i = 0; i < 4; i++) await buy(page, 'Nicolás', 0);
  await page.getByRole('link', { name: 'Ver resultados' }).click();
  const id = await page.evaluate(
    () => JSON.parse(localStorage.getItem('no-escuches:game:v1')!).currentGame.id,
  );
  await page.getByRole('button', { name: 'Repetir configuración', exact: true }).click();
  await expect(page).toHaveURL(/game\/play/);
  const next = await page.evaluate(
    () => JSON.parse(localStorage.getItem('no-escuches:game:v1')!).currentGame,
  );
  expect(next.id).not.toBe(id);
  expect(
    next.items.every((i: { assignedPlayerId: string | null }) => i.assignedPlayerId === null),
  ).toBe(true);
  await page.goto('/game/new');
  await page.getByRole('button', { name: 'Comenzar partida' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Comenzar partida' })).toBeFocused();
  await page.goto('/ruta-inexistente');
  await expect(page.getByRole('heading', { name: 'Por aquí no era.' })).toBeVisible();
});
test('capacidad, precio inválido y agotamiento sin reparto automático', async ({ page }) => {
  await setup(page);
  await page.getByLabel('Total de ítems', { exact: true }).fill('10');
  await page.getByRole('spinbutton', { name: 'Malos', exact: true }).fill('0');
  await page.getByRole('button', { name: 'Comenzar partida' }).click();
  await expect(page.locator('.error-notice')).toContainText('Necesitas 10 ítems buenos');
  await page.getByLabel('Total de ítems', { exact: true }).fill('8');
  await page.getByLabel('Límite por jugador', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Comenzar partida' }).click();
  await page.getByRole('button', { name: /Jugador.*Nicolás/ }).click();
  await page.getByLabel('Otro monto', { exact: true }).fill('21');
  await expect(
    page.getByText('Le quedan $20. El precio no puede superar ese saldo.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Asignar a Nicolás por $21' })).toBeDisabled();
  await page.getByLabel('Otro monto', { exact: true }).fill('-1');
  await expect(page.getByText('Usa un precio entero no negativo.')).toBeVisible();
  for (let i = 0; i < 8; i++) await buy(page, i % 2 === 0 ? 'Nicolás' : 'Bastián', 0);
  await expect(page.getByRole('heading', { name: 'Partida terminada.' })).toBeVisible();
  await expect(page.locator('.finished-card')).toContainText('Todos los ítems tienen dueño.');
  await page.reload();
  await expect(page).toHaveURL(/game\/results/);
});
