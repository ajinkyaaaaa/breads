import categoryMap from '../data/commodityCategories.json';

export type CommodityCategory = 'fruit' | 'vegetable';

const MAP = categoryMap as Record<string, CommodityCategory>;

/** Grains, pulses, oilseeds, spices, etc. aren't in the map -- callers should render nothing for those. */
export function getCommodityCategory(commodityName: string): CommodityCategory | null {
  return MAP[commodityName] ?? null;
}
