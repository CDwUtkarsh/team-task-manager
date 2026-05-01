import api from "./client";

export const projectsApi = {
  list: () => api.get("/projects/"),
  create: (payload) => api.post("/projects/", payload),
  addMember: (projectId, payload) => api.post(`/projects/${projectId}/add-member`, payload),
  removeMember: (projectId, userId) => api.delete(`/projects/${projectId}/members/${userId}`),
  remove: (projectId) => api.delete(`/projects/${projectId}`),
};
