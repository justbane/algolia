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
