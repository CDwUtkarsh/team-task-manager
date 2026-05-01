import certifi
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings


class MongoDB:
    client: AsyncIOMotorClient | None = None
    database: AsyncIOMotorDatabase | None = None


mongodb = MongoDB()


async def connect_to_mongo() -> None:
    mongodb.client = AsyncIOMotorClient(
        settings.mongo_url,
        tls=True,
        tlsCAFile=certifi.where(),
    )
    mongodb.database = mongodb.client[settings.mongodb_db_name]

    await mongodb.database.users.create_index("email", unique=True)
    await mongodb.database.projects.create_index("created_by")
    await mongodb.database.projects.create_index("members.user_id")
    await mongodb.database.tasks.create_index("project_id")
    await mongodb.database.tasks.create_index("assigned_to")
    await mongodb.database.tasks.create_index("status")


async def close_mongo_connection() -> None:
    if mongodb.client is not None:
        mongodb.client.close()


def get_database() -> AsyncIOMotorDatabase:
    if mongodb.database is None:
        raise RuntimeError("Database has not been initialized")
    return mongodb.database

