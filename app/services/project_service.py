from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.dependencies import validate_object_id
from app.models.project import PROJECT_ROLE_ADMIN, project_document
from app.schemas.project import AddMemberRequest, ProjectCreate, ProjectResponse, serialize_project


def get_project_member(project: dict, user_id: str) -> dict | None:
    return next(
        (member for member in project.get("members", []) if member["user_id"] == user_id),
        None,
    )


def is_account_admin(user: dict) -> bool:
    return user.get("role") == "admin"


def require_account_admin(user: dict) -> None:
    if not is_account_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account access required",
        )


def require_project_admin(project: dict, user_id: str) -> None:
    member = get_project_member(project, user_id)
    if member is None or member["role"] != PROJECT_ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project admin access required",
        )


def require_project_member(project: dict, user_id: str) -> dict:
    member = get_project_member(project, user_id)
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project membership required",
        )
    return member


async def get_project_or_404(db: AsyncIOMotorDatabase, project_id: str) -> dict:
    project = await db.projects.find_one({"_id": validate_object_id(project_id, "project_id")})
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project


async def serialize_project_with_members(
    db: AsyncIOMotorDatabase,
    project: dict,
) -> ProjectResponse:
    member_ids = [member["user_id"] for member in project.get("members", [])]
    users_by_id: dict[str, dict] = {}
    if member_ids:
        cursor = db.users.find({"_id": {"$in": [validate_object_id(user_id, "user_id") for user_id in member_ids]}})
        users_by_id = {str(user["_id"]): user async for user in cursor}
    return serialize_project(project, users_by_id)


async def create_project(
    db: AsyncIOMotorDatabase,
    payload: ProjectCreate,
    current_user: dict,
) -> ProjectResponse:
    require_account_admin(current_user)
    user_id = str(current_user["_id"])
    document = project_document(payload.name, payload.description, user_id)
    result = await db.projects.insert_one(document)
    project = await db.projects.find_one({"_id": result.inserted_id})
    return await serialize_project_with_members(db, project)


async def list_user_projects(
    db: AsyncIOMotorDatabase,
    current_user: dict,
) -> list[ProjectResponse]:
    user_id = str(current_user["_id"])
    query = {} if is_account_admin(current_user) else {"members.user_id": user_id}
    cursor = db.projects.find(query).sort("created_at", -1)
    return [await serialize_project_with_members(db, project) async for project in cursor]


async def add_member(
    db: AsyncIOMotorDatabase,
    project_id: str,
    payload: AddMemberRequest,
    current_user: dict,
) -> ProjectResponse:
    project = await get_project_or_404(db, project_id)
    require_account_admin(current_user)

    new_member_id = str(validate_object_id(payload.user_id, "user_id"))
    user = await db.users.find_one({"_id": validate_object_id(new_member_id, "user_id")})
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if get_project_member(project, new_member_id) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a project member",
        )

    await db.projects.update_one(
        {"_id": project["_id"]},
        {"$push": {"members": {"user_id": new_member_id, "role": payload.role.value}}},
    )
    updated_project = await db.projects.find_one({"_id": project["_id"]})
    return await serialize_project_with_members(db, updated_project)


async def remove_member(
    db: AsyncIOMotorDatabase,
    project_id: str,
    member_id: str,
    current_user: dict,
) -> ProjectResponse:
    project = await get_project_or_404(db, project_id)
    require_account_admin(current_user)

    member_id = str(validate_object_id(member_id, "user_id"))
    member = get_project_member(project, member_id)
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project member not found",
        )

    admin_count = sum(
        1
        for project_member in project.get("members", [])
        if project_member["role"] == PROJECT_ROLE_ADMIN
    )
    if member["role"] == PROJECT_ROLE_ADMIN and admin_count == 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A project must have at least one admin",
        )

    await db.projects.update_one(
        {"_id": project["_id"]},
        {"$pull": {"members": {"user_id": member_id}}},
    )
    await db.tasks.update_many(
        {"project_id": str(project["_id"]), "assigned_to": member_id},
        {"$set": {"assigned_to": str(current_user["_id"])}},
    )
    updated_project = await db.projects.find_one({"_id": project["_id"]})
    return await serialize_project_with_members(db, updated_project)


async def delete_project(
    db: AsyncIOMotorDatabase,
    project_id: str,
    current_user: dict,
) -> None:
    project = await get_project_or_404(db, project_id)
    require_account_admin(current_user)

    await db.tasks.delete_many({"project_id": str(project["_id"])})
    await db.projects.delete_one({"_id": project["_id"]})
