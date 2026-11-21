// Customer-side actions the assistant may trigger. They map to the Newtags app's real views:
// home (with search filters), product page, comparison section, bag. Nothing else.
//
// Deliberately NOT here: checkout, payment, placing or cancelling orders, account changes,
// and any seller/admin action. The customer always presses those buttons themselves.

export const PAGES = ["home", "cart"] as const;
export type Page = (typeof PAGES)[number];

export const ACTION_NAMES = ["navigate", "open_product", "search", "compare", "add_to_cart"] as const;

export type AssistantAction =
  | { name: "navigate"; page: Page }
  | { name: "open_product"; product_id: string }
  | { name: "compare"; product_id: string }
  | { name: "add_to_cart"; product_id: string; qty: number }
  | { name: "search"; query?: string; category?: "electronics" | "clothing" | "beauty"; min_price?: number; max_price?: number };

/** Which product the customer is looking at. The app sends "/product/<id>" on product pages. */
export function productIdFromPath(path: string): string | null {
  const m = path.match(/^\/product\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
