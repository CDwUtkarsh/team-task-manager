from typing import Annotated

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.core.dependencies import get_current_user
from app.schemas.user import UserResponse, serialize_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=list[UserResponse])
async def list_users(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    cursor = db.users.find(
        {
            "is_test_user": {"$ne": True},
            "$nor": [
                {
                    "email": {
                        "$regex": r"(^dbg-|^rbac-|^strict-|@example\.com$)",
                        "$options": "i",
                    }
                },
                {
                    "name": {
                        "$regex": r"^(E2E|RBAC|Strict|Dbg|Debug|Browser)\b",
                        "$options": "i",
                    }
                },
            ],
        }
    ).sort("name", 1)
    return [serialize_user(user) async for user in cursor]
