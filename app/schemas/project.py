from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ProjectRole(str, Enum):
    admin = "admin"
    member = "member"


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=1000)


class AddMemberRequest(BaseModel):
    user_id: str
    role: ProjectRole = ProjectRole.member


class ProjectMemberResponse(BaseModel):
    user_id: str
    role: ProjectRole
    name: str | None = None
    email: str | None = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    created_by: str
    members: list[ProjectMemberResponse]
    created_at: datetime


def serialize_project(project: dict, users_by_id: dict[str, dict] | None = None) -> ProjectResponse:
    users_by_id = users_by_id or {}
    return ProjectResponse(
        id=str(project["_id"]),
        name=project["name"],
        description=project.get("description"),
        created_by=project["created_by"],
        members=[
            ProjectMemberResponse(
                user_id=member["user_id"],
                role=member["role"],
                name=users_by_id.get(member["user_id"], {}).get("name"),
                email=users_by_id.get(member["user_id"], {}).get("email"),
            )
            for member in project.get("members", [])
        ],
        created_at=project["created_at"],
    )
