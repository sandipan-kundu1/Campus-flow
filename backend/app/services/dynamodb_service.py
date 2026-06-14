import boto3
from boto3.dynamodb.conditions import Key
from app.config import settings

def get_dynamodb():
    return boto3.resource(
        "dynamodb",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )

def get_table(table_name: str):
    return get_dynamodb().Table(table_name)

def put_item(table_name: str, item: dict):
    table = get_table(table_name)
    table.put_item(Item=item)

def get_item(table_name: str, key: dict):
    table = get_table(table_name)
    response = table.get_item(Key=key)
    return response.get("Item")

def query_items(table_name: str, key_condition, index_name: str = None):
    table = get_table(table_name)
    kwargs = {"KeyConditionExpression": key_condition}
    if index_name:
        kwargs["IndexName"] = index_name
    response = table.query(**kwargs)
    return response.get("Items", [])

def scan_items(table_name: str, filter_expression=None):
    table = get_table(table_name)
    kwargs = {}
    if filter_expression:
        kwargs["FilterExpression"] = filter_expression
    response = table.scan(**kwargs)
    return response.get("Items", [])

def update_item(table_name: str, key: dict, update_expression: str, expression_values: dict, expression_names: dict = None):
    table = get_table(table_name)
    kwargs = {
        "Key": key,
        "UpdateExpression": update_expression,
        "ExpressionAttributeValues": expression_values,
        "ReturnValues": "ALL_NEW",
    }
    if expression_names:
        kwargs["ExpressionAttributeNames"] = expression_names
    response = table.update_item(**kwargs)
    return response.get("Attributes")

def delete_item(table_name: str, key: dict):
    table = get_table(table_name)
    table.delete_item(Key=key)
