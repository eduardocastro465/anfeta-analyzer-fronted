"use client";

import {  useState } from "react";
import { LoginForm } from "@/components/login-form";
import { ChatBot } from "@/components/chat-bot";

import type { Colaborador, Actividad } from "@/lib/types";
import { logout, validateSession } from "../lib/api";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentColaborador, setCurrentColaborador] =
    useState<Colaborador | null>(null);
  const [userActividades, setUserActividades] = useState<Actividad[]>([]);


  const handleLogin = (colaborador: Colaborador, actividades: Actividad[]) => {
    localStorage.setItem("colaborador", JSON.stringify(colaborador));
    localStorage.setItem("actividades", JSON.stringify(actividades));

    setCurrentColaborador(colaborador);
    setUserActividades(actividades);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    const ok = await logout();
    if (ok) {
      setIsLoggedIn(false);
      setCurrentColaborador(null);
      setUserActividades([]);
    }
  };

  if (!isLoggedIn || !currentColaborador) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <ChatBot
      colaborador={currentColaborador}
      actividades={userActividades}
      onLogout={handleLogout}
    />
  );
}
