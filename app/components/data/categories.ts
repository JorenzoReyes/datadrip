type ApiCategory = { id: number; name: string };
type ApiSubcategory = { id: number; name: string };
type ApiProductType = { id?: number; name?: string; product_type?: string };

export async function getCategoryOptions(level: 1|2|3|4|5|6, path: string[] = []) {
	if (level === 1) {
		const res = await fetch('/api/categories', { cache: 'no-store' });
		const data = await res.json() as { categories?: ApiCategory[] };
		return Array.isArray(data.categories) ? data.categories.map((c) => c.name) : [];
	}
	if (level === 2 && path[0]) {
		// Prefer categoryName param; fallback to categoryId
		let res = await fetch(`/api/subcategories?categoryName=${encodeURIComponent(path[0])}`, { cache: 'no-store' });
		let data = await res.json() as { subcategories?: ApiSubcategory[] };
		let list: ApiSubcategory[] = Array.isArray(data.subcategories) ? data.subcategories : [];
		if (list.length === 0) {
			const catRes = await fetch('/api/categories', { cache: 'no-store' });
			const catData = await catRes.json() as { categories?: ApiCategory[] };
			const match = (catData.categories || []).find((c) => c.name === path[0]);
			if (match?.id) {
				res = await fetch(`/api/subcategories?categoryId=${match.id}`, { cache: 'no-store' });
				data = await res.json() as { subcategories?: ApiSubcategory[] };
				list = Array.isArray(data.subcategories) ? data.subcategories : [];
			}
		}
		return list.map((s) => s.name);
	}
	// Levels 3-5 are derived from product_types, split by ' > '
    const l1 = path[0];
    const l2 = path[1];
	if (!l1 || !l2) return [];
	let productTypes: string[] = [];
	// First attempt: by names (categoryName + subcategoryName)
	try {
		const r = await fetch(`/api/product-types?categoryName=${encodeURIComponent(l1)}&subcategoryName=${encodeURIComponent(l2)}`, { cache: 'no-store' });
		if (r.ok) {
			const d = await r.json() as { product_types?: ApiProductType[]; productTypes?: ApiProductType[] };
			const arr: ApiProductType[] = Array.isArray(d.product_types) ? d.product_types : (Array.isArray(d.productTypes) ? d.productTypes : []);
			productTypes = arr
				.map((p) => String(p.name ?? p.product_type ?? ''))
				.filter((v) => v.trim().length > 0);
		}
	} catch { /* ignore and fallback */ }
	if (productTypes.length === 0) {
		// Fallback strictly required by API: resolve subcategoryId
		try {
			const catRes = await fetch('/api/categories', { cache: 'no-store' });
			const catData = await catRes.json() as { categories?: ApiCategory[] };
			const cat = (catData.categories || []).find((c) => c.name === l1);
			if (cat?.id) {
				const subRes = await fetch(`/api/subcategories?categoryId=${cat.id}`, { cache: 'no-store' });
				const subData = await subRes.json() as { subcategories?: ApiSubcategory[] };
				const sub = (subData.subcategories || []).find((s) => s.name === l2);
				if (sub?.id) {
					const r2 = await fetch(`/api/product-types?subcategoryId=${sub.id}`, { cache: 'no-store' });
					if (r2.ok) {
						const d2 = await r2.json() as { product_types?: ApiProductType[]; productTypes?: ApiProductType[] };
					const arr2: ApiProductType[] = Array.isArray(d2.product_types) ? d2.product_types : (Array.isArray(d2.productTypes) ? d2.productTypes : []);
					productTypes = arr2
						.map((p) => String(p.name ?? p.product_type ?? ''))
						.filter((v) => v.trim().length > 0);
					}
				}
			}
		} catch { /* no-op */ }
	}
	const depth = level - 2; // level3 -> 1st part, level4 -> 2nd, level5 -> 3rd
	const chosenDeeper = path.slice(2).filter(Boolean);
	const seen = new Set<string>();
	for (const pt of productTypes) {
		const parts = pt.split('>').map((s) => s.trim()).filter(Boolean);
		let matchesPrefix = true;
		for (let i = 0; i < chosenDeeper.length; i++) {
			if (parts[i] !== chosenDeeper[i]) { matchesPrefix = false; break; }
		}
		if (!matchesPrefix) continue;
		const next = parts[depth - 1];
		if (next) seen.add(next);
	}
	return Array.from(seen).sort();
}

export function hasMoreChildren(selectedPath: string[]) {
    const filtered = selectedPath.filter(Boolean);
    const [l1, l2, l3, l4, l5] = filtered;
    if (!l1) return false;   // nothing selected
    if (!l2) return true;    // there may be subcategories
    if (!l3) return true;    // there may be product_type segment 1
    if (!l4) return true;    // there may be product_type segment 2
    if (!l5) return true;    // there may be product_type segment 3 (6th level overall)
    return false;            // stop after 6 levels
}
