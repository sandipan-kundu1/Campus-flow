import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import api from "../api/client";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Setup request interceptor to automatically add Authorization token
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        const storedToken = localStorage.getItem("token");
        if (storedToken) {
          config.headers.Authorization = `Bearer ${storedToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Read stored user and token on startup
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setLoading(false);

    return () => {
      api.interceptors.request.eject(requestInterceptor);
    };
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { token: jwtToken, user: userProfile } = res.data;
    localStorage.setItem("token", jwtToken);
    localStorage.setItem("user", JSON.stringify(userProfile));
    setToken(jwtToken);
    setUser(userProfile);
    return userProfile;
  };

  const register = async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password });
    const { token: jwtToken, user: userProfile } = res.data;
    localStorage.setItem("token", jwtToken);
    localStorage.setItem("user", JSON.stringify(userProfile));
    setToken(jwtToken);
    setUser(userProfile);
    return userProfile;
  };

  const loginWithGoogle = async (credential) => {
    const res = await api.post("/auth/google", { credential });
    const { token: jwtToken, user: userProfile } = res.data;
    localStorage.setItem("token", jwtToken);
    localStorage.setItem("user", JSON.stringify(userProfile));
    setToken(jwtToken);
    setUser(userProfile);
    return userProfile;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
        isAuthenticated: !!token
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
