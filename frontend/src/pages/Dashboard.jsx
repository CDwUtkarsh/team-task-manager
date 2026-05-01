import { useEffect, useMemo, useState } from "react";
import { getApiError } from "../api/client";
import { projectsApi } from "../api/projects";
import { tasksApi } from "../api/tasks";
import EmptyState from "../components/EmptyState.jsx";
import Loading from "../components/Loading.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatDate, getStatusLabel, getMemberLabel, STATUSES } from "../utils";

export default function Dashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const [taskResult, projectResult] = await Promise.all([tasksApi.list(), projectsApi.list()]);
        setTasks(taskResult.data);
        setProjects(projectResult.data);
      } catch (error) {
        showToast(getApiError(error, "Unable to load dashboard"), "error");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [showToast]);

  const stats = useMemo(() => {
    const byStatus = STATUSES.reduce((result, item) => ({ ...result, [item.value]: 0 }), {});
    tasks.forEach((task) => {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
    });
    return {
      total: tasks.length,
      overdue: tasks.filter((task) => task.is_overdue).length,
      byStatus,
      assignedToMe: tasks.filter((task) => task.assigned_to === user.id),
    };
  }, [tasks, user.id]);

  const projectName = (projectId) =>
    projects.find((project) => project.id === projectId)?.name || "Unknown project";

  if (loading) return <Loading label="Loading dashboard..." />;

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Current workload and task status.</p>
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span>Total tasks</span>
          <strong>{stats.total}</strong>
        </article>
        {STATUSES.map((status) => (
          <article key={status.value} className="stat-card">
            <span>{status.label}</span>
            <strong>{stats.byStatus[status.value]}</strong>
          </article>
        ))}
        <article className="stat-card danger">
          <span>Overdue</span>
          <strong>{stats.overdue}</strong>
        </article>
      </div>

      <div className="section-title">
        <h3>Assigned to you</h3>
      </div>
      {stats.assignedToMe.length === 0 ? (
        <EmptyState title="No tasks assigned to you" />
      ) : (
        <div className="list">
          {stats.assignedToMe.map((task) => (
            <article key={task.id} className={`list-item ${task.is_overdue ? "overdue" : ""}`}>
              <div>
                <h4>{task.title}</h4>
                <p>
                  {projectName(task.project_id)} - {getStatusLabel(task.status)} - Due{" "}
                  {formatDate(task.due_date)}
                </p>
              </div>
              <span className="pill">{getMemberLabel({ members: [] }, task.assigned_to, user.id)}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
