import { createContext, useContext, useMemo, useState } from "react";
import { authApi } from "../api/auth";

const AuthContext = createContext(null);

function readStoredUser() {
  const value = localStorage.getItem("ttm_user");
  if (!value) return null;
  const user = JSON.parse(value);
  return { role: "member", ...user };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(localStorage.getItem("ttm_token"));

  const saveSession = (data) => {
    localStorage.setItem("ttm_token", data.access_token);
    localStorage.setItem("ttm_user", JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
  };

  const login = async (payload) => {
    const { data } = await authApi.login(payload);
    saveSession(data);
  };

  const signup = async (payload) => {
    const { data } = await authApi.signup(payload);
    saveSession(data);
  };

  const logout = () => {
    localStorage.removeItem("ttm_token");
    localStorage.removeItem("ttm_user");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      signup,
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
