const { algoliasearch, instantsearch } = window;

const searchClient = algoliasearch(
  'YFA7GQ7VGK',
  '2b4ad902b9ec9bef3004caaa4b866eb5'
);

const search = instantsearch({
  indexName: 'products',
  searchClient,
  future: { preserveSharedStateOnUnmount: true },
});

search.addWidgets([
  // Search box with placeholder
  instantsearch.widgets.searchBox({
    container: '#searchbox',
    placeholder: 'Search for products...',
    showSubmit: false,
    showReset: true,
  }),

  // Clear refinements button
  instantsearch.widgets.clearRefinements({
    container: '#clear-refinements',
  }),

  // Hierarchical categories menu
  instantsearch.widgets.hierarchicalMenu({
    container: '#hierarchical-categories',
    attributes: [
      'hierarchicalCategories.lvl0',
      'hierarchicalCategories.lvl1',
      'hierarchicalCategories.lvl2',
    ],
  }),

  // Brand refinement list
  instantsearch.widgets.refinementList({
    container: '#brand-list',
    attribute: 'brand',
    searchable: true,
    showMore: true,
    limit: 10,
    showMoreLimit: 50,
  }),

  // Price range slider
  instantsearch.widgets.rangeSlider({
    container: '#price-range',
    attribute: 'price',
    tooltips: {
      format: (value) => `$${Math.round(value)}`,
    },
  }),

  // Rating filter
  instantsearch.widgets.ratingMenu({
    container: '#rating-menu',
    attribute: 'rating',
    max: 5,
  }),

  // Free shipping toggle
  instantsearch.widgets.toggleRefinement({
    container: '#free-shipping',
    attribute: 'free_shipping',
    on: true,
    templates: {
      labelText: '{{ #isRefined }}✓{{ /isRefined }} Free Shipping',
    },
  }),

  // Sort by dropdown
  instantsearch.widgets.sortBy({
    container: '#sort-by',
    items: [
      { label: 'Relevance', value: 'products' },
      { label: 'Price: Low to High', value: 'products_price_asc' },
      { label: 'Price: High to Low', value: 'products_price_desc' },
      { label: 'Rating: High to Low', value: 'products_rating_desc' },
    ],
  }),

  // Stats display
  instantsearch.widgets.stats({
    container: '#stats',
  }),

  // Hits with product template
  instantsearch.widgets.hits({
    container: '#hits',
    templates: {
      item: (hit, { html, components }) => html`
        <article class="hit">
          <div class="hit-image">
            <img src="${hit.image || '/placeholder.png'}" alt="${hit.name}" />
          </div>
          <div class="hit-content">
            <h3>${components.Highlight({ hit, attribute: 'name' })}</h3>
            <p class="hit-description">${hit.description || ''}</p>
            <div class="hit-details">
              <span class="hit-brand">${hit.brand || ''}</span>
              ${hit.rating ? html`<span class="hit-rating">⭐ ${hit.rating}/5</span>` : ''}
            </div>
            <div class="hit-footer">
              <span class="hit-price">$${hit.price}</span>
              ${hit.free_shipping ? html`<span class="hit-shipping">🚚 Free Shipping</span>` : ''}
            </div>
          </div>
        </article>
      `,
    },
  }),

  // Configure hits per page
  instantsearch.widgets.configure({
    hitsPerPage: 12,
    attributesToSnippet: ['description:50'],
  }),

  // Pagination
  instantsearch.widgets.pagination({
    container: '#pagination',
  }),
]);

search.start();
