// Deterministic ranking for the assistant. Gemini picks WHICH products match and WHAT the
// customer wants (cheapest / top rated / best value); this file does the maths, so the
// numbers are always right.

import type { PlatformOffer, Product } from "./catalog.ts";

export const SORTS = ["relevance", "cheapest", "top_rated", "best_value"] as const;
export type Sort = (typeof SORTS)[number];

export type Insight = {
  rank: number;
  badge?: string; // e.g. "Lowest price", "Top rated", "Best value"
  effective_price: number; // our price after a coupon anyone can use (bank offers excluded: they depend on the card)
  weighted_rating: number; // rating adjusted for how many reviews it has
  lowest_other?: { platform: PlatformOffer["platform"]; effective_price: number };
  saving_vs_others: number; // > 0 means we're cheaper than the cheapest other platform
};

export type RankedProduct = Product & { insight: Insight };

/** Value of a coupon text like "₹500 off", "SEMIL500: ₹500 off" or "10% off, up to ₹300". */
export function couponValue(text: string | undefined, price: number): number {
  if (!text) return 0;
  const pct = text.match(/(\d+(?:\.\d+)?)\s*%\s*off/i);
  if (pct) {
    const cap = text.match(/up to\s*₹\s*([\d,]+)/i);
    const v = Math.round((price * Number(pct[1])) / 100);
    return cap ? Math.min(v, Number(cap[1].replace(/,/g, ""))) : v;
  }
  const flat = text.match(/₹\s*([\d,]+)\s*off/i);
  return flat ? Math.min(price, Number(flat[1].replace(/,/g, ""))) : 0;
}

export const effectivePrice = (p: Product) => p.price - couponValue(p.ourOffers?.coupon, p.price);
const otherEffective = (o: PlatformOffer) => o.price - couponValue(o.coupon, o.price);

/** Bayesian average: a 4.6★ with 30,000 reviews beats a 4.8★ with 12 reviews. */
export function weightedRating(p: Product, prior = 4.0, weight = 500) {
  return (p.rating * p.reviews + prior * weight) / (p.reviews + weight);
}

export function rankProducts(candidates: Product[], sort: Sort, opts: { maxPrice?: number; minPrice?: number; limit?: number } = {}) {
  const limit = opts.limit ?? 3;
  let list = candidates;
  let budgetIgnored = false;

  if (opts.maxPrice != null || opts.minPrice != null) {
    const inBudget = list.filter((p) => {
      const e = effectivePrice(p);
      return (opts.maxPrice == null || e <= opts.maxPrice) && (opts.minPrice == null || e >= opts.minPrice);
    });
    if (inBudget.length) list = inBudget;
    else budgetIgnored = true; // nothing in budget: show the closest instead of nothing
  }

  const eff = new Map(list.map((p) => [p.id, effectivePrice(p)]));
  const wr = new Map(list.map((p) => [p.id, weightedRating(p)]));
  const prices = [...eff.values()], ratings = [...wr.values()];
  const [pMin, pMax] = [Math.min(...prices), Math.max(...prices)];
  const [rMin, rMax] = [Math.min(...ratings), Math.max(...ratings)];
  const norm = (v: number, lo: number, hi: number) => (hi === lo ? 1 : (v - lo) / (hi - lo));
  const value = (p: Product) => 0.55 * norm(wr.get(p.id)!, rMin, rMax) + 0.45 * (1 - norm(eff.get(p.id)!, pMin, pMax));

  const sorted = [...list];
  if (sort === "cheapest") sorted.sort((a, b) => eff.get(a.id)! - eff.get(b.id)! || wr.get(b.id)! - wr.get(a.id)!);
  if (sort === "top_rated") sorted.sort((a, b) => wr.get(b.id)! - wr.get(a.id)! || eff.get(a.id)! - eff.get(b.id)!);
  if (sort === "best_value") sorted.sort((a, b) => value(b) - value(a) || eff.get(a.id)! - eff.get(b.id)!);
  // "relevance" keeps Gemini's order

  const badgeFor: Record<Sort, string | undefined> = { cheapest: "Lowest price", top_rated: "Top rated", best_value: "Best value", relevance: undefined };

  const products: RankedProduct[] = sorted.slice(0, limit).map((p, i) => {
    const others = (p.comparison ?? []).map((o) => ({ platform: o.platform, effective_price: otherEffective(o) }));
    const lowest_other = others.length ? others.reduce((a, b) => (b.effective_price < a.effective_price ? b : a)) : undefined;
    const e = eff.get(p.id)!;
    return {
      ...p,
      insight: {
        rank: i + 1,
        badge: i === 0 ? badgeFor[sort] : undefined,
        effective_price: e,
        weighted_rating: Math.round(wr.get(p.id)! * 100) / 100,
        lowest_other,
        saving_vs_others: lowest_other ? lowest_other.effective_price - e : 0,
      },
    };
  });

  return { products, budgetIgnored, summary: summarize(products, sort, budgetIgnored, opts.maxPrice) };
}

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

/** One factual line written from the numbers, shown above the cards. */
function summarize(list: RankedProduct[], sort: Sort, budgetIgnored: boolean, maxPrice?: number): string {
  if (!list.length) return "";
  const top = list[0];
  const parts: string[] = [];
  if (budgetIgnored && maxPrice != null) parts.push(`Nothing matches under ${inr(maxPrice)}, so here are the closest options.`);
  if (sort === "cheapest") parts.push(`Sorted by lowest price. Cheapest: ${top.name} at ${inr(top.insight.effective_price)}.`);
  if (sort === "top_rated") parts.push(`Sorted by rating and number of reviews. Top: ${top.name}, ${top.rating}★ from ${top.reviews.toLocaleString("en-IN")} reviews.`);
  if (sort === "best_value") parts.push(`Sorted by value (rating vs price). Best value: ${top.name}, ${top.rating}★ at ${inr(top.insight.effective_price)}.`);
  const s = top.insight.saving_vs_others;
  if (sort !== "relevance" && top.insight.lowest_other) {
    parts.push(s > 0 ? `That's ${inr(s)} less than ${top.insight.lowest_other.platform}.` : s === 0 ? `Same price as ${top.insight.lowest_other.platform}.` : "");
  }
  return parts.filter(Boolean).join(" ");
}
