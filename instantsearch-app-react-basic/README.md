# Basic React InstantSearch demo

The smallest useful React InstantSearch setup for onboarding demos:

- **Autocomplete dropdown** (`@algolia/autocomplete-js`) with **Query Suggestions**
  and a short **product list** in the same panel.
- **Faceted sidebar** on the left (category, brand, price range, free-shipping toggle).
- **Product grid** with stats, current refinements, and pagination.

## 1. Configure credentials

```bash
cp .env.example .env
```

Then edit `.env`:

| Variable | Meaning |
| --- | --- |
| `VITE_ALGOLIA_APP_ID` | Your Algolia Application ID |
| `VITE_ALGOLIA_API_KEY` | A **Search-only** API key (safe for the browser) |
| `VITE_ALGOLIA_INDEX_NAME` | Index powering the product grid + facets |
| `VITE_ALGOLIA_SUGGESTIONS_INDEX_NAME` | A Query Suggestions index |

The committed defaults point at Algolia's public demo dataset (`latency` /
`instant_search`), so the app runs before you plug in your own application.

## 2. Install & run

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Where things live

| File | Responsibility |
| --- | --- |
| `src/searchClient.js` | Creates the search-only Algolia client from env vars |
| `src/App.jsx` | `<InstantSearch>` root: layout, `<Hits>`, `<Pagination>` |
| `src/components/Autocomplete.jsx` | Autocomplete dropdown + Query Suggestions plugin + product source, synced to InstantSearch |
| `src/components/Sidebar.jsx` | Facet widgets (`RefinementList`, `RangeInput`, `ToggleRefinement`) |
| `src/components/ProductHit.jsx` | One product card |

## Pointing at your own index

1. Set the four `.env` variables.
2. In the Algolia dashboard, mark the sidebar attributes
   (`categories`, `brand`, `price`, `free_shipping`) as **attributes for faceting**.
3. Adjust the field names in `Sidebar.jsx` and `ProductHit.jsx` to match your records.
