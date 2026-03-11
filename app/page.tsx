"use client";

import { useState, useEffect } from "react";
import {
  obtenerPreferenciasUsuario,
  guardarPreferenciasUsuario,
} from "@/lib/api";
import { LoginForm } from "@/components/LoginForm";
import { ChatContainer } from "@/components/ChatContainer";
import type { Colaborador, Actividad } from "@/lib/types";
import { logout } from "@/lib/api";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentColaborador, setCurrentColaborador] =
    useState<Colaborador | null>(null);
  const [userActividades, setUserActividades] = useState<Actividad[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [preferencias, setPreferencias] = useState({
    tema: "AUTO",
    velocidadVoz: 1,
    idiomaVoz: "es-MX",
  });
  // 🔹 Recuperar sesión
  useEffect(() => {
    try {
      const savedColaborador = localStorage.getItem("colaborador");
      const savedActividades = localStorage.getItem("actividades");

      if (savedColaborador && savedActividades) {
        setCurrentColaborador(JSON.parse(savedColaborador));
        setUserActividades(JSON.parse(savedActividades));
        setIsLoggedIn(true);
      }
      obtenerPreferenciasUsuario().then((res) => {
        if (res.success && res.preferencias) {
          setPreferencias(res.preferencias);
          localStorage.setItem("tema", res.preferencias.tema);
        }
      });
    } catch (error) {
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSession = () => {
    localStorage.removeItem("colaborador");
    localStorage.removeItem("actividades");
  };

  // 🔹 Login
  const handleLogin = async (
    colaborador: Colaborador,
    actividades: Actividad[],
  ) => {
    localStorage.setItem("colaborador", JSON.stringify(colaborador));
    localStorage.setItem("actividades", JSON.stringify(actividades));

    const prefs = await obtenerPreferenciasUsuario();
    if (prefs.success) setPreferencias(prefs.preferencias);
    localStorage.setItem("tema", prefs.preferencias.tema);
    setCurrentColaborador(colaborador);
    setUserActividades(actividades);
    setIsLoggedIn(true);
  };

  // 🔹 Logout DEFINITIVO
  const handleLogout = async () => {
    try {
      await logout(); // backend (cookies / jwt)
    } catch (e) {
    } finally {
      clearSession();
      setIsLoggedIn(false);
      setCurrentColaborador(null);
      setUserActividades([]);
      setPreferencias({ tema: "AUTO", velocidadVoz: 1, idiomaVoz: "es-MX" });
    }
  };

  // 🔹 Función para navegar a reportes
  const handleViewReports = () => {
    // Redirige a la página de reportes (ColaboradoresView)
    window.location.href = "/reporte-del-dia";
  };

  // 🔹 Login
  if (!isLoggedIn || !currentColaborador) {
    return <LoginForm onLogin={handleLogin} />;
  }

  // 🔹 Chat
  return (
    <ChatContainer
      key={currentColaborador.email}
      colaborador={currentColaborador}
      actividades={userActividades}
      onLogout={handleLogout}
      onViewReports={handleViewReports} // 🔹 Pasa la función al ChatContainer
      preferencias={preferencias} // ← nuevo
      onGuardarPreferencias={async (nuevasPrefs) => {
        // ← nuevo
        const result = await guardarPreferenciasUsuario(nuevasPrefs);
        if (result.success) setPreferencias(nuevasPrefs);
        localStorage.setItem("tema", nuevasPrefs.tema);
      }}
    />
  );
}
