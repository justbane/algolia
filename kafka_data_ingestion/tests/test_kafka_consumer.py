"""Tests for KafkaToAlgolia consumer."""

import json
import pytest
from unittest.mock import MagicMock, patch, mock_open
from pathlib import Path
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


class TestKafkaToAlgolia:
    """Test suite for KafkaToAlgolia consumer class."""

    @pytest.fixture
    def mock_env(self, monkeypatch):
        """Set up mock environment variables."""
        monkeypatch.setenv('ALGOLIA_APP_ID', 'test_app_id')
        monkeypatch.setenv('ALGOLIA_API_KEY', 'test_api_key')
        monkeypatch.setenv('ALGOLIA_INDEX_NAME', 'test_index')
        monkeypatch.setenv('KAFKA_MODE', 'DEMO')

    @pytest.fixture
    def mock_algolia(self):
        """Create mock Algolia client."""
        with patch('kafka_consumer.SearchClient') as mock_client:
            mock_index = MagicMock()
            mock_index.get_objects = MagicMock(return_value={'results': []})
            mock_index.save_objects = MagicMock(return_value=MagicMock(raw_responses=[{'taskID': 123}]))
            mock_index.wait_task = MagicMock()
            
            mock_client.create.return_value.init_index.return_value = mock_index
            
            yield mock_client, mock_index

    @pytest.fixture
    def sample_kafka_data(self, tmp_path):
        """Create sample Kafka data file."""
        data = [
            {
                "objectID": "1",
                "name": "Product 1",
                "rating": 5,
                "free_shipping": True
            },
            {
                "objectID": "2",
                "name": "Product 2",
                "popularity": 1000
            }
        ]
        
        file_path = tmp_path / "kafka message.json"
        with open(file_path, 'w') as f:
            json.dump(data, f)
        
        return file_path

    def test_initialization_success(self, mock_env, mock_algolia):
        """Test successful initialization of KafkaToAlgolia."""
        from kafka_consumer import KafkaToAlgolia
        
        consumer = KafkaToAlgolia()
        
        assert consumer.config['kafka_mode'] == 'DEMO'
        assert consumer.config['batch_size'] == 100
        assert consumer.stats['messages_processed'] == 0
        assert consumer.stats['products_updated'] == 0

    def test_initialization_missing_credentials(self):
        """Test that initialization fails without required credentials."""
        from kafka_consumer import KafkaToAlgolia
        
        # Mock load_dotenv to prevent loading from .env file
        # Also mock os.getenv to return None for required vars
        with patch('kafka_consumer.load_dotenv'):
            with patch('kafka_consumer.os.getenv') as mock_getenv:
                def getenv_side_effect(key, default=None):
                    # Return None for required vars, default for others
                    if key in ['ALGOLIA_APP_ID', 'ALGOLIA_API_KEY']:
                        return None
                    return default
                
                mock_getenv.side_effect = getenv_side_effect
                
                with pytest.raises(SystemExit) as exc_info:
                    KafkaToAlgolia()
                
                assert exc_info.value.code == 1

    def test_demo_mode_file_reading(self, mock_env, mock_algolia, sample_kafka_data, monkeypatch):
        """Test reading from file in demo mode."""
        from kafka_consumer import KafkaToAlgolia
        
        # Change to directory with sample file
        monkeypatch.chdir(sample_kafka_data.parent)
        
        consumer = KafkaToAlgolia()
        
        # Mock file reading
        with patch('pathlib.Path.exists', return_value=True):
            with patch('builtins.open', mock_open(read_data=sample_kafka_data.read_text())):
                with patch.object(consumer, '_upload_batch') as mock_upload:
                    consumer._run_demo_mode()
                    
                    # Verify upload was called
                    assert mock_upload.called
                    
                    # Verify products were processed
                    call_args = mock_upload.call_args[0][0]
                    assert len(call_args) == 2
                    assert call_args[0]['objectID'] == '1'

    def test_batch_processing(self, mock_env, mock_algolia):
        """Test batch processing logic."""
        from kafka_consumer import KafkaToAlgolia
        
        consumer = KafkaToAlgolia()
        mock_client, mock_index = mock_algolia
        
        # Create large batch
        products = [{'objectID': str(i), 'name': f'Product {i}'} for i in range(150)]
        
        # Mock get_objects to return empty (new records)
        mock_index.get_objects.return_value = {'results': []}
        
        consumer._upload_batch(products)
        
        # Verify upload was called
        assert mock_index.save_objects.called
        assert consumer.stats['products_updated'] == 150

    def test_statistics_tracking(self, mock_env, mock_algolia):
        """Test that statistics are tracked correctly."""
        from kafka_consumer import KafkaToAlgolia
        
        consumer = KafkaToAlgolia()
        mock_client, mock_index = mock_algolia
        
        products = [
            {'objectID': '1', 'name': 'Product 1'},
            {'objectID': '2', 'name': 'Product 2'}
        ]
        
        mock_index.get_objects.return_value = {'results': []}
        
        initial_count = consumer.stats['products_updated']
        consumer._upload_batch(products)
        
        assert consumer.stats['products_updated'] == initial_count + 2

    def test_empty_batch_handling(self, mock_env, mock_algolia):
        """Test handling of empty batches."""
        from kafka_consumer import KafkaToAlgolia
        
        consumer = KafkaToAlgolia()
        mock_client, mock_index = mock_algolia
        
        # Upload empty batch
        consumer._upload_batch([])
        
        # Should not call Algolia
        assert not mock_index.save_objects.called

    def test_upload_with_existing_records(self, mock_env, mock_algolia):
        """Test upload when records already exist in Algolia."""
        from kafka_consumer import KafkaToAlgolia
        
        consumer = KafkaToAlgolia()
        mock_client, mock_index = mock_algolia
        
        # Mock existing records
        existing = [
            {'objectID': '1', 'name': 'Existing Product', 'price': 100}
        ]
        mock_index.get_objects.return_value = {'results': existing}
        
        # Kafka update with new field
        kafka_updates = [
            {'objectID': '1', 'name': 'New Name', 'rating': 5}
        ]
        
        consumer._upload_batch(kafka_updates)
        
        # Verify get_objects was called to fetch existing data
        assert mock_index.get_objects.called
        
        # Verify save_objects was called
        assert mock_index.save_objects.called

    def test_error_handling_on_upload_failure(self, mock_env, mock_algolia):
        """Test error handling when Algolia upload fails."""
        from kafka_consumer import KafkaToAlgolia
        
        consumer = KafkaToAlgolia()
        mock_client, mock_index = mock_algolia
        
        # Mock Algolia error
        mock_index.save_objects.side_effect = Exception("Algolia API error")
        mock_index.get_objects.return_value = {'results': []}
        
        products = [{'objectID': '1', 'name': 'Product'}]
        
        # Should handle error gracefully
        consumer._upload_batch(products)
        
        # Error counter should increase
        assert consumer.stats['errors'] > 0

    def test_configuration_defaults(self, mock_env, mock_algolia):
        """Test that configuration has correct defaults."""
        from kafka_consumer import KafkaToAlgolia
        
        consumer = KafkaToAlgolia()
        
        assert consumer.config['kafka_mode'] == 'DEMO'
        assert consumer.config['kafka_bootstrap_servers'] == 'localhost:9092'
        assert consumer.config['kafka_topic'] == 'product-updates'
        assert consumer.config['kafka_group_id'] == 'algolia-indexer'
        assert consumer.config['batch_size'] == 100

    def test_configuration_custom_values(self, mock_env, mock_algolia, monkeypatch):
        """Test configuration with custom values."""
        from kafka_consumer import KafkaToAlgolia
        
        monkeypatch.setenv('KAFKA_BOOTSTRAP_SERVERS', 'custom:9092')
        monkeypatch.setenv('KAFKA_TOPIC', 'custom-topic')
        monkeypatch.setenv('BATCH_SIZE', '50')
        
        consumer = KafkaToAlgolia()
        
        assert consumer.config['kafka_bootstrap_servers'] == 'custom:9092'
        assert consumer.config['kafka_topic'] == 'custom-topic'
        assert consumer.config['batch_size'] == 50

    def test_algolia_wait_task_called(self, mock_env, mock_algolia):
        """Test that wait_task is called after upload."""
        from kafka_consumer import KafkaToAlgolia
        
        consumer = KafkaToAlgolia()
        mock_client, mock_index = mock_algolia
        
        mock_index.get_objects.return_value = {'results': []}
        
        products = [{'objectID': '1', 'name': 'Product'}]
        consumer._upload_batch(products)
        
        # Verify wait_task was called
        assert mock_index.wait_task.called
        mock_index.wait_task.assert_called_with(123)

    def test_object_ids_extraction(self, mock_env, mock_algolia):
        """Test extraction of object IDs for fetching existing records."""
        from kafka_consumer import KafkaToAlgolia
        
        consumer = KafkaToAlgolia()
        mock_client, mock_index = mock_algolia
        
        products = [
            {'objectID': '1', 'name': 'Product 1'},
            {'objectID': '2', 'name': 'Product 2'},
            {'objectID': '3', 'name': 'Product 3'}
        ]
        
        mock_index.get_objects.return_value = {'results': []}
        consumer._upload_batch(products)
        
        # Verify get_objects was called with correct IDs
        call_args = mock_index.get_objects.call_args[0][0]
        assert '1' in call_args
        assert '2' in call_args
        assert '3' in call_args

    def test_batch_size_chunking(self, mock_env, mock_algolia):
        """Test that large batches are processed correctly."""
        from kafka_consumer import KafkaToAlgolia
        
        consumer = KafkaToAlgolia()
        mock_client, mock_index = mock_algolia
        
        # Create batch larger than typical size
        products = [{'objectID': str(i), 'name': f'Product {i}'} for i in range(250)]
        
        mock_index.get_objects.return_value = {'results': []}
        consumer._upload_batch(products)
        
        # Verify all products were counted
        assert consumer.stats['products_updated'] == 250

    def test_demo_mode_file_not_found(self, mock_env, mock_algolia, monkeypatch):
        """Test handling when demo file is not found."""
        from kafka_consumer import KafkaToAlgolia
        
        monkeypatch.chdir('/tmp')
        
        consumer = KafkaToAlgolia()
        
        # Mock file not existing
        with patch('pathlib.Path.exists', return_value=False):
            # Should handle gracefully (log error)
            consumer._run_demo_mode()
            
            # Should not crash, stats should remain at 0
            assert consumer.stats['messages_processed'] == 0
