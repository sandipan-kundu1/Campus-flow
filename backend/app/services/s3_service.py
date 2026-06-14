import boto3
from app.config import settings

def get_s3():
    return boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )

def upload_file(file_bytes: bytes, key: str, content_type: str = "application/octet-stream") -> str:
    s3 = get_s3()
    s3.put_object(
        Bucket=settings.aws_s3_bucket,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )
    return f"s3://{settings.aws_s3_bucket}/{key}"

def get_file(key: str) -> bytes:
    s3 = get_s3()
    response = s3.get_object(Bucket=settings.aws_s3_bucket, Key=key)
    return response["Body"].read()

def list_files(prefix: str) -> list:
    s3 = get_s3()
    response = s3.list_objects_v2(Bucket=settings.aws_s3_bucket, Prefix=prefix)
    return [obj["Key"] for obj in response.get("Contents", [])]

def delete_file(key: str):
    s3 = get_s3()
    s3.delete_object(Bucket=settings.aws_s3_bucket, Key=key)
