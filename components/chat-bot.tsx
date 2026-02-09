"use client";

import React from "react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  validateSession,
  obtenerHistorialSidebar,
  actualizarEstadoPendientes,
  validarReportePendiente,
  obtenerActividadesConRevisiones,
  guardarReporteTarde,
  sendPendienteValidarYGuardar,
  chatGeneralIA,
  consultarIAProyecto,
} from "@/lib/api";
import type {
  ActividadDiaria,
  PendienteEstadoLocal,
  Message,
  ConversacionSidebar,
  AssistantAnalysis,
  TaskExplanation,
  ChatBotProps,
  ChatStep,
} from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Bot,
  FileText,
  LogOut,
  AlertCircle,
  PartyPopper,
  Clock,
  CheckCircle2,
  Brain,
  Target,
  User,
  Mail,
  Check,
} from "lucide-react";
import { getDisplayName } from "@/util/utils-chat";
import { useVoiceSynthesis } from "@/components/hooks/use-voice-synthesis";
import { ChatHeader } from "./ChatHeader";
import { VoiceGuidanceFlow } from "./VoiceGuidanceFlow";
import { useVoiceRecognition } from "@/components/hooks/useVoiceRecognition";
import { useVoiceMode } from "@/components/hooks/useVoiceMode";
import { useConversationHistory } from "@/components/hooks/useConversationHistory";
import {
  getCurrentActivity,
  getCurrentTask,
  isClearCommand,
  cleanExplanationTranscript,
  validateExplanationLength,
} from "@/util/voiceModeLogic";
import { MessageList, NoTasksMessage, TasksPanel } from "./chat/MessageList";
import { messageTemplates } from "./chat/messageTemplates";
import { ChatInputBar } from "./chat/ChatInputBar";
import { ReporteActividadesModal } from "./ReporteActividadesModal";
import { useMessageRestoration } from "@/components/hooks/useMessageRestoration";

