from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.dependencies import validate_object_id
from app.models.task import TASK_STATUS_TODO, task_document
from app.schemas.task import TaskCreate, TaskResponse, TaskStatus, TaskStatusUpdate, serialize_task
from app.services.project_service import (
    get_project_or_404,
    is_account_admin,
    require_account_admin,
    require_project_member,
)


async def create_task(
    db: AsyncIOMotorDatabase,
    payload: TaskCreate,
    current_user: dict,
) -> TaskResponse:
    project = await get_project_or_404(db, payload.project_id)
    creator_id = str(current_user["_id"])
    require_account_admin(current_user)

    assigned_to = str(validate_object_id(payload.assigned_to, "assigned_to"))
    if not any(member["user_id"] == assigned_to for member in project.get("members", [])):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assigned user must be a project member",
        )

    document = task_document(
        title=payload.title,
        description=payload.description,
        status=TASK_STATUS_TODO,
        project_id=str(project["_id"]),
        assigned_to=assigned_to,
        created_by=creator_id,
        due_date=payload.due_date,
    )
    result = await db.tasks.insert_one(document)
    task = await db.tasks.find_one({"_id": result.inserted_id})
    return serialize_task(task)


async def list_tasks(
    db: AsyncIOMotorDatabase,
    current_user: dict,
    project_id: str | None = None,
    task_status: TaskStatus | None = None,
) -> list[TaskResponse]:
    current_user_id = str(current_user["_id"])
    query: dict = {}

    if task_status is not None:
        query["status"] = task_status.value

    if project_id is not None:
        project = await get_project_or_404(db, project_id)
        query["project_id"] = str(project["_id"])
        if not is_account_admin(current_user):
            require_project_member(project, current_user_id)
            query["assigned_to"] = current_user_id
    else:
        if is_account_admin(current_user):
            cursor = db.tasks.find(query).sort("created_at", -1)
            return [serialize_task(task) async for task in cursor]

        project_ids = [
            str(project["_id"])
            async for project in db.projects.find({"members.user_id": current_user_id})
        ]
        if not project_ids:
            return []
        query["project_id"] = {"$in": project_ids}
        query["assigned_to"] = current_user_id

    cursor = db.tasks.find(query).sort("created_at", -1)
    return [serialize_task(task) async for task in cursor]


async def update_task_status(
    db: AsyncIOMotorDatabase,
    task_id: str,
    payload: TaskStatusUpdate,
    current_user: dict,
) -> TaskResponse:
    task = await db.tasks.find_one({"_id": validate_object_id(task_id, "task_id")})
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    current_user_id = str(current_user["_id"])
    if task["assigned_to"] != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned user can update task status",
        )

    await db.tasks.update_one(
        {"_id": task["_id"]},
        {"$set": {"status": payload.status.value}},
    )
    updated_task = await db.tasks.find_one({"_id": task["_id"]})
    return serialize_task(updated_task)


async def delete_task(
    db: AsyncIOMotorDatabase,
    task_id: str,
    current_user: dict,
) -> None:
    task = await db.tasks.find_one({"_id": validate_object_id(task_id, "task_id")})
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    project = await get_project_or_404(db, task["project_id"])
    require_account_admin(current_user)

    await db.tasks.delete_one({"_id": task["_id"]})
