# Mercato frontend: backend handoff

This repository contains the React/Vite user interface. The catalog, offers, shopping assistant, and cart currently use demo data in `src/App.tsx`. Use this contract to connect the UI to a backend running on another computer, server, or cloud service.

## 1. Source files to send

Send the repository without generated or private files:

```text
src/
public/
index.html
package.json
pnpm-lock.yaml
tsconfig.json
vite.config.ts
.mise.toml
.env.example
BACKEND_INTEGRATION.md
```

Do **not** send:

```text
node_modules/
dist/
.git/
.env
```

The receiving developer can run:

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The Figma Make preview already starts its own development server. Do not run a second development server inside Make.

## 2. Connecting to a backend on another device

Set the backend URL in `.env`:

```env
VITE_API_BASE_URL=http://192.168.1.50:3000/api/v1
```

Replace `192.168.1.50` with the backend computer's LAN IP address. Both devices must be on the same network unless the backend is publicly hosted.

The backend must:

1. Listen on `0.0.0.0`, not only `localhost`.
2. Allow the backend port through its firewall.
3. Enable CORS for the frontend origin.
4. Return JSON with `Content-Type: application/json`.
5. Serve product images through public HTTPS URLs, or through URLs reachable by the frontend device.

Example CORS development configuration:

```text
Allowed origins: http://localhost:5173, http://localhost:8443
Allowed methods: GET, POST, PATCH, DELETE, OPTIONS
Allowed headers: Content-Type, Authorization
Allow credentials: true (only if cookie authentication is used)
```

Never put database passwords, payment secrets, or private API keys in a `VITE_` environment variable. Vite variables are visible in the browser.

## 3. Response envelope

Successful list response:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0
  }
}
```

Successful single-record response:

```json
{
  "data": {}
}
```

Error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A customer-safe error message",
    "fields": {
      "quantity": "Quantity must be at least 1"
    }
  }
}
```

Use ISO 8601 UTC timestamps, for example `2026-11-21T10:30:00Z`. Send money as integer minor units (`25900` means $259.00) plus a currency code to avoid floating-point errors.

## 4. Product format

### `GET /products`

Supported query parameters:

```text
search
category
minPrice
maxPrice
sort=recommended|price_asc|rating_desc
page
pageSize
```

Example response item:

```json
{
  "id": "aurelia",
  "slug": "aurelia-one",
  "name": "Aurelia One",
  "category": "Audio",
  "subtitle": "Spatial over-ear headphones",
  "description": "Engineered for all-day listening with adaptive noise control.",
  "basePrice": {
    "amount": 27900,
    "currency": "USD"
  },
  "themeColor": "#d9a15e",
  "images": [
    {
      "id": "img_1",
      "url": "https://cdn.example.com/products/aurelia/front.jpg",
      "alt": "Aurelia One headphones in warm ivory",
      "sortOrder": 1
    }
  ],
  "stats": [
    { "label": "Battery", "value": "38 hours" },
    { "label": "Weight", "value": "254 grams" }
  ],
  "features": [
    {
      "title": "Silence, on demand.",
      "description": "Adaptive noise control adjusts in real time."
    }
  ],
  "materials": [
    { "label": "Finish", "value": "Warm ivory" }
  ],
  "variants": [
    {
      "id": "aurelia-ivory",
      "name": "Warm ivory",
      "sku": "AUR-ONE-IVY",
      "available": true
    }
  ]
}
```

### `GET /products/:productId`

Returns one product in the same format.

## 5. Retailer offer format

### `GET /products/:productId/offers`

Supported query parameter:

```text
sort=recommended|price_asc|rating_desc|delivery_asc
```

Example response:

```json
{
  "data": [
    {
      "id": "offer_amazon_aurelia",
      "productId": "aurelia",
      "variantId": "aurelia-ivory",
      "retailer": {
        "id": "amazon",
        "name": "Amazon",
        "mark": "a",
        "brandColor": "#ff9900",
        "featureTitle": "Fastest delivery",
        "featureDescription": "Free next-day delivery with live tracking."
      },
      "price": {
        "amount": 25900,
        "currency": "USD"
      },
      "rating": 4.7,
      "reviewCount": 2800,
      "delivery": {
        "label": "Tomorrow",
        "estimatedDate": "2026-11-22",
        "price": {
          "amount": 0,
          "currency": "USD"
        }
      },
      "stock": "in_stock",
      "returnsDays": 30,
      "productUrl": "https://retailer.example/product",
      "lastCheckedAt": "2026-11-21T10:30:00Z"
    }
  ],
  "meta": {
    "productId": "aurelia",
    "total": 5
  }
}
```

