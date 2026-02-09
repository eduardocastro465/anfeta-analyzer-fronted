"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { validateSession, obtenerHistorialSidebar } from "@/lib/api";
import type { Colaborador, AssistantAnalysis } from "@/lib/types";
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
  BarChart3,
  X,
  AlertCircle,
} from "lucide-react";
import { ChatBot } from "./chat-bot";
import { obtenerMensajesConversacion } from "@/lib/historial.service";
import { useReporteData } from "@/app/reporte-del-dia/hooks/useReporteData";
import DashboardView from "@/app/reporte-del-dia/components/DashboardView";
import type { ApiResponse, Usuario, Actividad, DetalleView } from "@/app/reporte-del-dia/types/reporteTypes";

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

type ViewMode = 'chat' | 'reportes';

export function ChatContainer({
  colaborador,
  actividades,
  onLogout,
}: ChatContainerProps) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversaciones, setConversaciones] = useState<ConversacionSidebar[]>([]);
  const [conversacionActiva, setConversacionActiva] = useState<string | null>(null);
  const [sidebarCargando, setSidebarCargando] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('chat');

  // ESTADOS NUEVOS PARA DASHBOARD
  const [currentDashboardView, setCurrentDashboardView] = useState<DetalleView>('dashboard');
  const [selectedDashboardUser, setSelectedDashboardUser] = useState<Usuario | null>(null);
  const [selectedDashboardActivity, setSelectedDashboardActivity] = useState<Actividad | null>(null);

  const [mensajesRestaurados, setMensajesRestaurados] = useState<MensajeHistorial[]>([]);
  const [analisisRestaurado, setAnalisisRestaurado] = useState<AssistantAnalysis | null>(null);
  const [cargandoConversacion, setCargandoConversacion] = useState(false);

  const {
    datos: reporteData,
    loading: loadingReportes,
    error: errorReportes,
    refreshing: refreshingReportes,
    tiempoUltimaCarga,
    cargarDatosReales,
  } = useReporteData();

  const router = useRouter();

  const conversacionesAgrupadas = conversaciones.reduce(
    (acc, conv) => {
      const dia = obtenerLabelDia(conv.createdAt);
      acc[dia] ??= [];
      acc[dia].push(conv);
      return acc;
    },
    {} as Record<string, ConversacionSidebar[]>,
  );

  // HANDLER DE NAVEGACIÓN PARA DASHBOARD
  const handleDashboardNavigate = useCallback((view: DetalleView, user?: Usuario, activity?: Actividad) => {
    console.log("🚀 Dashboard Navigate - Vista:", view,
      "Usuario:", user?.nombre,
      "Actividad:", activity?.titulo);
    setCurrentDashboardView(view);
    setSelectedDashboardUser(user || null);
    setSelectedDashboardActivity(activity || null);
  }, []);

  const handleViewUser = useCallback((usuario: Usuario) => {
    console.log("Ver usuario:", usuario.nombre);
    handleDashboardNavigate('usuario', usuario);
  }, [handleDashboardNavigate]);

  const handleViewActivity = useCallback((actividad: Actividad, usuario: Usuario) => {
    console.log("Ver actividad:", actividad.titulo);
    handleDashboardNavigate('actividad', usuario, actividad);
  }, [handleDashboardNavigate]);

  const handleBackToDashboard = useCallback(() => {
    console.log("Volviendo al dashboard");
    handleDashboardNavigate('dashboard');
  }, [handleDashboardNavigate]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", newTheme === "dark");
    }
  };

  const handleViewReports = () => {
    if (colaborador.email === "jjohn@pprin.com") {
      setViewMode('reportes');
      // Resetear el dashboard a vista general
      handleDashboardNavigate('dashboard');
      cargarDatosReales(true);
    } else {
      alert("Solo el administrador puede acceder a los reportes");
    }
  };

  const handleBackToChat = () => {
    setViewMode('chat');
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.add("dark");
  }, []);

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

  // En ChatContainer.tsx

