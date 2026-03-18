import { useState, useCallback } from "react";
import { validatePassword } from "@/app/actions";

export function useAdminAuth() {
  const [adminPassword, setAdminPassword] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("coffee_admin_password");
    }
    return null;
  });

  const handleLogin = useCallback(async () => {
    const password = prompt("Please enter the admin password to login:");
    if (password) {
      const isValid = await validatePassword(password);
      if (isValid) {
        setAdminPassword(password);
        localStorage.setItem("coffee_admin_password", password);
      } else {
        alert("Incorrect password. Access denied.");
      }
    }
  }, []);

  const handleLogout = useCallback(() => {
    if (confirm("Are you sure you want to log out of brewer mode?")) {
      setAdminPassword(null);
      localStorage.removeItem("coffee_admin_password");
    }
  }, []);

  return { adminPassword, setAdminPassword, handleLogin, handleLogout };
}
