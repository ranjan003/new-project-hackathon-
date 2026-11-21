from backend.price_service.serpapi_client import (
    search_products,
    get_product_offers
)

from backend.price_service.price_engine import (
    find_matching_products,
    normalize_offers,
    compare_offers
)


def main():
    query = input("Enter product name/model: ").strip()

    if not query:
        print("Please enter a product name.")
        return

    print("\nSearching Google Shopping...\n")

    try:
        search_results = search_products(query)

        if not search_results:
            print("No search results found.")
            return

        candidates = find_matching_products(search_results, query)

        if not candidates:
            candidates = search_results

        candidates = candidates[:10]

        print("======= PRODUCT CANDIDATES =======")

        for index, product in enumerate(candidates, start=1):
            print(f"\n{index}. {product.get('title')}")
            print("Price:", product.get("price"))
            print("Store:", product.get("source"))
            print("Product ID:", product.get("product_id"))

        choice = input(
            "\nSelect the exact product number to compare: "
        ).strip()

        if not choice.isdigit():
            print("Please enter a valid number.")
            return

        selected_index = int(choice) - 1

        if selected_index < 0 or selected_index >= len(candidates):
            print("Invalid product selection.")
            return

        selected_product = candidates[selected_index]

        product_id = selected_product.get("product_id")

        if not product_id:
            print("Product ID not available for this result.")
            return

        print("\nFetching offers for selected product...")
        print("Product:", selected_product.get("title"))

        product_data = get_product_offers(product_id)

        offers = normalize_offers(product_data)

        comparison = compare_offers(offers)

        print("\n======= PRICE COMPARISON =======")

        if not comparison["offers"]:
            print("No valid merchant offers found.")
            return

        for offer in comparison["offers"]:
            print("\n----------------------------")
            print("Store:", offer.get("seller"))
            print("Price:", offer.get("display_price"))
            print("Shipping:", offer.get("shipping"))
            print("Product:", offer.get("product_name"))
            print("Link:", offer.get("product_url"))

        best = comparison["best_deal"]

        print("\n======= BEST DEAL =======")
        print("Store:", best.get("seller"))
        print("Price:", best.get("display_price"))
        print("Product:", best.get("product_name"))
        print("Link:", best.get("product_url"))

        print("\n======= PRICE SUMMARY =======")
        print("Lowest Price:", comparison["lowest_price"])
        print("Highest Price:", comparison["highest_price"])
        print("Price Difference:", comparison["price_difference"])

    except Exception as e:
        print("\nSomething went wrong:", e)


if __name__ == "__main__":
    main()