import { indexName } from './algoliaClient'

// ─── URL serialization helpers ──────────────────────────────────────────────

// Parses "?brand[0]=Samsung&brand[1]=Apple&q=phone" → { brand: ['Samsung','Apple'], q: 'phone' }
export function parseSearchParams(search) {
  const params = new URLSearchParams(search)
  const result = {}
  for (const [key, value] of params.entries()) {
    const arrayMatch = key.match(/^(.+)\[(\d+)\]$/)
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch
      if (!Array.isArray(result[arrayKey])) result[arrayKey] = []
      result[arrayKey][Number(index)] = value
    } else {
      result[key] = value
    }
  }
  return result
}

// Serializes { brand: ['Samsung'], q: 'phone' } → "?brand[0]=Samsung&q=phone"
export function serializeToSearch(routeState) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(routeState)) {
    if (value == null) continue
    if (Array.isArray(value)) {
      value.forEach((v, i) => params.append(`${key}[${i}]`, String(v)))
    } else {
      params.set(key, String(value))
    }
  }
  const str = params.toString()
  return str ? `?${str}` : ''
}

// ─── State mapping: InstantSearch uiState ↔ URL route state ─────────────────

export const stateMapping = {
  stateToRoute(uiState) {
    const s = uiState[indexName] || {}
    const route = {}

    if (s.query) route.q = s.query
    if (s.refinementList?.brand?.length) route.brand = s.refinementList.brand
    if (s.refinementList?.categories?.length) route.category = s.refinementList.categories
    if (s.refinementList?._collections?.length) route.collection = s.refinementList._collections

    const price = s.range?.price
    if (price?.min != null) route.minPrice = price.min
    if (price?.max != null) route.maxPrice = price.max

    if (s.toggle?.free_shipping) route.freeShipping = '1'
    if (s.page > 1) route.page = s.page
    if (s.sortBy) route.sortBy = s.sortBy
    if (s.hitsPerPage) route.hitsPerPage = s.hitsPerPage

    return route
  },

  routeToState(routeState) {
    const s = {}

    if (routeState.q) s.query = routeState.q

    const refinementList = {}
    if (routeState.brand) refinementList.brand = [].concat(routeState.brand)
    if (routeState.category) refinementList.categories = [].concat(routeState.category)
    if (routeState.collection) refinementList._collections = [].concat(routeState.collection)
    if (Object.keys(refinementList).length) s.refinementList = refinementList

    if (routeState.minPrice != null || routeState.maxPrice != null) {
      s.range = {
        price: {
          min: routeState.minPrice != null ? Number(routeState.minPrice) : undefined,
          max: routeState.maxPrice != null ? Number(routeState.maxPrice) : undefined,
        },
      }
    }

    if (routeState.freeShipping) s.toggle = { free_shipping: true }
    if (routeState.page) s.page = Number(routeState.page)
    if (routeState.sortBy) s.sortBy = routeState.sortBy
    if (routeState.hitsPerPage) s.hitsPerPage = Number(routeState.hitsPerPage)

    return { [indexName]: s }
  },
}
