from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.core.dependencies import get_current_user
from app.schemas.project import AddMemberRequest, ProjectCreate, ProjectResponse
from app.services.project_service import (
    add_member,
    create_project,
    delete_project,
    list_user_projects,
    remove_member,
)

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create(
    payload: ProjectCreate,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    return await create_project(db, payload, current_user)


@router.get("/", response_model=list[ProjectResponse])
async def list_projects(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    return await list_user_projects(db, current_user)


@router.post("/{project_id}/add-member", response_model=ProjectResponse)
async def add_project_member(
    project_id: str,
    payload: AddMemberRequest,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    return await add_member(db, project_id, payload, current_user)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_project(
    project_id: str,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    await delete_project(db, project_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{project_id}/members/{user_id}", response_model=ProjectResponse)
async def remove_project_member(
    project_id: str,
    user_id: str,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    return await remove_member(db, project_id, user_id, current_user)
