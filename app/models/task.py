from datetime import datetime, timezone


TASK_STATUS_TODO = "todo"
TASK_STATUS_IN_PROGRESS = "in_progress"
TASK_STATUS_DONE = "done"
TASK_STATUSES = {TASK_STATUS_TODO, TASK_STATUS_IN_PROGRESS, TASK_STATUS_DONE}


def task_document(
    title: str,
    description: str | None,
    status: str,
    project_id: str,
    assigned_to: str,
    created_by: str,
    due_date: datetime | None,
) -> dict:
    return {
        "title": title,
        "description": description,
        "status": status,
        "project_id": project_id,
        "assigned_to": assigned_to,
        "created_by": created_by,
        "due_date": due_date,
        "created_at": datetime.now(timezone.utc),
    }

