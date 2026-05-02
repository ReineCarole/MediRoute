from jose import JWTError, jwt
from datetime import datetime, timedelta

SECRET_KEY  = "supersecretkey"   # move to .env in production
ALGORITHM   = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480   # 8 hours

def create_token(data: dict):
    to_encode = data.copy()
    expire    = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None