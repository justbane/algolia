# Algolia Data Ingestion Services

Multi-language data ingestion architecture with three independent services (PHP, Node.js, and Python). Each service handles its respective data source and uploads directly to Algolia with comprehensive test coverage.

## Repository Structure

```
algolia/
├── php_data_ingestion/              # PHP Service
│   ├── index.php                   # Main ingestion script
│   ├── api response.json           # Sample data (demo mode)
│   ├── tests/                      # PHPUnit tests
│   │   ├── RateLimiterTest.php    # Rate limiting tests
│   │   └── PHPAPIIngestionTest.php # Main service tests
│   ├── phpunit.xml                 # PHPUnit configuration
│   ├── composer.json               # Dependencies + test scripts
│   ├── .env.example               # Configuration template
│   └── README.md                  # Complete documentation
│
├── node_data_ingestion/            # Node.js Service
│   ├── index.js                   # Main ingestion script
│   ├── xml output.xml             # Sample data (demo mode)
│   ├── __tests__/                 # Jest tests
│   │   ├── parser.test.js        # XML parser tests
│   │   └── XMLCatalogIngestion.test.js  # Main service tests
│   ├── jest.config.js             # Jest configuration
│   ├── package.json               # Dependencies + test scripts
│   ├── .env.example              # Configuration template
│   └── README.md                 # Complete documentation
│
├── kafka_data_ingestion/           # Python Service
│   ├── kafka_consumer.py          # Main consumer script
│   ├── kafka message.json         # Sample data (demo mode)
│   ├── parsers/
│   │   └── kafka_parser.py       # Message parser
│   ├── tests/                     # Pytest tests
│   │   ├── test_parsers.py       # Parser tests
│   │   ├── test_merge_logic.py   # Merge strategy tests (CRITICAL)
│   │   └── test_kafka_consumer.py # Main consumer tests
│   ├── pytest.ini                 # Pytest configuration
│   ├── requirements.txt           # Dependencies (includes test deps)
│   ├── .env.example              # Configuration template
│   └── README.md                 # Complete documentation
│
├── instantsearch-app/             # Search UI (InstantSearch.js)
│   ├── src/app.js                # Search configuration
│   ├── index.html                # Demo page
│   └── package.json              # Dependencies
│
└── algolia-solution-architect/    # Assignment reference materials
    ├── api response.json          # Sample API data
    ├── xml output.xml             # Sample catalog data
    └── kafka message.json         # Sample Kafka messages
```

## Assignment Overview

Design and implement a data integration solution that combines three systems:

1. **PHP/SQL E-commerce API** (Rate-limited, product IDs only)
2. **Node.js/MongoDB XML Catalog** (Source of truth, hourly updates)
3. **Kafka Topic** (Real-time updates, sync issues)

### Key Requirements

- Integrate three disparate data sources
- Language-native implementations (PHP, Node.js, Python)
- Independent services with direct Algolia uploads
- Handle rate limits and sync issues
- Production-only environment (no staging)
- Build demo search UI
- Comprehensive documentation


## Quick Start

### 1. PHP Data Ingestion (PHP/SQL API)

```bash
cd php_data_ingestion

# Install dependencies
composer install

# Configure credentials
cp .env.example .env
# Edit .env with your credentials

# Run ingestion
php index.php
```

### 2. Node.js Data Ingestion (XML Catalog)

```bash
cd node_data_ingestion

# Install dependencies
npm install

# Configure credentials
cp .env.example .env
# Edit .env with your credentials

# Run ingestion
node index.js
```

### 3. Python Data Ingestion (Kafka)

```bash
cd kafka_data_ingestion

# Install dependencies
pip install -r requirements.txt

# Configure credentials
cp .env.example .env
# Edit .env with your credentials

# Run consumer
python kafka_consumer.py
```

### 4. Search UI Demo

```bash
cd instantsearch-app

# Install dependencies
npm install  # or: yarn

# Start development server
npm start    # or: yarn start

# Open http://localhost:3000
```

## Testing

All services include comprehensive unit test suites with proper mocking and coverage.

### Run All Tests

```bash
# PHP Tests (11 tests, 26 assertions)
cd php_data_ingestion
composer install
composer test

# Node.js Tests (22 tests)
cd node_data_ingestion
npm install
npm test

# Python Tests (40+ tests)
cd kafka_data_ingestion
pip install -r requirements.txt
pytest
```

### Test Coverage Summary

| Service | Tests | Framework | Key Tests |
|---------|-------|-----------|-----------|
| **PHP** | 11 | PHPUnit | Rate limiting, API pagination, batch upload |
| **Node.js** | 22 | Jest | XML parsing, category transformation, batch upload |
| **Python** | 40+ | pytest | **Merge logic (critical)**, parser validation, consumer flow |

**Total: ~73 comprehensive unit tests**

### Demo Mode Testing

All services support **demo mode** using local sample files:
- No authentication or network access required
- Perfect for CI/CD pipelines
- Validates full ingestion flow

