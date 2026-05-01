import api from "./client";

export const tasksApi = {
  list: (filters = {}) => api.get("/tasks/", { params: filters }),
  create: (payload) => api.post("/tasks/", payload),
  updateStatus: (taskId, status) => api.patch(`/tasks/${taskId}/status`, { status }),
  remove: (taskId) => api.delete(`/tasks/${taskId}`),
};
