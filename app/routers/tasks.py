from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.core.dependencies import get_current_user
from app.schemas.task import TaskCreate, TaskResponse, TaskStatus, TaskStatusUpdate
from app.services.task_service import create_task, delete_task, list_tasks, update_task_status

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create(
    payload: TaskCreate,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    return await create_task(db, payload, current_user)


@router.get("/", response_model=list[TaskResponse])
async def list_project_tasks(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    current_user: Annotated[dict, Depends(get_current_user)],
    project_id: Annotated[str | None, Query()] = None,
    task_status: Annotated[TaskStatus | None, Query(alias="status")] = None,
):
    return await list_tasks(db, current_user, project_id, task_status)


@router.patch("/{task_id}/status", response_model=TaskResponse)
async def patch_task_status(
    task_id: str,
    payload: TaskStatusUpdate,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    return await update_task_status(db, task_id, payload, current_user)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_task(
    task_id: str,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    await delete_task(db, task_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

