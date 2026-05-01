from datetime import datetime, timezone


def user_document(name: str, email: str, hashed_password: str, role: str) -> dict:
    return {
        "name": name,
        "email": email.lower(),
        "password": hashed_password,
        "role": role,
        "is_test_user": False,
        "created_at": datetime.now(timezone.utc),
    }
