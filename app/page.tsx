"use client";

import { useState, useEffect, useCallback } from "react";
import { LoginForm } from "@/components/login-form";
import { ChatContainer } from "@/components/ChatContainer";
import type { Colaborador, Actividad } from "@/lib/types";
import { logout, validateSession } from "@/lib/api";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentColaborador, setCurrentColaborador] =
    useState<Colaborador | null>(null);
  const [userActividades, setUserActividades] = useState<Actividad[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem("colaborador");
    localStorage.removeItem("actividades");
  }, []);

  // Logout - now using useCallback to avoid dependency issues
  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      clearSession();
      setIsLoggedIn(false);
      setCurrentColaborador(null);
      setUserActividades([]);
      setIsLoading(false);
    }
  }, [clearSession]);

  // VALIDACIÓN REAL DE SESIÓN
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const session = await validateSession();

        if (!mounted) return;

        // No hay sesión válida
        if (!session) {
          handleLogout();
          return;
        }

        // Sesión válida - restaurar desde localStorage
        const savedColaborador = localStorage.getItem("colaborador");
        const savedActividades = localStorage.getItem("actividades");

        if (savedColaborador && savedActividades) {
          setCurrentColaborador(JSON.parse(savedColaborador));
          setUserActividades(JSON.parse(savedActividades));
          setIsLoggedIn(true);
        } else {
          // Datos faltantes en localStorage - hacer logout
          handleLogout();
        }
      } catch (error) {
        console.error("Error en init:", error);
        if (mounted) {
          handleLogout();
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [handleLogout]); //  Ahora incluye handleLogout como dependencia

  // Login
  const handleLogin = useCallback(
    (colaborador: Colaborador, actividades: Actividad[]) => {
      localStorage.setItem("colaborador", JSON.stringify(colaborador));
      localStorage.setItem("actividades", JSON.stringify(actividades));
      setCurrentColaborador(colaborador);
      setUserActividades(actividades);
      setIsLoggedIn(true);
    },
    [],
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Cargando sesión...
      </div>
    );
  }

  if (!isLoggedIn || !currentColaborador) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <ChatContainer
      colaborador={currentColaborador}
      actividades={userActividades}
      onLogout={handleLogout}
      onViewReports={() => (window.location.href = "/reporte-del-dia")}
    />
  );
}
