import type { CategoryMapping } from './DefinitionLoader';

interface CategoryDef {
  id: number;
  name: string;
  parent_id: number | null;
}

interface HasCategories {
  categories: number[];
  [key: string]: any;
}

/**
 * Maps indexer-specific categories to standard Newznab categories
 * and filters results by category.
 */
export class CategoryFilter {
  private nameToId: Map<string, number>;
  private parentChildren: Map<number, Set<number>>;

  constructor(standardCategories: CategoryDef[]) {
    this.nameToId = new Map(standardCategories.map(c => [c.name, c.id]));

    // Build parent -> children lookup
    this.parentChildren = new Map();
    for (const cat of standardCategories) {
      if (cat.parent_id === null) {
        if (!this.parentChildren.has(cat.id)) {
          this.parentChildren.set(cat.id, new Set());
        }
      } else {
        const children = this.parentChildren.get(cat.parent_id) ?? new Set();
        children.add(cat.id);
        this.parentChildren.set(cat.parent_id, children);
      }
    }
  }

  /**
   * Map an indexer-specific category ID to a standard Newznab category ID
   * using the indexer's category mapping definitions.
   */
  mapToStandard(indexerCategoryId: string, mappings: CategoryMapping[]): number | null {
    const mapping = mappings.find(m => m.id === indexerCategoryId);
    if (!mapping) return null;

    const standardId = this.nameToId.get(mapping.cat);
    return standardId ?? null;
  }

  /**
   * Filter results to only include those matching the specified category IDs.
   * When filtering by a parent category (e.g., 2000 Movies), includes all
   * subcategories (e.g., 2030, 2040, 2045).
   */
  filterByCategories<T extends HasCategories>(results: T[], categoryIds: number[]): T[] {
    if (categoryIds.length === 0) return results;

    // Expand parent categories to include their children
    const expandedIds = new Set<number>();
    for (const id of categoryIds) {
      expandedIds.add(id);
      const children = this.parentChildren.get(id);
      if (children) {
        for (const childId of children) {
          expandedIds.add(childId);
        }
      }
    }

    return results.filter(r =>
      r.categories.some(cat => expandedIds.has(cat))
    );
  }

  /**
   * Resolve a standard category ID to its name.
   */
  resolveStandardName(categoryId: number): string | null {
    for (const [name, id] of this.nameToId) {
      if (id === categoryId) return name;
    }
    return null;
  }
}
