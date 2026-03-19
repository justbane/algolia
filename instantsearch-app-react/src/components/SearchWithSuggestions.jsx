import { useEffect, useRef, useMemo } from 'react'
import { autocomplete } from '@algolia/autocomplete-js'
import { createQuerySuggestionsPlugin } from '@algolia/autocomplete-plugin-query-suggestions'
import { useSearchBox } from 'react-instantsearch'
import client from '../algoliaClient'

export default function SearchWithSuggestions() {
  const containerRef = useRef(null)
  const { refine } = useSearchBox()
  const refineRef = useRef(refine)

  useEffect(() => {
    refineRef.current = refine
  }, [refine])

  const suggestionsPlugin = useMemo(
    () =>
      createQuerySuggestionsPlugin({
        searchClient: client,
        indexName: import.meta.env.VITE_ALGOLIA_SUGGESTIONS_INDEX_NAME,
        getSearchParams() {
          return { hitsPerPage: 5 }
        },
      }),
    []
  )

  useEffect(() => {
    if (!containerRef.current) return

    const search = autocomplete({
      container: containerRef.current,
      placeholder: 'Search electronics…',
      plugins: [suggestionsPlugin],
      onStateChange({ state }) {
        refineRef.current(state.query)
      },
      openOnFocus: true,
    })

    return () => search.destroy()
  }, [suggestionsPlugin])

  return <div ref={containerRef} />
}
