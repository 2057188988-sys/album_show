import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api, getToken, setToken } from './api.js';
import Login from './pages/Login.jsx';
import Shop from './pages/Shop.jsx';

const AuthContext = createContext(null);
export function useAuth() {
  return useContext(AuthContext);
}

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const login = (token, nextUser) => {
    setToken(token);
    setUser(nextUser);
  };
  const logout = () => {
    setToken(null);
    setUser(null);
  };

  if (!ready) return <div className="loading-screen">加载中…</div>;

  return (
    <AuthContext.Provider value={{ user, login, logout, setUser }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/shop/:username" element={<Shop />} />
          <Route path="*" element={<Navigate to={user ? '/shop/me' : '/login'} replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}