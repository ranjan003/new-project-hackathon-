import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_URL = "https://serpapi.com/search"


def get_api_key():
    api_key = os.getenv("SERPAPI_KEY")

    if not api_key:
        raise ValueError("SERPAPI_KEY missing. Check your .env file.")

    return api_key


def search_products(query):
    """Search Google Shopping for products."""

    params = {
        "engine": "google_shopping",
        "q": query,
        "gl": "in",
        "hl": "en",
        "api_key": get_api_key()
    }

    response = requests.get(API_URL, params=params, timeout=30)
    response.raise_for_status()

    data = response.json()

    return data.get("shopping_results", [])


def get_product_offers(product_id):
    """Fetch offers for a selected product."""

    params = {
        "engine": "google_product",
        "product_id": product_id,
        "offer_view": "true",
        "gl": "in",
        "hl": "en",
        "api_key": get_api_key()
    }

    response = requests.get(API_URL, params=params, timeout=30)
    response.raise_for_status()

    data = response.json()

    return data.get("product_results", {})