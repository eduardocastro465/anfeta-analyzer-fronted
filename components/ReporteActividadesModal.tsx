import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Mic,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  XCircle,
} from "lucide-react";

import type { ActividadDiaria } from "@/lib/types";
import { guardarReporteTarde } from "@/lib/api";
import { useAudioRecorder } from "./hooks/useAudioRecorder";
import { transcribirAudioCliente } from "@/lib/transcription";
import { useAutoSendVoice } from "@/components/Audio/UseAutoSendVoiceOptions";
import { useVoiceSynthesis } from "@/components/hooks/use-voice-synthesis";

interface ReporteActividadesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  theme: "light" | "dark";
  actividadesDiarias: ActividadDiaria[];
  onGuardarReporte: () => Promise<void>;
  guardandoReporte: boolean;
  turno: "mañana" | "tarde";
  tareasSeleccionadas?: Set<string>;
  actividadesConTareas?: any[];
  tareasReportadasMap?: Map<string, any>;
}

// ✅ TIPOS SIMPLIFICADOS - Eliminados pasos de motivo
type PasoModal =
  | "inicial"
  | "preguntando-que-hizo"
  | "escuchando-que-hizo"
  | "guardando-que-hizo"
  | "completado";

type EstadoTarea = "pendiente" | "completada" | "no-completada";

