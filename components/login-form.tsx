"use client";

import { useState, useEffect } from "react";
import { fetchColaboradores, SignIn, validateSession } from "@/lib/api";
import type { Colaborador, Actividad } from "@/lib/types";
import {
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Moon,
  Sun,
  ChevronDown,
} from "lucide-react";
import Image from "next/image";

interface LoginFormProps {
  onLogin: (colaborador: Colaborador, actividades: Actividad[]) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [colaboradorInfo, setColaboradorInfo] = useState<Colaborador | null>(null);
  const [isLoadingColaboradores, setIsLoadingColaboradores] = useState(true);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // 1. Verificación segura del tema (solo en el cliente)
    if (typeof window !== "undefined") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(isDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", isDark);
    }

    // 2. Iniciar verificación de sesión
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    setIsCheckingSession(true);
    try {
      const user = await validateSession();
      
      if (user && user.email) {
        const colaboradoresData = await fetchColaboradores();
        setColaboradores(colaboradoresData);

        const colaboradorActivo = colaboradoresData.find(
          (c) => c.email === user.email,
        );

        if (colaboradorActivo) {
          // 3. Guardado seguro en localStorage
          if (typeof window !== "undefined") {
            localStorage.setItem("colaborador", JSON.stringify(colaboradorActivo));
            localStorage.setItem("actividades", JSON.stringify([]));
          }
          onLogin(colaboradorActivo, []);
          return;
        }
      }
      await loadColaboradores();
    } catch (err) {
      console.error("Error al verificar sesión:", err);
      await loadColaboradores();
    } finally {
      setIsCheckingSession(false);
    }
  };

  const loadColaboradores = async () => {
    setIsLoadingColaboradores(true);
    setError(null);
    try {
      const data = await fetchColaboradores();
      setColaboradores(data);
    } catch (err) {
      setError("Error al cargar colaboradores. Verifica tu conexión.");
      console.error(err);
    } finally {
      setIsLoadingColaboradores(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (typeof window !== "undefined") {
      document.documentElement.classList.toggle("dark", newTheme === "dark");
    }
  };

  useEffect(() => {
    if (selectedId) {
      const colaborador = colaboradores.find((c) => c._id === selectedId);
      setColaboradorInfo(colaborador || null);
    } else {
      setColaboradorInfo(null);
    }
  }, [selectedId, colaboradores]);

  const handleAcceder = async () => {
    if (!colaboradorInfo) return;
    
    try {
      const user = await SignIn(colaboradorInfo.email);
      if (user) {
        if (typeof window !== "undefined") {
          localStorage.setItem("colaborador", JSON.stringify(colaboradorInfo));
          localStorage.setItem("actividades", JSON.stringify([]));
        }
        onLogin(colaboradorInfo, []);
      }
    } catch (err) {
      setError("No se pudo iniciar sesión correctamente.");
    }
  };

  const getDisplayName = (colaborador: Colaborador) => {
    if (colaborador.firstName || colaborador.lastName) {
      return `${colaborador.firstName || ""} ${colaborador.lastName || ""}`.trim();
    }
    return colaborador.email.split("@")[0];
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#6841ea] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900 font-sans">
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm flex items-center justify-center hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors shadow-sm"
      >
        {theme === "light" ? <Moon className="w-4 h-4 text-gray-700" /> : <Sun className="w-4 h-4 text-gray-300" />}
      </button>

      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <Image
                src="/icono.webp"
                alt="Chat"
                width={100}
                height={100}
                className="object-contain rounded-full drop-shadow-[0_0_8px_rgba(104,65,234,0.5)]"
              />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Asistente de Tareas</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Selecciona tu usuario para comenzar</p>
          </div>

          <div className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50/70 dark:bg-red-900/20 backdrop-blur-sm rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-red-700 dark:text-red-300 text-xs mb-1">{error}</p>
                  <button onClick={loadColaboradores} className="text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Reintentar
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 px-1">Colaborador</label>
              {isLoadingColaboradores ? (
                <div className="flex items-center justify-center p-4 bg-gray-50/50 dark:bg-neutral-800/50 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-[#6841ea]" />
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="w-full h-12 px-3 bg-white/70 dark:bg-neutral-800/70 border-0 rounded-lg text-gray-900 dark:text-white focus:ring-1 focus:ring-[#6841ea] appearance-none text-sm"
                  >
                    <option value="">Selecciona tu usuario...</option>
                    {colaboradores.map((c) => (
                      <option key={c._id} value={c._id}>{getDisplayName(c)}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>

            {colaboradorInfo && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="p-4 bg-gray-50/50 dark:bg-neutral-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {colaboradorInfo.avatar ? (
                      <img src={colaboradorInfo.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 bg-[#6841ea]/10 rounded-full flex items-center justify-center">
                        <span className="text-[#6841ea] font-bold text-sm">{getDisplayName(colaboradorInfo).charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">{getDisplayName(colaboradorInfo)}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-xs truncate">{colaboradorInfo.email}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAcceder}
                  className="w-full h-11 rounded-lg font-medium bg-[#6841ea] hover:bg-[#5a36d4] text-white shadow-sm flex items-center justify-center transition-all"
                >
                  Iniciar Sesión <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}