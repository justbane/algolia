import { useEffect, useMemo, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { InstantSearch, Configure } from 'react-instantsearch'
import client, { indexName } from './algoliaClient'
import { stateMapping, parseSearchParams, serializeToSearch } from './routing'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Results from './components/Results'
import ProductDetail from './components/ProductDetail'
import CartPage from './components/CartPage'

function SearchLayout() {
  return (
    <div className="main-layout">
      <Sidebar />
      <Results />
    </div>
  )
}

/**
 * Wraps InstantSearch with a custom router that is driven by React Router.
 *
 * The default InstantSearch history router and React Router both listen to the
 * browser's `popstate` event independently. React Router processes it first,
 * re-mounting search widgets before InstantSearch can restore URL state —
 * leaving the UI out of sync with the URL on back-navigation.
 *
 * This component fixes that by using React Router's `useLocation` as the
 * source of truth: whenever React Router sees a URL change (including
 * back/forward), we forward it to InstantSearch's router callback so the two
 * are always in step.
 */
function InstantSearchProvider({ children }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Keep a stable ref to navigate so the router object never needs to change.
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  // Stable ref to the callback InstantSearch registers via router.onUpdate().
  const callbackRef = useRef(null)

  // Track whether we triggered this location change ourselves to avoid
  // feeding our own write() back in as an onUpdate() notification.
  const isWritingRef = useRef(false)

  const router = useMemo(
    () => ({
      /** Called on mount: read initial search state from the URL. */
      read() {
        if (window.location.pathname !== '/') return {}
        return parseSearchParams(window.location.search)
      },

      /** Called when InstantSearch state changes: push new URL via React Router. */
      write(routeState) {
        if (window.location.pathname !== '/') return
        const search = serializeToSearch(routeState)
        // Avoid a no-op navigate (which would still push a history entry).
        if ((window.location.search || '') === (search || '')) return
        isWritingRef.current = true
        navigateRef.current({ search }, { replace: false })
        // Clear the flag after this tick so the useEffect below won't echo.
        Promise.resolve().then(() => {
          isWritingRef.current = false
        })
      },

      createURL(routeState) {
        const search = serializeToSearch(routeState)
        return search ? `/${search}` : '/'
      },

      /** InstantSearch registers a callback here to be notified of URL changes. */
      onUpdate(callback) {
        callbackRef.current = callback
      },

      dispose() {
        callbackRef.current = null
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // created once; navigate is accessed via ref
  )

  /**
   * Whenever React Router's location changes (back, forward, or any Link
   * navigation), notify InstantSearch so it can re-hydrate from the URL.
   * Skip notifications for our own write() calls to prevent feedback loops.
   */
  useEffect(() => {
    if (location.pathname !== '/') return
    if (isWritingRef.current) return
    callbackRef.current?.(parseSearchParams(location.search))
  }, [location])

  const routing = useMemo(() => ({ router, stateMapping }), [router])

  return (
    <InstantSearch searchClient={client} indexName={indexName} insights routing={routing}>
      {/* <Configure
        optionalFilters={['brand:Apple<score=3>', 'brand:Samsung<score=2>', 'brand:-Huawei']}
        hitsPerPage={50}
      /> */}
      <Configure
        hitsPerPage={50}
      />
      {children}
    </InstantSearch>
  )
}

export default function App() {
  return (
    <InstantSearchProvider>
      <div className="app">
        <Header />
        <Routes>
          <Route path="/" element={<SearchLayout />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </div>
    </InstantSearchProvider>
  )
}
