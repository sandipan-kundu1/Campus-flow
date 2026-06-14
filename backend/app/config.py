from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    gemini_api_key: str = ""
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "ap-south-1"
    aws_s3_bucket: str = ""
    dynamodb_students_table: str = "students"
    dynamodb_schedules_table: str = "schedules"
    dynamodb_deadlines_table: str = "deadlines"
    hf_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    chroma_db_path: str = "./chroma_db"
    jwt_secret: str = "campusflow_jwt_secret_key_super_secret_123456"
    google_client_id: str = ""
    google_client_secret: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
