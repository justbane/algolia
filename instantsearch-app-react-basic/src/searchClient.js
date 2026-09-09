import { liteClient as algoliasearch } from 'algoliasearch/lite'
import aa from 'search-insights'

// The "lite" client is search-only and is all InstantSearch needs in the browser.
export const searchClient = algoliasearch(
  import.meta.env.VITE_ALGOLIA_APP_ID,
  import.meta.env.VITE_ALGOLIA_API_KEY
)

// Powers the view/click/conversion events sent from <InstantSearch insights>
// and from the manual sendEvent() calls in ProductHit.
aa('init', {
  appId: import.meta.env.VITE_ALGOLIA_APP_ID,
  apiKey: import.meta.env.VITE_ALGOLIA_API_KEY,
  useCookie: true,
})

export { aa }

export const indexName = import.meta.env.VITE_ALGOLIA_INDEX_NAME
export const suggestionsIndexName = import.meta.env.VITE_ALGOLIA_SUGGESTIONS_INDEX_NAME
export const documentsIndexName = import.meta.env.VITE_ALGOLIA_DOCUMENTS_INDEX_NAME
export const docsSuggestionsIndexName = import.meta.env.VITE_ALGOLIA_DOCUMENTS_SUGGESTIONS_INDEX_NAME
