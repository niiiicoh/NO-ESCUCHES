import type { Catalog, Category, Item } from '../types';
import { seedCatalog } from '../data/seed';
import { catalogSchema } from '../lib/schemas';
import { keys, storage } from '../lib/storage';
export interface CatalogRepository {
  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(data: Pick<Category, 'name' | 'emoji' | 'description'>): Promise<Category>;
  updateCategory(
    id: string,
    data: Partial<Pick<Category, 'name' | 'emoji' | 'description' | 'active'>>,
  ): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  duplicateCategory(id: string): Promise<Category>;
  getItemsByCategory(id: string): Promise<Item[]>;
  createItem(data: Pick<Item, 'categoryId' | 'name' | 'type'>): Promise<Item>;
  updateItem(
    id: string,
    data: Partial<Pick<Item, 'categoryId' | 'name' | 'type' | 'active'>>,
  ): Promise<void>;
  deleteItem(id: string): Promise<void>;
}
class LocalCatalogRepository implements CatalogRepository {
  private catalog: Catalog | null = null;
  async load() {
    if (!this.catalog) {
      const saved = storage.read(keys.catalog, catalogSchema);
      if (saved) this.catalog = saved;
      else {
        const seed = seedCatalog();
        storage.write(keys.catalog, seed);
        this.catalog = seed;
      }
    }
    return structuredClone(this.catalog);
  }
  private commit(c: Catalog) {
    const parsed = catalogSchema.safeParse(c);
    if (!parsed.success)
      throw new Error(
        'Usa nombres únicos y no vacíos en cada categoría; verifica la categoría de destino.',
      );
    storage.write(keys.catalog, parsed.data);
    this.catalog = parsed.data;
  }
  async getCategories() {
    return (await this.load()).categories;
  }
  async getCategory(id: string) {
    return (await this.load()).categories.find((c) => c.id === id);
  }
  async createCategory(data: Pick<Category, 'name' | 'emoji' | 'description'>) {
    const c = await this.load();
    const category = {
      ...data,
      name: data.name.trim(),
      id: crypto.randomUUID(),
      active: true,
      createdAt: new Date().toISOString(),
    };
    c.categories.push(category);
    this.commit(c);
    return category;
  }
  async updateCategory(
    id: string,
    data: Partial<Pick<Category, 'name' | 'emoji' | 'description' | 'active'>>,
  ) {
    const c = await this.load(),
      target = c.categories.find((x) => x.id === id);
    if (!target) throw new Error('Categoría inexistente.');
    Object.assign(target, data);
    target.name = target.name.trim();
    this.commit(c);
  }
  async deleteCategory(id: string) {
    const c = await this.load();
    c.categories = c.categories.filter((x) => x.id !== id);
    c.items = c.items.filter((x) => x.categoryId !== id);
    this.commit(c);
  }
  async duplicateCategory(id: string) {
    const c = await this.load(),
      source = c.categories.find((x) => x.id === id);
    if (!source) throw new Error('Categoría inexistente.');
    let n = 1;
    while (c.categories.some((x) => x.name === `${source.name} (copia ${n})`)) n++;
    const copy = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} (copia ${n})`,
      createdAt: new Date().toISOString(),
    };
    c.categories.push(copy);
    c.items.push(
      ...c.items
        .filter((x) => x.categoryId === id)
        .map((x) => ({
          ...x,
          id: crypto.randomUUID(),
          categoryId: copy.id,
          createdAt: copy.createdAt,
        })),
    );
    this.commit(c);
    return copy;
  }
  async getItemsByCategory(id: string) {
    return (await this.load()).items.filter((x) => x.categoryId === id);
  }
  async createItem(data: Pick<Item, 'categoryId' | 'name' | 'type'>) {
    const c = await this.load(),
      item = {
        ...data,
        name: data.name.trim(),
        id: crypto.randomUUID(),
        active: true,
        createdAt: new Date().toISOString(),
      };
    c.items.push(item);
    this.commit(c);
    return item;
  }
  async updateItem(
    id: string,
    data: Partial<Pick<Item, 'categoryId' | 'name' | 'type' | 'active'>>,
  ) {
    const c = await this.load(),
      target = c.items.find((x) => x.id === id);
    if (!target) throw new Error('Ítem inexistente.');
    Object.assign(target, data);
    target.name = target.name.trim();
    this.commit(c);
  }
  async deleteItem(id: string) {
    const c = await this.load();
    c.items = c.items.filter((x) => x.id !== id);
    this.commit(c);
  }
  async reset() {
    const c = seedCatalog();
    storage.write(keys.catalog, c);
    this.catalog = c;
    return c;
  }
}
export const catalogRepository = new LocalCatalogRepository();
