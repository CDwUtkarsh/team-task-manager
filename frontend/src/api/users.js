import api from "./client";

export const usersApi = {
  list: () => api.get("/users/"),
};
