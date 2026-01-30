"use client";

import {
  Bot,
  Target,
  CheckCircle2,
  ListChecks,
  Headphones,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageItem } from "./MessageItem";
import { MessageListProps } from "@/lib/types";
import { verificarDescripcion } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";

export function MessageList({
  messages,
  isTyping,
  theme,
  onVoiceMessageClick,
  scrollRef,
  assistantAnalysis,
  onOpenReport,
  onStartVoiceMode,
  reportConfig = {
    horaInicio: 17,
    minutoInicio: 30,
    horaFin: 24,
    minutoFin: 59,
  },
}: MessageListProps) {
  // ✅ Estado para almacenar IDs de tareas con descripción guardada
  const [tareasConDescripcion, setTareasConDescripcion] = useState<Set<string>>(
    new Set(),
  );

  const isReportTimeWindow = () => {
    const now = new Date();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
    const startTotalMinutes =
      reportConfig.horaInicio * 60 + reportConfig.minutoInicio;
    const endTotalMinutes = reportConfig.horaFin * 60 + reportConfig.minutoFin;
    return (
      currentTotalMinutes >= startTotalMinutes &&
      currentTotalMinutes <= endTotalMinutes
    );
  };

  const esHoraReporte = isReportTimeWindow();

  // const verificarDescripciones = useCallback(async () => {
  //   if (!assistantAnalysis?.sessionId) return;
  //   const response = await verificarDescripcion(assistantAnalysis.sessionId);

  //   if (response.valida) {
  //     setTareasConDescripcion(new Set(response.tareasConDescripcion));
  //   }
  // }, [assistantAnalysis?.sessionId]);

  // ✅ Función para verificar tareas con descripción
  const verificarTareasConDescripcion = useCallback(async () => {
    if (!assistantAnalysis?.sessionId) return;
  }, [assistantAnalysis?.sessionId]);

  // ✅ useEffect: Verificar cada 10 segundos
  useEffect(() => {
    if (!assistantAnalysis) return;

    // Verificar inmediatamente al montar
    verificarTareasConDescripcion();

    // Intervalo de 10 segundos
    const interval = setInterval(() => {
      verificarTareasConDescripcion();
    }, 10000);

    return () => clearInterval(interval);
  }, [assistantAnalysis?.sessionId, verificarTareasConDescripcion]);

  // ✅ useEffect: Escuchar evento personalizado cuando se guardan explicaciones
  useEffect(() => {
    const handleExplanationsSaved = () => {
      console.log("🔄 Evento: Explicaciones guardadas - Actualizando lista...");
      // Verificar inmediatamente después de guardar
      setTimeout(() => {
        verificarTareasConDescripcion();
      }, 1000); // Pequeño delay para que el backend procese
    };

    window.addEventListener("explanations-saved", handleExplanationsSaved);

    return () => {
      window.removeEventListener("explanations-saved", handleExplanationsSaved);
    };
  }, [verificarTareasConDescripcion]);

  // ✅ Filtrar actividades y tareas SIN descripción
  const actividadesConTareasPendientes =
    assistantAnalysis?.data.revisionesPorActividad
      .map((revision) => {
        // Filtrar tareas que NO tienen descripción guardada
        const tareasPendientes = revision.tareasConTiempo.filter((tarea) => {
          return !tareasConDescripcion.has(tarea.id);
        });

        return {
          ...revision,
          tareasConTiempo: tareasPendientes,
        };
      })
      .filter((revision) => revision.tareasConTiempo.length > 0) || [];

  const hayTareas = actividadesConTareasPendientes.length > 0;

  const totalTareasPendientes = actividadesConTareasPendientes.reduce(
    (sum, revision) => sum + revision.tareasConTiempo.length,
    0,
  );

  // useEffect para hacer scroll
  useEffect(() => {
    if (assistantAnalysis && hayTareas && scrollRef.current) {
      const timer = setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [assistantAnalysis, hayTareas, scrollRef]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          theme={theme}
          onVoiceMessageClick={onVoiceMessageClick}
        />
      ))}

      {/* Panel de actividades - SOLO TAREAS SIN DESCRIPCIÓN */}
      {assistantAnalysis && hayTareas && (
        <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-4">
          <div
            className={`w-full max-w-xl rounded-lg border overflow-hidden ${
              theme === "dark"
                ? "bg-[#1a1a1a] border-[#2a2a2a]"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="px-3 py-2 border-b border-[#2a2a2a] bg-[#6841ea]/10 flex justify-between items-center">
              <h4 className="font-medium text-xs flex items-center gap-2 uppercase tracking-wide">
                <Target className="w-4 h-4" />
                Tareas Pendientes ({totalTareasPendientes})
              </h4>
              <Badge
                variant="secondary"
                className="text-[10px] bg-[#6841ea] text-white border-none"
              >
                {esHoraReporte ? "MODO REPORTE" : "PLANIFICACIÓN"}
              </Badge>
            </div>

            <div className="p-3 space-y-4">
              {actividadesConTareasPendientes.map((revision, idx) => {
                const actividad = assistantAnalysis.data.actividades.find(
                  (act) => act.id === revision.actividadId,
                );

                if (!actividad) return null;

                return (
                  <div
                    key={revision.actividadId}
                    className={`p-3 rounded-lg ${theme === "dark" ? "bg-[#252527]" : "bg-gray-50"}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx % 3 === 0
                              ? "bg-blue-500/20 text-blue-500"
                              : idx % 3 === 1
                                ? "bg-purple-500/20 text-purple-500"
                                : "bg-pink-500/20 text-pink-500"
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <h5 className="font-medium text-sm">
                          {actividad.titulo}
                        </h5>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {actividad.horario}
                      </Badge>
                    </div>

                    {revision.tareasConTiempo.length > 0 && (
                      <div className="ml-8 mt-2 space-y-2">
                        {revision.tareasConTiempo.map((tarea) => (
                          <div
                            key={tarea.id}
                            className={`p-2 rounded ${theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{tarea.nombre}</span>
                              <Badge
                                variant={
                                  tarea.prioridad === "ALTA"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-[10px]"
                              >
                                {tarea.prioridad}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div
              className={`p-3 border-t ${theme === "dark" ? "border-[#2a2a2a] bg-[#252527]" : "border-gray-200 bg-gray-50"}`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">
                    {totalTareasPendientes} tarea
                    {totalTareasPendientes !== 1 ? "s" : ""} sin descripción
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      if (esHoraReporte) {
                        onOpenReport?.();
                      } else {
                        onStartVoiceMode?.();
                      }
                    }}
                    size="sm"
                    className="flex-1 bg-[#6841ea] hover:bg-[#5a36d4] text-xs h-8"
                  >
                    {esHoraReporte ? (
                      <>
                        <ListChecks className="w-3.5 h-3.5 mr-2" />
                        Reportar Actividades
                      </>
                    ) : (
                      <>
                        <Headphones className="w-3.5 h-3.5 mr-2" />
                        Explicar Tareas
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      onStartVoiceMode?.();
                    }}
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs h-8"
                  >
                    Continuar Chat
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sin tareas pendientes */}
      {assistantAnalysis && !hayTareas && (
        <div className="animate-in slide-in-from-bottom-2 duration-300 flex justify-center">
          <div
            className={`p-4 rounded-lg border text-center ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}
          >
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <h4 className="font-semibold mb-1 text-sm">
              ✅ Todas las tareas explicadas
            </h4>
            <p className="text-xs text-gray-500">
              No hay tareas pendientes por describir.
            </p>
          </div>
        </div>
      )}

      {isTyping && (
        <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
          <div
            className={`rounded-lg px-4 py-3 flex items-center gap-2 ${theme === "dark" ? "bg-[#2a2a2a] text-white" : "bg-gray-100 text-gray-900"}`}
          >
            <Bot className="w-4 h-4 text-[#6841ea]" />
            <div className="flex gap-1">
              <div
                className="w-1.5 h-1.5 bg-[#6841ea] rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-1.5 h-1.5 bg-[#6841ea] rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-1.5 h-1.5 bg-[#6841ea] rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
