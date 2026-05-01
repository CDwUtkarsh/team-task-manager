# 🚀 Team Task Manager

A full-stack web application to manage team projects, assign tasks, and track progress with **Role-Based Access Control (RBAC)**.

---

## 🔥 Features

* 🔐 Authentication (JWT-based Login & Signup)
* 👥 Project & Team Management
* ✅ Task Creation, Assignment & Tracking
* 📊 Dashboard with task statistics
* ⏰ Overdue task tracking
* 🔑 Role-Based Access Control:

  * **Admin** → Full access
  * **Member** → Limited access

---

## 🧠 Tech Stack

### Backend

* FastAPI (Python)
* MongoDB
* Pydantic
* JWT Authentication
* Bcrypt (Password hashing)

### Frontend

* React (Vite)
* Axios
* Basic CSS (Minimal UI)

---

## 📁 Project Structure

```text
backend/
  app/
    core/
    models/
    routers/
    schemas/
    services/
    main.py

frontend/
  src/
    api/
    components/
    context/
    pages/
    App.jsx
```

---

## ⚙️ Backend Setup

```bash
# Create virtual environment
python -m venv .venv

# Activate
.venv\Scripts\activate   # Windows
source .venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload
```

API will run on:

```
http://127.0.0.1:8000
```

Swagger Docs:

```
http://127.0.0.1:8000/docs
```

---

## 🎨 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```
http://127.0.0.1:5173
```

---

## 🔐 RBAC (Access Control)

### 👑 Admin

* Create/Delete projects
* Add/Remove members
* Create/Assign/Delete tasks
* View all tasks

### 👤 Member

* View assigned tasks
* Update task status
* Cannot create/delete

---

## 📡 API Endpoints

### Auth

* POST `/auth/register`
* POST `/auth/login`

### Projects

* POST `/projects/`
* GET `/projects/`
* POST `/projects/{id}/add-member`
* DELETE `/projects/{id}`

### Tasks

* POST `/tasks/`
* GET `/tasks/`
* PATCH `/tasks/{id}/status`
* DELETE `/tasks/{id}`

---

## 🚀 How It Works

1. User signs up & logs in
2. Admin creates a project
3. Admin adds members
4. Admin assigns tasks
5. Members update task status
6. Dashboard shows progress

---

## 📌 Notes

* JWT tokens stored in localStorage
* Minimal UI (focus on functionality)
* Designed for learning + interview use

---

## 📈 Future Improvements

* Notifications system
* File attachments in tasks
* Activity logs
* Better UI/UX

---
