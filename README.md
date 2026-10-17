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

Both apps use the shared request client in `shared/` and load the same repository-level `.env` file. Set `VITE_API_BASE_URL` to the full API URL, including `/api/v1`, for example `https://lepara-api.onrender.com/api/v1`. Both development and production requests use this URL directly.

For Vercel, deploy the repository root as one project with the root `vercel.json`; it builds both apps and serves the storefront at `/` and admin at `/admin`. Configure `VITE_API_BASE_URL` in the Vercel project's environment (or make the shared `.env` available during the build). Because the browser connects to the API directly, the API must allow both local development and deployed website origins in `CORS_ORIGINS` for browser requests and refresh cookies to work.

The public app loads products, product variants, events, cart quotes, customer accounts, contribution forms and orders from the API. Orders are created with the API's required idempotency key and payment-method values. The admin app uses the API's admin sign-in and two-factor authentication, and manages dashboard data, products, stock variants, orders, and events. Product and event image uploads use the API's multipart image endpoints. The API does not support deleting products or events: products can be hidden from the shop and events move through Draft, Published, and Closed statuses instead.

The API documentation is available at https://lepara-api.onrender.com/api/docs. The API must allow the deployed storefront and admin origins in its CORS configuration for browser requests and refresh cookies to work.