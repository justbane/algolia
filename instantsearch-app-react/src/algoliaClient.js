import { algoliasearch } from 'algoliasearch'
import aa from 'search-insights'

const client = algoliasearch(
  import.meta.env.VITE_ALGOLIA_APP_ID,
  import.meta.env.VITE_ALGOLIA_API_KEY
)

aa('init', {
  appId: import.meta.env.VITE_ALGOLIA_APP_ID,
  apiKey: import.meta.env.VITE_ALGOLIA_API_KEY,
  useCookie: true,
})

export const indexName = import.meta.env.VITE_ALGOLIA_INDEX_NAME
export { aa }
export default client