## Documentation

### Service-Specific Documentation

Each service has comprehensive documentation including testing instructions:

- **[PHP Ingestion README](php_data_ingestion/README.md)** - Rate-limited API with PHPUnit tests
- **[Node.js Ingestion README](node_data_ingestion/README.md)** - XML parsing with Jest tests
- **[Python Ingestion README](kafka_data_ingestion/README.md)** - Kafka consumer with pytest suite

## 🔧 Technical Implementation

### Multi-Language Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  PHP/SQL API    │     │ Node.js/MongoDB │     │  Kafka Topic    │
│                 │     │   XML Catalog   │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                        │
         ▼                       ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ PHP Service     │     │ Node.js Service │     │ Python Service  │
│ index.php       │     │ index.js        │     │kafka_consumer.py│
│ (Rate Limited)  │     │ (Hourly)        │     │ (Real-time)     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                        │
         └───────────────────────┴────────────────────────┘
                                 │
                          ┌──────▼──────┐
                          │   Algolia   │
                          │    Index    │
                          └─────────────┘
```

### Architecture Benefits

1. **Language-Native**: Each service uses the language of its source system
2. **Independent Deployment**: Services can be deployed/scaled separately
3. **Simpler Codebase**: No complex merge logic needed
4. **Team Autonomy**: Teams can work on their service independently

### Key Features

**Intelligent Merge Strategy**
- XML catalog is always the source of truth
- Kafka provides enrichment for missing fields
- All conflicts are logged for monitoring

**Conflict Resolution Example**

| Field | XML | Kafka | Result | Reason |
|-------|-----|-------|--------|--------|
| price | 70 | 69 | **70** | XML wins |
| rating | - | 5 | **5** | Enrichment |
| url | - | https://... | **https://...** | Enrichment |

**Production-Ready**
- Comprehensive error handling
- Detailed logging and monitoring
- Batch upload optimization
- Data validation before upload

## Data Sources

### 1. PHP/SQL API (`api response.json`)
Returns minimal product information:
```json
[
  {"name": "Product Name", "objectID": "1696302"}
]
```

### 2. XML Catalog (`xml output.xml`)
Complete product details (source of truth):
```xml
<row>
  <name>Product Name</name>
  <description>Full description</description>
  <price>70</price>
  <objectID>1696302</objectID>
</row>
```

### 3. Kafka Messages (`kafka message.json`)
Real-time updates with enrichment data:
```json
{
  "objectID": "1696302",
  "price": 69,
  "rating": 5,
  "url": "https://..."
}
```

## Search UI Features

The InstantSearch demo showcases:

- **Instant Search** with autocomplete
- **Hierarchical Faceting** for categories
- **Brand Filtering** with search
- **Price Range Slider**
- **Rating Filter**
- **Free Shipping Toggle**
- **Sort Options** (relevance, price, rating)
- **Responsive Design**

## Architecture Highlights

### Production (Things to consider)

**Rate Limiting**
- PHP API: 1000 records/request, 10 req/s max
- Implemented with exponential backoff

**Error Handling**
- Dead letter queue for failed messages
- Retry logic with circuit breakers
- Comprehensive logging

**Monitoring**
- Conflict tracking and alerting
- Kafka consumer lag monitoring
- Algolia upload metrics
- Data quality validation

**Zero-Downtime Deployment**
- Index versioning strategy
- Atomic alias switching
- Rollback procedures


## Security

- API credentials in environment variables
- .gitignore for sensitive files
- Algolia API key separation (Admin vs Search)
- Internal API network restrictions


## Testing

### Unit Tests

See individual ingestion modules read files for testing instructions.

## Dependencies

**Python (Data Ingestion)**
- algoliasearch >= 3.0.0
- python-dotenv >= 1.0.0
- Standard library: xml.etree, json, logging

**JavaScript (Search UI)**
- instantsearch.js
- algoliasearch
- (See instantsearch-app/package.json for complete list)

## Deployment

### Local Development
```bash
# Terminal 1: Run data ingestion
cd data-ingestion && python integrate_and_upload.py

# Terminal 2: Run UI
cd instantsearch-app && npm start
```

## Assessment Criteria Coverage

| Criterion | Implementation |
|-----------|---------------|
| **Data Integration Design** | ✅ Complete 3-system architecture |
| **Problem-Solving** | ✅ Conflict resolution, rate limiting, sync issues |
| **Technology Knowledge** | ✅ Python, XML parsing, Kafka, Algolia |
| **Error Handling** | ✅ Comprehensive logging, retries, validation |
| **Communication** | ✅ Detailed documentation, diagrams, comments |


## Useful Links

- [Algolia Documentation](https://www.algolia.com/doc/)
- [InstantSearch.js Guide](https://www.algolia.com/doc/guides/building-search-ui/what-is-instantsearch/js/)
- [Python Client Documentation](https://www.algolia.com/doc/api-client/getting-started/install/python/)


