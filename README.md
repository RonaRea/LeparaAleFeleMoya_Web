# Lepara Ale Fele Moya Web

This workspace contains the React websites for the client project.

## Apps

- `apps/admin`: admin dashboard prototype implementation
- `apps/public`: public-facing website prototype implementation

## Commands

```bash
npm install
npm run dev:admin
npm run build:admin
npm run dev:public
npm run build:public
```

## API setup

Both apps now read from a single dummy bootstrap client per app. To point either app at a real backend later, create an `.env.local` file inside `apps/public` or `apps/admin` with:

```bash
VITE_API_BASE_URL=https://your-api.example.com
```

Then update the route strings in `apps/public/src/api.ts` or `apps/admin/src/api.ts`.

Both apps share the same request helper in `shared/api-client.ts`, so common fetch behavior only needs to be changed in one place.