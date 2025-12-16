#!/usr/bin/env python3
"""
Kafka Consumer Service for Algolia
===================================

This service consumes product update messages from Kafka topic
and uploads them directly to Algolia.
"""

import json
import logging
import os
import sys
from pathlib import Path
from typing import Dict, Any
from datetime import datetime

from dotenv import load_dotenv
from algoliasearch.search_client import SearchClient

from parsers.kafka_parser import parse_kafka_messages

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('kafka_consumer.log')
    ]
)
logger = logging.getLogger(__name__)


class KafkaToAlgolia:
    """    
    DEMO mode: Reads from kafka message.json file
    PRODUCTION mode: Connects to Kafka broker and consumes messages
    """
    
    def __init__(self):
        """Initialize Kafka consumer and Algolia client."""
        # Load environment variables
        load_dotenv()
        
        # Validate configuration
        required = ['ALGOLIA_APP_ID', 'ALGOLIA_API_KEY']
        missing = [var for var in required if not os.getenv(var)]
        
        if missing:
            logger.error(f"Missing required environment variables: {', '.join(missing)}")
            sys.exit(1)
        
        # Config
        self.config = {
            'kafka_mode': os.getenv('KAFKA_MODE', 'DEMO'),
            'kafka_bootstrap_servers': os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092'),
            'kafka_topic': os.getenv('KAFKA_TOPIC', 'product-updates'),
            'kafka_group_id': os.getenv('KAFKA_GROUP_ID', 'algolia-indexer'),
            'batch_size': int(os.getenv('BATCH_SIZE', '100')),
        }
        
        # Initialize Algolia client (v3.x API)
        self.algolia_client = SearchClient.create(
            os.getenv('ALGOLIA_APP_ID'),
            os.getenv('ALGOLIA_API_KEY')
        )
        self.algolia_index = self.algolia_client.init_index(
            os.getenv('ALGOLIA_INDEX_NAME', 'products')
        )
        
        # Statistics
        self.stats = {
            'messages_processed': 0,
            'products_updated': 0,
            'errors': 0
        }
        
        logger.info("=" * 80)
        logger.info(f"Kafka Topic: {self.config['kafka_topic']}")
        logger.info(f"Batch Size: {self.config['batch_size']}")
        logger.info("=" * 80)        
    
    def run(self):
        """Main execution: consume from Kafka and upload to Algolia."""
        logger.info("Starting Kafka consumer...")
        
        try:
            if self.config['kafka_mode'] == 'DEMO':
                self._run_demo_mode()
            else:
                self._run_production_mode()
            
            self._print_summary()
            
        except KeyboardInterrupt:
            logger.info("Shutdown requested by user")
            self._print_summary()
            sys.exit(0)
            
        except Exception as e:
            logger.error(f"\nConsumer failed: {e}")
            logger.error(f"Stack trace:", exc_info=True)
            sys.exit(1)
    
    def _run_demo_mode(self):
        """
        Demo: Read from sample Kafka message file.
        """
        os.system('cls' if os.name == 'nt' else 'clear')
        logger.info("[DEMO MODE] Reading from sample file...")
        
        # Get sample file path
        project_root = Path(__file__).parent
        # print(project_root)
        kafka_file =project_root / 'kafka message.json'
        
        if not kafka_file.exists():
            logger.error(f"File not found: {kafka_file}")
            return
        
        # Parse Kafka messages
        kafka_updates = parse_kafka_messages(str(kafka_file))
        logger.info(f"Loaded {len(kafka_updates)} messages from sample file")
        
        # Convert to list of products
        products = list(kafka_updates.values())
        self.stats['messages_processed'] = len(products)
        
        # Upload to Algolia
        if products:
            self._upload_batch(products)
    


    def _run_production_mode(self):
        """
        Production mode: Connet to Kafka and consume messages.
        Requires kafka-python library
        """
        try:
            from kafka import KafkaConsumer
        except ImportError:
            logger.error("kafka-python not installed. Run: pip install kafka-python")
            return
        
        logger.info(f"[PRODUCTION MODE] Connecting to Kafka...")
        logger.info(f"Topic: {self.config['kafka_topic']}")
        
        # Initialize Kafka consumer
        consumer = KafkaConsumer(
            self.config['kafka_topic'],
            bootstrap_servers=self.config['kafka_bootstrap_servers'].split(','),
            group_id=self.config['kafka_group_id'],
            auto_offset_reset='latest',  # Only new messages
            enable_auto_commit=True,
            value_deserializer=lambda m: json.loads(m.decode('utf-8'))
        )
        
        logger.info("Conneted to Kafka. Waiting for messages...")
        logger.info("Press Ctrl+c to stop\n")
        
        batch = []
        
        try:
            for message in consumer:
                product_update = message.value
                
                # Add timestamp
                product_update['_kafka_timestamp'] = datetime.utcnow().isoformat()
                product_update['_kafka_offset'] = message.offset
                product_update['_kafka_partition'] = message.partition
                
                batch.append(product_update)
                self.stats['messages_processed'] += 1
                
                logger.info(f"Received message: {product_update.get('objectID', 'unknown')}")
                
                # Upload batch when it reaches batch size
                if len(batch) >= self.config['batch_size']:
                    self._upload_batch(batch)
                    batch = []
        
        finally:
            # Upload remaining messages
            if batch:
                self._upload_batch(batch)
            
            consumer.close()
            logger.info("Kafka consumer closed")
    


    def _upload_batch(self, products: list):
        """
        Upload a batch of products to Algolia with smart merging.
        
        Strategy:
        - Fetch existing records from Algolia
        - Merge Kafka updates WITHOUT overwriting catalog fields
        - Kafka only enriches, doesn't replace (catalog is source of truth)
        
        Args:
            products: List of product dictionaries from Kafka
        """
        if not products:
            return
        
        try:
            logger.info(f"Uploading batch of {len(products)} product to Algolia...")
            
            # Get object IDs for this batch
            object_ids = [p['objectID'] for p in products if 'objectID' in p]
            
            if not object_ids:
                logger.warning("No valid objectIDs in batch, skipping")
                return
            
            # Fetch existing records from Algolia
            logger.debug(f"Fetching existing records for {len(object_ids)} products...")
            existing_records = {}
            
            try:
                # Get multiple objects from Algolia
                response = self.algolia_index.get_objects(object_ids)
                
                # Build lookup of existing records
                for record in response.get('results', []):
                    if record and 'objectID' in record:
                        existing_records[record['objectID']] = record
                        
                logger.debug(f"Found {len(existing_records)} existing records in Algolia")
                
            except Exception as e:
                logger.warning(f"Could not fetch existing records: {e}. Will upload as new.")
            
            # Merge Kafka data with existing records (catalog wins on conflicts)
            merged_products = []
            
            for kafka_product in products:
                object_id = kafka_product.get('objectID')
                
                if object_id in existing_records:
                    # Record exists - merge carefully (catalog is source of truth)
                    existing = existing_records[object_id]
                    merged = dict(existing)  # Start with existing data
                    
                    # Only add NEW fields from Kafka (don't overwrite existing)
                    enriched_fields = []
                    for field, kafka_value in kafka_product.items():
                        if field not in merged or merged[field] is None:
                            # Field doesn't exist or is null - safe to add
                            merged[field] = kafka_value
                            enriched_fields.append(field)
                    
                    if enriched_fields:
                        logger.debug(f"Enriched {object_id} with fields: {', '.join(enriched_fields)}")
                    else:
                        logger.debug(f"No enrichment needed for {object_id} (all fields exist)")
                    
                    merged_products.append(merged)
                else:
                    # New record - add as is
                    logger.debug(f"New record: {object_id}")
                    merged_products.append(kafka_product)
            
            # Upload merged records to Algolia
            if merged_products:
                response = self.algolia_index.save_objects(merged_products)
                
                # Wait for indexing to complete
                if hasattr(response, 'raw_responses') and len(response.raw_responses) > 0:
                    task_id = response.raw_responses[-1]['taskID']
                    self.algolia_index.wait_task(task_id)
                
                self.stats['products_updated'] += len(merged_products)
                logger.info(f"Successfully uploaded {len(merged_products)} products")
            
        except Exception as e:
            self.stats['errors'] += 1
            logger.error(f"Failed to upload batch: {e}")
            logger.error(f"Error details: {type(e).__name__}", exc_info=True)
            
            # In production, you might want to:
            # - Send failed messages to dead letter queue
            # - Retry with exponential backoff
            # - Alert monitoring system
    
    def _print_summary(self):
        logger.info("\n" + "=" * 80)
        logger.info("KAFKA CONSUMER SUMMARY")
        logger.info(f"Messages Processed: {self.stats['messages_processed']}")
        logger.info(f"Products Updated: {self.stats['products_updated']}")
        logger.info(f"Errors: {self.stats['errors']}")
        logger.info("=" * 80)


def main():
    """Main entry point."""
    try:
        consumer = KafkaToAlgolia()
        consumer.run()
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
