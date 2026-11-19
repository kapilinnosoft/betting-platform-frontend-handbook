# Technology stack

Versions are **resolved** versions from each repo's committed `package-lock.json`, not the ranges in `package.json`. `OBSERVED`.

| Concern | rsplay-user (`810884b`) | vishnu7user (`6f3b811`) |
|---|---|---|
| Build tool | Vite 6.4.3 | Vite 6.4.1 |
| Language | TypeScript 5.9.3 | TypeScript 5.9.3 |
| UI library | React 18.3.1 | React 18.3.1 |
| Routing | react-router-dom 6.30.3 (`BrowserRouter`, routes in `App.tsx`) | react-router-dom 6.30.3 |
| Client state | Redux Toolkit 1.9.7 | Redux Toolkit 1.9.7 |
| Server state / fetching | RTK Query (bundled with RTK 1.9.7), `fetchBaseQuery` | RTK Query, `fetchBaseQuery` |
| Real-time | Polling only (no socket library) | Polling only |
| Styling | Tailwind CSS 3.4.17, Radix UI (`@radix-ui/react-dialog` 1.1.17) | Tailwind CSS 3.4.17 |
| Forms / validation | react-hook-form 7.71.1, zod 3.25.76 | react-hook-form 7.71.1, zod 3.25.76 |
| Notifications (toast) | react-hot-toast 2.6.0 | react-hot-toast 2.6.0 |
| Cookies | js-cookie 3.0.8 (only in the unused `src/apis/apiSlice.ts`) | js-cookie 3.0.5 (auth token storage) |
| Dates | dayjs 1.11.21, date-fns 4.4.0 | dayjs 1.11.19 |
| Carousels | swiper 12.2.0 | swiper 12.1.0 |
| i18n | i18next 26.4.2 (`src/i18n`) | — |
| Push notifications | firebase 12.19.0 (FCM) | — |
| PWA | Hand-registered `/sw.js` in `main.tsx` | vite-plugin-pwa 1.3.0 |
| HTTP client | `fetch` via `fetchBaseQuery`. No axios | `fetch` via `fetchBaseQuery`. No axios |

## Environment variables seen in the source

Names only; values are deployment configuration and are not recorded here.

| Variable | Used in | Effect |
|---|---|---|
| `VITE_API_BASE_URL` | `src/store/api/apiSlice.ts` (both) | API base URL, falling back to `'/api'` |
| `VITE_MAINTENANCE_MODE` | `src/App.tsx` (both) | `'true'` renders only the maintenance page |

Other `import.meta.env` variables (Firebase config and others) will be listed when the module that uses them is documented.

## Scripts

Both `package.json` files share the template script set: `dev`, `build`, `lint`, `lint:fix`, `lint:css`, `preview`, `test`, `test:watch`, `test:coverage`, `typecheck`, `format`, `format:check`, `prepare`, `quality`, `quality:quick`. vishnu7 also has `knip` (unused-code detection). Nothing was run for this documentation; it is a read-only analysis.
