import jwt
from datetime import datetime, timedelta
from fastapi import Header, HTTPException, status
from app.config import settings

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """Generates a JWT access token containing user profile information."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)  # Default 7 days
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")
    return encoded_jwt

def get_current_user(authorization: str = Header(None)) -> str:
    """FastAPI dependency to extract and verify the JWT from the Authorization header.
    
    Returns the user's email which acts as the unique student_id.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is missing"
        )
    
    try:
        parts = authorization.split(" ")
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header must follow format 'Bearer <token>'"
            )
        
        token = parts[1]
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        email = payload.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: payload is missing email"
            )
        return email
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authorization token: {str(e)}"
        )
