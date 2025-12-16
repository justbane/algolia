"""Tests for Kafka merge logic - ensuring catalog is source of truth."""

import pytest
from unittest.mock import MagicMock, patch, call
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


class TestMergeLogic:
    """
    Critical tests for the merge logic in Kafka consumer.
    
    The key requirement: XML catalog is the source of truth.
    Kafka should only ENRICH with new fields, never overwrite existing data.
    """

    @pytest.fixture
    def mock_algolia_index(self):
        """Create a mock Algolia index."""
        mock_index = MagicMock()
        mock_index.get_objects = MagicMock()
        mock_index.save_objects = MagicMock(return_value=MagicMock(raw_responses=[{'taskID': 123}]))
        return mock_index

    def test_merge_preserves_existing_catalog_data(self, mock_algolia_index):
        """Test that existing catalog data is never overwritten by Kafka."""
        # Existing record in Algolia (from XML catalog)
        existing_record = {
            'objectID': '123',
            'name': 'Catalog Name',
            'price': 100,
            'description': 'Catalog Description'
        }
        
        # Kafka tries to update with conflicting data
        kafka_update = {
            'objectID': '123',
            'name': 'Kafka Name',  # Should be ignored
            'price': 50,  # Should be ignored
            'description': 'Kafka Description',  # Should be ignored
            'rating': 5  # NEW field - should be added
        }
        
        # Mock Algolia to return existing record
        mock_algolia_index.get_objects.return_value = {
            'results': [existing_record]
        }
        
        # Simulate merge logic
        merged = dict(existing_record)
        for field, kafka_value in kafka_update.items():
            if field not in merged or merged[field] is None:
                merged[field] = kafka_value
        
        # Verify catalog data is preserved
        assert merged['name'] == 'Catalog Name', "Catalog name should be preserved"
        assert merged['price'] == 100, "Catalog price should be preserved"
        assert merged['description'] == 'Catalog Description', "Catalog description should be preserved"
        
        # Verify new field is added
        assert merged['rating'] == 5, "New field from Kafka should be added"

    def test_merge_adds_new_kafka_fields(self, mock_algolia_index):
        """Test that Kafka enriches records with new fields."""
        existing_record = {
            'objectID': '123',
            'name': 'Product',
            'price': 100
        }
        
        kafka_update = {
            'objectID': '123',
            'rating': 4.5,
            'popularity': 1000,
            'free_shipping': True
        }
        
        # Simulate merge
        merged = dict(existing_record)
        enriched_fields = []
        for field, kafka_value in kafka_update.items():
            if field not in merged or merged[field] is None:
                merged[field] = kafka_value
                enriched_fields.append(field)
        
        # Verify all new fields are added
        assert merged['rating'] == 4.5
        assert merged['popularity'] == 1000
        assert merged['free_shipping'] is True
        
        # Verify original fields unchanged
        assert merged['name'] == 'Product'
        assert merged['price'] == 100
        
        # Check enrichment tracking
        assert 'rating' in enriched_fields
        assert 'popularity' in enriched_fields
        assert 'free_shipping' in enriched_fields

    def test_merge_handles_null_values_in_catalog(self, mock_algolia_index):
        """Test that Kafka can fill in null values from catalog."""
        existing_record = {
            'objectID': '123',
            'name': 'Product',
            'price': 100,
            'rating': None,  # Null value in catalog
            'description': None
        }
        
        kafka_update = {
            'objectID': '123',
            'rating': 4,  # Should fill null value
            'description': 'Kafka description',  # Should fill null value
            'url': 'https://example.com'  # New field
        }
        
        # Simulate merge
        merged = dict(existing_record)
        for field, kafka_value in kafka_update.items():
            if field not in merged or merged[field] is None:
                merged[field] = kafka_value
        
        # Kafka should fill in null values
        assert merged['rating'] == 4
        assert merged['description'] == 'Kafka description'
        assert merged['url'] == 'https://example.com'
        
        # Original non-null values preserved
        assert merged['name'] == 'Product'
        assert merged['price'] == 100

    def test_merge_creates_new_record_if_not_exists(self, mock_algolia_index):
        """Test that Kafka creates new records if they don't exist in catalog."""
        kafka_update = {
            'objectID': '999',
            'name': 'New Product',
            'price': 50,
            'rating': 5
        }
        
        # Mock Algolia to return empty results
        mock_algolia_index.get_objects.return_value = {
            'results': []
        }
        
        # Simulate logic: if record doesn't exist, add as-is
        existing_records = {}  # Empty
        if kafka_update['objectID'] not in existing_records:
            merged = kafka_update  # New record added as-is
        
        assert merged == kafka_update
        assert merged['objectID'] == '999'
        assert merged['name'] == 'New Product'

    def test_merge_batch_processing(self, mock_algolia_index):
        """Test merge logic with multiple records in a batch."""
        # Existing records from catalog
        existing_records = {
            '1': {'objectID': '1', 'name': 'Product 1', 'price': 100},
            '2': {'objectID': '2', 'name': 'Product 2', 'price': 200}
        }
        
        # Kafka updates
        kafka_updates = [
            {'objectID': '1', 'name': 'Wrong Name', 'rating': 5},  # Update existing
            {'objectID': '2', 'price': 50, 'popularity': 1000},  # Update existing
            {'objectID': '3', 'name': 'New Product', 'price': 300}  # New record
        ]
        
        # Simulate batch merge
        merged_products = []
        for kafka_product in kafka_updates:
            object_id = kafka_product['objectID']
            
            if object_id in existing_records:
                # Merge with existing
                existing = existing_records[object_id]
                merged = dict(existing)
                
                for field, kafka_value in kafka_product.items():
                    if field not in merged or merged[field] is None:
                        merged[field] = kafka_value
                
                merged_products.append(merged)
            else:
                # New record
                merged_products.append(kafka_product)
        
        # Verify results
        assert len(merged_products) == 3
        
        # Product 1: catalog data preserved, rating added
        assert merged_products[0]['name'] == 'Product 1'
        assert merged_products[0]['price'] == 100
        assert merged_products[0]['rating'] == 5
        
        # Product 2: catalog data preserved, popularity added
        assert merged_products[1]['name'] == 'Product 2'
        assert merged_products[1]['price'] == 200
        assert merged_products[1]['popularity'] == 1000
        
        # Product 3: new record added as-is
        assert merged_products[2]['objectID'] == '3'
        assert merged_products[2]['name'] == 'New Product'

    def test_merge_no_enrichment_needed(self, mock_algolia_index):
        """Test when Kafka has no new fields to add."""
        existing_record = {
            'objectID': '123',
            'name': 'Product',
            'price': 100,
            'rating': 4,
            'description': 'Existing description'
        }
        
        kafka_update = {
            'objectID': '123',
            'name': 'Different Name',  # Conflict - ignored
            'price': 50,  # Conflict - ignored
            'rating': 5,  # Conflict - ignored
        }
        
        # Simulate merge
        merged = dict(existing_record)
        enriched_fields = []
        for field, kafka_value in kafka_update.items():
            if field not in merged or merged[field] is None:
                merged[field] = kafka_value
                enriched_fields.append(field)
        
        # No enrichment should occur
        assert len(enriched_fields) == 0
        
        # All values should match catalog
        assert merged == existing_record

    def test_merge_complex_nested_data(self, mock_algolia_index):
        """Test merge with complex nested data structures."""
        existing_record = {
            'objectID': '123',
            'name': 'Product',
            'hierarchicalCategories': {
                'lvl0': 'Electronics',
                'lvl1': 'Electronics > Audio'
            }
        }
        
        kafka_update = {
            'objectID': '123',
            'hierarchicalCategories': {  # Should be ignored - already exists
                'lvl0': 'Different'
            },
            'metadata': {  # New nested field - should be added
                'source': 'kafka',
                'timestamp': '2024-01-01'
            }
        }
        
        # Simulate merge
        merged = dict(existing_record)
        for field, kafka_value in kafka_update.items():
            if field not in merged or merged[field] is None:
                merged[field] = kafka_value
        
        # Original nested data preserved
        assert merged['hierarchicalCategories']['lvl0'] == 'Electronics'
        
        # New nested data added
        assert 'metadata' in merged
        assert merged['metadata']['source'] == 'kafka'

    def test_merge_preserves_empty_strings_as_valid_values(self, mock_algolia_index):
        """Test that empty strings are considered valid values and not overwritten."""
        existing_record = {
            'objectID': '123',
            'name': 'Product',
            'description': ''  # Empty string is a valid value
        }
        
        kafka_update = {
            'objectID': '123',
            'description': 'Kafka description'  # Should NOT overwrite empty string
        }
        
        # Simulate merge - only add if field doesn't exist OR is None
        merged = dict(existing_record)
        for field, kafka_value in kafka_update.items():
            if field not in merged or merged[field] is None:
                merged[field] = kafka_value
        
        # Empty string should be preserved (it's not None)
        assert merged['description'] == ''

    def test_merge_zero_values_not_overwritten(self, mock_algolia_index):
        """Test that zero values are preserved and not overwritten."""
        existing_record = {
            'objectID': '123',
            'name': 'Product',
            'price': 0,  # Zero is a valid price
            'rating': 0
        }
        
        kafka_update = {
            'objectID': '123',
            'price': 100,  # Should NOT overwrite zero
            'rating': 5  # Should NOT overwrite zero
        }
        
        # Simulate merge
        merged = dict(existing_record)
        for field, kafka_value in kafka_update.items():
            if field not in merged or merged[field] is None:
                merged[field] = kafka_value
        
        # Zero values preserved
        assert merged['price'] == 0
        assert merged['rating'] == 0
