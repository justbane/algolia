# Kafka Data Ingestion Service

Python service for consuming product update messages from Kafka and uploading to Algolia in real-time.

## Overview

This service handles ingestion from the Kafka topic which:

- **Real-time Updates**: Receives product parameter updates as they happen
- **Third-party Source**: Messages come from disconnected external system
- **Enrichment Data**: Provides ratings, URLs, shipping info, and other metadata
- **Sync Issues**: Known to have occasional synchronization delays

## Architecture

```
┌────────────────┐
│  Kafka Topic   │
│ product-updates│
│  (Real-time)   │
└───────┬────────┘
        │
        │ Consumer Group
        │ Concurrent Processing
        ▼
┌────────────────┐
│kafka_consumer.py│
│  Parse & Batch │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│    Algolia     │
│  (Batch 100)   │
└────────────────┘
```

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Algolia Python Client v3.x (installed via requirements.txt)
- Access to Kafka broker (for production mode)
- Algolia account and API keys

**Note**: This service uses Algolia Python Client v3.x for stability and compatibility.

## Installation

1. **Install dependencies:**
   ```bash
   cd data-ingestion
   pip install -r requirements.txt
   ```
   
   This installs:
   - `algoliasearch` v3.x (Python client)
   - `python-dotenv` (environment variables)
   - `kafka-python` (Kafka consumer - optional for demo mode)

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

4. **Configure Kafka connection (for production):**
   ```env
   KAFKA_MODE=PRODUCTION
   KAFKA_BOOTSTRAP_SERVERS=kafka-broker:9092
   KAFKA_TOPIC=product-updates
   KAFKA_GROUP_ID=algolia-indexer
   ```

## Usage

### Demo Mode (Default)

Reads from sample file without Kafka connection. Uses the sample `kafka message.json` file in the `data-ingestion` folder:

```bash
python kafka_consumer.py
```

**What happens in demo mode:**
- Reads from `kafka message.json` in the same directory
- Parses the Kafka message format
- Uploads to Algolia
- No Kafka broker required

### Production Mode

Connects to Kafka broker and consumes messages:

```env
# Set in .env
KAFKA_MODE=PRODUCTION
KAFKA_BOOTSTRAP_SERVERS=kafka-broker-1:9092,kafka-broker-2:9092
```

```bash
python kafka_consumer.py
```

The consumer will run continuously until stopped with Ctrl+C.

## How It Works

### 1. Kafka Consumption

The service connects to Kafka and consumes messages from the `product-updates` topic:

```python
consumer = KafkaConsumer(
    'product-updates',
    group_id='algolia-indexer',
    auto_offset_reset='latest'  # Only new messages
)

for message in consumer:
    product = message.value
    # Process and upload
```

### 2. Batching

Messages are batched for efficient Algolia uploads:

```python
batch_size = 100  # Configurable

# Collect messages until batch is full
batch.append(product)

if len(batch) >= batch_size:
    upload_to_algolia(batch)
    batch = []
```

### 3. Real-time Upload

Batches are uploaded to Algolia as they fill:

```python
# Algolia v3.x API
response = algolia_index.save_objects(products)

# Response is an IndexingResponse object with raw_responses
task_id = response.raw_responses[-1]['taskID']
algolia_index.wait_task(task_id)
```

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KAFKA_MODE` | `DEMO` | `DEMO` or `PRODUCTION` |
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | Kafka broker addresses (comma-separated) |
| `KAFKA_TOPIC` | `product-updates` | Kafka topic name |
| `KAFKA_GROUP_ID` | `algolia-indexer` | Consumer group ID |
| `BATCH_SIZE` | `100` | Number of messages to batch |
| `ALGOLIA_APP_ID` | - | Required: Algolia application ID |
| `ALGOLIA_API_KEY` | - | Required: Algolia admin API key |
| `ALGOLIA_INDEX_NAME` | `products` | Algolia index name |

### Optional Kafka Authentication

For secure Kafka clusters:

```env
KAFKA_SASL_MECHANISM=PLAIN
KAFKA_SASL_USERNAME=your_username
KAFKA_SASL_PASSWORD=your_password
KAFKA_SECURITY_PROTOCOL=SASL_SSL
```


## Kafka Message Format

Expected JSON message structure:

```json
{
    "objectID": "1696302",
    "name": "Product Name",
    "price": 69,
    "rating": 5,
    "popularity": 10000,
    "url": "https://www.example.com/product",
    "free_shipping": true,
    "type": "Electronics"
}
```

The service adds metadata:

```json
{
    ...original fields...,
    "_kafka_timestamp": "2024-01-15T10:30:00.123Z",
    "_kafka_offset": 12345,
    "_kafka_partition": 0
}
```

## Error Handling

The service includes comprehensive error handling:

1. **Connection Errors**: Retries Kafka connection
2. **Parse Errors**: Logs and continues with next message
3. **Upload Errors**: Logs error, message not lost (offset not committed)
4. **Shutdown**: Graceful shutdown on Ctrl+C, uploads remaining batch


## Production Deployment

### Running as Service

Use systemd on Linux:

```ini
# /etc/systemd/system/kafka-algolia.service
[Unit]
Description=Kafka to Algolia Consumer
After=network.target

