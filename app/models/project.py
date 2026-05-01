from datetime import datetime, timezone


PROJECT_ROLE_ADMIN = "admin"
PROJECT_ROLE_MEMBER = "member"


def project_document(name: str, description: str | None, created_by: str) -> dict:
    return {
        "name": name,
        "description": description,
        "created_by": created_by,
        "members": [{"user_id": created_by, "role": PROJECT_ROLE_ADMIN}],
        "created_at": datetime.now(timezone.utc),
    }

