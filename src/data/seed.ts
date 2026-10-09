import type { Catalog, ItemType } from '../types';
export function seedCatalog(): Catalog {
  const definitions = [
    [
      'pizza',
      'Ingredientes de pizza',
      '🍕',
      'Una buena pizza empieza con una mala decisión.',
      [
        'Pepperoni',
        'Mozzarella',
        'Queso cheddar',
        'Jamón',
        'Choclo',
        'Champiñones',
        'Aceitunas',
        'Tocino',
      ],
      [
        'Clavos oxidados',
        'Vello púbico',
        'Sudor de axila',
        'Quesillo del pico',
        'Arena',
        'Pasta dental',
        'Aceite de motor',
        'Pelo mojado',
      ],
    ],
    [
      'batido',
      'Ingredientes de batido',
      '🥤',
      'Agita las expectativas. Lo demás es suerte.',
      ['Leche', 'Plátano', 'Frutilla', 'Yogur', 'Avena', 'Cacao', 'Miel', 'Mango'],
      [
        'Agua de completos',
        'Salsa de soja',
        'Pasta dental',
        'Arena',
        'Cebolla cruda',
        'Aceite de motor',
        'Agua de calcetín',
        'Café con sal',
      ],
    ],
    [
      'isla',
      'Isla desierta',
      '🏝️',
      'Dos náufragos. Un equipaje muy cuestionable.',
      [
        'Agua potable',
        'Encendedor',
        'Cuchillo',
        'Botiquín',
        'Cuerda',
        'Linterna',
        'Carpa',
        'Filtro de agua',
      ],
      [
        'Televisor',
        'Microondas',
        'Ladrillo',
        'Impresora',
        'Control remoto',
        'Florero',
        'Aspiradora',
        'Calendario vencido',
      ],
    ],
  ] as const;
  const createdAt = new Date().toISOString();
  return {
    version: 1,
    categories: definitions.map(([id, name, emoji, description]) => ({
      id,
      name,
      emoji,
      description,
      active: true,
      createdAt,
    })),
    items: definitions.flatMap(([categoryId, , , , good, bad]) =>
      (
        [
          ['GOOD', good],
          ['BAD', bad],
        ] as const
      ).flatMap(([type, names]) =>
        names.map((name, index) => ({
          id: `${categoryId}-${type}-${index}`,
          categoryId,
          name,
          type: type as ItemType,
          active: true,
          createdAt,
        })),
      ),
    ),
  };
}
