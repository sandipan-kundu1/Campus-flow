import bcrypt
import httpx
from datetime import datetime
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.services import dynamodb_service
from app.utils.auth import create_access_token
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleLoginRequest(BaseModel):
    credential: str

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

@router.post("/register")
def register(req: RegisterRequest):
    email = req.email.strip().lower()
    if not email or not req.password or not req.name.strip():
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Check if user already exists
    existing = dynamodb_service.get_item(settings.dynamodb_students_table, {"id": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered")
    
    # Create new user profile
    user_item = {
        "id": email,
        "type": "user",
        "name": req.name.strip(),
        "email": email,
        "password_hash": hash_password(req.password),
        "created_at": datetime.utcnow().isoformat()
    }
    
    try:
        dynamodb_service.put_item(settings.dynamodb_students_table, user_item)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")
        
    token = create_access_token({"email": email, "name": user_item["name"]})
    return {
        "token": token,
        "user": {
            "name": user_item["name"],
            "email": email
        }
    }

@router.post("/login")
def login(req: LoginRequest):
    email = req.email.strip().lower()
    # Find user profile
    user = dynamodb_service.get_item(settings.dynamodb_students_table, {"id": email})
    if not user or user.get("type") != "user" or "password_hash" not in user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        
    # Verify password hash
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        
    token = create_access_token({"email": email, "name": user.get("name", "")})
    return {
        "token": token,
        "user": {
            "name": user.get("name", ""),
            "email": email,
            "picture": user.get("picture", None)
        }
    }

@router.post("/google")
async def google_login(req: GoogleLoginRequest):
    credential = req.credential.strip()
    if not credential:
        raise HTTPException(status_code=400, detail="Google token credential is required")
        
    # Verify token with Google API
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": credential},
                timeout=10.0
            )
            
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid Google token")
                
            payload = resp.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Token verification request failed: {str(e)}")
        
    # Validate client audience matches our configured client ID
    client_id = settings.google_client_id
    if client_id and payload.get("aud") != client_id:
        raise HTTPException(status_code=400, detail="Google Client ID mismatch")
        
    email = payload.get("email", "").strip().lower()
    name = payload.get("name", "").strip()
    picture = payload.get("picture", "").strip()
    sub = payload.get("sub", "").strip()
    
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email address associated")
        
    # Check if user exists, else register them
    user = dynamodb_service.get_item(settings.dynamodb_students_table, {"id": email})
    if not user:
        user = {
            "id": email,
            "type": "user",
            "name": name,
            "email": email,
            "google_sub": sub,
            "picture": picture,
            "created_at": datetime.utcnow().isoformat()
        }
        dynamodb_service.put_item(settings.dynamodb_students_table, user)
    else:
        # Check and update if info has changed
        needs_update = False
        if user.get("type") != "user":
            user["type"] = "user"
            needs_update = True
        if user.get("google_sub") != sub:
            user["google_sub"] = sub
            needs_update = True
        if user.get("picture") != picture:
            user["picture"] = picture
            needs_update = True
        if user.get("name") != name:
            user["name"] = name
            needs_update = True
            
        if needs_update:
            dynamodb_service.put_item(settings.dynamodb_students_table, user)
            
    token = create_access_token({"email": email, "name": name})
    return {
        "token": token,
        "user": {
            "name": name,
            "email": email,
            "picture": picture
        }
    }
