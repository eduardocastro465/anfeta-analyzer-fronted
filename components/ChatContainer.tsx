"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { validateSession, obtenerHistorialSidebar } from "@/lib/api";
import type { Colaborador, Message, AssistantAnalysis } from "@/lib/types";
import type { MensajeHistorial } from "@/lib/interface/historial.interface";
import { obtenerLabelDia } from "@/util/labelDia";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
} from "lucide-react";
import { ChatBot } from "./chat-bot";
import { obtenerMensajesConversacion } from "@/lib/historial.service";

interface ChatContainerProps {
  colaborador: Colaborador;
  actividades: any[];
  onLogout: () => void;
}

export type ConversacionSidebar = {
  sessionId: string;
  userId: string;
  nombreConversacion?: string;
  estadoConversacion: string;
  createdAt: string;
  updatedAt?: string;
};

export function ChatContainer({
  colaborador,
  actividades,
  onLogout,
}: ChatContainerProps) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversaciones, setConversaciones] = useState<ConversacionSidebar[]>(
    [],
  );
  const [conversacionActiva, setConversacionActiva] = useState<string | null>(
    null,
  );
  const [sidebarCargando, setSidebarCargando] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  // Estados para restauración
  const [mensajesRestaurados, setMensajesRestaurados] = useState<
    MensajeHistorial[]
  >([]);
  const [analisisRestaurado, setAnalisisRestaurado] =
    useState<AssistantAnalysis | null>(null);
  const [cargandoConversacion, setCargandoConversacion] = useState(false);

  const router = useRouter();

  // Agrupar conversaciones por día
  const conversacionesAgrupadas = conversaciones.reduce(
    (acc, conv) => {
      const dia = obtenerLabelDia(conv.createdAt);
      acc[dia] ??= [];
      acc[dia].push(conv);
      return acc;
    },
    {} as Record<string, ConversacionSidebar[]>,
  );

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", newTheme === "dark");
    }
  };

  // Dark mode inicial
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.add("dark");
  }, []);

  // Inicialización
  useEffect(() => {
    const init = async () => {
      const user = await validateSession();
      if (!user) {
        router.replace("/");
        return;
      }

      await cargarHistorial();
    };

    init();
  }, [router]);

  // Cargar historial del sidebar
  const cargarHistorial = async () => {
    try {
      setSidebarCargando(true);
      const res = await obtenerHistorialSidebar();

      if (res.success && res.data) {
        setConversaciones(res.data);
      } else {
        setConversaciones([]);
      }
    } catch (error) {
      console.error("Error al cargar sidebar:", error);
      setConversaciones([]);
    } finally {
      setSidebarCargando(false);
    }
  };

  // ✅ Restaurar conversación
  const restaurarConversacion = async (sessionId: string) => {
    try {
      setCargandoConversacion(true);
      setConversacionActiva(sessionId);

      console.log("📥 Restaurando conversación:", sessionId);

      const response = await obtenerMensajesConversacion(sessionId);

      if (response.success) {
        console.log("✅ Conversación obtenida:", {
          mensajes: response.mensajes?.length || 0,
          tieneAnalisis: !!response.ultimoAnalisis,
          estadoConversacion: response.estadoConversacion,
        });

        setMensajesRestaurados(response.mensajes || []);
        setAnalisisRestaurado(response.ultimoAnalisis || null);

        // Actualizar nombre si cambió
        if (response.nombreConversacion) {
          const convIndex = conversaciones.findIndex(
            (c) => c.sessionId === sessionId,
          );
          if (
            convIndex !== -1 &&
            conversaciones[convIndex].nombreConversacion !==
              response.nombreConversacion
          ) {
            actualizarNombreConversacion(
              sessionId,
              response.nombreConversacion,
            );
          }
        }
      } else {
        console.warn("⚠️ No se pudo cargar la conversación");
        setMensajesRestaurados([]);
        setAnalisisRestaurado(null);
      }
    } catch (error: any) {
      console.error("❌ Error al restaurar conversación:", error);
      setMensajesRestaurados([]);
      setAnalisisRestaurado(null);
    } finally {
      setCargandoConversacion(false);
    }
  };

  // Seleccionar conversación
  const seleccionarConversacion = async (conv: ConversacionSidebar) => {
    // Si ya está activa, no hacer nada
    if (conversacionActiva === conv.sessionId) return;

    await restaurarConversacion(conv.sessionId);
  };

  // Crear nueva conversación
  const crearNuevaConversacion = () => {
    setConversacionActiva(null);
    setMensajesRestaurados([]);
    setAnalisisRestaurado(null);
  };

  // Agregar nueva conversación al sidebar
  const agregarNuevaConversacion = (nuevaConv: ConversacionSidebar) => {
    setConversaciones((prev) => [nuevaConv, ...prev]);
    setConversacionActiva(nuevaConv.sessionId);
  };

  // Actualizar nombre de conversación
  const actualizarNombreConversacion = (
    sessionId: string,
    nuevoNombre: string,
  ) => {
    setConversaciones((prev) =>
      prev.map((conv) =>
        conv.sessionId === sessionId
          ? {
              ...conv,
              nombreConversacion: nuevoNombre,
              updatedAt: new Date().toISOString(),
            }
          : conv,
      ),
    );
  };

  return (
    <div
      className={`min-h-screen font-['Arial'] flex ${
        theme === "dark" ? "bg-[#101010] text-white" : "bg-white text-gray-900"
      }`}
    >
      {/* ========== SIDEBAR DE HISTORIAL ========== */}
      <aside
        className={`fixed left-0 top-0 h-screen z-30 flex flex-col transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-0"
        } ${
          theme === "dark"
            ? "bg-[#0a0a0a] border-r border-[#1a1a1a]"
            : "bg-gray-50 border-r border-gray-200"
        }`}
      >
        {sidebarOpen && (
          <>
            {/* Header del Sidebar */}
            <div
              className={`p-4 border-b ${
                theme === "dark" ? "border-[#1a1a1a]" : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-[#6841ea]" />
                  <h2 className="font-semibold text-sm">Historial</h2>
                </div>
              </div>
            </div>

            {/* Botón Nueva Conversación */}
            <div className="p-3">
              <button
                onClick={crearNuevaConversacion}
                className={`w-full p-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  theme === "dark"
                    ? "bg-[#6841ea] hover:bg-[#5a36d4]"
                    : "bg-[#6841ea] hover:bg-[#5a36d4]"
                } text-white font-medium`}
              >
                <Plus className="w-4 h-4" />
                Nueva conversación
              </button>
            </div>

            {/* Lista de Conversaciones */}
            <ScrollArea className="flex-1 px-2 py-2">
              <div className="space-y-4">
                {Object.entries(conversacionesAgrupadas).map(([dia, convs]) => (
                  <div key={dia}>
                    {/* Label del día */}
                    <div
                      className={`px-2 py-1.5 text-xs font-medium uppercase tracking-wider ${
                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      {dia}
                    </div>
                    {/* Conversaciones del día */}
                    <div className="space-y-1">
                      {convs.map((conv) => (
                        <button
                          key={conv.sessionId}
                          onClick={() => seleccionarConversacion(conv)}
                          disabled={
                            cargandoConversacion &&
                            conversacionActiva === conv.sessionId
                          }
                          className={`w-full text-left p-2.5 rounded-lg transition-all group relative ${
                            conversacionActiva === conv.sessionId
                              ? theme === "dark"
                                ? "bg-[#6841ea]/20 border border-[#6841ea]/30"
                                : "bg-[#6841ea]/10 border border-[#6841ea]/20"
                              : theme === "dark"
                                ? "hover:bg-[#1a1a1a]"
                                : "hover:bg-gray-100"
                          } ${cargandoConversacion && conversacionActiva === conv.sessionId ? "opacity-50" : ""}`}
                        >
                          <div className="flex items-start gap-2">
                            <MessageSquare
                              className={`w-4 h-4 mt-0.5 shrink-0 ${
                                conversacionActiva === conv.sessionId
                                  ? "text-[#6841ea]"
                                  : theme === "dark"
                                    ? "text-gray-500"
                                    : "text-gray-400"
                              }`}
                            />

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {conv.nombreConversacion ||
                                  `Chat ${new Date(conv.createdAt).toLocaleDateString("es-MX")}`}
                              </p>

                              <p className="text-xs text-gray-500 mt-0.5">
                                {conv.updatedAt
                                  ? new Date(conv.updatedAt).toLocaleTimeString(
                                      "es-MX",
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )
                                  : new Date(conv.createdAt).toLocaleTimeString(
                                      "es-MX",
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                              </p>
                            </div>

                            {/* Indicadores */}
                            {cargandoConversacion &&
                              conversacionActiva === conv.sessionId && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                  <Loader2 className="w-4 h-4 animate-spin text-[#6841ea]" />
                                </div>
                              )}

                            {conversacionActiva === conv.sessionId &&
                              isTyping &&
                              !cargandoConversacion && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                  <Loader2 className="w-4 h-4 animate-spin text-[#6841ea]" />
                                </div>
                              )}
                          </div>

                          {/* Indicador de conversación activa */}
                          {conversacionActiva === conv.sessionId && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#6841ea] rounded-r-full" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {sidebarCargando && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-[#6841ea]" />
                    <span className="text-xs text-gray-500 ml-2">
                      Cargando historial...
                    </span>
                  </div>
                )}

                {!sidebarCargando && conversaciones.length === 0 && (
                  <div className="p-4 text-center">
                    <p className="text-xs text-gray-500">
                      No hay conversaciones anteriores
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer del Sidebar */}
            <div
              className={`p-3 border-t ${
                theme === "dark" ? "border-[#1a1a1a]" : "border-gray-200"
              }`}
            >
              <p
                className={`text-xs text-center ${
                  theme === "dark" ? "text-gray-600" : "text-gray-400"
                }`}
              >
                {new Date().toLocaleDateString("es-MX", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </p>
            </div>
          </>
        )}
      </aside>

      {/* Botón para toggle del sidebar */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`fixed z-40 top-1/2 -translate-y-1/2 transition-all duration-300 p-1.5 rounded-r-lg ${
          sidebarOpen ? "left-64" : "left-0"
        } ${
          theme === "dark"
            ? "bg-[#1a1a1a] hover:bg-[#252525] text-gray-400 hover:text-white border-y border-r border-[#2a2a2a]"
            : "bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 border-y border-r border-gray-200"
        }`}
        title={sidebarOpen ? "Cerrar sidebar" : "Abrir sidebar"}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {/* ========== COMPONENTE CHAT ========== */}
      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        <ChatBot
          colaborador={colaborador}
          actividades={actividades}
          onLogout={onLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
          conversacionActiva={conversacionActiva}
          mensajesRestaurados={mensajesRestaurados}
          analisisRestaurado={analisisRestaurado}
          onNuevaConversacion={agregarNuevaConversacion}
          onActualizarNombre={actualizarNombreConversacion}
          onActualizarTyping={setIsTyping}
        />
      </div>
    </div>
  );
}
