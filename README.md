# Lepara Ale Fele Moya Web

This workspace contains the React storefront and admin dashboard for Lepara Ale Fele Moya.

## Apps

- `apps/admin`: API-backed admin dashboard
- `apps/public`: API-backed storefront

## Commands

```bash
npm install
npm run dev:admin
npm run build:admin
npm run dev:public
npm run build:public
```

## API configuration

Both apps use the shared request client and API configuration in `shared/`. For local development, copy the app's `.env.example` to `.env.local`; the Vite dev server proxies `/api/v1` to the production API so browser cookies and API requests work without local CORS changes:

```bash
VITE_API_BASE_URL=/api/v1
```

For deployment, set `VITE_API_BASE_URL=https://lepara-api.onrender.com/api/v1` (or omit it to use the shared production default). The API must allow both deployed website origins in `CORS_ORIGINS` for browser requests and refresh cookies to work.

The public app loads products, product variants, events, cart quotes, customer accounts, contribution forms and orders from the API. Orders are created with the API's required idempotency key and payment-method values. The admin app uses the API's admin sign-in, two-factor authentication, dashboard, products and orders endpoints.

The API documentation is available at https://lepara-api.onrender.com/api/docs. The API must allow the deployed storefront and admin origins in its CORS configuration for browser requests and refresh cookies to work.