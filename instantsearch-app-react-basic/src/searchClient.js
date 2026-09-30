import { liteClient as algoliasearch } from 'algoliasearch/lite'
import aa from 'search-insights'

// The "lite" client is search-only and is all InstantSearch needs in the browser.
export const searchClient = algoliasearch(
  import.meta.env.VITE_ALGOLIA_APP_ID,
  import.meta.env.VITE_ALGOLIA_API_KEY
)

// One stable token per browser, sent with every search and every event so
// Algolia can tie queries to clicks/conversions (Personalization, A/B tests,
// Click & Conversion analytics). Swap in your logged-in user's ID if you have one.
const USER_TOKEN_KEY = 'algolia-user-token'

function getOrCreateUserToken() {
  try {
    const existing = localStorage.getItem(USER_TOKEN_KEY)
    if (existing) {
      return existing
    }
    const token = `anonymous-${crypto.randomUUID()}`
    localStorage.setItem(USER_TOKEN_KEY, token)
    return token
  } catch {
    return `anonymous-${crypto.randomUUID()}`
  }
}

export const userToken = getOrCreateUserToken()

// Powers the view/click/conversion events sent from <InstantSearch insights>
// and from the manual sendEvent() calls in ProductHit.
aa('init', {
  appId: import.meta.env.VITE_ALGOLIA_APP_ID,
  apiKey: import.meta.env.VITE_ALGOLIA_API_KEY,
  userToken
})

export { aa }

export const indexName = import.meta.env.VITE_ALGOLIA_INDEX_NAME
export const suggestionsIndexName = import.meta.env.VITE_ALGOLIA_SUGGESTIONS_INDEX_NAME
export const documentsIndexName = import.meta.env.VITE_ALGOLIA_DOCUMENTS_INDEX_NAME
export const docsSuggestionsIndexName = import.meta.env.VITE_ALGOLIA_DOCUMENTS_SUGGESTIONS_INDEX_NAME