[Service]
Type=simple
User=algolia
WorkingDirectory=/opt/algolia/data-ingestion
ExecStart=/usr/bin/python3 kafka_consumer.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable kafka-algolia
sudo systemctl start kafka-algolia
sudo systemctl status kafka-algolia
```

### Monitoring

Add monitoring for:
- Consumer lag (messages behind)
- Upload success rate
- Processing latency
- Error rate

```bash
# Check consumer lag
kafka-consumer-groups --bootstrap-server kafka:9092 \
  --describe --group algolia-indexer
```

### Scaling

Horizontal scaling with consumer groups:

1. Ensure topic has multiple partitions
2. Run multiple consumer instances (same group ID)
3. Kafka automatically distributes partitions

```bash
# Run 3 instances for parallel processing
for i in {1..3}; do
    python kafka_consumer.py &
done
```


**Note**: kafka-python is only required for production mode. Demo mode works without it.

## Testing

This service includes comprehensive unit tests using pytest.

### Running Tests

```bash
# Install test dependencies
pip install -r requirements.txt

# Run all tests
pytest

# Run with coverage report
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_merge_logic.py

# Run with verbose output
pytest -v

# Run only specific test
pytest tests/test_kafka_consumer.py::TestKafkaToAlgolia::test_initialization_success
```

### Test Structure

```
tests/
├── __init__.py
├── test_parsers.py          # Kafka message parser tests
├── test_merge_logic.py      # Source-of-truth merge tests (CRITICAL)
└── test_kafka_consumer.py   # Main consumer tests
```

### Test Coverage

The test suite covers:
- Kafka message parsing and validation
- **Source-of-truth merging** (catalog data never overwritten)
- Field enrichment (Kafka adds new fields only)
- Conflict avoidance (existing values preserved)
- Batch processing and chunking
- Demo mode file reading
- Algolia integration (mocked)
- Statistics tracking
- Error handling

### Key Test: Source-of-Truth Merging

The most critical tests verify that XML catalog data is **never** overwritten:

```python
def test_merge_preserves_existing_catalog_data():
    """Kafka enriches but never overwrites catalog fields."""
    existing = {'objectID': '1', 'name': 'Catalog Name', 'price': 100}
    kafka = {'objectID': '1', 'name': 'Kafka Name', 'rating': 5}
    
    # After merge:
    # - name stays 'Catalog Name' (not overwritten)
    # - price stays 100 (not overwritten)
    # - rating is 5 (new field added)
```

### Writing New Tests

Tests use pytest with mocking:

```python
from unittest.mock import MagicMock, patch

@patch('kafka_consumer.SearchClient.create')
def test_upload(mock_algolia):
    mock_index = MagicMock()
    mock_algolia.return_value.init_index.return_value = mock_index
    # ... test logic
```

## Development

### Integration Testing

```bash
# Test with sample file (demo mode)
KAFKA_MODE=DEMO python kafka_consumer.py
```

### Debugging

Enable verbose logging:

```python
# In kafka_consumer.py
logging.basicConfig(level=logging.DEBUG)
```

## File Structure

```
data-ingestion/
├── kafka_consumer.py       # Main consumer script
├── parsers/
│   ├── __init__.py
│   └── kafka_parser.py    # Kafka message parser
├── requirements.txt        # Python dependencies
├── .env.example           # Environment template
├── .gitignore            # Git ignore rules
└── README.md             # This file
```
