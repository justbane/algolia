# Basic React InstantSearch demo

The smallest useful React InstantSearch setup for onboarding demos:

- **Autocomplete dropdown** (`@algolia/autocomplete-js`) with **Query Suggestions**,
  federated **product** and **document** results (two indices, one dropdown) in the
  same panel.
- **Faceted sidebar** on the left (category, brand, price range, free-shipping toggle).
- **Product grid** with stats, current refinements, and pagination.
- **Insights events** (view / click / add-to-cart) sent via `search-insights`.

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
| `VITE_ALGOLIA_DOCUMENTS_INDEX_NAME` | A second index (`documents_crawling`) federated into the autocomplete dropdown |

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
| `src/components/Autocomplete.jsx` | Autocomplete dropdown + Query Suggestions plugin + federated product/document sources, synced to InstantSearch |
| `src/components/Sidebar.jsx` | Facet widgets (`RefinementList`, `RangeInput`, `ToggleRefinement`) |
| `src/components/ProductHit.jsx` | One product card. Sends `click` and `conversion` (add-to-cart) insights events |

## Insights events

`src/searchClient.js` initializes `search-insights` (`aa`) with the app's credentials, and
`<InstantSearch insights>` in `App.jsx` turns on the insights middleware:

- **View** — sent automatically for every hit that renders in `<Hits>`.
- **Click** — sent manually from `ProductHit` when a card is clicked.
- **Add to cart** (conversion, `eventSubtype: 'addToCart'`) — sent manually from the
  "Add to Cart" button on each `ProductHit`.

Events require the index to have Click & Conversion Analytics enabled and appear in the
Algolia dashboard's Analytics tab / Events debugger.

## Pointing at your own index

1. Set the four `.env` variables.
2. In the Algolia dashboard, mark the sidebar attributes
   (`categories`, `brand`, `price`, `free_shipping`) as **attributes for faceting**.
3. Adjust the field names in `Sidebar.jsx` and `ProductHit.jsx` to match your records.
