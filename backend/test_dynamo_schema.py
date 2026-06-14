import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import boto3
from app.config import settings

db = boto3.client(
    'dynamodb',
    region_name=settings.aws_region,
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key
)
for t in ['students', 'schedules', 'deadlines']:
    desc = db.describe_table(TableName=t)['Table']
    keys = [(k['AttributeName'], k['KeyType']) for k in desc['KeySchema']]
    print(f"{t}: partition_key={keys}")
