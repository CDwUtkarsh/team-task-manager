from pymongo.errors import DuplicateKeyError
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import user_document
from app.schemas.auth import TokenResponse
from app.schemas.user import UserCreate, serialize_user


async def register_user(db: AsyncIOMotorDatabase, payload: UserCreate) -> TokenResponse:
    user_count = await db.users.count_documents({})
    role = "admin" if user_count == 0 else payload.role
    document = user_document(
        name=payload.name,
        email=str(payload.email),
        hashed_password=hash_password(payload.password),
        role=role,
    )
    try:
        result = await db.users.insert_one(document)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = await db.users.find_one({"_id": result.inserted_id})
    access_token = create_access_token(str(user["_id"]), user.get("role", "member"))
    return TokenResponse(access_token=access_token, user=serialize_user(user))


async def login_user(
    db: AsyncIOMotorDatabase,
    email: str,
    password: str,
) -> TokenResponse:
    user = await db.users.find_one({"email": email.lower()})
    if user is None or not verify_password(password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(str(user["_id"]), user.get("role", "member"))
    return TokenResponse(access_token=access_token, user=serialize_user(user))