const restaurarConversacion = async (sessionId: string) => {
  try {
    setCargandoConversacion(true);
    setConversacionActiva(sessionId);
    
    console.log("📥 Restaurando conversación:", sessionId);
    
    const response = await obtenerMensajesConversacion(sessionId);
    
    console.log("🔍 Respuesta completa del backend:", response);
    
    if (response.success && response.data) { // ✅ Acceder a response.data
      const { data } = response; // ✅ Destructurar data
      
      console.log("✅ Conversación obtenida:", {
        mensajes: data.mensajes?.length || 0,
        tieneAnalisis: !!data.ultimoAnalisis,
        estadoConversacion: data.estadoConversacion,
        nombreConversacion: data.nombreConversacion
      });

      // ✅ Acceder a través de data
      setMensajesRestaurados(data.mensajes || []);
      setAnalisisRestaurado(data.ultimoAnalisis || null);
      
      // Actualizar nombre si cambió
      if (data.nombreConversacion) {
        const convIndex = conversaciones.findIndex(c => c.sessionId === sessionId);
        if (convIndex !== -1 && 
            conversaciones[convIndex].nombreConversacion !== data.nombreConversacion) {
          actualizarNombreConversacion(sessionId, data.nombreConversacion);
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

  const seleccionarConversacion = async (conv: ConversacionSidebar) => {
    if (conversacionActiva === conv.sessionId) return;
    await restaurarConversacion(conv.sessionId);
    setViewMode('chat');
  };

  const crearNuevaConversacion = () => {
    setConversacionActiva(null);
    setMensajesRestaurados([]);
    setAnalisisRestaurado(null);
    setViewMode('chat');
  };

  const agregarNuevaConversacion = (nuevaConv: ConversacionSidebar) => {
    setConversaciones((prev) => [nuevaConv, ...prev]);
    setConversacionActiva(nuevaConv.sessionId);
    setViewMode('chat');
  };

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
      className={`min-h-screen font-['Arial'] flex ${theme === "dark" ? "bg-[#101010] text-white" : "bg-white text-gray-900"
        }`}
    >
      {/* ========== SIDEBAR DE HISTORIAL ========== */}
      <aside
        className={`fixed left-0 top-0 h-screen z-30 flex flex-col transition-all duration-300 ${sidebarOpen ? "w-64" : "w-0"
          } ${theme === "dark"
            ? "bg-[#0a0a0a] border-r border-[#1a1a1a]"
            : "bg-gray-50 border-r border-gray-200"
          }`}
      >
        {sidebarOpen && (
          <>
            {/* Header del Sidebar */}
            <div
              className={`p-4 border-b ${theme === "dark" ? "border-[#1a1a1a]" : "border-gray-200"
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {viewMode === 'reportes' ? (
                    <BarChart3 className="w-5 h-5 text-[#6841ea]" />
                  ) : (
                    <History className="w-5 h-5 text-[#6841ea]" />
                  )}
                  <h2 className="font-semibold text-sm">
                    {viewMode === 'reportes' ? 'Reportes' : 'Historial'}
                  </h2>
                </div>

                {viewMode === 'reportes' && (
                  <button
                    onClick={handleBackToChat}
                    className={`p-1.5 rounded-lg ${theme === "dark"
                      ? "hover:bg-[#1a1a1a]"
                      : "hover:bg-gray-100"
                      }`}
                    title="Volver al chat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {viewMode === 'chat' ? (
              <>
                {/* Botón Nueva Conversación */}
                <div className="p-3">
                  <button
                    onClick={crearNuevaConversacion}
                    className={`w-full p-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ${theme === "dark"
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
                        <div
                          className={`px-2 py-1.5 text-xs font-medium uppercase tracking-wider ${theme === "dark" ? "text-gray-500" : "text-gray-400"
                            }`}
                        >
                          {dia}
                        </div>
                        <div className="space-y-1">
                          {convs.map((conv) => (
                            <button
                              key={conv.sessionId}
                              onClick={() => seleccionarConversacion(conv)}
                              disabled={
                                cargandoConversacion &&
                                conversacionActiva === conv.sessionId
                              }
                              className={`w-full text-left p-2.5 rounded-lg transition-all group relative ${conversacionActiva === conv.sessionId
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
                                  className={`w-4 h-4 mt-0.5 shrink-0 ${conversacionActiva === conv.sessionId
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
              </>
            ) : (
              <div className="flex-1 p-4">
                <div className="space-y-3">
                  <button
                    onClick={handleBackToChat}
                    className={`w-full p-3 rounded-lg text-left ${theme === "dark"
                      ? "bg-[#1a1a1a] hover:bg-[#252525]"
                      : "bg-gray-100 hover:bg-gray-200"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 text-[#6841ea]" />
                      <span>Volver al Chat</span>
                    </div>
                  </button>

                  <div className={`p-3 rounded-lg ${theme === "dark"
                    ? "bg-[#1a1a1a]"
                    : "bg-gray-100"
                    }`}>
                    <h3 className="text-sm font-medium mb-2">Vista de Reportes</h3>
                    <p className="text-xs text-gray-500">
                      Panel administrativo de actividades
                    </p>
                    {reporteData && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-500">
                          Usuarios: {reporteData.estadisticas.totalUsuarios}
                        </p>
                        <p className="text-xs text-gray-500">
                          Actividades: {reporteData.estadisticas.totalTareas}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Footer del Sidebar */}
            <div
              className={`p-3 border-t ${theme === "dark" ? "border-[#1a1a1a]" : "border-gray-200"
                }`}
            >
              <p
                className={`text-xs text-center ${theme === "dark" ? "text-gray-600" : "text-gray-400"
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
        className={`fixed z-40 top-1/2 -translate-y-1/2 transition-all duration-300 p-1.5 rounded-r-lg ${sidebarOpen ? "left-64" : "left-0"
          } ${theme === "dark"
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

      {/* ========== CONTENIDO PRINCIPAL ========== */}
      <div
        className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-16" : "ml-0"
          }`}
      >
        {viewMode === 'chat' ? (
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
            showLogoutDialog={showLogoutDialog}
            setShowLogoutDialog={setShowLogoutDialog}
            onViewReports={handleViewReports}
          />
        ) : (
          <div className="h-screen flex flex-col">
            {/* Header personalizado para reportes - SIN FONDO NI BORDES */}
            <div className={`p-4 ${theme === "dark"
              ? "bg-transparent"
              : "bg-transparent"
              }`}>
              <div className="max-w-full mx-auto px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <h1 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      Reportes de Actividades
                    </h1>
                    <p className={`text-sm ${theme === "dark"
                      ? "text-gray-400"
                      : "text-gray-600"
                      }`}>
                      Panel administrativo • {colaborador.email}
                      {colaborador.email === "jjohn@pprin.com" && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                          Admin
                        </span>
                      )}
                    </p>
                  
                    {currentDashboardView !== 'dashboard' && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={handleBackToDashboard}
                          className="px-3 py-1 text-xs bg-[#2a2a2a] hover:bg-[#353535] text-gray-300 rounded-lg"
                        >
                          ← Dashboard Principal
                        </button>
                        {currentDashboardView === 'usuario' && selectedDashboardUser && (
                          <span className="text-xs text-gray-400">
                            Usuario: {selectedDashboardUser.nombre}
                          </span>
                        )}
                        {currentDashboardView === 'actividad' && selectedDashboardActivity && (
                          <span className="text-xs text-gray-400 truncate max-w-xs">
                            Actividad: {selectedDashboardActivity.titulo.substring(0, 50)}...
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {currentDashboardView !== 'dashboard' && (
                    <button
                      onClick={handleBackToDashboard}
                      className={`px-3 py-1.5 text-xs rounded-lg ${theme === "dark"
                        ? "bg-[#2a2a2a] hover:bg-[#353535] text-gray-300"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        }`}
                    >
                      ← Dashboard
                    </button>
                  )}
                  <button
                    onClick={handleBackToChat}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${theme === "dark"
                      ? "bg-transparent hover:bg-[#353535] text-gray-300"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                  >
                     Volver al Chat
                  </button>
                </div>
              </div>
            </div>
            {/* Contenido de reportes - MÁS ANCHO */}
            <div className="flex-1 overflow-auto">
              <div className="max-w-[95vw] mx-auto p-4">
                {loadingReportes ? (
                  <div className={`rounded-lg p-8 text-center ${theme === "dark"
                    ? "bg-[#1a1a1a]"
                    : "bg-white"}`}>
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#6841ea]" />
                    <p className="mt-4 text-gray-500">Cargando datos de reportes...</p>
                  </div>
                ) : errorReportes ? (
                  <div className={`rounded-lg p-6 ${theme === "dark"
                    ? "bg-red-900/20 border-red-500/20"
                    : "bg-red-50 border-red-200"}`}>
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <div>
                        <h3 className="font-bold">Error al cargar reportes</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {errorReportes}
                        </p>
                        <button
                          onClick={() => cargarDatosReales(true)}
                          className="mt-3 px-4 py-2 bg-[#6841ea] text-white rounded-lg text-sm"
                        >
                          Reintentar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : reporteData ? (
                  <div className={`rounded-xl ${theme === "dark"
                    ? "bg-gradient-to-b from-[#0a0a0a] to-[#111111] shadow-[0_0_40px_-10px_rgba(255,255,255,0.15)] border border-white/20"
                    : "bg-gradient-to-b from-white to-gray-50 shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] border border-gray-200"
                    }`}>
                    <DashboardView
                      estadisticas={reporteData.estadisticas}
                      data={reporteData.data}
                      currentView={currentDashboardView}
                      selectedUser={selectedDashboardUser}
                      selectedActivity={selectedDashboardActivity}
                      onNavigate={handleDashboardNavigate}
                    />
                  </div>
                ) : (
                  <div className={`rounded-lg p-8 text-center ${theme === "dark"
                    ? "bg-[#1a1a1a]"
                    : "bg-white"}`}>
                    <BarChart3 className="w-12 h-12 mx-auto text-gray-400" />
                    <h3 className="mt-4 text-lg font-bold">Sin datos de reportes</h3>
                    <p className="text-gray-500 mt-2">
                      No hay datos disponibles para mostrar.
                    </p>
                    <button
                      onClick={() => cargarDatosReales(true)}
                      className="mt-4 px-4 py-2 bg-[#6841ea] text-white rounded-lg"
                    >
                      Cargar Datos
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}