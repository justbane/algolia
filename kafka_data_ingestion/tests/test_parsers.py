"""Tests for Kafka message parsers."""

import json
import pytest
from pathlib import Path
from datetime import datetime
import sys
import os

# Add parent directory to path to import parsers
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from parsers.kafka_parser import parse_kafka_messages, extract_kafka_only_fields


class TestKafkaParser:
    """Test suite for Kafka message parsing."""

    @pytest.fixture
    def sample_kafka_messages(self, tmp_path):
        """Create a temporary Kafka messages file."""
        messages = [
            {
                "objectID": "1696302",
                "name": "Product 1",
                "price": 69,
                "rating": 5,
                "free_shipping": True
            },
            {
                "objectID": "1696303",
                "name": "Product 2",
                "popularity": 1000,
                "url": "https://example.com/product2"
            }
        ]
        
        file_path = tmp_path / "test_kafka.json"
        with open(file_path, 'w') as f:
            json.dump(messages, f)
        
        return str(file_path)

    def test_parse_kafka_messages_success(self, sample_kafka_messages):
        """Test successful parsing of Kafka messages."""
        result = parse_kafka_messages(sample_kafka_messages)
        
        assert isinstance(result, dict)
        assert len(result) == 2
        assert "1696302" in result
        assert "1696303" in result

    def test_parse_kafka_messages_adds_metadata(self, sample_kafka_messages):
        """Test that parser adds processing metadata."""
        result = parse_kafka_messages(sample_kafka_messages)
        
        for objectID, message in result.items():
            assert '_kafka_processed_at' in message
            # Verify it's a valid ISO timestamp
            datetime.fromisoformat(message['_kafka_processed_at'])

    def test_parse_kafka_messages_preserves_data(self, sample_kafka_messages):
        """Test that all original fields are preserved."""
        result = parse_kafka_messages(sample_kafka_messages)
        
        product1 = result["1696302"]
        assert product1['name'] == 'Product 1'
        assert product1['price'] == 69
        assert product1['rating'] == 5
        assert product1['free_shipping'] is True

    def test_parse_kafka_messages_handles_missing_objectid(self, tmp_path):
        """Test handling of messages without objectID."""
        messages = [
            {"name": "Product without ID"},
            {"objectID": "123", "name": "Valid product"}
        ]
        
        file_path = tmp_path / "test_kafka.json"
        with open(file_path, 'w') as f:
            json.dump(messages, f)
        
        result = parse_kafka_messages(str(file_path))
        
        # Should only include the valid product
        assert len(result) == 1
        assert "123" in result

    def test_parse_kafka_messages_empty_file(self, tmp_path):
        """Test parsing an empty Kafka messages file."""
        file_path = tmp_path / "empty.json"
        with open(file_path, 'w') as f:
            json.dump([], f)
        
        result = parse_kafka_messages(str(file_path))
        
        assert isinstance(result, dict)
        assert len(result) == 0

    def test_parse_kafka_messages_invalid_json(self, tmp_path):
        """Test handling of invalid JSON."""
        file_path = tmp_path / "invalid.json"
        with open(file_path, 'w') as f:
            f.write("not valid json")
        
        with pytest.raises(json.JSONDecodeError):
            parse_kafka_messages(str(file_path))

    def test_parse_kafka_messages_missing_file(self):
        """Test handling of missing file."""
        with pytest.raises(FileNotFoundError):
            parse_kafka_messages("/nonexistent/file.json")


class TestExtractKafkaOnlyFields:
    """Test suite for extracting Kafka-only enrichment fields."""

    def test_extract_all_kafka_fields(self):
        """Test extraction of all Kafka-only fields."""
        kafka_data = {
            "objectID": "123",
            "name": "Product",
            "type": "electronics",
            "price_range": "$50-$100",
            "url": "https://example.com/product",
            "free_shipping": True,
            "popularity": 500,
            "rating": 4.5,
            "description": "This is not Kafka-only"
        }
        
        result = extract_kafka_only_fields(kafka_data)
        
        assert result['type'] == 'electronics'
        assert result['price_range'] == '$50-$100'
        assert result['url'] == 'https://example.com/product'
        assert result['free_shipping'] is True
        assert result['popularity'] == 500
        assert result['rating'] == 4.5
        
        # Should not include non-Kafka fields
        assert 'objectID' not in result
        assert 'name' not in result
        assert 'description' not in result

    def test_extract_partial_kafka_fields(self):
        """Test extraction when only some Kafka fields are present."""
        kafka_data = {
            "objectID": "123",
            "rating": 4,
            "free_shipping": False
        }
        
        result = extract_kafka_only_fields(kafka_data)
        
        assert len(result) == 2
        assert result['rating'] == 4
        assert result['free_shipping'] is False

    def test_extract_no_kafka_fields(self):
        """Test extraction when no Kafka-only fields are present."""
        kafka_data = {
            "objectID": "123",
            "name": "Product",
            "price": 99
        }
        
        result = extract_kafka_only_fields(kafka_data)
        
        assert isinstance(result, dict)
        assert len(result) == 0

    def test_extract_empty_data(self):
        """Test extraction from empty data."""
        result = extract_kafka_only_fields({})
        
        assert isinstance(result, dict)
        assert len(result) == 0

    def test_extract_preserves_data_types(self):
        """Test that data types are preserved during extraction."""
        kafka_data = {
            "type": "electronics",
            "price_range": "$50-$100",
            "free_shipping": True,
            "popularity": 500,
            "rating": 4.5
        }
        
        result = extract_kafka_only_fields(kafka_data)
        
        assert isinstance(result['type'], str)
        assert isinstance(result['price_range'], str)
        assert isinstance(result['free_shipping'], bool)
        assert isinstance(result['popularity'], int)
        assert isinstance(result['rating'], float)

    def test_extract_with_null_values(self):
        """Test extraction when Kafka fields have null values."""
        kafka_data = {
            "objectID": "123",
            "type": None,
            "rating": None,
            "url": "https://example.com"
        }
        
        result = extract_kafka_only_fields(kafka_data)
        
        # Should include fields even if they're None
        assert 'type' in result
        assert result['type'] is None
        assert 'rating' in result
        assert result['rating'] is None
        assert result['url'] == 'https://example.com'