export function ReporteActividadesModal({
  isOpen,
  onOpenChange,
  theme,
  actividadesDiarias,
  onGuardarReporte,
  guardandoReporte,
  turno,
  tareasSeleccionadas = new Set(),
  actividadesConTareas = [],
  tareasReportadasMap = new Map(),
}: ReporteActividadesModalProps) {
  // ==================== ESTADOS ====================
  const [paso, setPaso] = useState<PasoModal>("inicial");
  const [indiceActual, setIndiceActual] = useState(0);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [estadoTareas, setEstadoTareas] = useState<Map<string, EstadoTarea>>(
    new Map(),
  );

  // ==================== REFS ====================
  const isProcessingRef = useRef(false);
  const pasoActualRef = useRef<PasoModal>(paso);
  const indiceRef = useRef(indiceActual);
  const speakRef = useRef<(text: string) => Promise<void>>(async () => {});
  const stopVoiceRef = useRef<() => void>(() => {});
  const startRecordingRef = useRef<() => void>(() => {});
  const cancelRecordingRef = useRef<() => void>(() => {});

  // ==================== HOOKS ====================
  const audioRecorder = useAudioRecorder();
  const { speak: speakText, stop: stopVoice, isSpeaking } = useVoiceSynthesis();

  // Mantener refs actualizadas
  useEffect(() => {
    pasoActualRef.current = paso;
  }, [paso]);
  useEffect(() => {
    indiceRef.current = indiceActual;
  }, [indiceActual]);
  useEffect(() => {
    speakRef.current = speakText;
  }, [speakText]);
  useEffect(() => {
    stopVoiceRef.current = stopVoice;
  }, [stopVoice]);

  // Resetear al abrir
  useEffect(() => {
    if (isOpen) {
      setEstadoTareas(new Map());
      setPaso("inicial");
      setIndiceActual(0);
    }
  }, [isOpen]);

  // ==================== TAREAS A REPORTAR ====================
  const tareasParaReportar = useMemo(() => {
    if (tareasSeleccionadas.size > 0 && actividadesConTareas.length > 0) {
      const tareas: any[] = [];
      actividadesConTareas.forEach((revision) => {
        revision.tareasNoReportadas?.forEach((tarea: any) => {
          if (tareasSeleccionadas.has(tarea.id)) {
            tareas.push({
              pendienteId: tarea.id,
              nombre: tarea.nombre,
              descripcion: tarea.descripcion || "",
              duracionMin: tarea.duracionMin || 0,
              terminada: false,
              motivoNoCompletado: null,
              actividadId: revision.actividadId,
              completadoLocal: false,
              motivoLocal: "",
              actividadTitulo: revision.actividadTitulo,
              actividadHorario: revision.actividadHorario,
            });
          }
        });
      });
      return tareas;
    }
    return actividadesDiarias.flatMap((actividad) =>
      actividad.pendientes
        .filter((p) => p.descripcion && p.descripcion.trim().length > 0)
        .map((p) => ({
          pendienteId: p.pendienteId,
          nombre: p.nombre,
          descripcion: p.descripcion || "",
          duracionMin: p.duracionMin,
          terminada: p.terminada,
          motivoNoCompletado: p.motivoNoCompletado || null,
          actividadId: actividad.actividadId,
          completadoLocal: false,
          motivoLocal: "",
          actividadTitulo: actividad.titulo,
          actividadHorario: `${actividad.horaInicio} - ${actividad.horaFin}`,
        })),
    );
  }, [tareasSeleccionadas, actividadesConTareas, actividadesDiarias]);

  const tareasRef = useRef(tareasParaReportar);
  useEffect(() => {
    tareasRef.current = tareasParaReportar;
  }, [tareasParaReportar]);

  const tareaActual = tareasParaReportar[indiceActual];
  const totalTareas = tareasParaReportar.length;
  const progreso = totalTareas > 0 ? (indiceActual / totalTareas) * 100 : 0;

  // ==================== HOOK AUTO-SEND VOICE ====================
  const {
    isRecording,
    isTranscribing,
    audioLevel,
    startVoiceRecording,
    cancelVoiceRecording,
    cleanup,
  } = useAutoSendVoice({
    silenceThreshold: 3000,
    speechThreshold: 8,
    transcriptionService: transcribirAudioCliente,
    stopRecording: audioRecorder.stopRecording,
    startRecording: audioRecorder.startRecording,
    onTranscriptionComplete: async (transcript) => {
      await procesarRespuesta(transcript, pasoActualRef.current);
    },
    onError: (error) => {
      setErrorValidacion(error.message || "Error al procesar el audio");
      setTimeout(() => {
        setErrorValidacion(null);
        setPaso("preguntando-que-hizo");
      }, 3000);
    },
  });

  // Mantener refs de grabación actualizadas
  useEffect(() => {
    startRecordingRef.current = startVoiceRecording;
  }, [startVoiceRecording]);
  useEffect(() => {
    cancelRecordingRef.current = cancelVoiceRecording;
  }, [cancelVoiceRecording]);

  // ==================== HELPERS ====================
  const actualizarEstadoTarea = useCallback(
    (pendienteId: string, estado: EstadoTarea) => {
      setEstadoTareas((prev) => {
        const next = new Map(prev);
        next.set(pendienteId, estado);
        return next;
      });
    },
    [],
  );

  const avanzarSiguienteTarea = useCallback(async (indice: number) => {
    const total = tareasRef.current.length;
    if (indice + 1 < total) {
      setIndiceActual(indice + 1);
      setPaso("preguntando-que-hizo");
    } else {
      setPaso("completado");
      speakRef
        .current("¡Excelente! Has completado el reporte de todas tus tareas.")
        .catch(() => {});
    }
  }, []);

  // ==================== ✅ PROCESAR RESPUESTA SIMPLIFICADO ====================
  const procesarRespuesta = async (
    transcript: string,
    pasoCapturado: PasoModal,
  ) => {
    if (isProcessingRef.current) return;

    if (transcript.length < 3) {
      setErrorValidacion("La respuesta es muy corta.");
      setTimeout(() => {
        setErrorValidacion(null);
        setPaso("preguntando-que-hizo");
      }, 2000);
      return;
    }

    isProcessingRef.current = true;
    const indiceCapturado = indiceRef.current;
    const tareaCapturada = tareasRef.current[indiceCapturado];

    try {
      setPaso("guardando-que-hizo");

      const data = await guardarReporteTarde({
        actividadId: tareaCapturada.actividadId,
        pendienteId: tareaCapturada.pendienteId,
        queHizo: transcript,
      });

      if (data.success) {
        if (data.completada) {
          // ✅ Completada
          actualizarEstadoTarea(tareaCapturada.pendienteId, "completada");
          speakRef.current("Perfecto, tarea completada.").catch(() => {});
          setTimeout(() => avanzarSiguienteTarea(indiceCapturado), 1500);
        } else {
          // ❌ No completada - LA IA YA GUARDÓ EL MOTIVO
          actualizarEstadoTarea(tareaCapturada.pendienteId, "no-completada");

          // Mensaje confirmando que se registró
          const mensaje = data.motivoNoCompletado
            ? "Entendido. Siguiente tarea."
            : "Registrado. Siguiente tarea.";

          speakRef.current(mensaje).catch(() => {});
          setTimeout(() => avanzarSiguienteTarea(indiceCapturado), 1500);
        }
      } else {
        throw new Error(data.error || "Error al guardar");
      }
    } catch (error) {
      console.error("❌ Error procesando:", error);
      setErrorValidacion("Hubo un problema. Inténtalo de nuevo.");
      setTimeout(() => {
        setErrorValidacion(null);
        setPaso("preguntando-que-hizo");
      }, 3000);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // ==================== INICIAR REPORTE ====================
  const iniciarReporte = async () => {
    if (totalTareas === 0) {
      alert("No hay tareas para reportar");
      return;
    }
    setIndiceActual(0);
    setEstadoTareas(new Map());
    setPaso("preguntando-que-hizo");
  };

  // ==================== 🔥 EFECTO: PREGUNTAR QUÉ HIZO ====================
  useEffect(() => {
    if (paso !== "preguntando-que-hizo" || !isOpen) return;

    const tarea = tareasRef.current[indiceRef.current];
    if (!tarea) return;

    const total = tareasRef.current.length;
    const texto = `Tarea ${indiceRef.current + 1} de ${total}: ${tarea.nombre}. ¿Qué hiciste en esta tarea?`;

    stopVoiceRef.current();
    speakRef.current(texto).catch(() => {});

    const estimatedSpeechMs = Math.max(3000, texto.length * 55);
    const timer = setTimeout(() => {
      if (pasoActualRef.current === "preguntando-que-hizo") {
        setPaso("escuchando-que-hizo");
        setTimeout(() => {
          if (pasoActualRef.current === "escuchando-que-hizo") {
            startRecordingRef.current();
          }
        }, 500);
      }
    }, estimatedSpeechMs);

    return () => {
      clearTimeout(timer);
      stopVoiceRef.current();
    };
  }, [paso, isOpen]);

  // ==================== LIMPIAR AL CERRAR ====================
  useEffect(() => {
    if (!isOpen) {
      cancelRecordingRef.current();
      stopVoiceRef.current();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // ==================== CANCELAR ====================
  const handleCancelar = async () => {
    cancelRecordingRef.current();
    stopVoiceRef.current();
    onOpenChange(false);
    setPaso("inicial");
    setEstadoTareas(new Map());
  };

  // ==================== BADGE DE ESTADO ====================
  const getEstadoBadge = (estado: EstadoTarea | undefined) => {
    if (!estado || estado === "pendiente") return null;
    if (estado === "completada")
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400">
          <CheckCircle2 className="w-3 h-3" /> Completada
        </span>
      );
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 dark:text-red-400">
        <XCircle className="w-3 h-3" /> No completada
      </span>
    );
  };

  // ==================== RENDER ====================
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleCancelar();
        else onOpenChange(true);
      }}
    >
      <DialogContent
        className={`max-w-2xl max-h-[85vh] overflow-hidden flex flex-col rounded-lg border shadow-lg ${
          theme === "dark"
            ? "bg-gradient-to-b from-[#1a1a1a] to-[#252527] border-orange-900/50"
            : "bg-gradient-to-b from-white to-orange-50/30 border-orange-200"
        }`}
      >
        <DialogHeader
          className={`pb-2 border-b bg-gradient-to-r from-orange-500/10 to-amber-500/10 ${
            theme === "dark" ? "border-orange-900/50" : "border-orange-200"
          }`}
        >
          <DialogTitle className="flex items-center justify-between text-base font-bold">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-500" />
              {turno === "tarde"
                ? "Explicación de Tareas Completadas"
                : "Reporte de Actividades del Día"}
            </div>
            {paso !== "inicial" && paso !== "completado" && (
              <Badge
                variant="outline"
                className="text-xs font-bold bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-700 dark:text-orange-300 border-orange-500/50"
              >
                Tarea {indiceActual + 1} de {totalTareas}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* ========== INICIAL ========== */}
          {paso === "inicial" && (
            <div className="space-y-3">
              <div
                className={`p-3 rounded-lg border ${
                  theme === "dark"
                    ? "bg-gradient-to-br from-[#2a2a2a] to-[#1f1f1f] border-orange-900/30"
                    : "bg-gradient-to-br from-white to-orange-50/50 border-orange-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm">
                    {turno === "tarde"
                      ? "Tareas seleccionadas para explicar"
                      : "Tareas a reportar"}
                  </span>
                  <Badge className="text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white border-none">
                    {totalTareas} tareas
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">
                  El asistente te preguntará qué hiciste en cada tarea. La IA
                  analizará automáticamente si la completaste.
                </p>
              </div>

              {totalTareas === 0 ? (
                <div className="text-center py-6">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-2">
                    <AlertCircle className="w-6 h-6 text-yellow-500" />
                  </div>
                  <p className="text-xs text-gray-500 font-medium">
                    No hay tareas para reportar.
                  </p>
                </div>
              ) : (
                <Button
                  onClick={iniciarReporte}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white h-10 font-bold shadow-md"
                >
                  <Mic className="w-4 h-4 mr-1.5" />
                  {turno === "tarde"
                    ? "Iniciar Explicación por Voz"
                    : "Iniciar Reporte por Voz"}
                </Button>
              )}
            </div>
          )}

          {/* ========== BARRA DE PROGRESO ========== */}
          {paso !== "inicial" && paso !== "completado" && (
            <div className="w-full h-1.5 bg-gray-200 dark:bg-[#2a2a2a] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500 shadow-sm"
                style={{ width: `${progreso}%` }}
              />
            </div>
          )}

          {/* ========== HISTORIAL TAREAS ANTERIORES ========== */}
          {paso !== "inicial" && paso !== "completado" && indiceActual > 0 && (
            <div
              className={`rounded-lg border p-2.5 space-y-1.5 ${
                theme === "dark"
                  ? "bg-[#1e1e1e] border-orange-900/20"
                  : "bg-gray-50 border-orange-100"
              }`}
            >
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                Tareas anteriores
              </p>
              {tareasParaReportar.slice(0, indiceActual).map((tarea, i) => {
                const estado = estadoTareas.get(tarea.pendienteId);
                return (
                  <div
                    key={tarea.pendienteId}
                    className={`flex items-center justify-between px-2 py-1 rounded-md text-xs border ${
                      estado === "completada"
                        ? theme === "dark"
                          ? "bg-green-900/20 border-green-800/40"
                          : "bg-green-50 border-green-200"
                        : estado === "no-completada"
                          ? theme === "dark"
                            ? "bg-red-900/20 border-red-800/40"
                            : "bg-red-50 border-red-200"
                          : "bg-transparent border-transparent"
                    }`}
                  >
                    <span className="text-gray-600 dark:text-gray-400 truncate max-w-[65%]">
                      <span className="font-bold mr-1">{i + 1}.</span>
                      {tarea.nombre}
                    </span>
                    {getEstadoBadge(estado)}
                  </div>
                );
              })}
            </div>
          )}

          {/* ========== TAREA ACTUAL ========== */}
          {tareaActual && paso !== "inicial" && paso !== "completado" && (
            <div
              className={`p-3 rounded-lg border transition-colors duration-300 ${
                estadoTareas.get(tareaActual.pendienteId) === "completada"
                  ? theme === "dark"
                    ? "bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-700/50"
                    : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300"
                  : estadoTareas.get(tareaActual.pendienteId) ===
                      "no-completada"
                    ? theme === "dark"
                      ? "bg-gradient-to-br from-red-900/20 to-red-800/20 border-red-700/50"
                      : "bg-gradient-to-br from-red-50 to-red-100/50 border-red-200"
                    : theme === "dark"
                      ? "bg-gradient-to-br from-[#2a2a2a] to-[#1f1f1f] border-orange-900/30"
                      : "bg-gradient-to-br from-white to-orange-50/50 border-orange-200"
              }`}
            >
              <div className="flex items-start gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-base font-bold shrink-0 border transition-colors duration-300 ${
                    estadoTareas.get(tareaActual.pendienteId) === "completada"
                      ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/50"
                      : estadoTareas.get(tareaActual.pendienteId) ===
                          "no-completada"
                        ? "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/50"
                        : theme === "dark"
                          ? "bg-orange-500/30 text-orange-300 border-orange-500/50"
                          : "bg-orange-500/20 text-orange-700 border-orange-500/50"
                  }`}
                >
                  {estadoTareas.get(tareaActual.pendienteId) ===
                  "completada" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : estadoTareas.get(tareaActual.pendienteId) ===
                    "no-completada" ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    indiceActual + 1
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold mb-0.5 text-sm">
                    {tareaActual.nombre}
                  </h4>
                  {tareaActual.descripcion &&
                    tareaActual.descripcion.trim().length > 0 && (
                      <p className="text-xs text-gray-500 mb-1.5">
                        {tareaActual.descripcion}
                      </p>
                    )}
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                    <span>{tareaActual.actividadTitulo}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5 text-orange-500" />
                      {tareaActual.duracionMin} min
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========== PREGUNTANDO QUÉ HIZO ========== */}
          {paso === "preguntando-que-hizo" && (
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center border border-orange-500/30 mx-auto">
                <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
              </div>
              <p className="text-xs text-gray-500 font-medium">
                El asistente está hablando...
              </p>
            </div>
          )}

          {/* ========== ESCUCHANDO QUÉ HIZO ========== */}
          {paso === "escuchando-que-hizo" && (
            <div className="text-center space-y-3">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse border border-red-500/40">
                  <Mic className="w-8 h-8 text-red-500" />
                </div>
                <div
                  className="absolute inset-0 rounded-full border-2 border-red-500 transition-all"
                  style={{
                    transform: `scale(${1 + audioLevel / 200})`,
                    opacity: audioLevel / 100,
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 font-medium">
                {isRecording
                  ? "Escuchando... (Deja de hablar 3 segundos para enviar)"
                  : isTranscribing
                    ? "Procesando audio..."
                    : "Preparando micrófono..."}
              </p>
              {isRecording && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                    Audio: {audioLevel.toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ========== GUARDANDO ========== */}
          {paso === "guardando-que-hizo" && (
            <div className="text-center space-y-3 py-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center border border-orange-500/30 mx-auto">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Analizando tu respuesta con IA...
              </p>
            </div>
          )}

          {/* ========== COMPLETADO ========== */}
          {paso === "completado" && (
            <div className="text-center space-y-3 py-4">
              <div
                className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center border-2 ${
                  theme === "dark"
                    ? "bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-500/50"
                    : "bg-gradient-to-br from-green-100 to-emerald-100 border-green-400"
                }`}
              >
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-bold">¡Reporte Completado!</h3>

              <div
                className={`rounded-lg border p-3 text-left space-y-1.5 ${
                  theme === "dark"
                    ? "bg-[#1e1e1e] border-orange-900/20"
                    : "bg-gray-50 border-orange-100"
                }`}
              >
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
                  Resumen de tareas
                </p>
                {tareasParaReportar.map((tarea, i) => {
                  const estado = estadoTareas.get(tarea.pendienteId);
                  return (
                    <div
                      key={tarea.pendienteId}
                      className={`flex items-center justify-between px-2 py-1 rounded-md text-xs border ${
                        estado === "completada"
                          ? theme === "dark"
                            ? "bg-green-900/20 border-green-800/40"
                            : "bg-green-50 border-green-200"
                          : theme === "dark"
                            ? "bg-red-900/20 border-red-800/40"
                            : "bg-red-50 border-red-200"
                      }`}
                    >
                      <span className="text-gray-600 dark:text-gray-400 truncate max-w-[65%]">
                        <span className="font-bold mr-1">{i + 1}.</span>
                        {tarea.nombre}
                      </span>
                      {getEstadoBadge(estado)}
                    </div>
                  );
                })}
                <div className="flex justify-center gap-4 pt-2 border-t border-gray-200 dark:border-gray-700 mt-1">
                  <span className="text-[10px] font-bold text-green-600 dark:text-green-400">
                    ✅{" "}
                    {
                      [...estadoTareas.values()].filter(
                        (e) => e === "completada",
                      ).length
                    }{" "}
                    completadas
                  </span>
                  <span className="text-[10px] font-bold text-red-500 dark:text-red-400">
                    ❌{" "}
                    {
                      [...estadoTareas.values()].filter(
                        (e) => e === "no-completada",
                      ).length
                    }{" "}
                    no completadas
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-9 font-bold border-green-500/50 hover:bg-green-500/10 hover:text-green-700 dark:hover:text-green-300"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Cerrar
              </Button>
            </div>
          )}

          {/* ========== ERROR ========== */}
          {errorValidacion && (
            <div
              className={`p-2.5 rounded-lg border animate-in slide-in-from-top duration-300 ${
                theme === "dark"
                  ? "bg-gradient-to-br from-red-900/30 to-red-800/30 border-red-500/50"
                  : "bg-gradient-to-br from-red-50 to-red-100 border-red-300"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  {errorValidacion}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ========== BOTÓN CANCELAR ========== */}
        {paso !== "inicial" && paso !== "completado" && (
          <div
            className={`flex justify-center p-3 border-t bg-gradient-to-r from-gray-50/50 to-orange-50/30 dark:from-[#1f1f1f] dark:to-[#2a2a2a] ${
              theme === "dark" ? "border-orange-900/50" : "border-orange-200"
            }`}
          >
            <Button
              variant="outline"
              onClick={handleCancelar}
              className="hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 hover:text-white hover:border-red-500 transition-all h-9 text-sm font-bold"
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              Cancelar Reporte
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