All retailer offers should have equal status. Do not send an automatic `bestOffer` unless the business has an explicit, customer-visible ranking policy.

## 6. Shopping assistant

The current assistant uses local catalog rules. For a server-powered assistant, implement:

### `POST /assistant/recommendations`

Request:

```json
{
  "message": "I need noise-cancelling headphones under $300",
  "conversationId": "optional-existing-conversation-id",
  "filters": {
    "currency": "USD",
    "inStockOnly": true
  }
}
```

Response:

```json
{
  "data": {
    "conversationId": "conv_123",
    "message": "Aurelia One is the closest match for your budget and use.",
    "recommendations": [
      {
        "productId": "aurelia",
        "reason": "Adaptive noise control, 38-hour battery, and under $300."
      }
    ],
    "suggestedPrompts": [
      "Show the lowest price",
      "Compare delivery times"
    ]
  }
}
```

The backend must keep private AI-provider keys server-side. It should validate requests, rate-limit the endpoint, ground answers in current catalog data, and avoid inventing prices or stock.

## 7. Cart and order format

### `POST /cart/quote`

Use this before checkout so prices and stock are revalidated.

Request:

```json
{
  "currency": "USD",
  "items": [
    {
      "offerId": "offer_amazon_aurelia",
      "variantId": "aurelia-ivory",
      "quantity": 1
    }
  ],
  "postalCode": "10001"
}
```

Response:

```json
{
  "data": {
    "quoteId": "quote_123",
    "expiresAt": "2026-11-21T10:45:00Z",
    "items": [
      {
        "offerId": "offer_amazon_aurelia",
        "quantity": 1,
        "unitPrice": { "amount": 25900, "currency": "USD" },
        "lineTotal": { "amount": 25900, "currency": "USD" },
        "available": true
      }
    ],
    "subtotal": { "amount": 25900, "currency": "USD" },
    "delivery": { "amount": 0, "currency": "USD" },
    "tax": { "amount": 2137, "currency": "USD" },
    "total": { "amount": 28037, "currency": "USD" }
  }
}
```

### `POST /orders`

Request:

```json
{
  "quoteId": "quote_123",
  "customer": {
    "email": "customer@example.com",
    "firstName": "Avery",
    "lastName": "Lee"
  },
  "shippingAddress": {
    "line1": "123 Example Street",
    "line2": "",
    "city": "New York",
    "region": "NY",
    "postalCode": "10001",
    "country": "US"
  },
  "paymentToken": "token_from_payment_provider"
}
```

Response:

```json
{
  "data": {
    "orderId": "order_123",
    "status": "confirmed",
    "orderNumber": "MER-100023",
    "total": { "amount": 28037, "currency": "USD" },
    "confirmationEmail": "customer@example.com"
  }
}
```

Do not send raw card numbers to the application backend. Use a payment provider's hosted fields or checkout SDK and send only its secure token.

## 8. Suggested frontend API client

Create `src/lib/api.ts` when the backend URL is known:

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  const body = await response.json()
  if (!response.ok) {
    throw new Error(body?.error?.message || 'Request failed')
  }
  return body.data as T
}

export const api = {
  products: () => request<Product[]>('/products'),
  product: (id: string) => request<Product>(`/products/${id}`),
  offers: (id: string) => request<Offer[]>(`/products/${id}/offers`),
  recommend: (message: string) =>
    request<Recommendation>('/assistant/recommendations', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
}
```

Define `Product`, `Offer`, and `Recommendation` from the response formats above. Add loading, empty, and error states before replacing the demo data in `src/App.tsx`.

## 9. Integration checklist

- [ ] Backend base URL is available from the frontend device.
- [ ] CORS allows the exact frontend origin.
- [ ] Product and offer endpoints match this document.
- [ ] All money uses integer minor units and a currency code.
- [ ] Images have public/reachable URLs and useful alt text.
- [ ] Offer stock and prices are timestamped.
- [ ] Cart quote revalidates stock and price.
- [ ] AI credentials and payment credentials remain server-side.
- [ ] Assistant responses are grounded in catalog data.
- [ ] Checkout uses a payment-provider token, never raw card data.
- [ ] Frontend has loading, empty, offline, and error states.
