import { useState, useCallback, useEffect } from "react";
import { validatePassword } from "@/app/actions";

export function useAdminAuth() {
  const [adminPassword, setAdminPassword] = useState<string | null>(null);

  // Read after mount so server and client render the same initial markup
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAdminPassword(localStorage.getItem("coffee_admin_password"));
  }, []);

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
