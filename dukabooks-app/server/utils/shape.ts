// Small response shapers so pages get flat fields they can render directly.

export const withCompany = (deal: any) => ({ ...deal, company: deal?.properties?.company ?? null });

export const withStock = (product: any) => ({ ...product, stock: Number(product?.properties?.stock ?? 0) });
