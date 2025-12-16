import json
from typing import List, Dict, Any
from datetime import datetime


def parse_kafka_messages(kafka_file_path: str) -> Dict[str, Dict[str, Any]]:
    """
    Parse Kafka messages containing product updates.

    Args:
        kafka_file_path: Path to the Kafka messages JSON file

    Returns:
        Dictionary mapping objectID to Kafka update data
    """
    with open(kafka_file_path, 'r', encoding='utf-8') as f:
        messages = json.load(f)
    
    kafka_updates = {}
    
    for message in messages:
        if 'objectID' in message:
            # Add metadata about when this update was processed
            message['_kafka_processed_at'] = datetime.utcnow().isoformat()
            kafka_updates[message['objectID']] = message
    
    return kafka_updates


def extract_kafka_only_fields(kafka_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract fields that typically only come from Kafka and not from XML catalog.
    
    Args:
        kafka_data: Raw Kafka message data
        
    Returns:
        Dictionary with Kafka-only enrichment fields
    """
    kafka_only_fields = [
        'type',
        'price_range',
        'url',
        'free_shipping',
        'popularity',
        'rating'
    ]
    
    enrichment = {}
    for field in kafka_only_fields:
        if field in kafka_data:
            enrichment[field] = kafka_data[field]
    
    return enrichment
