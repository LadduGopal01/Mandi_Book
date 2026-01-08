import { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const login = async (id, pass) => {
    try {
      const apiUrl = import.meta.env.VITE_SHEET_API_URL;
      const sheetName = import.meta.env.VITE_SHEET_LOGIN_NAME;

      const response = await fetch(`${apiUrl}?sheet=${sheetName}`);
      const result = await response.json();

      if (!result.success || !result.data) return false;

      const rows = result.data;
      // Columns: A=Serial, B=Name, C=ID, D=Pass, E=Role, F=Page Access
      let matched = null;

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (r[2] === id && r[3] === pass) {
          // Parse page access (Column F / Index 5)
          const pageAccessRaw = r[5];
          const pageAccess = pageAccessRaw
            ? String(pageAccessRaw).split(',').map(p => p.trim()).filter(Boolean)
            : [];

          matched = {
            id: r[2],
            name: r[1],
            role: r[4],
            pageAccess: pageAccess
          };
          break;
        }
      }

      if (matched) {
        setUser(matched);
        return true;
      }

      return false;

    } catch (err) {
      console.error("Login error:", err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
