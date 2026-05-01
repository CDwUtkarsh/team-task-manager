from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class TaskStatus(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    project_id: str
    assigned_to: str
    due_date: datetime | None = None

    @field_validator("due_date")
    @classmethod
    def normalize_due_date(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return value
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskResponse(BaseModel):
    id: str
    title: str
    description: str | None = None
    status: TaskStatus
    project_id: str
    assigned_to: str
    created_by: str
    due_date: datetime | None = None
    created_at: datetime
    is_overdue: bool


def serialize_task(task: dict) -> TaskResponse:
    due_date = task.get("due_date")
    is_overdue = False
    if due_date is not None and task["status"] != TaskStatus.done:
        if due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=timezone.utc)
        is_overdue = due_date < datetime.now(timezone.utc)

    return TaskResponse(
        id=str(task["_id"]),
        title=task["title"],
        description=task.get("description"),
        status=task["status"],
        project_id=task["project_id"],
        assigned_to=task["assigned_to"],
        created_by=task["created_by"],
        due_date=due_date,
        created_at=task["created_at"],
        is_overdue=is_overdue,
    )

