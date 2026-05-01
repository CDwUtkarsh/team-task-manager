import { useEffect, useMemo, useState } from "react";
import { getApiError } from "../api/client";
import { projectsApi } from "../api/projects";
import { tasksApi } from "../api/tasks";
import EmptyState from "../components/EmptyState.jsx";
import Loading from "../components/Loading.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatDate, getMemberLabel, getStatusLabel, STATUSES } from "../utils";

const initialTask = {
  title: "",
  description: "",
  project_id: "",
  assigned_to: "",
  due_date: "",
};

export default function Tasks() {
  const { user } = useAuth();
  const isAccountAdmin = user?.role === "admin";
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({ project_id: "", status: "" });
  const [newTask, setNewTask] = useState(initialTask);
  const [creating, setCreating] = useState(false);

  const selectedProject = projects.find((project) => project.id === newTask.project_id);
  const canCreateTask = isAccountAdmin && selectedProject;
  const adminProjects = isAccountAdmin ? projects : [];

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.project_id) params.project_id = filters.project_id;
      if (filters.status) params.status = filters.status;
      const [taskResult, projectResult] = await Promise.all([tasksApi.list(params), projectsApi.list()]);
      setTasks(taskResult.data);
      setProjects(projectResult.data);
      if (!newTask.project_id && projectResult.data.length > 0) {
        const firstAdminProject = projectResult.data[0];
        if (firstAdminProject) {
          setNewTask((current) => ({
            ...current,
            project_id: firstAdminProject.id,
            assigned_to: firstAdminProject.members[0]?.user_id || "",
          }));
        }
      }
    } catch (error) {
      showToast(getApiError(error, "Unable to load tasks"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters.project_id, filters.status]);

  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects]
  );

  const handleProjectForNewTask = (projectId) => {
    const project = projects.find((item) => item.id === projectId);
    setNewTask({
      ...newTask,
      project_id: projectId,
      assigned_to: project?.members[0]?.user_id || "",
    });
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!canCreateTask) {
      showToast("Only admins can create tasks", "error");
      return;
    }
    setCreating(true);
    try {
      await tasksApi.create({
        ...newTask,
        description: newTask.description || null,
        due_date: newTask.due_date ? new Date(newTask.due_date).toISOString() : null,
      });
      setNewTask({ ...initialTask, project_id: newTask.project_id, assigned_to: newTask.assigned_to });
      showToast("Task created", "success");
      await loadData();
    } catch (error) {
      showToast(getApiError(error, "Unable to create task"), "error");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusUpdate = async (taskId, status) => {
    try {
      await tasksApi.updateStatus(taskId, status);
      showToast("Status updated", "success");
      await loadData();
    } catch (error) {
      showToast(getApiError(error, "Unable to update status"), "error");
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await tasksApi.remove(taskId);
      showToast("Task deleted", "success");
      await loadData();
    } catch (error) {
      showToast(getApiError(error, "Unable to delete task"), "error");
    }
  };

  if (loading) return <Loading label="Loading tasks..." />;

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>Tasks</h2>
          <p>Filter, assign, and update team work.</p>
        </div>
      </div>

      {adminProjects.length > 0 && (
        <form className="panel form-grid task-form" onSubmit={handleCreate}>
          <label>
            Title
            <input
              value={newTask.title}
              onChange={(event) => setNewTask({ ...newTask, title: event.target.value })}
              minLength="2"
              required
            />
          </label>
          <label>
            Project
            <select value={newTask.project_id} onChange={(event) => handleProjectForNewTask(event.target.value)} required>
              {adminProjects.map((project) => (
                <option value={project.id} key={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Assign to
            <select
              value={newTask.assigned_to}
              onChange={(event) => setNewTask({ ...newTask, assigned_to: event.target.value })}
              required
            >
              {(selectedProject?.members || []).map((member) => (
                <option value={member.user_id} key={member.user_id}>
                  {getMemberLabel(selectedProject, member.user_id, user.id)} - {member.role}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due date
            <input
              type="datetime-local"
              value={newTask.due_date}
              onChange={(event) => setNewTask({ ...newTask, due_date: event.target.value })}
            />
          </label>
          <label className="wide">
            Description
            <input
              value={newTask.description}
              onChange={(event) => setNewTask({ ...newTask, description: event.target.value })}
            />
          </label>
          <button className="button" disabled={creating}>
            {creating ? "Creating..." : "Create task"}
          </button>
        </form>
      )}

      <div className="filters">
        <label>
          Project
          <select value={filters.project_id} onChange={(event) => setFilters({ ...filters, project_id: event.target.value })}>
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {tasks.length === 0 ? (
        <EmptyState title="No tasks created yet" message="Change filters or create the first task." />
      ) : (
        <div className="list">
          {tasks.map((task) => {
            const project = projectById.get(task.project_id);
            const isAssigned = task.assigned_to === user.id;
            const isAdmin = isAccountAdmin;

            return (
              <article className={`list-item task-item ${task.is_overdue ? "overdue" : ""}`} key={task.id}>
                <div>
                  <h4>{task.title}</h4>
                  <p>
                    {project?.name || "Unknown project"} - Due {formatDate(task.due_date)}
                  </p>
                  {task.description && <p>{task.description}</p>}
                </div>
                <div className="task-actions">
                  {task.is_overdue && <span className="badge badge-danger">Overdue</span>}
                  <span className="pill">{getStatusLabel(task.status)}</span>
                  <span className="muted">{getMemberLabel(project, task.assigned_to, user.id)}</span>
                  {isAssigned && (
                    <select value={task.status} onChange={(event) => handleStatusUpdate(task.id, event.target.value)}>
                      {STATUSES.map((status) => (
                        <option value={status.value} key={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {isAdmin && (
                    <button className="button button-danger" onClick={() => handleDelete(task.id)}>
                      Delete
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
