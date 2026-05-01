import { useEffect, useState } from "react";
import { getApiError } from "../api/client";
import { projectsApi } from "../api/projects";
import { usersApi } from "../api/users";
import EmptyState from "../components/EmptyState.jsx";
import Loading from "../components/Loading.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { getMemberLabel, getUserLabel } from "../utils";

export default function Projects() {
  const { user } = useAuth();
  const isAccountAdmin = user?.role === "admin";
  const { showToast } = useToast();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "" });
  const [memberForms, setMemberForms] = useState({});

  const loadProjects = async () => {
    setLoading(true);
    try {
      const [projectResult, userResult] = await Promise.all([projectsApi.list(), usersApi.list()]);
      setProjects(projectResult.data);
      setUsers(userResult.data);
    } catch (error) {
      showToast(getApiError(error, "Unable to load projects"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setCreating(true);
    try {
      await projectsApi.create({
        name: newProject.name,
        description: newProject.description || null,
      });
      setNewProject({ name: "", description: "" });
      showToast("Project created", "success");
      await loadProjects();
    } catch (error) {
      showToast(getApiError(error, "Unable to create project"), "error");
    } finally {
      setCreating(false);
    }
  };

  const handleAddMember = async (event, projectId) => {
    event.preventDefault();
    const form = memberForms[projectId] || { user_id: "", role: "member" };
    try {
      await projectsApi.addMember(projectId, form);
      setMemberForms({ ...memberForms, [projectId]: { user_id: "", role: "member" } });
      showToast("Member added", "success");
      await loadProjects();
    } catch (error) {
      showToast(getApiError(error, "Unable to add member"), "error");
    }
  };

  const handleRemoveMember = async (projectId, memberId) => {
    if (!window.confirm("Remove this member from the project?")) return;
    try {
      await projectsApi.removeMember(projectId, memberId);
      showToast("Member removed", "success");
      await loadProjects();
    } catch (error) {
      showToast(getApiError(error, "Unable to remove member"), "error");
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Delete this project and all of its tasks?")) return;
    try {
      await projectsApi.remove(projectId);
      showToast("Project deleted", "success");
      await loadProjects();
    } catch (error) {
      showToast(getApiError(error, "Unable to delete project"), "error");
    }
  };

  if (loading) return <Loading label="Loading projects..." />;

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>Projects</h2>
          <p>Organize team membership and project access.</p>
        </div>
      </div>

      {isAccountAdmin && (
        <form className="panel form-grid" onSubmit={handleCreate}>
          <label>
            Project name
            <input
              value={newProject.name}
              onChange={(event) => setNewProject({ ...newProject, name: event.target.value })}
              minLength="2"
              required
            />
          </label>
          <label>
            Description
            <input
              value={newProject.description}
              onChange={(event) => setNewProject({ ...newProject, description: event.target.value })}
            />
          </label>
          <button className="button" disabled={creating}>
            {creating ? "Creating..." : "Create project"}
          </button>
        </form>
      )}

      {projects.length === 0 ? (
        <EmptyState title="No projects created yet" message="Create a project to invite members." />
      ) : (
        <div className="project-grid">
          {projects.map((project) => {
            const isAdmin = isAccountAdmin;
            const memberForm = memberForms[project.id] || { user_id: "", role: "member" };
            const memberIds = new Set(project.members.map((member) => member.user_id));
            const availableUsers = users.filter((item) => !memberIds.has(item.id));

            return (
              <article className="project-card" key={project.id}>
                <div className="card-header">
                  <div>
                    <h3>{project.name}</h3>
                    <p>{project.description || "No description"}</p>
                  </div>
                  <span className="pill">{user.role}</span>
                </div>

                <div className="section-title compact">
                  <h4>Members</h4>
                </div>
                <div className="members-list">
                  {project.members.map((member) => (
                    <div className="member-row" key={member.user_id}>
                      <span>
                        {getMemberLabel(project, member.user_id, user.id)}
                      </span>
                      <span className="muted">{member.role}</span>
                      {isAdmin && member.user_id !== user.id && (
                        <button
                          className="text-button danger-text"
                          onClick={() => handleRemoveMember(project.id, member.user_id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {isAdmin && (
                  <>
                    <form className="member-form" onSubmit={(event) => handleAddMember(event, project.id)}>
                      <select
                        aria-label="User"
                        value={memberForm.user_id}
                        onChange={(event) =>
                          setMemberForms({
                            ...memberForms,
                            [project.id]: { ...memberForm, user_id: event.target.value },
                          })
                        }
                        required
                      >
                        <option value="">Select user</option>
                        {availableUsers.map((candidate) => (
                          <option value={candidate.id} key={candidate.id}>
                            {getUserLabel(candidate, user.id)}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label="Role"
                        value={memberForm.role}
                        onChange={(event) =>
                          setMemberForms({
                            ...memberForms,
                            [project.id]: { ...memberForm, role: event.target.value },
                          })
                        }
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button className="button button-secondary" disabled={availableUsers.length === 0}>
                        Add
                      </button>
                    </form>
                    <button className="button button-danger full" onClick={() => handleDeleteProject(project.id)}>
                      Delete project
                    </button>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
