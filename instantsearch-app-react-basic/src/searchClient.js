import { liteClient as algoliasearch } from 'algoliasearch/lite'

// The "lite" client is search-only and is all InstantSearch needs in the browser.
export const searchClient = algoliasearch(
  import.meta.env.VITE_ALGOLIA_APP_ID,
  import.meta.env.VITE_ALGOLIA_API_KEY
)

export const indexName = import.meta.env.VITE_ALGOLIA_INDEX_NAME
export const suggestionsIndexName = import.meta.env.VITE_ALGOLIA_SUGGESTIONS_INDEX_NAME
