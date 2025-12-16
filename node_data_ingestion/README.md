# Node.js Data Ingestion Service

Node.js service for fetching XML product catalog from the Node.js/MongoDB system and uploading to Algolia.

## Overview

This service handles ingestion from the Node.js/MongoDB system which:

- **Updates Hourly**: XML catalog is regenerated every hour
- **Source of Truth**: Contains authoritative product data
- **Secure Access**: Requires authentication to access catalog URL

## Architecture

```
┌──────────────────┐
│ Node.js/MongoDB  │
│  XML Catalog     │
│  (Hourly Update) │
└────────┬─────────┘
         │
         │ HTTPS with Auth
         │ Updated every hour
         ▼
┌──────────────────┐
│   index.js       │
│   XML Parser     │
│   Transform      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    Algolia       │
│  (10K/batch)     │
└──────────────────┘
```

## Prerequisites

- Node.js 14.0 or higher
- npm or yarn
- Algolia Node.js Client v4.x (installed via package.json)
- Access to XML catalog URL (for production mode)
- Algolia account and API keys

**Note**: This service uses Algolia Node.js Client v4.x.

## Installation

1. **Install dependencies:**
   ```bash
   cd node_data_ingestion
   npm install
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

4. **Configure XML catalog access:**
   ```env
   XML_CATALOG_URL=https://secure-catalog.company.com/products.xml
   XML_CATALOG_USERNAME=your_username
   XML_CATALOG_PASSWORD=your_password
   ```

## Usage

### Run Ingestion

```bash
npm start
```

Or:

```bash
node index.js
```

### Demo Mode

If you don't have access to the actual XML catalog, the script runs in demo mode:

```env
XML_CATALOG_URL=DEMO
```

This will use `xml output.xml` in the `node_data_ingestion` folder (same directory as the script).

**Demo mode behavior:**
- Reads from local `xml output.xml` file
- No authentication required
- Perfect for testing and development

## How It Works

### 1. Fetch XML Catalog

The service fetches the complete XML catalog via HTTPS:

```javascript
const response = await axios.get(xmlCatalogUrl, {
    timeout: 300000, // 5 minutes for large files
    auth: { username, password }
});
```

### 2. Parse XML

Uses `fast-xml-parser` for efficient XML parsing:

```javascript
const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true
});
const data = parser.parse(xmlContent);
```

### 3. Transform Data

Converts XML structure to Algolia format:

```xml
<!-- XML Input -->
<row>
    <name>Product Name</name>
    <price>99.99</price>
    <categories>Electronics</categories>
    <categories>Cameras</categories>
</row>
```

```javascript
// Algolia Output
{
    name: "Product Name",
    price: 99.99,
    price_range: "50 - 100",
    categories: ["Electronics", "Cameras"],
    objectID: "12345"
}
```

### 4. Upload to Algolia

Uploads in large batches (up to 10,000 records):

```javascript
// Algolia v4.x API
const response = await algoliaIndex.saveObjects(products);

// Response structure:
// {
//   taskIDs: [12345, 67890],  // Array of task IDs
//   objectIDs: ['id1', 'id2']  // Array of object IDs
// }

// Wait for completion
await algoliaIndex.waitTask(response.taskIDs[response.taskIDs.length - 1]);
```

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `XML_CATALOG_URL` | `DEMO` | URL to XML catalog |
| `XML_CATALOG_TIMEOUT` | `300000` | HTTP timeout (5 min for large files) |
| `XML_CATALOG_USERNAME` | - | Optional: HTTP basic auth username |
| `XML_CATALOG_PASSWORD` | - | Optional: HTTP basic auth password |
| `ALGOLIA_APP_ID` | - | Required: Algolia application ID |
| `ALGOLIA_API_KEY` | - | Required: Algolia admin API key |
| `ALGOLIA_INDEX_NAME` | `products` | Algolia index name |
| `ALGOLIA_BATCH_SIZE` | `10000` | Upload batch size |

## Output

Expected console output:

```
Node.js XML Catalog Ingestion Service Initialized
================================================
XML Catalog URL: DEMO
Algolia Index: products
Batch Size: 10000
================================================

Fetching XML catalog
  - Reading from sample file
  - Read 1234 bytes

Parsing XML
  - Found 1 products in XML
  - Successfully transformed 1 products

Uploading 1 products to Algolia
  - Uploading in 1 batch(es)
  - Uploading batch 1/1 (1 records)...
  - Indexing complete
  - Successfully uploaded 1 products

================================================
INGESTION COMPLETE
================================================
Duration: 2.34s
Products Processed: 1
Products Uploaded: 1
Errors: 0
================================================
```

## XML Format

### Expected Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<root>
    <row>
        <name>Product Name</name>
        <description>Product description</description>
        <brand>Brand Name</brand>
        <categories>Category 1</categories>
        <categories>Category 2</categories>
        <hierarchicalCategories>
            <lvl0>Top Level</lvl0>
            <lvl1>Top Level > Sub Level</lvl1>
            <lvl2>Top Level > Sub Level > Detail</lvl2>
        </hierarchicalCategories>
        <type>Product Type</type>
        <price>99.99</price>
        <price_range>50 - 100</price_range>
        <image>https://cdn.example.com/image.jpg</image>
        <url>https://www.example.com/product</url>
        <free_shipping>true</free_shipping>
        <popularity>5000</popularity>
        <rating>4</rating>
        <objectID>12345</objectID>
    </row>
    <!-- More rows... -->
</root>
```

### Field Transformations

| XML Field | Algolia Field | Transformation |
|-----------|---------------|----------------|
| `price` | `price` | String → Number |
| `rating` | `rating` | String → Integer |
| `popularity` | `popularity` | String → Integer |
| `free_shipping` | `free_shipping` | String → Boolean |
| `categories` | `categories` | Single/Array |
| `hierarchicalCategories` | `hierarchicalCategories` | Object with lvl0, lvl1, etc. |

## Error Handling

The service includes comprehensive error handling:

1. **XML Fetch Errors**: Network timeouts, auth failures
2. **Parse Errors**: Malformed XML
3. **Transformation Errors**: Missing required fields
4. **Upload Errors**: Algolia API errors

## Production Deployment

### Scheduling

Run hourly to match XML catalog updates:

```bash
# Cron job (runs at 5 minutes past every hour)
5 * * * * cd /path/to/node_data_ingestion && node index.js >> ingestion.log 2>&1
```

### Monitoring

Add monitoring for:
- Execution duration (alert if > 10 minutes)
- Product count (alert if 0 or drops significantly)
- Parse errors (alert if > 1%)
- Upload success rate

### Performance

For large catalogs (100K+ products):
- Increase `XML_CATALOG_TIMEOUT` if needed
- Consider streaming XML parser for memory efficiency
- Monitor memory usage

## Related Documentation

- [PHP Ingestion](../php_data_ingestion/README.md)
- [Kafka Ingestion](../data-ingestion/README.md)