export function ChatBot({
  colaborador,
  onLogout,
  theme: externalTheme,
  onToggleTheme: externalToggle,
  conversacionActiva,
  mensajesRestaurados,
  analisisRestaurado,
  onNuevaConversacion,
  onActualizarNombre,
  onActualizarTyping,
  onViewReports
}: ChatBotProps) {
  // ==================== REFS ====================
  const scrollRef = useRef<HTMLDivElement>(null);
  const welcomeSentRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const explanationProcessedRef = useRef<boolean>(false);
  const assistantAnalysisRef = useRef<AssistantAnalysis | null>(null);

  // ==================== HOOKS PERSONALIZADOS ====================
  const voiceRecognition = useVoiceRecognition();
  const voiceMode = useVoiceMode();
  const conversationHistory = useConversationHistory();
  const {
    speak: speakText,
    stop: stopVoice,
    isSpeaking,
    rate,
    changeRate,
  } = useVoiceSynthesis();

  // ==================== CONSTANTES ====================
  const displayName = getDisplayName(colaborador);
  const router = useRouter();

  // ==================== ESTADOS PRINCIPALES ====================
  const [step, setStep] = useState<ChatStep>("welcome");
  const [userInput, setUserInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [assistantAnalysis, setAssistantAnalysis] =
    useState<AssistantAnalysis | null>(null);
  const [isLoadingIA, setIsLoadingIA] = useState(false);

  // ==================== DIÁLOGOS Y MODALS ====================
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [mostrarModalReporte, setMostrarModalReporte] = useState(false);

  // ==================== SIDEBAR ====================
  const [sidebarCargado, setSidebarCargado] = useState(false);
  const [sidebarCargando, setSidebarCargando] = useState(true);
  const [data, setData] = useState<ConversacionSidebar[]>([]);

  // ==================== REPORTE DE ACTIVIDADES ====================
  const [actividadesDiarias] = useState<ActividadDiaria[]>([]);
  const [pendientesReporte, setPendientesReporte] = useState<
    PendienteEstadoLocal[]
  >([]);
  const [guardandoReporte, setGuardandoReporte] = useState(false);

  // ==================== MODAL VOZ REPORTE ====================
  const [indicePendienteActual, setIndicePendienteActual] = useState(0);
  const [pasoModalVoz, setPasoModalVoz] = useState<
    "esperando" | "escuchando" | "procesando"
  >("esperando");
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>("");
  const [isUserEditing, setIsUserEditing] = useState(false);

  // ==================== HORARIOS REPORTE ====================
  const [horaInicioReporte] = useState("1:33 PM");
  const [horaFinReporte] = useState("11:59 PM");

  // ==================== PiP ====================
  const [isPiPMode, setIsPiPMode] = useState(false);
  const [isInPiPWindow, setIsInPiPWindow] = useState(false);

  // ==================== ✅ NUEVO: ESTADOS PARA TAREAS SELECCIONADAS ====================
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [filteredActivitiesForVoice, setFilteredActivitiesForVoice] = useState<any[]>([]);

  // ==================== VALORES COMPUTADOS ====================
  const canUserType =
    step !== "loading-analysis" && step !== "error" && !voiceMode.voiceMode;

  const [chatMode, setChatMode] = useState<"normal" | "ia">("ia");

  const [internalTheme, setInternalTheme] = useState<"light" | "dark">("dark");
  const theme = externalTheme ?? internalTheme;

  // ==================== FUNCIONES ====================

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.add("dark");
    if (welcomeSentRef.current) return;
    welcomeSentRef.current = true;

    const init = async () => {
      const user = await validateSession();
      if (!user) {
        router.replace("/");
        return;
      }

      addMessageWithTyping(
        "bot",
        `¡Hola ${displayName}! 👋 Soy tu asistente.`,
        500,
      );

      addMessageWithTyping(
        "system",
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Brain className="w-4 h-4 text-[#6841ea]" />
          {"Obteniendo análisis de tus actividades..."}
        </div>,
      );

      fetchAssistantAnalysis();
    };

    init();
  }, []);

  // ✅ FUNCIÓN MODIFICADA: Iniciar modo voz CON tareas seleccionadas
  const handleStartVoiceMode = () => {
    console.log("========== INICIANDO MODO VOZ GENERAL ==========");

    const analysis = assistantAnalysisRef.current;

    if (!analysis) {
      console.log("❌ No hay analysis");
      speakText("No hay actividades para explicar.");
      return;
    }

    const activitiesWithTasks = analysis.data.revisionesPorActividad
      .filter(
        (actividad) =>
          actividad.tareasConTiempo && actividad.tareasConTiempo.length > 0,
      )
      .map((actividad) => ({
        actividadId: actividad.actividadId,
        actividadTitulo: actividad.actividadTitulo,
        actividadHorario: actividad.actividadHorario,
        colaboradores: actividad.colaboradores || [],
        tareas: actividad.tareasConTiempo.map((tarea) => ({
          ...tarea,
          actividadId: actividad.actividadId,
          actividadTitulo: actividad.actividadTitulo,
        })),
      }));

    if (activitiesWithTasks.length === 0) {
      speakText("No hay tareas con tiempo asignado para explicar.");
      return;
    }

    // ✅ Usar todas las actividades (sin filtrar)
    setFilteredActivitiesForVoice(activitiesWithTasks);
    voiceMode.setVoiceMode(true);
    voiceMode.setVoiceStep("confirm-start");
    voiceMode.setExpectedInputType("confirmation");
    voiceMode.setCurrentActivityIndex(0);
    voiceMode.setCurrentTaskIndex(0);
    voiceMode.setTaskExplanations([]);

    const mensaje = `Vamos a explicar ${activitiesWithTasks.length} actividad${activitiesWithTasks.length !== 1 ? "es" : ""} con tareas programadas. ¿Listo para comenzar?`;
    speakText(mensaje);
  };

  // ✅ NUEVA FUNCIÓN: Iniciar modo voz CON tareas seleccionadas específicas
  const handleStartVoiceModeWithTasks = (taskIds: string[]) => {
    console.log("========== INICIANDO MODO VOZ CON TAREAS SELECCIONADAS ==========");
    console.log("🎯 Tareas seleccionadas:", taskIds);

    if (!taskIds || taskIds.length === 0) {
      console.warn("❌ No hay tareas seleccionadas");
      speakText("No hay tareas seleccionadas para explicar.");
      return;
    }

    const analysis = assistantAnalysisRef.current;
    if (!analysis) {
      console.log("❌ No hay analysis");
      speakText("No hay actividades para explicar.");
      return;
    }

    // ✅ Filtrar actividades que contengan las tareas seleccionadas
    const filteredActivities = analysis.data.revisionesPorActividad
      .map((actividad) => {
        // Filtrar solo las tareas seleccionadas en esta actividad
        const tareasFiltradas = actividad.tareasConTiempo
          .filter((tarea) => taskIds.includes(tarea.id))
          .map((tarea) => ({
            ...tarea,
            actividadId: actividad.actividadId,
            actividadTitulo: actividad.actividadTitulo,
          }));

        // Si no hay tareas seleccionadas en esta actividad, omitirla
        if (tareasFiltradas.length === 0) return null;

        return {
          actividadId: actividad.actividadId,
          actividadTitulo: actividad.actividadTitulo,
          actividadHorario: actividad.actividadHorario,
          colaboradores: actividad.colaboradores || [],
          tareas: tareasFiltradas,
        };
      })
      .filter((act): act is any => act !== null);

    console.log("✅ Actividades filtradas:", filteredActivities);

    if (filteredActivities.length === 0) {
      console.warn("⚠️ No se encontraron actividades con las tareas seleccionadas");
      speakText("No se encontraron actividades con las tareas seleccionadas.");
      return;
    }

    // ✅ Guardar en estado para VoiceGuidanceFlow
    setSelectedTaskIds(taskIds);
    setFilteredActivitiesForVoice(filteredActivities);

    // ✅ Configurar modo voz
    voiceMode.setVoiceMode(true);
    voiceMode.setVoiceStep("confirm-start");
    voiceMode.setExpectedInputType("confirmation");
    voiceMode.setCurrentActivityIndex(0);
    voiceMode.setCurrentTaskIndex(0);
    voiceMode.setTaskExplanations([]);

    const mensaje = `Vamos a explicar ${taskIds.length} tarea${taskIds.length !== 1 ? 's' : ''} seleccionada${taskIds.length !== 1 ? 's' : ''} en ${filteredActivities.length} actividad${filteredActivities.length !== 1 ? 'es' : ''}. ¿Listo para comenzar?`;
    speakText(mensaje);
  };

  useMessageRestoration({
    conversacionActiva,
    mensajesRestaurados,
    analisisRestaurado,
    theme,
    displayName,
    email: colaborador.email,
    onOpenReport: () => setMostrarModalReporte(true),
    onStartVoiceMode: handleStartVoiceMode,
    setMessages,
    setStep,
    setIsTyping,
    setAssistantAnalysis,
    assistantAnalysisRef,
    scrollRef,
  });

  useEffect(() => {
    if (!voiceRecognition.voiceTranscript) {
      return;
    }

    console.log(
      "EFECTO: Procesando voiceTranscript:",
      voiceRecognition.voiceTranscript,
    );

    if (!voiceMode.voiceMode) {
      return;
    }

    processVoiceCommand(voiceRecognition.voiceTranscript);
  }, [voiceRecognition.voiceTranscript, voiceMode.voiceMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log(
        "Voces disponibles:",
        voices.map((v) => `${v.name} (${v.lang})`),
      );
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof document === "undefined") return;
    document.documentElement.classList.add("dark");

    const checkIfPiPWindow = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const isPiPWindow = urlParams.get("pip") === "true";
      setIsInPiPWindow(isPiPWindow);

      if (isPiPWindow) {
        document.title = "Asistente Anfeta";
        document.documentElement.style.overflow = "hidden";
        document.body.style.margin = "0";
        document.body.style.padding = "0";
        document.body.style.overflow = "hidden";
        document.body.style.height = "100vh";
        document.body.style.width = "100vw";

        if (window.opener) {
          setIsPiPMode(true);
          try {
            window.moveTo(window.screenX, window.screenY);
            window.resizeTo(400, 600);
          } catch (e) {
            console.log(
              "No se pueden aplicar ciertas restricciones de ventana",
            );
          }
        }

        window.addEventListener("message", handleParentMessage);
      }
    };

    checkIfPiPWindow();

    if (!isInPiPWindow) {
      window.addEventListener("message", handleChildMessage);
    }

    const checkPiPWindowInterval = setInterval(() => {
      if (pipWindowRef.current && pipWindowRef.current.closed) {
        console.log("Ventana PiP cerrada detectada");
        setIsPiPMode(false);
        pipWindowRef.current = null;
      }
    }, 1000);

    const handleBeforeUnload = () => {
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        try {
          pipWindowRef.current.postMessage({ type: "PARENT_CLOSING" }, "*");
        } catch (e) {
          console.log("No se pudo notificar a la ventana PiP");
        }
        pipWindowRef.current.close();
      }
      voiceRecognition.stopRecording();
      stopVoice();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("message", handleParentMessage);
      window.removeEventListener("message", handleChildMessage);
      clearInterval(checkPiPWindowInterval);

      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
      }
      voiceRecognition.stopRecording();
      stopVoice();
    };
  }, [isInPiPWindow, stopVoice]);

  useEffect(() => {
    if (!assistantAnalysis) return;
    if (sidebarCargado) return;

    setSidebarCargando(true);
    obtenerHistorialSidebar()
      .then((res) => {
        console.log("Historial del sidebar cargado:", res.data);
        setData(res.data);
        setSidebarCargado(true);
      })
      .catch((error) => {
        console.error("Error al cargar sidebar:", error);
        setData([]);
      })
      .finally(() => setSidebarCargando(false));
  }, [assistantAnalysis, sidebarCargado]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, voiceMode.voiceMode, voiceMode.voiceStep]);

  useEffect(() => {
    if (
      inputRef.current &&
      step !== "loading-analysis" &&
      !voiceMode.voiceMode
    ) {
      inputRef.current.focus();
    }
  }, [step, voiceMode.voiceMode]);

  const activitiesWithTasks = useMemo(() => {
    if (!assistantAnalysis?.data?.revisionesPorActividad) {
      return [];
    }

    return assistantAnalysis.data.revisionesPorActividad
      .filter((actividad) => actividad.tareasConTiempo.length > 0)
      .map((actividad) => ({
        actividadId: actividad.actividadId,
        actividadTitulo: actividad.actividadTitulo,
        actividadHorario: actividad.actividadHorario,
        colaboradores: actividad.colaboradores || [],
        tareas: actividad.tareasConTiempo.map((tarea) => ({
          ...tarea,
          actividadId: actividad.actividadId,
          actividadTitulo: actividad.actividadTitulo,
        })),
      }));
  }, [assistantAnalysis]);

  const toggleChatMode = () => {
    const newMode = chatMode === "normal" ? "ia" : "normal";
    setChatMode(newMode);

    if (newMode === "ia") {
      addMessage(
        "system",
        <div
          className={`p-3 rounded-lg border ${theme === "dark"
            ? "bg-[#6841ea]/10 border-[#6841ea]/20"
            : "bg-purple-50 border-purple-200"
            }`}
        >
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#6841ea]" />
            <span className="text-sm font-medium text-[#6841ea]">
              Modo Asistente IA activado
            </span>
          </div>
          <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
            Ahora puedes hacer preguntas sobre tus tareas y recibir ayuda
            personalizada.
          </p>
        </div>,
      );
    } else {
      addMessage(
        "system",
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Modo normal activado
        </div>,
      );
    }
  };

  const handleUserInputChange = (value: string) => {
    setUserInput(value);

    if (
      value !== lastTranscriptRef.current &&
      voiceRecognition.voiceTranscript
    ) {
      console.log("✏️ Usuario editando manualmente");
      setIsUserEditing(true);

      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = null;
        console.log("🚫 Envío automático cancelado por edición");
      }
    }
  };

  const handleAutoSend = async () => {
    if (!userInput.trim()) return;

    console.log("📤 Enviando automáticamente:", userInput);

    try {
      const mensajeAEnviar = userInput.trim();

      addMessage("user", mensajeAEnviar);
      setUserInput("");
      setIsTyping(true);
      setIsLoadingIA(true);

      setIsUserEditing(false);
      lastTranscriptRef.current = "";

      let response;
      if (chatMode === "ia" && assistantAnalysis) {
        response = await consultarIAProyecto(mensajeAEnviar);
      } else {
        response = await chatGeneralIA(mensajeAEnviar);
      }

      if (response.respuesta) {
        addMessage("bot", response.respuesta);
      } else {
        addMessage("bot", "Lo siento, no pude procesar tu mensaje.");
      }

      setIsLoadingIA(false);
      setIsTyping(false);
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      setIsTyping(false);
      setIsLoadingIA(false);
      addMessage("bot", "Lo siento, hubo un error al procesar tu mensaje.");
    }
  };

  const preguntarPendiente = (index: number) => {
    if (index >= pendientesReporte.length) {
      speakText("Terminamos. ¿Quieres guardar el reporte?");
      return;
    }

    const p = pendientesReporte[index];
    setIndicePendienteActual(index);

    const texto = `Tarea ${index + 1}: ${p.nombre}. ¿La completaste y qué hiciste? O si no, ¿por qué no?`;
    speakText(texto);

    setTimeout(() => {
      voiceRecognition.startRecording(
        (transcript) => {
          console.log("Transcripción del reporte:", transcript);
          if (transcript.trim()) {
            procesarRespuestaReporte(transcript);
          }
        },
        (error) => {
          console.error("Error:", error);
          speakText("Error con el micrófono.");
        },
      );
    }, texto.length * 50);
  };

  const procesarRespuestaReporte = async (transcript: string) => {
    const trimmedTranscript = transcript.trim();
    explanationProcessedRef.current = true;

    console.log("📝 Procesando:", trimmedTranscript);

    if (!trimmedTranscript || trimmedTranscript.length < 5) {
      speakText("Tu respuesta es muy corta. Por favor, da más detalles.");
      setTimeout(() => {
        setPasoModalVoz("esperando");
        explanationProcessedRef.current = false;
      }, 1000);
      return;
    }

    const p = pendientesReporte[indicePendienteActual];
    if (!p) return;

    setPasoModalVoz("procesando");
    speakText("Validando...");

    try {
      const data = await validarReportePendiente(
        p.pendienteId,
        p.actividadId,
        trimmedTranscript,
      );

      console.log("📝 Validado:", data);

      const fueCompletado = data.terminada;
      console.log("📝 Fue completado:", fueCompletado);

      setPendientesReporte((prev) =>
        prev.map((item) =>
          item.pendienteId === p.pendienteId
            ? {
              ...item,
              completadoLocal: fueCompletado,
              motivoLocal: fueCompletado ? "" : trimmedTranscript,
            }
            : item,
        ),
      );

      speakText(
        data.terminada ? "Ok, completada." : "Entendido, no completada.",
      );

      setTimeout(() => {
        setPasoModalVoz("esperando");
        explanationProcessedRef.current = false;
        setIndicePendienteActual((prev) => prev + 1);

        if (indicePendienteActual + 1 < pendientesReporte.length) {
          setTimeout(() => preguntarPendiente(indicePendienteActual + 1), 500);
        }
      }, 1500);
    } catch (error) {
      console.error("Error:", error);
      speakText("Error. Intenta de nuevo.");
      setTimeout(() => {
        setPasoModalVoz("esperando");
        explanationProcessedRef.current = false;
      }, 1500);
    }
  };

  const guardarReporteDiario = async () => {
    try {
      setGuardandoReporte(true);

      const pendientesSinMotivo = pendientesReporte.filter(
        (p) =>
          !p.completadoLocal &&
          (!p.motivoLocal || p.motivoLocal.trim().length < 5),
      );

      if (pendientesSinMotivo.length > 0) {
        speakText(
          "Por favor, explica por qué no completaste todas las tareas marcadas como incompletas.",
        );
        setGuardandoReporte(false);
        return;
      }

      const pendientesParaEnviar = pendientesReporte.map((p) => ({
        pendienteId: p.pendienteId,
        actividadId: p.actividadId,
        completado: p.completadoLocal,
        motivoNoCompletado:
          !p.completadoLocal && p.motivoLocal ? p.motivoLocal : undefined,
      }));

      const response = await actualizarEstadoPendientes(pendientesParaEnviar);

      if (response.success) {
        setMostrarModalReporte(false);

        setIndicePendienteActual(0);
        setPasoModalVoz("esperando");

        addMessage(
          "bot",
          <div
            className={`p-4 rounded-lg border ${theme === "dark"
              ? "bg-green-900/20 border-green-500/20"
              : "bg-green-50 border-green-200"
              }`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div>
                <span className="font-medium">✅ Reporte guardado</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  Se actualizaron {response.actualizados} tareas correctamente.
                  ¡Buen trabajo hoy!
                </p>
              </div>
            </div>
          </div>,
        );

        speakText(
          `Reporte guardado. Se actualizaron ${response.actualizados} tareas. Buen trabajo hoy.`,
        );
      }
    } catch (error) {
      console.error("Error al guardar reporte:", error);
      addMessage(
        "bot",
        <div
          className={`p-4 rounded-lg border ${theme === "dark"
            ? "bg-red-900/20 border-red-500/20"
            : "bg-red-50 border-red-200"
            }`}
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span>Error al guardar el reporte. Intenta nuevamente.</span>
          </div>
        </div>,
      );
    } finally {
      setGuardandoReporte(false);
    }
  };

  const finishVoiceMode = () => {
    console.log("========== FINALIZANDO MODO VOZ ==========");

    stopVoice();

    voiceMode.setVoiceMode(false);
    voiceMode.setVoiceStep("idle");
    voiceMode.setExpectedInputType("none");
    voiceMode.setCurrentActivityIndex(0);
    voiceMode.setCurrentTaskIndex(0);

    addMessage(
      "bot",
      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <div>
            <span className="font-medium">¡Jornada iniciada!</span>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
              Has explicado{" "}
              {
                voiceMode.taskExplanations.filter(
                  (exp) => exp.explanation !== "[Tarea saltada]",
                ).length
              }{" "}
              tareas correctamente. ¡Mucho éxito!
            </p>
          </div>
        </div>
      </div>,
    );

    speakText(
      "¡Perfecto! Tu jornada ha comenzado. Mucho éxito con tus tareas.",
    );
  };

  const cancelVoiceMode = () => {
    stopVoice();
    voiceRecognition.stopRecording();
    voiceMode.cancelVoiceMode();
  };

  const confirmStartVoiceMode = () => {
    if (filteredActivitiesForVoice.length === 0) {
      speakText("No hay actividades con tareas para explicar.");
      setTimeout(() => voiceMode.cancelVoiceMode(), 1000);
      return;
    }

    voiceMode.setVoiceStep("activity-presentation");
    voiceMode.setExpectedInputType("none");

    setTimeout(() => {
      speakActivityByIndex(0);
    }, 300);
  };

  const speakActivityByIndex = (activityIndex: number) => {
    if (activityIndex >= filteredActivitiesForVoice.length) {
      voiceMode.setVoiceStep("summary");
      voiceMode.setExpectedInputType("confirmation");

      setTimeout(() => {
        speakText(
          "¡Perfecto! Has explicado todas las tareas. presiona el boton de comenzar para iniciar tu jornada para comenzar a trabajar.",
        );
      }, 500);
      return;
    }

    const activity = filteredActivitiesForVoice[activityIndex];
    const activityText = `Actividad ${activityIndex + 1} de ${filteredActivitiesForVoice.length}: ${activity.actividadTitulo}. Tiene ${activity.tareas.length} tarea${activity.tareas.length !== 1 ? "s" : ""}.`;

    voiceMode.setVoiceStep("activity-presentation");
    voiceMode.setExpectedInputType("none");

    setTimeout(() => {
      speakText(activityText);

      const estimatedSpeechTime = activityText.length * 40 + 1000;

      setTimeout(() => {
        voiceMode.setCurrentTaskIndex(0);
        speakTaskByIndices(activityIndex, 0);
      }, estimatedSpeechTime);
    }, 100);
  };

  const speakTaskByIndices = (activityIndex: number, taskIndex: number) => {
    if (activityIndex >= filteredActivitiesForVoice.length) {
      voiceMode.setVoiceStep("summary");
      voiceMode.setExpectedInputType("confirmation");

      setTimeout(() => {
        speakText(
          "¡Perfecto! Has explicado todas las tareas. ¿Quieres enviar este reporte?",
        );
      }, 500);
      return;
    }

    const activity = filteredActivitiesForVoice[activityIndex];

    if (taskIndex >= activity.tareas.length) {
      const nextActivityIndex = activityIndex + 1;
      voiceMode.setCurrentActivityIndex(nextActivityIndex);
      voiceMode.setCurrentTaskIndex(0);

      setTimeout(() => {
        speakActivityByIndex(nextActivityIndex);
      }, 500);
      return;
    }

    const task = activity.tareas[taskIndex];
    const taskText = `Tarea ${taskIndex + 1} de ${activity.tareas.length}: ${task.nombre}. ¿Cómo planeas resolver esta tarea?`;

    voiceMode.setVoiceStep("task-presentation");
    voiceMode.setExpectedInputType("none");
    voiceMode.setCurrentListeningFor(`Tarea: ${task.nombre}`);

    setTimeout(() => {
      speakText(taskText);

      const estimatedSpeechTime = taskText.length * 40 + 800;

      setTimeout(() => {
        voiceMode.setVoiceStep("waiting-for-explanation");
        voiceMode.setExpectedInputType("explanation");
      }, estimatedSpeechTime);
    }, 100);
  };

  const startTaskExplanation = () => {
    const allowedStates = [
      "waiting-for-explanation",
      "confirmation",
      "task-presentation",
    ];

    if (!allowedStates.includes(voiceMode.voiceStep)) {
      console.log("Estado no permitido para explicar");
      return;
    }

    stopVoice();

    const currentTask = getCurrentTask(
      voiceMode.currentActivityIndex,
      voiceMode.currentTaskIndex,
      filteredActivitiesForVoice,
    );

    if (currentTask) {
      voiceMode.setCurrentListeningFor(
        `Explicación para: ${currentTask.nombre}`,
      );
    }

    voiceMode.setVoiceStep("listening-explanation");
    voiceMode.setExpectedInputType("explanation");

    setTimeout(() => {
      startRecordingWrapper();
    }, 100);
  };

  const startRecordingWrapper = () => {
    voiceRecognition.startRecording(undefined, (error) => {
      console.error("Error en reconocimiento de voz:", error);
      speakText("Hubo un error con el micrófono. Por favor, intenta de nuevo.");
    });
  };

  const startChatVoiceRecording = () => {
    if (voiceRecognition.isRecording) {
      voiceRecognition.stopRecording();
      return;
    }

    voiceRecognition.startRecording(
      (transcript) => {
        if (transcript.trim()) {
          setUserInput(transcript.trim());
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }
      },
      (error) => {
        console.error("Error en reconocimiento de voz:", error);
        addMessage(
          "system",
          <div className="text-xs text-red-500">
            Error con el micrófono. Por favor, verifica los permisos.
          </div>,
        );
      },
    );
  };

  const processVoiceExplanation = async (transcript: string) => {
    console.log("========== PROCESANDO EXPLICACIÓN DE VOZ ==========");
    console.log("📝 Transcripción recibida:", transcript);

    const trimmedTranscript = cleanExplanationTranscript(transcript);
    console.log("🧹 Transcripción limpia:", trimmedTranscript);

    const validation = validateExplanationLength(trimmedTranscript);
    console.log("✅ Validación de longitud:", validation);

    if (!validation.isValid) {
      console.warn("❌ Explicación muy corta");
      speakText(validation.message!);
      setTimeout(() => {
        voiceMode.setVoiceStep("waiting-for-explanation");
        voiceMode.setExpectedInputType("explanation");
      }, 1000);
      return;
    }

    const currentTask = getCurrentTask(
      voiceMode.currentActivityIndex,
      voiceMode.currentTaskIndex,
      filteredActivitiesForVoice,
    );
    const currentActivity = getCurrentActivity(
      voiceMode.currentActivityIndex,
      filteredActivitiesForVoice,
    );

    console.log("📋 Tarea actual:", currentTask);
    console.log("📂 Actividad actual:", currentActivity);

    if (!currentTask || !currentActivity) {
      console.error("❌ No hay tarea o actividad actual");
      return;
    }

    voiceMode.setVoiceStep("processing-explanation");
    speakText("Validando tu explicación...");

    try {
      console.log("📡 Enviando al backend...");

      const payload = {
        actividadId: currentActivity.actividadId,
        actividadTitulo: currentActivity.actividadTitulo,
        nombrePendiente: currentTask.nombre,
        idPendiente: currentTask.id,
        explicacion: trimmedTranscript,
        userEmail: colaborador.email,

      };

      const response = await sendPendienteValidarYGuardar(payload);

      console.log("📡 Respuesta del backend:", response);

      if (response.esValida) {
        console.log("✅ EXPLICACIÓN VÁLIDA");

        const newExplanation: TaskExplanation = {
          taskId: currentTask.id,
          taskName: currentTask.nombre,
          activityTitle: currentActivity.actividadTitulo,
          explanation: trimmedTranscript,
          confirmed: true,
          priority: currentTask.prioridad,
          duration: currentTask.duracionMin,
          timestamp: new Date(),
        };

        voiceMode.setTaskExplanations((prev) => [
          ...prev.filter((exp) => exp.taskId !== currentTask.id),
          newExplanation,
        ]);

        speakText(
          "Perfecto, explicación validada. Pasamos a la siguiente tarea.",
        );

        setTimeout(() => {
          const nextTaskIndex = voiceMode.currentTaskIndex + 1;

          if (nextTaskIndex < currentActivity.tareas.length) {
            console.log("➡️ Siguiente tarea en la misma actividad");
            voiceMode.setCurrentTaskIndex(nextTaskIndex);
            voiceMode.setRetryCount(0);
            speakTaskByIndices(voiceMode.currentActivityIndex, nextTaskIndex);
          } else {
            console.log("➡️ Siguiente actividad");
            const nextActivityIndex = voiceMode.currentActivityIndex + 1;
            voiceMode.setCurrentActivityIndex(nextActivityIndex);
            voiceMode.setCurrentTaskIndex(0);
            voiceMode.setRetryCount(0);

            if (nextActivityIndex < filteredActivitiesForVoice.length) {
              speakActivityByIndex(nextActivityIndex);
            } else {
              console.log("🎉 Todas las actividades completadas");
              voiceMode.setVoiceStep("summary");
              voiceMode.setExpectedInputType("confirmation");
              setTimeout(() => {
                speakText(
                  "¡Excelente! Has completado todas las tareas. ¿Quieres enviar el reporte?",
                );
              }, 1000);
            }
          }
        }, 2000);
      } else {
        console.warn("❌ EXPLICACIÓN NO VÁLIDA:", response.razon);

        voiceMode.setRetryCount((prev) => prev + 1);
        speakText(
          `${response.razon || "Por favor, explica con más detalle cómo resolverás esta tarea."}`,
        );

        setTimeout(() => {
          voiceMode.setVoiceStep("waiting-for-explanation");
          voiceMode.setExpectedInputType("explanation");
        }, 3000);
      }
    } catch (error) {
      console.error("❌ Error en validación:", error);
      speakText("Hubo un error. Por favor, intenta de nuevo.");

      setTimeout(() => {
        voiceMode.setVoiceStep("waiting-for-explanation");
        voiceMode.setExpectedInputType("explanation");
      }, 2000);
    }
  };

  const retryExplanation = () => {
    const currentTask = getCurrentTask(
      voiceMode.currentActivityIndex,
      voiceMode.currentTaskIndex,
      filteredActivitiesForVoice,
    );

    if (!currentTask) return;

    voiceMode.setTaskExplanations((prev) =>
      prev.filter((exp) => exp.taskId !== currentTask.id),
    );
    voiceMode.setRetryCount((prev) => prev + 1);

    stopVoice();

    setTimeout(() => {
      speakText("Por favor, explica nuevamente cómo resolverás esta tarea.");
      setTimeout(() => {
        voiceMode.setVoiceStep("waiting-for-explanation");
        voiceMode.setExpectedInputType("explanation");
      }, 1000);
    }, 300);
  };

  const skipTask = () => {
    const currentTask = getCurrentTask(
      voiceMode.currentActivityIndex,
      voiceMode.currentTaskIndex,
      filteredActivitiesForVoice,
    );
    const currentActivity = getCurrentActivity(
      voiceMode.currentActivityIndex,
      filteredActivitiesForVoice,
    );

    if (!currentTask || !currentActivity) return;

    const explanation: TaskExplanation = {
      taskId: currentTask.id,
      taskName: currentTask.nombre,
      activityTitle: currentActivity.actividadTitulo,
      explanation: "[Tarea saltada]",
      confirmed: true,
      priority: currentTask.prioridad,
      duration: currentTask.duracionMin,
      timestamp: new Date(),
    };

    voiceMode.setTaskExplanations((prev) => [
      ...prev.filter((exp) => exp.taskId !== currentTask.id),
      explanation,
    ]);

    const nextTaskIndex = voiceMode.currentTaskIndex + 1;

    if (nextTaskIndex < currentActivity.tareas.length) {
      voiceMode.setCurrentTaskIndex(nextTaskIndex);
      voiceMode.resetForNextTask();
      setTimeout(
        () => speakTaskByIndices(voiceMode.currentActivityIndex, nextTaskIndex),
        500,
      );
    } else {
      const nextActivityIndex = voiceMode.currentActivityIndex + 1;
      voiceMode.setCurrentActivityIndex(nextActivityIndex);
      voiceMode.setCurrentTaskIndex(0);
      voiceMode.resetForNextTask();

      if (nextActivityIndex < filteredActivitiesForVoice.length) {
        setTimeout(() => speakActivityByIndex(nextActivityIndex), 500);
      } else {
        voiceMode.setVoiceStep("summary");
        voiceMode.setExpectedInputType("confirmation");
        setTimeout(() => {
          speakText(
            "¡Perfecto! Has explicado todas las tareas. ¿Quieres enviar este reporte?",
          );
        }, 500);
      }
    }
  };

  const processVoiceCommand = (transcript: string) => {
    if (!transcript.trim()) return;

    const lowerTranscript = transcript.toLowerCase().trim();
    console.log("Procesando comando de voz:", lowerTranscript);

    if (!voiceMode.voiceMode) return;

    switch (voiceMode.expectedInputType) {
      case "confirmation":
        if (
          isClearCommand(lowerTranscript, ["sí", "si", "confirmar", "correcto"])
        ) {
          sendExplanationsToBackend();
          return;
        }

        if (isClearCommand(lowerTranscript, ["no", "corregir", "cambiar"])) {
          if (voiceMode.voiceStep === "confirmation") {
            retryExplanation();
          }
          return;
        }
        break;

      case "explanation":
        if (voiceMode.voiceStep === "listening-explanation") {
          if (isClearCommand(lowerTranscript, ["terminar", "listo", "fin"])) {
            if (voiceRecognition.voiceTranscript.trim()) {
              processVoiceExplanation(voiceRecognition.voiceTranscript);
              return;
            }
          }
        }
        break;
    }

    if (isClearCommand(lowerTranscript, ["saltar", "skip"])) {
      skipTask();
      return;
    }

    if (isClearCommand(lowerTranscript, ["cancelar", "salir"])) {
      cancelVoiceMode();
      return;
    }
  };

  const sendExplanationsToBackend = async () => {
    console.log("========== ENVIANDO EXPLICACIONES AL BACKEND ==========");

    if (!assistantAnalysis) {
      console.log("ERROR: No hay análisis de asistente");
      return;
    }

    try {
      voiceMode.setVoiceStep("sending");
      voiceMode.setExpectedInputType("none");
      speakText("Enviando tu reporte...");

      const payload = {
        sessionId: assistantAnalysis.sessionId,
        userId: colaborador.email,
        projectId: assistantAnalysis.proyectoPrincipal,
        explanations: voiceMode.taskExplanations
          .filter((exp) => exp.explanation !== "[Tarea saltada]")
          .map((exp) => ({
            taskId: exp.taskId,
            taskName: exp.taskName,
            activityTitle: exp.activityTitle,
            explanation: exp.explanation,
            priority: exp.priority,
            duration: exp.duration,
            recordedAt: exp.timestamp.toISOString(),
            confirmed: exp.confirmed,
          })),
      };

      const response = await guardarReporteTarde(payload);

      if (response.ok) {
        speakText("¡Correcto! Tu reporte ha sido enviado.");
      } else {
        speakText("Hubo un error al enviar tu reporte.");
      }

      setTimeout(() => {
        voiceMode.setVoiceStep("idle");
        voiceMode.setVoiceMode(false);
        voiceMode.setExpectedInputType("none");

        addMessage(
          "bot",
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500" />
              <div>
                <span className="font-medium">Actividades guardadas</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  Has explicado{" "}
                  {
                    voiceMode.taskExplanations.filter(
                      (exp) => exp.explanation !== "[Tarea saltada]",
                    ).length
                  }{" "}
                  tareas.
                </p>
              </div>
            </div>
          </div>,
        );
      }, 1000);
    } catch (error) {
      console.error("Error al enviar explicaciones:", error);
      speakText("Hubo un error al enviar tu reporte.");
      voiceMode.setVoiceStep("summary");
      voiceMode.setExpectedInputType("confirmation");
    }
  };

  const handleParentMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (event.data.type === "PARENT_CLOSING") {
      window.close();
    }
  };

  const handleChildMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (event.data.type === "CHILD_CLOSED") {
      setIsPiPMode(false);
      pipWindowRef.current = null;
    }
  };

  const showAssistantAnalysis = async (
    analysis: AssistantAnalysis,
    isRestoration = false,
  ) => {
    if (!isRestoration) {
      addMessageWithTyping(
        "bot",
        messageTemplates.welcome.userInfo({
          theme,
          displayName,
          email: colaborador.email,
        }),
        400,
        true,
      );

      setTimeout(async () => {
        addMessageWithTyping(
          "bot",
          messageTemplates.analysis.metrics({
            theme,
            analysis,
          }),
          600,
          false,
        );

        setTimeout(() => {
          const hayTareas = analysis.data.revisionesPorActividad.some(
            (r) => r.tareasConTiempo.length > 0,
          );

          if (hayTareas) {
            const actividadesConTareas =
              analysis.data.revisionesPorActividad.filter(
                (r) => r.tareasConTiempo.length > 0,
              );
            const totalTareas = actividadesConTareas.reduce(
              (sum, r) => sum + r.tareasConTiempo.length,
              0,
            );

            addMessage(
              "bot",
              <TasksPanel
                actividadesConTareasPendientes={actividadesConTareas}
                totalTareasPendientes={totalTareas}
                esHoraReporte={false}
                theme={theme}
                assistantAnalysis={analysis}
                onOpenReport={() => setMostrarModalReporte(true)}
                onStartVoiceMode={handleStartVoiceMode}
              />,
            );
          } else {
            addMessage("bot", <NoTasksMessage theme={theme} />);
          }
        }, 1400);
      }, 800);
    }
  };

  const fetchAssistantAnalysis = async (
    showAll = false,
    isRestoration = false,
  ) => {
    try {
      setIsTyping(true);
      setStep("loading-analysis");

      const requestBody = {
        email: colaborador.email,
        showAll: showAll,
      };

      const data = await obtenerActividadesConRevisiones(requestBody);

      console.log("Respuesta del endpoint con revisiones:", data);

      const adaptedData: AssistantAnalysis & { colaboradoresInvolucrados?: any[] } = {
        success: data.success,
        answer: data.answer,
        provider: data.provider || "Gemini",
        sessionId: data.sessionId,
        proyectoPrincipal: data.proyectoPrincipal || "Sin proyecto principal",
        colaboradoresInvolucrados: data.colaboradoresInvolucrados || [],
        metrics: {
          totalActividades: data.metrics?.totalActividadesProgramadas || 0,
          actividadesConTiempoTotal:
            data.metrics?.actividadesConTiempoTotal || 0,
          actividadesFinales: data.metrics?.actividadesFinales || 0,
          tareasConTiempo: data.metrics?.tareasConTiempo || 0,
          tareasAltaPrioridad: data.metrics?.tareasAltaPrioridad || 0,
          tiempoEstimadoTotal: data.metrics?.tiempoEstimadoTotal || "0h 0m",
        },
        data: {
          actividades: (data.data?.actividades || []).map((a: any) => ({
            id: a.id,
            titulo: a.titulo,
            horario: a.horario,
            status: a.status,
            proyecto: a.proyecto,
            colaboradores: a.colaboradores || [],
            esHorarioLaboral: a.esHorarioLaboral || false,
            tieneRevisionesConTiempo: a.tieneRevisionesConTiempo || false,
          })),

          revisionesPorActividad: (data.data?.revisionesPorActividad || []).map(
            (act: any) => {
              console.log("🔍 Mapeando actividad:", act.actividadTitulo);
              console.log("   Tareas originales:", act.tareasConTiempo);

              const tareasMapeadas = (act.tareasConTiempo || []).map(
                (t: any) => ({
                  id: t.id,
                  nombre: t.nombre,
                  terminada: t.terminada || false,
                  confirmada: t.confirmada || false,
                  duracionMin: t.duracionMin || 0,
                  fechaCreacion: t.fechaCreacion,
                  fechaFinTerminada: t.fechaFinTerminada || null,
                  diasPendiente: t.diasPendiente || 0,
                  prioridad: t.prioridad || "BAJA",
                  colaboradores: t.colaboradores || [],
                }),
              );

              console.log("   Tareas mapeadas:", tareasMapeadas);

              return {
                actividadId: act.actividadId,
                actividadTitulo: act.actividadTitulo,
                actividadHorario: act.actividadHorario,
                colaboradores: act.colaboradores || [],
                assigneesOriginales: act.assigneesOriginales || [],
                tareasConTiempo: tareasMapeadas,
                totalTareasConTiempo: act.totalTareasConTiempo || 0,
                tareasAltaPrioridad: act.tareasAltaPrioridad || 0,
                tiempoTotal: act.tiempoTotal || 0,
                tiempoFormateado: act.tiempoFormateado || "0h 0m",
              };
            },
          ),
        },
        multiActividad: data.multiActividad || false,
      };

      console.log("========== GUARDANDO ANÁLISIS EN ESTADO ==========");
      console.log("📊 adaptedData:", adaptedData);
      console.log("👥 colaboradoresInvolucrados:", adaptedData.colaboradoresInvolucrados);
      console.log(
        "📋 revisionesPorActividad:",
        adaptedData.data.revisionesPorActividad,
      );

      assistantAnalysisRef.current = adaptedData;
      setAssistantAnalysis(adaptedData);

      setTimeout(() => {
        console.log("✅ Estado guardado, verificando...");
      }, 100);

      setStep("ready");
      showAssistantAnalysis(adaptedData, isRestoration);
    } catch (error) {
      console.error("Error al obtener análisis del asistente:", error);
      setIsTyping(false);
      setStep("error");
      addMessage(
        "bot",
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <span className="font-medium">Error al obtener actividades</span>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                Hubo un problema al obtener tus actividades. Por favor, intenta
                nuevamente más tarde.
              </p>
            </div>
          </div>
        </div>,
      );
    } finally {
      setIsTyping(false);
    }
  };

  const stopRecording = () => {
    console.log("========== DETENIENDO GRABACIÓN ==========");

    voiceRecognition.stopRecording();

    const currentTranscript = voiceRecognition.voiceTranscript;
    console.log("📝 Transcripción capturada:", currentTranscript);

    if (
      voiceMode.voiceMode &&
      voiceMode.voiceStep === "listening-explanation" &&
      currentTranscript.trim()
    ) {
      console.log("✅ Procesando explicación de voz...");
      processVoiceExplanation(currentTranscript);
    } else if (
      voiceMode.voiceMode &&
      voiceMode.voiceStep === "listening-explanation" &&
      !currentTranscript.trim()
    ) {
      console.warn("⚠️ No hay transcripción para procesar");
      speakText("No escuché tu explicación. Por favor, intenta de nuevo.");
      setTimeout(() => {
        voiceMode.setVoiceStep("waiting-for-explanation");
      }, 1000);
    }
  };

  const toggleTheme = () => {
    if (externalToggle) {
      externalToggle();
    } else {
      const newTheme = internalTheme === "light" ? "dark" : "light";
      setInternalTheme(newTheme);
      document.documentElement.classList.toggle("dark", newTheme === "dark");
    }
  };

  const addMessage = (
    type: Message["type"],
    content: string | React.ReactNode,
    voiceText?: string,
    isWide?: boolean,
  ) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date(),
      voiceText,
      isWide,
    };

    setMessages((prev) => {
      const updated = [...prev, newMessage];

      if (conversationHistory.conversacionActiva) {
        conversationHistory.actualizarCache(
          conversationHistory.conversacionActiva,
          updated,
        );
      }

      return updated;
    });
  };

  const addMessageWithTyping = async (
    type: Message["type"],
    content: string | React.ReactNode,
    delay = 800,
    isWide?: boolean,
  ) => {
    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, delay));
    setIsTyping(false);
    addMessage(type, content, undefined, isWide);
  };

  const handleUserInput = async (e: React.FormEvent) => {
    try {
      e.preventDefault();
      if (!userInput.trim()) return;
      let response;

      const mensajeAEnviar = userInput.trim();

      addMessage("user", mensajeAEnviar);
      setUserInput("");
      setIsTyping(true);
      setIsLoadingIA(true);

      if (chatMode === "ia" && assistantAnalysis) {
        response = await consultarIAProyecto(mensajeAEnviar);
      } else {
        response = await chatGeneralIA(mensajeAEnviar);
      }

      if (response.respuesta) {
        addMessage("bot", response.respuesta);
      } else {
        addMessage("bot", "Lo siento, no pude procesar tu mensaje.");
      }

      setIsLoadingIA(false);
      setIsTyping(false);
      console.log("Respuesta:", response);
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      setIsTyping(false);
      setIsLoadingIA(false);
      addMessage("bot", "Lo siento, hubo un error al procesar tu mensaje.");
    }
  };

  const handleVoiceMessageClick = (voiceText: string) => {
    setUserInput(voiceText);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div
      className={`flex flex-col h-screen ${theme === "dark" ? "bg-[#101010] text-white" : "bg-white text-gray-900"}`}
    >
      <ChatHeader
        isInPiPWindow={isInPiPWindow}
        sidebarOpen={conversationHistory.sidebarOpen}
        setSidebarOpen={conversationHistory.setSidebarOpen}
        theme={theme}
        toggleTheme={toggleTheme}
        displayName={displayName}
        colaborador={colaborador}
        rate={rate}
        changeRate={changeRate}
        isSpeaking={isSpeaking}
        isPiPMode={isPiPMode}
        openPiPWindow={() => { }}
        closePiPWindow={() => { }}
        setShowLogoutDialog={setShowLogoutDialog}
        onViewReports={onViewReports}
      />

      <VoiceGuidanceFlow
        voiceMode={voiceMode.voiceMode}
        voiceStep={voiceMode.voiceStep}
        theme={theme}
        isSpeaking={isSpeaking}
        finishVoiceMode={finishVoiceMode}
        currentActivityIndex={voiceMode.currentActivityIndex}
        currentTaskIndex={voiceMode.currentTaskIndex}
        // ✅ MODIFICADO: Usar filteredActivitiesForVoice en lugar de activitiesWithTasks
        activitiesWithTasks={filteredActivitiesForVoice}
        taskExplanations={voiceMode.taskExplanations}
        voiceTranscript={voiceRecognition.voiceTranscript}
        currentListeningFor={voiceMode.currentListeningFor}
        retryCount={voiceMode.retryCount}
        voiceConfirmationText=""
        rate={rate}
        changeRate={changeRate}
        cancelVoiceMode={cancelVoiceMode}
        confirmStartVoiceMode={confirmStartVoiceMode}
        speakTaskByIndices={speakTaskByIndices}
        startTaskExplanation={startTaskExplanation}
        skipTask={skipTask}
        processVoiceExplanation={processVoiceExplanation}
        stopRecording={voiceRecognition.stopRecording}
        retryExplanation={retryExplanation}
        sendExplanationsToBackend={sendExplanationsToBackend}
        recognitionRef={voiceRecognition.recognitionRef}
        setIsRecording={() => { }}
        setIsListening={() => { }}
        setVoiceStep={voiceMode.setVoiceStep}
        setCurrentListeningFor={voiceMode.setCurrentListeningFor}
        // ✅ NUEVO: Pasar selectedTaskIds al VoiceGuidanceFlow
        selectedTaskIds={selectedTaskIds}
      />

      <div
        className={`flex-1 overflow-y-auto
    [scrollbar-width:none]
    [-ms-overflow-style:none]
    [&::-webkit-scrollbar]:hidden
    ${isInPiPWindow ? "pt-2" : "pt-4"}
    pb-6
  `}
      >
        <div className="max-w-[75%] mx-auto w-fulll">
          <MessageList
            messages={messages}
            isTyping={isTyping}
            theme={theme}
            onVoiceMessageClick={handleVoiceMessageClick}
            scrollRef={scrollRef}
            assistantAnalysis={assistantAnalysis}
            onOpenReport={() => setMostrarModalReporte(true)}
            onStartVoiceMode={handleStartVoiceMode}
            // ✅ NUEVO: Pasar la nueva función con tareas seleccionadas
            onStartVoiceModeWithTasks={handleStartVoiceModeWithTasks}
            reportConfig={{
              horaInicio: horaInicioReporte,
              horaFin: horaFinReporte,
            }}
            userEmail={colaborador.email}
          />
        </div>
      </div>

      {!voiceMode.voiceMode && (
        <ChatInputBar
          userInput={userInput}
          setUserInput={handleUserInputChange}
          onSubmit={handleUserInput}
          onVoiceClick={startChatVoiceRecording}
          isRecording={voiceRecognition.isRecording}
          canUserType={canUserType}
          theme={theme}
          isLoadingIA={isLoadingIA}
          inputRef={inputRef}
          chatMode={chatMode}
          isSpeaking={isSpeaking}
          onToggleChatMode={toggleChatMode}
        />
      )}

      <ReporteActividadesModal
        isOpen={mostrarModalReporte}
        onOpenChange={setMostrarModalReporte}
        theme={theme}
        actividadesDiarias={actividadesDiarias}
        stopVoice={stopVoice}
        speakText={speakText}
        isSpeaking={isSpeaking}
        onGuardarReporte={guardarReporteDiario}
        guardandoReporte={guardandoReporte}
      />

      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent
          className={`${theme === "dark" ? "bg-[#1a1a1a] text-white border-[#2a2a2a]" : "bg-white text-gray-900 border-gray-200"} border`}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[#6841ea] text-xl">
              <PartyPopper className="w-6 h-6" />
              ¡Análisis completado!
            </AlertDialogTitle>
            <AlertDialogDescription
              className={`${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}
            >
              El análisis de tus actividades ha sido generado exitosamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={onLogout}
              className="bg-[#6841ea] hover:bg-[#5a36d4] text-white"
            >
              Cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent
          className={`font-['Arial'] ${theme === "dark" ? "bg-[#1a1a1a] text-white border-[#2a2a2a]" : "bg-white text-gray-900 border-gray-200"} border max-w-md`}
        >
          <AlertDialogHeader className="pt-6">
            <div className="mx-auto mb-4">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"}`}
              >
                <LogOut className="w-8 h-8 text-[#6841ea]" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-xl font-bold font-['Arial']">
              ¿Cerrar sesión?
            </AlertDialogTitle>
            <AlertDialogDescription
              className={`text-center pt-4 pb-2 font-['Arial'] ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}
            >
              <p>¿Estás seguro que deseas salir del asistente?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-6 font-['Arial']">
            <AlertDialogCancel
              className={`w-full sm:w-auto rounded-lg h-11 font-['Arial'] ${theme === "dark" ? "bg-[#2a2a2a] hover:bg-[#353535] text-white border-[#353535]" : "bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-200"} border`}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onLogout}
              className="w-full sm:w-auto bg-[#6841ea] hover:bg-[#5a36d4] text-white rounded-lg h-11 font-semibold font-['Arial']"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Confirmar salida
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}