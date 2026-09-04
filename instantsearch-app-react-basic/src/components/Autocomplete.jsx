import {
  createElement,
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createRoot } from 'react-dom/client'
import { usePagination, useSearchBox } from 'react-instantsearch'
import { autocomplete, getAlgoliaResults } from '@algolia/autocomplete-js'
import { createQuerySuggestionsPlugin } from '@algolia/autocomplete-plugin-query-suggestions'

import { searchClient, indexName, suggestionsIndexName } from '../searchClient'

// This is the standard Algolia recipe for wiring the standalone Autocomplete
// dropdown (query suggestions + product hits) to a React InstantSearch page:
// the dropdown owns the input, and every query change is pushed into
// InstantSearch so the product grid and facets update.
export function Autocomplete(props) {
  const { query, refine: setInstantSearchQuery } = useSearchBox()
  const { refine: setPage } = usePagination()

  const containerRef = useRef(null)
  const panelRootRef = useRef(null)
  const rootRef = useRef(null)

  const [autocompleteQuery, setAutocompleteQuery] = useState(query)

  // Push the dropdown's query into InstantSearch and reset to the first page.
  useEffect(() => {
    setInstantSearchQuery(autocompleteQuery)
    setPage(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autocompleteQuery])

  const plugins = useMemo(() => {
    const querySuggestionsPlugin = createQuerySuggestionsPlugin({
      searchClient,
      indexName: suggestionsIndexName,
      getSearchParams() {
        return { hitsPerPage: 5 }
      },
      transformSource({ source }) {
        return {
          ...source,
          // Selecting a suggestion just runs it as the search query.
          onSelect({ item }) {
            setAutocompleteQuery(item.query)
          },
        }
      },
    })

    return [querySuggestionsPlugin]
  }, [])

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const search = autocomplete({
      container: containerRef.current,
      placeholder: 'Search for products',
      openOnFocus: true,
      plugins,
      initialState: { query },
      onReset() {
        setAutocompleteQuery('')
      },
      onSubmit({ state }) {
        setAutocompleteQuery(state.query)
      },
      onStateChange({ prevState, state }) {
        if (prevState.query !== state.query) {
          setAutocompleteQuery(state.query)
        }
      },
      getSources({ query }) {
        if (!query) {
          return []
        }

        return [
          {
            sourceId: 'products',
            getItems() {
              return getAlgoliaResults({
                searchClient,
                queries: [
                  {
                    indexName,
                    query,
                    params: { hitsPerPage: 5 },
                  },
                ],
              })
            },
            onSelect({ item }) {
              setAutocompleteQuery(item.name)
            },
            templates: {
              header() {
                return <span className="aa-SourceHeaderTitle">Products</span>
              },
              item({ item, components }) {
                return (
                  <div className="aa-ItemWrapper">
                    <div className="aa-ItemContent">
                      <div className="aa-ItemIcon aa-ItemIcon--picture">
                        <img
                          src={item.image}
                          alt={item.name}
                          width="36"
                          height="36"
                        />
                      </div>
                      <div className="aa-ItemContentBody">
                        <div className="aa-ItemContentTitle">
                          <components.Highlight hit={item} attribute="name" />
                        </div>
                        <div className="aa-ItemContentDescription">
                          {item.brand} &middot; ${item.price}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              },
            },
          },
        ]
      },
      // Render Autocomplete's JSX templates with React.
      renderer: { createElement, Fragment, render: () => {} },
      render({ children }, root) {
        if (!panelRootRef.current || rootRef.current !== root) {
          rootRef.current = root
          panelRootRef.current?.unmount()
          panelRootRef.current = createRoot(root)
        }
        panelRootRef.current.render(children)
      },
      ...props,
    })

    return () => search.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plugins])

  return <div className="autocomplete" ref={containerRef} />
}
