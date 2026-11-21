import re


# 1. Clean product text
def normalize_text(text):
    if not text:
        return ""

    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


# 2. Find products matching the user's search
def find_matching_products(search_results, query):
    query_words = set(normalize_text(query).split())

    matches = []

    for item in search_results:
        title = item.get("title", "")
        title_words = set(normalize_text(title).split())

        if not query_words:
            continue

        overlap = len(query_words & title_words) / len(query_words)

        if overlap >= 0.6:
            matches.append(item)

    return matches


# 3. Extract and standardize merchant offers
def normalize_offers(product_results):
    offers = []

    stores = product_results.get("stores", [])

    for store in stores:
        price = store.get("extracted_price")

        offer = {
            "product_name": store.get("title") or product_results.get("title"),
            "seller": store.get("name"),
            "price": price,
            "display_price": store.get("price"),
            "shipping": store.get("shipping"),
            "total_price": store.get("extracted_total") or price,
            "rating": store.get("rating"),
            "reviews": store.get("reviews"),
            "product_url": store.get("link"),
            "currency": "INR"
        }

        offers.append(offer)

    return offers


# 4. Remove invalid prices
def filter_valid_offers(offers):
    valid_offers = []

    for offer in offers:
        price = offer.get("price")

        if isinstance(price, (int, float)) and price > 0:
            valid_offers.append(offer)

    return valid_offers


# 5. Sort offers cheapest to expensive
def sort_offers_by_price(offers):
    valid_offers = filter_valid_offers(offers)

    return sorted(valid_offers, key=lambda offer: offer["price"])


# 6. Compare all offers
def compare_offers(offers):
    sorted_offers = sort_offers_by_price(offers)

    if not sorted_offers:
        return {
            "offers": [],
            "best_deal": None,
            "lowest_price": None,
            "highest_price": None,
            "price_difference": None
        }

    prices = [offer["price"] for offer in sorted_offers]

    lowest_price = min(prices)
    highest_price = max(prices)

    return {
        "offers": sorted_offers,
        "best_deal": sorted_offers[0],
        "lowest_price": lowest_price,
        "highest_price": highest_price,
        "price_difference": round(highest_price - lowest_price, 2)
    }