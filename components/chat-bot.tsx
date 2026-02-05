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
  LogOut,
  AlertCircle,
  PartyPopper,
  CheckCircle2,
  Brain,
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
import { useAudioRecorder } from "./hooks/useAudioRecorder";
import { transcribirAudioCliente } from "@/lib/transcription";
import { isReportTime } from "@/util/Timeutils";

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
}: ChatBotProps) {
  // ==================== REFS ====================
  const scrollRef = useRef<HTMLDivElement>(null);
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

  // ==================== ESTADOS: CHAT PRINCIPAL ====================
  const [step, setStep] = useState<ChatStep>("welcome");
  const [userInput, setUserInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [assistantAnalysis, setAssistantAnalysis] =
    useState<AssistantAnalysis | null>(null);
  const [isLoadingIA, setIsLoadingIA] = useState(false);

  // ==================== ESTADOS: DIÁLOGOS Y MODALS ====================
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [mostrarModalReporte, setMostrarModalReporte] = useState(false);

  // ==================== ESTADOS: SIDEBAR ====================
  const [sidebarCargado, setSidebarCargado] = useState(false);
  const [sidebarCargando, setSidebarCargando] = useState(true);
  const [data, setData] = useState<ConversacionSidebar[]>([]);

  // ==================== ESTADOS: REPORTE DE ACTIVIDADES ====================
  const [actividadesDiarias] = useState<ActividadDiaria[]>([]);
  const [pendientesReporte, setPendientesReporte] = useState<
    PendienteEstadoLocal[]
  >([]);
  const [guardandoReporte, setGuardandoReporte] = useState(false);

  // ==================== ESTADOS: MODAL VOZ REPORTE ====================
  const [indicePendienteActual, setIndicePendienteActual] = useState(0);
  const [pasoModalVoz, setPasoModalVoz] = useState<
    "esperando" | "escuchando" | "procesando"
  >("esperando");
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>("");
  const [isUserEditing, setIsUserEditing] = useState(false);

  // ==================== ESTADOS: HORARIOS REPORTE ====================
  const [horaInicioReporte] = useState("1:33 PM"); // Formato: "HH:MM AM/PM"
  const [horaFinReporte] = useState("11:59 PM");

  // ==================== ESTADOS: PiP (PICTURE-IN-PICTURE) ====================
  const [isPiPMode, setIsPiPMode] = useState(false);
  const [isInPiPWindow, setIsInPiPWindow] = useState(false);

  // ==================== VALORES COMPUTADOS ====================
  const canUserType =
    step !== "loading-analysis" && step !== "error" && !voiceMode.voiceMode;

  const [chatMode, setChatMode] = useState<"normal" | "ia">("ia");

  const [internalTheme, setInternalTheme] = useState<"light" | "dark">("dark");
  const theme = externalTheme ?? internalTheme;
  const fetchingAnalysisRef = useRef(false);

  const { startRecording, stopRecording, currentStream } = useAudioRecorder();
  const isRecordingRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    isRecordingRef.current = isRecording;
    console.log("🔄 [SYNC] isRecordingRef actualizado:", isRecording);
  }, [isRecording]);

  const processAndSendAudio = async () => {
    if (isProcessingRef.current) {
      console.log("⚠️ Ya se está procesando audio");
      return;
    }

    console.log("📤 [PROCESO] Enviando audio después de 3s de silencio");
    isProcessingRef.current = true;
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsTranscribing(true);
    setAudioLevel(0);

    // Detener detección de audio
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    // Obtener el audio grabado
    const audio = await stopRecording();
    const sessionId =
      conversacionActiva || assistantAnalysis?.sessionId || null;

    try {
      console.log("🔄 [TRANSCRIPCIÓN] Transcribiendo audio...");
      const result = await transcribirAudioCliente(audio);

      if (result && result.trim().length > 0) {
        console.log("✅ [TRANSCRIPCIÓN] Texto:", result);
        addMessage("user", result);
        setIsTyping(true);
        setIsLoadingIA(true);

        console.log("🤖 [IA] Enviando a la IA...");
        const response = await chatGeneralIA(result, sessionId);

        if (response.respuesta) {
          console.log("✅ [IA] Respuesta recibida");
          addMessage("bot", response.respuesta);
        }

        setIsLoadingIA(false);
        setIsTyping(false);
      } else {
        console.warn("⚠️ [TRANSCRIPCIÓN] Texto vacío o nulo");
      }
    } catch (error) {
      console.error("❌ [ERROR] Error al transcribir:", error);
      addMessage(
        "system",
        <div className="text-xs text-red-500">
          Error al transcribir el audio
        </div>,
      );
    } finally {
      setIsTranscribing(false);
      setUserInput("");
      isProcessingRef.current = false;
      console.log("✅ [PROCESO] Proceso completado");
    }
  };

  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    console.log("⏱️ [TIMER] Reiniciado - esperando 3 segundos de silencio");

    silenceTimerRef.current = setTimeout(() => {
      console.log("✅ [TIMER] 3 segundos completados - enviando audio");
      processAndSendAudio();
    }, 3000);
  };

  const startAudioLevelDetection = (stream: MediaStream) => {
    try {

      micStreamRef.current = stream;

      const audioContext = new AudioContext();

      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let frameCount = 0;

      // Test inmediato
      const testAudioImmediate = () => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;

        console.log(
          "🔍 [DIAG] TEST INMEDIATO - Nivel promedio:",
          average.toFixed(2),
        );
        console.log(
          "🔍 [DIAG] Primeros 10 valores del array:",
          dataArray.slice(0, 10),
        );

        if (average === 0) {
          console.error("❌ [DIAG] PROBLEMA DETECTADO: Nivel es 0");
        } else {
          console.log("✅ [DIAG] Audio funcionando correctamente");
        }
      };

      setTimeout(testAudioImmediate, 100);
      setTimeout(testAudioImmediate, 500);

      // ✅ FUNCIÓN DE DETECCIÓN CORREGIDA
      const checkAudioLevel = () => {
        // ✅ USAR REF EN LUGAR DE STATE
        if (!isRecordingRef.current) {
          console.log("⚠️ [DETECCIÓN] isRecording es false, deteniendo...");
          setAudioLevel(0);
          return;
        }

        analyser.getByteFrequencyData(dataArray);

        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;
        const normalizedLevel = Math.min(average * 2, 100);

        setAudioLevel(normalizedLevel);

        // Log primeros 10 frames
        if (frameCount < 10) {
          console.log(
            `🔍 [DIAG] Frame ${frameCount} - Average: ${average.toFixed(2)}, Normalized: ${normalizedLevel.toFixed(2)}, isRecording: ${isRecordingRef.current}`,
          );
        }

        const SPEECH_THRESHOLD = 8;
        frameCount++;

        if (average > SPEECH_THRESHOLD) {
          // 🎤 VOZ DETECTADA
          console.log(
            `🎤 [VOZ] Nivel: ${average.toFixed(1)} | Normalizado: ${normalizedLevel.toFixed(1)} | Frame: ${frameCount}`,
          );
          resetSilenceTimer();
        } else {
          // 🔇 SILENCIO
          if (frameCount % 30 === 0) {
            console.log(
              `🔇 [SILENCIO] Nivel: ${average.toFixed(1)} | Frame: ${frameCount}`,
            );
          }
        }

        animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };

      resetSilenceTimer();
      checkAudioLevel();

      console.log("✅ [DETECCIÓN] Configuración completada");
    } catch (error) {
      console.error("❌ [ERROR] No se pudo configurar detección:", error);
      resetSilenceTimer();
    }
  };

  // ✅ FUNCIÓN onVoiceClick CORREGIDA
  const onVoiceClick = async () => {
    // Evitar clicks mientras se procesa
    if (isTranscribing || isProcessingRef.current) {
      console.log("⚠️ Ignorando click - procesando...");
      return;
    }

    // Si está grabando, cancelar y reiniciar
    if (isRecording) {
      console.log("🔄 [CORRECCIÓN] Cancelando y reiniciando grabación...");

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }

      await stopRecording();
      setUserInput("");
      setAudioLevel(0);
      setIsRecording(false);
      isRecordingRef.current = false; // ✅ ACTUALIZAR REF

      console.log("✅ Grabación cancelada");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Iniciar nueva grabación
    console.log("🎙️ [INICIO] Iniciando nueva grabación...");

    try {
      console.log("📞 Llamando a startRecording()...");
      const stream = await startRecording();

      console.log("✅ Stream obtenido:", {
        id: stream.id,
        active: stream.active,
        tracks: stream.getTracks().map((t) => ({
          kind: t.kind,
          label: t.label,
          enabled: t.enabled,
        })),
      });

      // ✅ ACTUALIZAR STATE Y REF
      setIsRecording(true);
      isRecordingRef.current = true;
      console.log("✅ Estado isRecording = true, ref = true");

      console.log("🎧 Iniciando detección de audio con el mismo stream...");
      startAudioLevelDetection(stream);

      console.log("✅ [INICIO] Grabación iniciada correctamente");
    } catch (error) {
      console.error("❌ [ERROR] Error al iniciar grabación:", error);

      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          alert(
            "❌ Permisos denegados. Por favor, permite el acceso al micrófono.",
          );
        } else if (error.name === "NotFoundError") {
          alert(
            "❌ No se encontró ningún micrófono. Conecta uno e intenta de nuevo.",
          );
        } else {
          alert(`❌ Error: ${error.message}`);
        }
      } else {
        alert("❌ No se pudo acceder al micrófono. Verifica los permisos.");
      }

      setIsRecording(false);
      isRecordingRef.current = false;
      setAudioLevel(0);
    }
  };

  // ✅ Limpiar al desmontar
  useEffect(() => {
    console.log("✅ [MOUNT] Componente de voz montado");

    return () => {
      console.log("🧹 [UNMOUNT] Limpiando componente de voz");

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (audioLevel > 0) {
      console.log("📊 [NIVEL] Audio actual:", audioLevel.toFixed(1));
    }
  }, [audioLevel]);

  const initializationRef = useRef(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.add("dark");

    // Prevenir múltiples ejecuciones
    if (initializationRef.current) {
      return;
    }

    const hayDatosRestauracion =
      (mensajesRestaurados && mensajesRestaurados.length > 1) ||
      analisisRestaurado;

    if (hayDatosRestauracion) {
      initializationRef.current = true;

      if (analisisRestaurado) {
        assistantAnalysisRef.current = analisisRestaurado;
        
        setAssistantAnalysis(analisisRestaurado);
        setStep("ready");
        setIsTyping(false); 
      }

      return;
    }

    initializationRef.current = true;

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

      await fetchAssistantAnalysis();
    };

    init();
  }, []);

  const handleStartVoiceMode = () => {
    // USAR EL REF EN LUGAR DEL ESTADO
    const analysis = assistantAnalysisRef.current;
    if (!analysis) {
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

    // Activar modo voz
    voiceMode.setVoiceMode(true);
    voiceMode.setVoiceStep("confirm-start");
    voiceMode.setExpectedInputType("confirmation");
    voiceMode.setCurrentActivityIndex(0);
    voiceMode.setCurrentTaskIndex(0);
    voiceMode.setTaskExplanations([]);

    // Mensaje de bienvenida
    const mensaje = `Vamos a explicar ${activitiesWithTasks.length} actividad${activitiesWithTasks.length !== 1 ? "es" : ""} con tareas programadas. ¿Listo para comenzar?`;
    speakText(mensaje);
  };

  useEffect(() => {
    onActualizarTyping?.(isTyping);
  }, [isTyping, onActualizarTyping]);

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

    if (!voiceMode.voiceMode) {
      return;
    }

    processVoiceCommand(voiceRecognition.voiceTranscript);
  }, [voiceRecognition.voiceTranscript, voiceMode.voiceMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => {
      window.speechSynthesis.getVoices();
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
          } catch (e) {}
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

    setSidebarCargando(true); // ✅ Ahora existe
    obtenerHistorialSidebar()
      .then((res) => {
        console.log("Historial del sidebar cargado:", res.data);
        setData(res.data); // ✅ Ahora existe
        setSidebarCargado(true);
      })
      .catch((error) => {
        console.error("Error al cargar sidebar:", error);
        setData([]); // ✅ Ahora existe
      })
      .finally(() => setSidebarCargando(false)); // ✅ Ahora existe
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
          className={`p-3 rounded-lg border ${
            theme === "dark"
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

    // Si el valor es diferente a la última transcripción, el usuario está editando
    if (
      value !== lastTranscriptRef.current &&
      voiceRecognition.voiceTranscript
    ) {
      console.log("✏️ Usuario editando manualmente");
      setIsUserEditing(true);

      // Cancelar envío automático
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = null;
        console.log("🚫 Envío automático cancelado por edición");
      }
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
      // ✅ Usar el hook
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

        // Si hay más tareas, preguntarlas
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

      // Validar que las tareas no completadas tengan motivo
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
            className={`p-4 rounded-lg border ${
              theme === "dark"
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
          className={`p-4 rounded-lg border ${
            theme === "dark"
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

    // Detener voz
    stopVoice();

    // Resetear modo voz
    voiceMode.setVoiceMode(false);
    voiceMode.setVoiceStep("idle");
    voiceMode.setExpectedInputType("none");
    voiceMode.setCurrentActivityIndex(0);
    voiceMode.setCurrentTaskIndex(0);

    // Mensaje de confirmación
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
    if (activitiesWithTasks.length === 0) {
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
    if (activityIndex >= activitiesWithTasks.length) {
      voiceMode.setVoiceStep("summary");
      voiceMode.setExpectedInputType("confirmation");

      setTimeout(() => {
        speakText(
          "¡Perfecto! Has explicado todas las tareas. presiona el boton de comenzar para iniciar tu jornada para comenzar a trabajar.",
        );
      }, 500);
      return;
    }

    const activity = activitiesWithTasks[activityIndex];
    const activityText = `Actividad ${activityIndex + 1} de ${activitiesWithTasks.length}: ${activity.actividadTitulo}. Tiene ${activity.tareas.length} tarea${activity.tareas.length !== 1 ? "s" : ""}.`;

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
    if (activityIndex >= activitiesWithTasks.length) {
      voiceMode.setVoiceStep("summary");
      voiceMode.setExpectedInputType("confirmation");

      setTimeout(() => {
        speakText(
          "¡Perfecto! Has explicado todas las tareas. ¿Quieres enviar este reporte?",
        );
      }, 500);
      return;
    }

    const activity = activitiesWithTasks[activityIndex];

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
      activitiesWithTasks,
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

  // funcion para iniciar grabacion de voz en chat no
  const startChatVoiceRecording = () => {
    if (voiceRecognition.isRecording) {
      // Si ya está grabando, detene onVoiceClick={startRecordingWrapper}r
      voiceRecognition.stopRecording();
      return;
    }

    // Iniciar grabación para chat normal
    voiceRecognition.startRecording(
      (transcript) => {
        // Cuando termine de grabar, poner el texto en el input
        if (transcript.trim()) {
          setUserInput(transcript.trim());
          // Opcional: Enfocar el input
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
      activitiesWithTasks,
    );
    const currentActivity = getCurrentActivity(
      voiceMode.currentActivityIndex,
      activitiesWithTasks,
    );

    console.log("📋 Tarea actual:", currentTask);
    console.log("📂 Actividad actual:", currentActivity);

    if (!currentTask || !currentActivity) {
      console.error("❌ No hay tarea o actividad actual");
      return;
    }

    // ✅ CAMBIAR ESTADO A "processing-explanation"
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
      };

      console.log("currentTask", currentTask);

      // ✅ ENVIAR AL BACKEND PARA VALIDAR
      const response = await sendPendienteValidarYGuardar(payload);

      if (response.esValida) {
        console.log("✅ EXPLICACIÓN VÁLIDA");

        // ✅ EXPLICACIÓN VÁLIDA - GUARDAR Y CONTINUAR
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

        // ✅ PASAR A LA SIGUIENTE TAREA
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

            if (nextActivityIndex < activitiesWithTasks.length) {
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

        // ❌ EXPLICACIÓN NO VÁLIDA - PEDIR CORRECCIÓN
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
      activitiesWithTasks,
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
      activitiesWithTasks,
    );
    const currentActivity = getCurrentActivity(
      voiceMode.currentActivityIndex,
      activitiesWithTasks,
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

      if (nextActivityIndex < activitiesWithTasks.length) {
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

    // Procesar comandos según el tipo de input esperado
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

    // Comandos globales
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
      // ✅ CORRECTO - Usa voiceMode
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
        voiceMode.setVoiceMode(false); // ✅ CORRECTO
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
        true, // isWide
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

            const esHoraReporte = isReportTime(horaInicioReporte, horaFinReporte);

            addMessage(
              "bot",
              <TasksPanel
                actividadesConTareasPendientes={actividadesConTareas}
                totalTareasPendientes={totalTareas}
                esHoraReporte={esHoraReporte}
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
    if (fetchingAnalysisRef.current) {
      console.log("⚠️ Ya hay un análisis en proceso, omitiendo...");
      return;
    }

    fetchingAnalysisRef.current = true;

    try {
      setIsTyping(true);
      setStep("loading-analysis");

      const requestBody = {
        email: colaborador.email,
        showAll: showAll,
      };

      const data = await obtenerActividadesConRevisiones(requestBody);

      console.log("Respuesta del endpoint con revisiones:", data);

      const adaptedData: AssistantAnalysis = {
        success: data.success,
        answer: data.answer,
        provider: data.provider || "Gemini",
        sessionId: data.sessionId,
        proyectoPrincipal: data.proyectoPrincipal || "Sin proyecto principal",
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
                }),
              );

              console.log("   Tareas mapeadas:", tareasMapeadas);

              return {
                actividadId: act.actividadId,
                actividadTitulo: act.actividadTitulo,
                actividadHorario: act.actividadHorario,
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

      assistantAnalysisRef.current = adaptedData;
      setAssistantAnalysis(adaptedData);
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
      // ✅ Liberar el lock después de un pequeño delay
      setTimeout(() => {
        fetchingAnalysisRef.current = false;
      }, 1000);
    }
  };

  const toggleTheme = () => {
    if (externalToggle) {
      externalToggle(); // Usa la función del padre
    } else {
      // Fallback local
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

      // Actualizar caché de conversación
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

      const sessionId =
        conversacionActiva || assistantAnalysis?.sessionId || null;

      if (chatMode === "ia" && assistantAnalysis) {
        response = await consultarIAProyecto(mensajeAEnviar, sessionId);
      } else {
        // response = await chatGeneralIA(mensajeAEnviar, sessionId);
      }

      if (response.respuesta) {
        addMessage("bot", response.respuesta);

        // 🆕 Si es una conversación nueva, agregarla al sidebar
        if (response.sessionId && !conversacionActiva) {
          console.log("🆕 Nueva conversación creada:", response.sessionId);

          onNuevaConversacion?.({
            sessionId: response.sessionId,
            userId: colaborador.email,
            estadoConversacion: "activa",
            createdAt: new Date().toISOString(),
            nombreConversacion: "Nueva conversación", // 👈 Agregar nombre temporal
          });
        }

        // 🔄 Si la conversación ya existía y el backend devolvió un nuevo nombre
        if (
          response.sessionId &&
          conversacionActiva &&
          response.nombreConversacion
        ) {
          onActualizarNombre?.(response.sessionId, response.nombreConversacion);
        }
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
        openPiPWindow={() => {}} // Implementar si necesitas PiP
        closePiPWindow={() => {}}
        setShowLogoutDialog={setShowLogoutDialog}
      />

      <VoiceGuidanceFlow
        voiceMode={voiceMode.voiceMode}
        voiceStep={voiceMode.voiceStep}
        theme={theme}
        isSpeaking={isSpeaking}
        finishVoiceMode={finishVoiceMode}
        currentActivityIndex={voiceMode.currentActivityIndex}
        currentTaskIndex={voiceMode.currentTaskIndex}
        activitiesWithTasks={activitiesWithTasks}
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
        setIsRecording={() => {}}
        setIsListening={() => {}}
        setVoiceStep={voiceMode.setVoiceStep}
        setCurrentListeningFor={voiceMode.setCurrentListeningFor}
      />

      {/* CONTENIDO DE MENSAJES - PADDING AJUSTADO */}
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
            reportConfig={{
              horaInicio: horaInicioReporte,
              horaFin: horaFinReporte,
            }}
          />
        </div>
      </div>

      {/* INPUT BAR - Z-INDEX AJUSTADO */}
      {!voiceMode.voiceMode && (
        <ChatInputBar
          userInput={userInput}
          setUserInput={handleUserInputChange}
          onSubmit={handleUserInput}
          // onVoiceClick={startChatVoiceRecording}
          // isRecording={voiceRecognition.isRecording}
          onVoiceClick={onVoiceClick}
          isRecording={isRecording}
          canUserType={canUserType}
          theme={theme}
          audioLevel={audioLevel}
          isLoadingIA={isLoadingIA}
          inputRef={inputRef}
          chatMode={chatMode}
          isSpeaking={isSpeaking}
          onToggleChatMode={toggleChatMode}
        />
      )}

      {/* Modal de Reporte de Actividades Diarias */}

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
      {/* ========== FIN CONTENIDO PRINCIPAL ========== */}

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
