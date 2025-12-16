# PHP Data Ingestion Service

PHP service for fetching product data from the internal PHP/SQL API and uploading to Algolia.

## Overview

This service handles ingestion from the PHP/SQL e-commerce system which has specific constraints:

- **Rate Limited**: Maximum 10 requests per second
- **Pagination**: Maximum 1000 results per request
- **Network**: Internal network only (requires VPN or internal access)

## Architecture

```
┌─────────────────┐
│  PHP/SQL API    │
│  (Internal)     │
└────────┬────────┘
         │ Rate Limited:
         │ - 1000 records/req
         │ - 10 req/s max
         ▼
┌─────────────────┐
│  index.php      │
│  Rate Limiter   │
│  Pagination     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Algolia      │
│  (10K/batch)    │
└─────────────────┘
```

## Prerequisites

- PHP 7.4 or higher
- Composer
- Access to internal PHP API (VPN if remote)
- Algolia account and API keys

## Installation

1. **Install dependencies:**
   ```bash
   cd php_data_ingestion
   composer install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Set Algolia credentials in `.env`:**
   ```env
   ALGOLIA_APP_ID=YOUR_APP_ID
   ALGOLIA_API_KEY=YOUR_ADMIN_API_KEY
   ALGOLIA_INDEX_NAME=products
   ```

4. **Configure PHP API access:**
   ```env
   PHP_API_URL=http://internal-api.company.local
   PHP_API_TIMEOUT=30
   ```

## Usage

### Run Ingestion

```bash
php index.php
```

Or using Composer:

```bash
composer ingest
```

### Demo Mode

If you don't have access to the actual PHP API, the script runs in demo mode and reads from the sample file (api response.json):

```env
PHP_API_URL=DEMO
```

### Product Load Mode

If need to load the initial product index, the script runs in product load mode and reads from the product list file (expected algoria payload.json):

```env
PHP_API_URL=PRODUCT_LOAD
```

This will use `./api response.json` as the data source.

## How It Works

### 1. Rate-Limited Fetching

The service respects PHP API constraints:

```php
// Rate limiter ensures max 10 req/s
$rateLimiter->wait();

// Fetch in batches of 1000
$response = $httpClient->get('/api/products', [
    'query' => [
        'limit' => 1000,
        'offset' => $offset
    ]
]);
```

### 2. Pagination

Automatically handles pagination until all products are fetched:

```
Page 1: Offset 0, Limit 1000 → 1000 products
Page 2: Offset 1000, Limit 1000 → 1000 products
Page 3: Offset 2000, Limit 1000 → 500 products (end)
```

### 3. Algolia Upload

Uploads in large batches (Algolia supports up to 10,000 records):

```php
// Algolia upload (no rate limit concerns)
$algoliaIndex->saveObjects($products);
```

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PHP_API_URL` | `DEMO` | PHP API base URL |
| `PHP_API_TIMEOUT` | `30` | HTTP timeout in seconds |
| `MAX_RESULTS_PER_REQUEST` | `1000` | PHP API batch size (constraint) |
| `MAX_REQUESTS_PER_SECOND` | `10` | PHP API rate limit (constraint) |
| `ALGOLIA_BATCH_SIZE` | `10000` | Algolia upload batch size |
| `ALGOLIA_APP_ID` | - | Required: Algolia application ID |
| `ALGOLIA_API_KEY` | - | Required: Algolia admin API key |
| `ALGOLIA_INDEX_NAME` | `products` | Algolia index name |


## Rate Limiting Details

### How Rate Limiting Works

```php
class RateLimiter {
    // Tracks last 10 calls within 1 second window
    // If limit reached, sleeps until window resets
}
```

**Example Timeline:**

```
0.0s: Request 1-10 (burst of 10)
0.1s: [RATE LIMIT] Sleep 0.9s
1.0s: Request 11-20 (next burst)
```

## Error Handling

The service includes comprehensive error handling:

1. **API Errors**: Retries up to 3 times with exponential backoff
2. **Network Errors**: Logged with full stack trace
3. **Algolia Errors**: Aborts with detailed error message

## Production Deployment

### Scheduling

Run hourly to sync with data updates:

```bash
# Cron job
0 * * * * cd /path/to/php_data_ingestion && php index.php >> ingestion.log 2>&1
```


## Testing

This service includes comprehensive unit tests using PHPUnit.

### Running Tests

```bash
# Install dev dependencies (includes PHPUnit)
composer install

# Run all tests
composer test

# Run with coverage report
composer test:coverage

# Run specific test file
./vendor/bin/phpunit tests/RateLimiterTest.php
```

### Test Structure

```
tests/
├── RateLimiterTest.php          # Rate limiting logic tests
└── PHPAPIIngestionTest.php      # Main service tests
```

### Test Coverage

The test suite covers:
- Rate limiting enforcement and timing
- Demo mode file reading
- Configuration loading and defaults
- Statistics tracking
- Batch processing logic
- Error handling


## Related Documentation

- [Node.js Ingestion](../node_data_ingestion/README.md)
- [Kafka Ingestion](../data-ingestion/README.md)

