"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { validateSession, obtenerHistorialSession } from "../lib/api";
import { HistorialSessionResponse } from "../lib/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import type { Colaborador } from "@/lib/types";
import {
  Bot,
  FileText,
  Send,
  LogOut,
  AlertCircle,
  Loader2,
  PartyPopper,
  Clock,
  CheckCircle2,
  Sparkles,
  Moon,
  Sun,
  Minimize2,
  PictureInPicture,
  Mic,
  MicOff,
  Volume2,
  Brain,
  Calendar,
  Target,
  Zap,
  BarChart3,
  User,
  Mail,
  CalendarDays,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Check,
  X,
  Headphones,
  RotateCcw,
  FolderOpen,
  ListChecks,
} from "lucide-react";
import Image from "next/image";

interface ChatBotProps {
  colaborador: Colaborador;
  actividades: any[];
  onLogout: () => void;
}

type ChatStep = "welcome" | "loading-analysis" | "show-analysis" | "finished";

interface Message {
  id: string;
  type: "bot" | "user" | "system" | "voice" | "analysis";
  content: string | React.ReactNode;
  timestamp: Date;
  voiceText?: string;
}

interface AssistantAnalysis {
  success: boolean;
  answer: string;
  provider: string;
  sessionId: string;
  proyectoPrincipal: string;
  metrics: {
    totalActividades: number;
    actividadesConTiempoTotal: number;
    actividadesFinales: number;
    tareasConTiempo: number;
    tareasAltaPrioridad: number;
    tiempoEstimadoTotal: string;
  };
  data: {
    actividades: Array<{
      id: string;
      titulo: string;
      horario: string;
      status: string;
      proyecto: string;
      esHorarioLaboral: boolean;
      tieneRevisionesConTiempo: boolean;
    }>;
    revisionesPorActividad: Array<{
      actividadId: string;
      actividadTitulo: string;
      actividadHorario: string;
      tareasConTiempo: Array<{
        id: string;
        nombre: string;
        terminada: boolean;
        confirmada: boolean;
        duracionMin: number;
        fechaCreacion: string;
        fechaFinTerminada: string | null;
        diasPendiente: number;
        prioridad: string;
      }>;
      totalTareasConTiempo: number;
      tareasAltaPrioridad: number;
      tiempoTotal: number;
      tiempoFormateado: string;
    }>;
  };
  multiActividad: boolean;
}

// ========== MÁQUINA DE ESTADOS MEJORADA ==========
type VoiceModeStep =
  | "idle"
  | "confirm-start"
  | "activity-presentation"
  | "task-presentation"
  | "waiting-for-explanation"
  | "listening-explanation"
  | "processing-explanation"
  | "confirmation"
  | "summary"
  | "sending";

interface TaskExplanation {
  taskId: string;
  taskName: string;
  activityTitle: string;
  explanation: string;
  confirmed: boolean;
  priority: string;
  duration: number;
  timestamp: Date;
}

// ========== Hook de síntesis de voz MÁS RÁPIDA ==========
const useVoiceSynthesis = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((text: string, rate = 1.2, pitch = 1.15) => {
    if (!("speechSynthesis" in window)) {
      console.warn("Tu navegador no soporta síntesis de voz");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-MX";
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    let selectedVoice =
      voices.find(v => v.name.includes("Microsoft Sabina")) ||
      voices.find(v => v.name.includes("Google español") && !v.name.toLowerCase().includes("male")) ||
      voices.find(v => v.name.includes("Helena") && v.lang.startsWith("es")) ||
      voices.find(v => v.name.includes("Monica") && v.lang.startsWith("es")) ||
      voices.find(v => v.lang.startsWith("es"));

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
};

const getDisplayName = (colaborador: Colaborador) => {
  if (colaborador.firstName || colaborador.lastName) {
    return `${colaborador.firstName || ""} ${colaborador.lastName || ""}`.trim();
  }
  return colaborador.email.split("@")[0];
};

export function ChatBot({ colaborador, onLogout }: ChatBotProps) {
  const [step, setStep] = useState<ChatStep>("welcome");
  const [userInput, setUserInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isTyping, setIsTyping] = useState(false);
  const [isPiPMode, setIsPiPMode] = useState(false);
  const [isInPiPWindow, setIsInPiPWindow] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [showVoiceOverlay, setShowVoiceOverlay] = useState(false);
  const [assistantAnalysis, setAssistantAnalysis] = useState<AssistantAnalysis | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const welcomeSentRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const recognitionRef = useRef<any>(null);
  const [isCheckingHistory, setIsCheckingHistory] = useState(false);
  const [hasExistingSession, setHasExistingSession] = useState(false);
  const [isCheckingAfterHours, setIsCheckingAfterHours] = useState(false);

  // ========== NUEVO: Estados para Modo Voz Mejorado ==========
  const [voiceMode, setVoiceMode] = useState<boolean>(false);
  const [voiceStep, setVoiceStep] = useState<VoiceModeStep>("idle");
  const [currentActivityIndex, setCurrentActivityIndex] = useState<number>(0);
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(0);
  const [taskExplanations, setTaskExplanations] = useState<TaskExplanation[]>([]);
  const [voiceConfirmationText, setVoiceConfirmationText] = useState<string>("");
  const [showVoiceSummary, setShowVoiceSummary] = useState<boolean>(false);
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [expectedInputType, setExpectedInputType] = useState<"explanation" | "confirmation" | "none">("none");
  const [currentListeningFor, setCurrentListeningFor] = useState<string>("");

  const displayName = getDisplayName(colaborador);
  const router = useRouter();
  const { speak: speakText, stop: stopVoice, isSpeaking } = useVoiceSynthesis();

  // ========== NUEVO: Reorganizar datos por actividades ==========
  const activitiesWithTasks = useMemo(() => {
    if (!assistantAnalysis?.data?.revisionesPorActividad) {
      return [];
    }

    return assistantAnalysis.data.revisionesPorActividad
      .filter(actividad => actividad.tareasConTiempo.length > 0)
      .map(actividad => ({
        actividadId: actividad.actividadId,
        actividadTitulo: actividad.actividadTitulo,
        actividadHorario: actividad.actividadHorario,
        tareas: actividad.tareasConTiempo.map(tarea => ({
          ...tarea,
          actividadId: actividad.actividadId,
          actividadTitulo: actividad.actividadTitulo
        }))
      }));
  }, [assistantAnalysis]);

  // ========== NUEVO: Calcular estadísticas ==========
  const totalActivities = activitiesWithTasks.length;
  const totalTasks = activitiesWithTasks.reduce((sum, activity) => sum + activity.tareas.length, 0);

  // ========== NUEVO: Función para obtener actividad actual ==========
  const getCurrentActivity = () => {
    if (currentActivityIndex >= 0 && currentActivityIndex < activitiesWithTasks.length) {
      return activitiesWithTasks[currentActivityIndex];
    }
    return null;
  };

  const getCurrentTask = () => {
    const currentActivity = getCurrentActivity();
    if (currentActivity && currentTaskIndex >= 0 && currentTaskIndex < currentActivity.tareas.length) {
      return currentActivity.tareas[currentTaskIndex];
    }
    return null;
  };

  // ========== NUEVO: Función para verificar si es después de las 17:30 ==========
  const checkIfAfterHours = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    return currentHour > 17 || (currentHour === 17 && currentMinute >= 30);
  };

  // ========== NUEVO: Función para verificar actividades al final del día ==========
  const checkEndOfDayActivities = async () => {
    try {
      setIsCheckingAfterHours(true);

      const response = await fetch(
        "http://localhost:4000/api/v1/assistant/verificar-actividades-finalizadas",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: colaborador.email,
            timestamp: new Date().toISOString()
          })
        }
      );

      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = await response.json();

      if (data.success && data.todasValidadas) {
        addMessage(
          "bot",
          <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-green-900/20 border-green-500/20" : "bg-green-50 border-green-200"}`}>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div>
                <span className="font-medium">¡Jornada completada! 🎉</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  Todas tus actividades han sido revisadas y validadas correctamente.
                  ¡Buen trabajo! Puedes cerrar sesión.
                </p>
              </div>
            </div>
          </div>
        );

        speakText("¡Perfecto! Todas tus actividades han sido revisadas y validadas. Buen trabajo, puedes cerrar sesión.", 1.3);
      }

      setIsCheckingAfterHours(false);
    } catch (error) {
      console.error("Error al verificar actividades finalizadas:", error);
      setIsCheckingAfterHours(false);
    }
  };

  // ========== MÁQUINA DE ESTADOS MEJORADA ==========
  const startVoiceMode = () => {
    console.log("Iniciando modo voz");
    setVoiceMode(true);
    setVoiceStep("confirm-start");
    setExpectedInputType("none");
    speakText("Para comenzar con el modo guiado por voz, di 'empezar' o presiona el botón.", 1.3);
  };

  const cancelVoiceMode = () => {
    console.log("Cancelando modo voz");
    stopVoice();
    stopRecording();
    setVoiceMode(false);
    setVoiceStep("idle");
    setCurrentActivityIndex(0);
    setCurrentTaskIndex(0);
    setTaskExplanations([]);
    setRetryCount(0);
    setExpectedInputType("none");
    setCurrentListeningFor("");
  };

  const confirmStartVoiceMode = () => {
    console.log("Confirmando inicio modo voz");

    if (activitiesWithTasks.length === 0) {
      speakText("No hay actividades con tareas para explicar.", 1.3);
      setTimeout(() => cancelVoiceMode(), 1000);
      return;
    }

    setVoiceStep("activity-presentation");
    setExpectedInputType("none");

    setTimeout(() => {
      speakActivityByIndex(0);
    }, 300);
  };

  const speakActivityByIndex = useCallback((activityIndex: number) => {
    console.log("========== speakActivityByIndex ==========");
    console.log("Índice recibido:", activityIndex);
    console.log("Total actividades:", activitiesWithTasks.length);

    if (!activitiesWithTasks || activitiesWithTasks.length === 0) {
      console.error("ERROR: No hay actividades para hablar");
      return;
    }

    if (activityIndex < 0 || activityIndex >= activitiesWithTasks.length) {
      console.log("Todas las actividades completadas");
      setVoiceStep("summary");
      setExpectedInputType("confirmation");

      setTimeout(() => {
        speakText("¡Perfecto! Has explicado todas las tareas de todas las actividades. ¿Quieres enviar este reporte?", 1.3);
      }, 500);
      return;
    }

    const activity = activitiesWithTasks[activityIndex];
    if (!activity) {
      console.error(`ERROR: No se encontró la actividad en índice ${activityIndex}`);
      return;
    }

    const activityText = `Actividad ${activityIndex + 1} de ${activitiesWithTasks.length}: ${activity.actividadTitulo}. Horario: ${activity.actividadHorario}. Tiene ${activity.tareas.length} tarea${activity.tareas.length !== 1 ? 's' : ''} pendiente${activity.tareas.length !== 1 ? 's' : ''}.`;

    console.log("Texto de actividad a hablar:", activityText);

    setVoiceStep("activity-presentation");
    setExpectedInputType("none");

    setTimeout(() => {
      speakText(activityText, 1.3);

      const estimatedSpeechTime = activityText.length * 40 + 1000;

      setTimeout(() => {
        console.log("Actividad presentada, pasando a primera tarea");
        setCurrentTaskIndex(0);
        speakTaskByIndices(activityIndex, 0);
      }, estimatedSpeechTime);
    }, 100);
  }, [activitiesWithTasks, speakText]);

  const speakTaskByIndices = useCallback((activityIndex: number, taskIndex: number) => {
    console.log("========== speakTaskByIndices ==========");
    console.log("Actividad índice:", activityIndex, "Tarea índice:", taskIndex);

    if (!activitiesWithTasks || activitiesWithTasks.length === 0) {
      console.error("ERROR: No hay actividades");
      return;
    }

    if (activityIndex >= activitiesWithTasks.length) {
      console.log("Todas las actividades completadas");
      setVoiceStep("summary");
      setExpectedInputType("confirmation");

      setTimeout(() => {
        speakText("¡Perfecto! Has explicado todas las tareas de todas las actividades. ¿Quieres enviar este reporte?", 1.3);
      }, 500);
      return;
    }

    const activity = activitiesWithTasks[activityIndex];
    if (!activity) {
      console.error(`ERROR: No se encontró la actividad en índice ${activityIndex}`);
      return;
    }

    if (taskIndex >= activity.tareas.length) {
      console.log("Todas las tareas de esta actividad completadas, pasando a siguiente actividad");
      const nextActivityIndex = activityIndex + 1;
      setCurrentActivityIndex(nextActivityIndex);
      setCurrentTaskIndex(0);

      setTimeout(() => {
        speakActivityByIndex(nextActivityIndex);
      }, 500);
      return;
    }

    const task = activity.tareas[taskIndex];
    if (!task) {
      console.error(`ERROR: No se encontró la tarea en índice ${taskIndex}`);
      return;
    }

    const taskText = `Tarea ${taskIndex + 1} de ${activity.tareas.length} en esta actividad: ${task.nombre}. Prioridad ${task.prioridad}, ${task.duracionMin} minutos, ${task.diasPendiente || 0} días pendiente. ¿Cómo planeas resolver esta tarea?`;

    console.log("Texto a hablar:", taskText);

    setVoiceStep("task-presentation");
    setExpectedInputType("none");

    setCurrentListeningFor(`Tarea: ${task.nombre}`);

    setTimeout(() => {
      speakText(taskText, 1.3);

      const estimatedSpeechTime = taskText.length * 40 + 800;

      setTimeout(() => {
        console.log("Habla completada, cambiando a waiting-for-explanation");
        setVoiceStep("waiting-for-explanation");
        setExpectedInputType("explanation");
      }, estimatedSpeechTime);
    }, 100);
  }, [activitiesWithTasks, speakText, speakActivityByIndex]);

  const startTaskExplanation = () => {
    console.log("========== INICIANDO startTaskExplanation ==========");
    console.log("Estado actual:", voiceStep);

    const allowedStates = ["waiting-for-explanation", "confirmation", "task-presentation"];

    if (!allowedStates.includes(voiceStep)) {
      console.log("ERROR: Estado no permitido para explicar.");
      return;
    }

    console.log("OK: Estado correcto, iniciando explicación...");
    stopVoice();

    if (isRecording) {
      console.log("Deteniendo grabación global activa");
      stopRecording();
    }

    const currentTask = getCurrentTask();
    if (currentTask) {
      setCurrentListeningFor(`Explicación para: ${currentTask.nombre}`);
    }

    setVoiceStep("listening-explanation");
    setExpectedInputType("explanation");
    setVoiceTranscript("");

    setTimeout(() => {
      console.log("Iniciando grabación para explicación...");
      startRecordingForExplanation();
    }, 100);
  };

  const startRecordingForExplanation = () => {
    console.log("Iniciando grabación específica para explicación...");

    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      console.error("ERROR: Navegador no soporta reconocimiento de voz");
      speakText("Tu navegador no soporta reconocimiento de voz. Por favor, usa el teclado.", 1.3);
      setTimeout(() => {
        setVoiceStep("waiting-for-explanation");
        setCurrentListeningFor("");
      }, 1000);
      return;
    }

    setIsRecording(true);
    setIsListening(true);
    setVoiceTranscript("");

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      console.log("OK: Reconocimiento de voz iniciado para explicación");
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      console.log("Transcripción recibida:", transcript);
      setVoiceTranscript(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("ERROR en reconocimiento de voz:", event.error);
      setIsListening(false);
      setIsRecording(false);
      setCurrentListeningFor("");

      if (event.error === "no-speech") {
        console.log("No se detectó voz");
        speakText("No escuché tu explicación. Por favor, intenta de nuevo.", 1.3);
      } else {
        console.log("Error de micrófono");
        speakText("Hubo un error con el micrófono. Por favor, intenta de nuevo.", 1.3);
      }

      setTimeout(() => {
        setVoiceStep("waiting-for-explanation");
      }, 1000);
    };

    recognition.onend = () => {
      console.log("Reconocimiento de voz finalizado");
      console.log("Transcripción final:", voiceTranscript);
      setIsListening(false);
      setIsRecording(false);
      setCurrentListeningFor("");

      if (!voiceTranscript.trim()) {
        console.log("No hay transcripción, volviendo a estado anterior");
        setTimeout(() => {
          setVoiceStep("waiting-for-explanation");
        }, 500);
      }
    };

    console.log("Iniciando reconocimiento de voz...");
    recognition.start();
  };

  const processVoiceExplanation = (transcript: string) => {
    const trimmedTranscript = transcript.trim();
    console.log("Procesando explicación de voz:", trimmedTranscript);

    const cleanedTranscript = trimmedTranscript
      .replace(/\b(terminar|listo|fin|confirmar|sí|si|no)\b/gi, '')
      .trim();

    if (!cleanedTranscript || cleanedTranscript.length < 10) {
      console.log("Transcripción muy corta o solo contiene comandos");

      if (isClearCommand(trimmedTranscript.toLowerCase(), ["terminar", "listo", "fin"])) {
        console.log("Es realmente un comando TERMINAR, procesando explicación");
      } else {
        speakText("La explicación es muy corta. Por favor, da más detalles sobre cómo resolverás esta tarea.", 1.3);
        setTimeout(() => {
          setVoiceStep("waiting-for-explanation");
          setExpectedInputType("explanation");
        }, 1000);
        return;
      }
    }

    const currentTask = getCurrentTask();
    const currentActivity = getCurrentActivity();

    if (!currentTask || !currentActivity) {
      console.error("ERROR: No hay tarea o actividad actual");
      return;
    }

    const updatedExplanations = taskExplanations.filter(exp => exp.taskId !== currentTask.id);

    const explanation: TaskExplanation = {
      taskId: currentTask.id,
      taskName: currentTask.nombre,
      activityTitle: currentActivity.actividadTitulo,
      explanation: trimmedTranscript,
      confirmed: false,
      priority: currentTask.prioridad,
      duration: currentTask.duracionMin,
      timestamp: new Date()
    };

    console.log("Explicación guardada (sin confirmar):", explanation);

    setTaskExplanations([...updatedExplanations, explanation]);
    setVoiceConfirmationText(trimmedTranscript);

    setVoiceStep("confirmation");
    setExpectedInputType("confirmation");

    const confirmationText = `¿Confirmas esta explicación para la tarea "${currentTask.nombre}"? Di 'sí' para confirmar o 'no' para corregir.`;

    console.log("Preguntando confirmación");
    speakText(confirmationText, 1.3);
  };

  const confirmExplanation = () => {
    console.log("========== CONFIRMANDO EXPLICACIÓN ==========");
    console.log("Estado actual: voiceStep =", voiceStep, "expectedInputType =", expectedInputType);

    if (voiceStep !== "confirmation" || expectedInputType !== "confirmation") {
      console.log("ERROR: No se puede confirmar en este estado");
      return;
    }

    const currentTask = getCurrentTask();
    const currentActivity = getCurrentActivity();

    if (!currentTask || !currentActivity) {
      console.error("ERROR: No hay tarea o actividad en el índice actual");
      return;
    }

    console.log("Confirmando tarea:", currentTask.nombre);

    setTaskExplanations(prev =>
      prev.map(exp =>
        exp.taskId === currentTask.id ? { ...exp, confirmed: true } : exp
      )
    );

    const nextTaskIndex = currentTaskIndex + 1;

    if (nextTaskIndex < currentActivity.tareas.length) {
      setCurrentTaskIndex(nextTaskIndex);
      setRetryCount(0);

      setTimeout(() => {
        speakTaskByIndices(currentActivityIndex, nextTaskIndex);
      }, 1000);
    } else {
      const nextActivityIndex = currentActivityIndex + 1;
      setCurrentActivityIndex(nextActivityIndex);
      setCurrentTaskIndex(0);
      setRetryCount(0);

      if (nextActivityIndex < activitiesWithTasks.length) {
        setTimeout(() => {
          speakActivityByIndex(nextActivityIndex);
        }, 1000);
      } else {
        console.log("Todas las actividades completadas, mostrando resumen");
        setVoiceStep("summary");
        setExpectedInputType("confirmation");

        setTimeout(() => {
          speakText("¡Perfecto! Has explicado todas las tareas de todas las actividades. ¿Quieres enviar este reporte?", 1.3);
        }, 500);
      }
    }
  };

  const retryExplanation = () => {
    console.log("========== REINTENTANDO EXPLICACIÓN ==========");
    console.log("Estado actual: voiceStep =", voiceStep, "expectedInputType =", expectedInputType);

    if (voiceStep !== "confirmation" || expectedInputType !== "confirmation") {
      console.log("ERROR: No se puede reintentar en este estado");
      return;
    }

    const currentTask = getCurrentTask();
    if (!currentTask) {
      console.error("ERROR: No hay tarea actual");
      return;
    }

    setTaskExplanations(prev => prev.filter(exp => exp.taskId !== currentTask.id));
    setRetryCount(prev => prev + 1);

    console.log("Reintento número:", retryCount + 1);
    stopVoice();

    setTimeout(() => {
      speakText("Por favor, explica nuevamente cómo resolverás esta tarea.", 1.3);
      setTimeout(() => {
        setVoiceStep("waiting-for-explanation");
        setExpectedInputType("explanation");
      }, 1000);
    }, 300);
  };

  const checkExistingConversation = async () => {
    try {
      setIsCheckingHistory(true);
      console.log("Verificando si hay sesión de historial existente...");

      const historial: HistorialSessionResponse = await obtenerHistorialSession();

      if (!historial.success || !historial.data) {
        console.log("No hay sesión de historial existente");
        setIsCheckingHistory(false);
        return false;
      }

      const proyectos = historial.proyectos;

      if (!proyectos || !proyectos.actividades) {
        setIsCheckingHistory(false);
        return false;
      }

      addMessageWithTyping(
        "bot",
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#6841ea]/5 border border-[#6841ea]/10">
            <div className="p-2 rounded-full bg-[#6841ea]/10">
              <User className="w-5 h-5 text-[#6841ea]" />
            </div>
            <div>
              <p className="font-medium text-sm">
                ¡Hola de nuevo, {displayName}! 👋
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {colaborador.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="p-2 rounded-full bg-[#6841ea]/10">
              <Brain className="w-5 h-5 text-[#6841ea]" />
            </div>
            <div>
              <h3 className="font-bold text-md">📋 Sesión restaurada</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date().toLocaleDateString("es-MX", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
                • Continuando donde te quedaste
              </p>
            </div>
          </div>
        </div>,
        400
      );

      setTimeout(() => {
        fetchAssistantAnalysis(false, true);
      }, 1000);

      setHasExistingSession(true);
      setIsCheckingHistory(false);
      return true;

    } catch (error) {
      console.error("Error al verificar conversación existente:", error);
      setIsCheckingHistory(false);
      return false;
    }
  };

  const skipTask = () => {
    console.log("========== SALTANDO TAREA ==========");
    console.log("Estado actual: voiceStep =", voiceStep);

    if (!["task-presentation", "waiting-for-explanation", "confirmation"].includes(voiceStep)) {
      console.log("ERROR: No se puede saltar en este estado");
      return;
    }

    const currentTask = getCurrentTask();
    const currentActivity = getCurrentActivity();

    if (!currentTask || !currentActivity) {
      console.error("ERROR: No hay tarea o actividad actual");
      return;
    }

    console.log("Saltando tarea:", currentTask.nombre);

    const explanation: TaskExplanation = {
      taskId: currentTask.id,
      taskName: currentTask.nombre,
      activityTitle: currentActivity.actividadTitulo,
      explanation: "[Tarea saltada]",
      confirmed: true,
      priority: currentTask.prioridad,
      duration: currentTask.duracionMin,
      timestamp: new Date()
    };

    const updatedExplanations = taskExplanations.filter(exp => exp.taskId !== currentTask.id);
    setTaskExplanations([...updatedExplanations, explanation]);

    const nextTaskIndex = currentTaskIndex + 1;

    if (nextTaskIndex < currentActivity.tareas.length) {
      setCurrentTaskIndex(nextTaskIndex);
      setRetryCount(0);

      setTimeout(() => {
        speakTaskByIndices(currentActivityIndex, nextTaskIndex);
      }, 500);
    } else {
      const nextActivityIndex = currentActivityIndex + 1;
      setCurrentActivityIndex(nextActivityIndex);
      setCurrentTaskIndex(0);
      setRetryCount(0);

      if (nextActivityIndex < activitiesWithTasks.length) {
        setTimeout(() => {
          speakActivityByIndex(nextActivityIndex);
        }, 500);
      } else {
        console.log("Todas las actividades completadas, mostrando resumen");
        setVoiceStep("summary");
        setExpectedInputType("confirmation");

        setTimeout(() => {
          speakText("¡Perfecto! Has explicado todas las tareas. ¿Quieres enviar este reporte?", 1.3);
        }, 500);
      }
    }
  };

  const processVoiceCommand = (transcript: string) => {
    if (!transcript.trim()) return;

    const lowerTranscript = transcript.toLowerCase().trim();
    console.log("Procesando comando de voz:", lowerTranscript);

    if (voiceMode) {
      console.log("Modo voz guiado ACTIVO - procesando comando específico");

      switch (expectedInputType) {
        case "confirmation":
          console.log("Estado: confirmation - voiceStep:", voiceStep);
          if (voiceStep === "confirmation" || voiceStep === "summary") {
            if (lowerTranscript.includes("sí") ||
              lowerTranscript.includes("si ") ||
              lowerTranscript.includes("confirm") ||
              lowerTranscript.includes("correcto") ||
              lowerTranscript.includes("vale") ||
              lowerTranscript.includes("ok") ||
              lowerTranscript.includes("de acuerdo")) {

              console.log("Comando de CONFIRMACION detectado");

              if (voiceStep === "confirmation") {
                console.log("Confirmando explicación actual");
                confirmExplanation();
              } else if (voiceStep === "summary") {
                console.log("Enviando explicaciones al backend");
                sendExplanationsToBackend();
              }
              return true;
            }

            if (lowerTranscript.includes("no") ||
              lowerTranscript.includes("corregir") ||
              lowerTranscript.includes("cambiar") ||
              lowerTranscript.includes("otra vez")) {

              console.log("Comando de CORRECCION detectado");

              if (voiceStep === "confirmation") {
                console.log("Reintentando explicación");
                retryExplanation();
              }
              return true;
            }
          }
          break;

        case "explanation":
          console.log("Estado: explanation - voiceStep:", voiceStep);
          if (voiceStep === "listening-explanation") {
            if (isClearCommand(lowerTranscript, ["terminar", "listo", "fin"])) {
              console.log("Comando TERMINAR explicación detectado");
              if (voiceTranscript.trim()) {
                processVoiceExplanation(voiceTranscript);
                return true;
              }
            }
          }
          break;

        case "none":
          console.log("No se espera input específico");
          break;
      }

      if (isClearCommand(lowerTranscript, ["saltar", "skip"])) {
        console.log("Comando SALTAR tarea detectado");
        skipTask();
        return true;
      }

      if (isClearCommand(lowerTranscript, ["cancelar", "salir"])) {
        console.log("Comando CANCELAR modo voz detectado");
        cancelVoiceMode();
        return true;
      }

      if ((voiceStep === "waiting-for-explanation" || voiceStep === "confirmation") &&
        isClearCommand(lowerTranscript, ["explicar", "empezar", "comenzar"])) {
        console.log("Comando INICIAR explicación detectado");
        startTaskExplanation();
        return true;
      }

      console.log("Comando no reconocido en modo voz guiado");
    } else {
      console.log("Modo voz guiado INACTIVO - procesando comandos globales");
    }

    console.log("Comando no procesado");
    return false;
  };

  const isClearCommand = (transcript: string, commands: string[]) => {
    const lowerTranscript = transcript.toLowerCase().trim();

    if (lowerTranscript.length > 30) return false;

    const isExactMatch = commands.some(cmd =>
      lowerTranscript === cmd ||
      lowerTranscript === ` ${cmd}` ||
      lowerTranscript === `${cmd} ` ||
      lowerTranscript === ` ${cmd} ` ||
      lowerTranscript === `${cmd}.` ||
      lowerTranscript === `${cmd},` ||
      lowerTranscript === `${cmd}!`
    );

    if (isExactMatch) return true;

    const words = lowerTranscript.split(/\s+/);
    const lastWord = words[words.length - 1];

    return commands.some(cmd =>
      lastWord === cmd ||
      lastWord === `${cmd}.` ||
      lastWord === `${cmd},` ||
      lastWord === `${cmd}!`
    );
  };

  const sendExplanationsToBackend = async () => {
    console.log("========== ENVIANDO EXPLICACIONES AL BACKEND ==========");

    if (!assistantAnalysis) {
      console.log("ERROR: No hay análisis de asistente");
      return;
    }

    try {
      setVoiceStep("sending");
      setExpectedInputType("none");
      speakText("Enviando tu reporte...", 1.3);

      const payload = {
        sessionId: assistantAnalysis.sessionId,
        userId: colaborador.email,
        projectId: assistantAnalysis.proyectoPrincipal,
        explanations: taskExplanations
          .filter(exp => exp.explanation !== "[Tarea saltada]")
          .map(exp => ({
            taskId: exp.taskId,
            taskName: exp.taskName,
            activityTitle: exp.activityTitle,
            explanation: exp.explanation,
            priority: exp.priority,
            duration: exp.duration,
            recordedAt: exp.timestamp.toISOString(),
            confirmed: exp.confirmed
          }))
      };

      console.log("Payload a enviar:", payload);

      const response = await fetch(
        "http://localhost:4000/api/v1/assistant/guardar-explicaciones",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const result = await response.json();

      speakText("¡Correcto! Tu reporte ha sido enviado. Gracias, puedes comenzar tu día.", 1.3);

      setTimeout(() => {
        setVoiceStep("idle");
        setVoiceMode(false);
        setShowVoiceSummary(false);
        setExpectedInputType("none");

        addMessage(
          "bot",
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500" />
              <div>
                <span className="font-medium">Actividades guardadas</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  Has explicado {taskExplanations.filter(exp => exp.explanation !== "[Tarea saltada]").length} tareas.
                  El reporte ha sido enviado a tu equipo.
                </p>
              </div>
            </div>
          </div>
        );
      }, 1000);

    } catch (error) {
      console.error("Error al enviar explicaciones:", error);
      speakText("Hubo un error al enviar tu reporte. Puedes intentar nuevamente.", 1.3);
      setVoiceStep("summary");
      setExpectedInputType("confirmation");
    }
  };

  useEffect(() => {
    if (!voiceTranscript) {
      return;
    }

    console.log("========================================");
    console.log("EFECTO: Procesando voiceTranscript:", voiceTranscript);
    console.log("voiceMode activo?:", voiceMode);
    console.log("voiceStep actual:", voiceStep);

    if (!voiceMode) {
      return;
    }

    const processed = processVoiceCommand(voiceTranscript);

    if (processed) {
      console.log("Comando procesado exitosamente");
      setVoiceTranscript("");
    } else {
      console.log("Comando NO fue procesado");
    }
  }, [voiceTranscript, voiceMode]);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log("Voces disponibles:", voices.map(v => `${v.name} (${v.lang})`));
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    const checkTimeAndVerifyActivities = () => {
      if (checkIfAfterHours()) {
        console.log("Es después de las 17:30, verificando actividades...");
        checkEndOfDayActivities();
      }
    };

    checkTimeAndVerifyActivities();

    const interval = setInterval(checkTimeAndVerifyActivities, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
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
            console.log("No se pueden aplicar ciertas restricciones de ventana");
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
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopVoice();
    };
  }, [isInPiPWindow, stopVoice]);

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

  const fetchAssistantAnalysis = async (showAll = false, isRestoration = false) => {
    try {
      setIsTyping(true);
      setStep("loading-analysis");

      if (!isRestoration) {
        addMessage(
          "system",
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Brain className="w-4 h-4 text-[#6841ea]" />
            {showAll ? "Obteniendo todas tus actividades..." : "Obteniendo análisis de tus actividades..."}
          </div>
        );
      }

      const requestBody = {
        email: colaborador.email,
        showAll: showAll
      };

      const response = await fetch(
        "http://localhost:4000/api/v1/assistant/actividades-con-revisiones",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = await response.json();

      console.log("Respuesta del endpoint con revisiones:", JSON.stringify(data, null, 2));

      const adaptedData: AssistantAnalysis = {
        success: data.success,
        answer: data.answer,
        provider: data.provider || "Gemini",
        sessionId: data.sessionId,
        proyectoPrincipal: data.proyectoPrincipal || "Sin proyecto principal",
        metrics: {
          totalActividades: data.metrics?.totalActividadesProgramadas || 0,
          actividadesConTiempoTotal: data.metrics?.actividadesConTiempoTotal || 0,
          actividadesFinales: data.metrics?.actividadesFinales || 0,
          tareasConTiempo: data.metrics?.tareasConTiempo || 0,
          tareasAltaPrioridad: data.metrics?.tareasAltaPrioridad || 0,
          tiempoEstimadoTotal: data.metrics?.tiempoEstimadoTotal || "0h 0m"
        },
        data: {
          actividades: data.data?.actividades?.map((a: any) => ({
            id: a.id,
            titulo: a.titulo,
            horario: a.horario,
            status: a.status,
            proyecto: a.proyecto,
            esHorarioLaboral: a.esHorarioLaboral || false,
            tieneRevisionesConTiempo: a.tieneRevisionesConTiempo || false
          })) || [],
          revisionesPorActividad: data.data?.revisionesPorActividad?.map((act: any) => ({
            actividadId: act.actividadId,
            actividadTitulo: act.actividadTitulo,
            actividadHorario: act.actividadHorario,
            tareasConTiempo: act.tareasConTiempo?.map((t: any) => ({
              id: t.id,
              nombre: t.nombre,
              terminada: t.terminada || false,
              confirmada: t.confirmada || false,
              duracionMin: t.duracionMin || 0,
              fechaCreacion: t.fechaCreacion,
              fechaFinTerminada: t.fechaFinTerminada || null,
              diasPendiente: t.diasPendiente || 0,
              prioridad: t.prioridad || "BAJA"
            })) || [],
            totalTareasConTiempo: act.totalTareasConTiempo || 0,
            tareasAltaPrioridad: act.tareasAltaPrioridad || 0,
            tiempoTotal: act.tiempoTotal || 0,
            tiempoFormateado: act.tiempoFormateado || "0h 0m"
          })) || []
        },
        multiActividad: data.multiActividad || false
      };

      console.log("Datos adaptados:", {
        actividades: adaptedData.data.actividades.length,
        revisiones: adaptedData.data.revisionesPorActividad.length,
        tareasTotales: adaptedData.data.revisionesPorActividad.reduce((sum, act) => sum + act.tareasConTiempo.length, 0)
      });

      setAssistantAnalysis(adaptedData);
      showAssistantAnalysis(adaptedData, isRestoration);
    } catch (error) {
      console.error("Error al obtener análisis del asistente:", error);
      setIsTyping(false);
      // sin datos de ejemplo ni estatico
      addMessage(
        "bot",
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <span className="font-medium">Error al obtener actividades</span>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                Hubo un problema al obtener tus actividades. Por favor, intenta nuevamente más tarde.
              </p>
            </div>
          </div>
        </div>
      );
    } finally {
      setIsTyping(false);
    }
  };

  const showAssistantAnalysis = async (analysis: AssistantAnalysis, isRestoration = false) => {
    const todasLasTareas = analysis.data.revisionesPorActividad.flatMap(
      actividad => actividad.tareasConTiempo
    );

    const hayTareas = todasLasTareas.length > 0;

    if (!isRestoration) {
      addMessageWithTyping(
        "bot",
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#6841ea]/5 border border-[#6841ea]/10">
            <div className="p-2 rounded-full bg-[#6841ea]/10">
              <User className="w-5 h-5 text-[#6841ea]" />
            </div>
            <div>
              <p className="font-medium text-sm">Hola, {displayName}!</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {colaborador.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="p-2 rounded-full bg-[#6841ea]/10">
              <Brain className="w-5 h-5 text-[#6841ea]" />
            </div>
            <div>
              <h3 className="font-bold text-md">📋 Resumen de tu día</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date().toLocaleDateString("es-MX", {
                  weekday: "short",
                  month: "short",
                  day: "numeric"
                })}
              </p>
            </div>
          </div>
        </div>,
        400
      );

      setTimeout(async () => {
        addMessageWithTyping(
          "bot",
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className={`p-3 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-3 h-3 text-red-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Alta</span>
                </div>
                <div className="text-xl font-bold text-red-500">{analysis.metrics.tareasAltaPrioridad || 0}</div>
              </div>
              <div className={`p-3 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-3 h-3 text-green-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total</span>
                </div>
                <div className="text-xl font-bold">{analysis.metrics.tareasConTiempo || 0}</div>
              </div>
              <div className={`p-3 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Tiempo</span>
                </div>
                <div className="text-xl font-bold text-yellow-500">{analysis.metrics.tiempoEstimadoTotal || "0h 0m"}</div>
              </div>
            </div>

            {analysis.answer && (
              <div className={`p-3 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-start gap-2">
                  <Bot className="w-4 h-4 text-[#6841ea] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {analysis.answer.split("\n\n")[0]}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>,
          600
        );
      }, 800);
    }

    setTimeout(async () => {
      if (!hayTareas) {
        addMessageWithTyping(
          "bot",
          <div className={`p-4 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-gray-50 border-gray-200"}`}>
            <div className="text-center py-4">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Sin tareas planificadas</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">No hay tareas con tiempo estimado para hoy.</p>
            </div>
          </div>,
          800
        );
      } else {
        addMessageWithTyping(
          "bot",
          <div className={`rounded-lg border overflow-hidden ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-white border-gray-200"}`}>
            <div className="p-3 border-b border-[#2a2a2a] bg-[#6841ea]/10">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Target className="w-4 h-4" />
                Actividades del Día ({analysis.data.actividades.length})
              </h4>
            </div>
            <div className="p-3 space-y-4">
              {analysis.data.actividades.map((actividad, idx) => {
                const revisiones = analysis.data.revisionesPorActividad.find(
                  rev => rev.actividadId === actividad.id
                );
                const tareas = revisiones?.tareasConTiempo || [];

                return (
                  <div key={actividad.id} className={`p-3 rounded-lg ${theme === "dark" ? "bg-[#252527]" : "bg-gray-50"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                          ${idx % 3 === 0 ? "bg-blue-500/20 text-blue-500" :
                            idx % 3 === 1 ? "bg-purple-500/20 text-purple-500" :
                              "bg-pink-500/20 text-pink-500"}`}>
                          {idx + 1}
                        </div>
                        <h5 className="font-medium text-sm">{actividad.titulo}</h5>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {actividad.horario}
                      </Badge>
                    </div>

                    {tareas.length > 0 && (
                      <div className="ml-8 mt-2 space-y-2">
                        {tareas.map((tarea, tIdx) => (
                          <div key={tarea.id} className={`p-2 rounded ${theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs
                                  ${tarea.prioridad === "ALTA" ? "bg-red-500/20 text-red-500" :
                                    tarea.prioridad === "MEDIA" ? "bg-yellow-500/20 text-yellow-500" :
                                      "bg-green-500/20 text-green-500"}`}>
                                  {tIdx + 1}
                                </div>
                                <span className="text-sm">{tarea.nombre}</span>
                              </div>
                              <Badge variant={tarea.prioridad === "ALTA" ? "destructive" : "secondary"} className="text-xs">
                                {tarea.prioridad}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 ml-7">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {tarea.duracionMin} min
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {tarea.diasPendiente || 0}d
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className={`p-3 border-t ${theme === "dark" ? "border-[#2a2a2a] bg-[#252527]" : "border-gray-200 bg-gray-50"}`}>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Total tiempo estimado:</span>
                <span className="font-bold">{analysis.metrics.tiempoEstimadoTotal}</span>
              </div>
            </div>
          </div>,
          800
        );
      }

      setTimeout(async () => {
        await addMessageWithTyping(
          "bot",
          <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-[#1a1a1a] border border-[#2a2a2a]" : "bg-gray-50 border border-gray-200"}`}>
            <div className="space-y-3">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {hayTareas
                  ? "¿Te gustaría explicar tus tareas usando el modo guiado por voz?"
                  : "¿Necesitas ayuda para planificar nuevas tareas?"}
              </p>
              {hayTareas && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={startVoiceMode}
                    className="bg-[#6841ea] hover:bg-[#5a36d4] flex items-center gap-2"
                  >
                    <Headphones className="w-4 h-4" />
                    Modo Voz Guiado
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStep("finished")}
                  >
                    Continuar en chat
                  </Button>
                </div>
              )}
            </div>
          </div>,
          600
        );
        setStep("finished");
      }, 1000);
    }, isRestoration ? 500 : 800);
  };

  const startRecording = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Tu navegador no soporta reconocimiento de voz");
      return;
    }

    if (isRecording) {
      stopRecording();
      return;
    }

    window.speechSynthesis.cancel();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (e) {
        console.log("Error al detener reconocimiento previo:", e);
      }
    }

    setShowVoiceOverlay(true);
    setIsRecording(true);
    setIsListening(true);
    setVoiceTranscript("");

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      console.log("✅ Reconocimiento de voz INICIADO");
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        } else {
          transcript += event.results[i][0].transcript;
        }
      }
      setVoiceTranscript(transcript);
    };

    recognition.onerror = (event: any) => {
      console.warn("⚠️ SpeechRecognition error:", event.error);

      if (event.error === "aborted") {
        console.log("🔄 Abortado intencionalmente");
        setIsListening(false);
        setIsRecording(false);
        setShowVoiceOverlay(false);
        return;
      }

      setIsListening(false);
      setIsRecording(false);
      setShowVoiceOverlay(false);
    };

    recognition.onend = () => {
      console.log("🛑 Reconocimiento de voz FINALIZADO");
      setIsListening(false);
      setIsRecording(false);
      setShowVoiceOverlay(false);
    };

    setTimeout(() => {
      try {
        recognition.start();
        console.log("🎤 Iniciando reconocimiento...");
      } catch (error) {
        console.error("❌ Error al iniciar reconocimiento:", error);
        setIsListening(false);
        setIsRecording(false);
        setShowVoiceOverlay(false);

        setTimeout(() => {
          try {
            recognition.start();
          } catch (retryError) {
            console.error("❌ Error en reintento:", retryError);
            alert("No se pudo acceder al micrófono. Por favor, verifica los permisos.");
          }
        }, 300);
      }
    }, 100);
  };

  const stopRecording = () => {
    console.log("========== DETENIENDO GRABACIÓN ==========");
    console.log("voiceMode:", voiceMode);
    console.log("voiceStep:", voiceStep);
    console.log("voiceTranscript:", voiceTranscript);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setIsListening(false);
    setShowVoiceOverlay(false);
    setCurrentListeningFor("");

    if (voiceMode && voiceStep === "listening-explanation" && voiceTranscript.trim()) {
      console.log("Procesando explicación después de detener grabación");
      processVoiceExplanation(voiceTranscript);
    } else if (voiceMode && voiceStep === "listening-explanation" && !voiceTranscript.trim()) {
      console.log("No hay transcripción, volviendo a waiting-for-explanation");
      speakText("No escuché tu explicación. Por favor, intenta de nuevo.", 1.3);
      setTimeout(() => {
        setVoiceStep("waiting-for-explanation");
      }, 1000);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const openPiPWindow = () => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
    }

    const width = 400;
    const height = 600;
    const left = window.screenLeft + window.outerWidth - width;
    const top = window.screenTop;

    const features = [
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
      "popup=yes",
      "menubar=no",
      "toolbar=no",
      "location=no",
      "status=no",
      "resizable=yes",
      "scrollbars=no",
      "titlebar=no",
      "chrome=no",
      "dialog=yes",
      "modal=no",
      "alwaysRaised=yes",
      "z-lock=yes"
    ].join(",");

    const pipUrl = `${window.location.origin}${window.location.pathname}?pip=true&timestamp=${Date.now()}`;
    pipWindowRef.current = window.open(pipUrl, "anfeta_pip", features);

    if (pipWindowRef.current) {
      setIsPiPMode(true);
      pipWindowRef.current.addEventListener("beforeunload", () => {
        try {
          window.opener?.postMessage({ type: "CHILD_CLOSED" }, "*");
        } catch (e) {
          console.log("No se pudo notificar cierre a ventana principal");
        }
      });

      setTimeout(() => {
        if (pipWindowRef.current && !pipWindowRef.current.closed) {
          try {
            pipWindowRef.current.focus();
          } catch (e) {
            console.log("No se pudo enfocar la ventana PiP");
          }
        }
      }, 100);

      const checkWindowClosed = setInterval(() => {
        if (pipWindowRef.current?.closed) {
          clearInterval(checkWindowClosed);
          setIsPiPMode(false);
          pipWindowRef.current = null;
        }
      }, 1000);
    } else {
      alert("No se pudo abrir la ventana flotante. Por favor, permite ventanas emergentes para este sitio.");
    }
  };

  const closePiPWindow = () => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
    }
    setIsPiPMode(false);
  };

  const addMessage = (
    type: Message["type"],
    content: string | React.ReactNode,
    voiceText?: string
  ) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date(),
      voiceText
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const addMessageWithTyping = async (
    type: Message["type"],
    content: string | React.ReactNode,
    delay = 800
  ) => {
    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, delay));
    setIsTyping(false);
    addMessage(type, content);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, voiceMode, voiceStep]);

  useEffect(() => {
    if (inputRef.current && step !== "loading-analysis" && !voiceMode) {
      inputRef.current.focus();
    }
  }, [step, voiceMode]);

  useEffect(() => {
    if (welcomeSentRef.current) return;
    welcomeSentRef.current = true;

    const init = async () => {
      const user = await validateSession();
      if (!user) {
        router.replace("/");
        return;
      }

      const hasExistingSession = await checkExistingConversation();

      if (!hasExistingSession) {
        setTimeout(() => {
          addMessageWithTyping("bot", `¡Hola ${displayName}! 👋 Soy tu asistente.`, 500);
          setTimeout(() => {
            addMessage(
              "system",
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Mail className="w-4 h-4 text-[#6841ea]" />
                Buscando tus actividades para el día de hoy...
              </div>
            );
            fetchAssistantAnalysis(false);
          }, 1500);
        }, 500);
      }
    };

    init();
  }, [router, displayName]);

  const handleUserInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const input = userInput.trim();
    setUserInput("");
    addMessage("user", input);

    if (step === "finished") {
      addMessage(
        "bot",
        <div className="text-gray-700 dark:text-gray-300">
          He recibido tu comentario. ¿Te gustaría cerrar sesión o tienes alguna pregunta sobre el análisis?
        </div>
      );
    }
  };

  const canUserType = step !== "loading-analysis" && !voiceMode;

  const handleVoiceMessageClick = (voiceText: string) => {
    setUserInput(voiceText);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const VoiceGuidanceFlow = () => {
    if (!voiceMode) return null;

    console.log("=== VOICE GUIDANCE FLOW ===");
    console.log("activitiesWithTasks length:", activitiesWithTasks.length);
    console.log("currentActivityIndex:", currentActivityIndex);
    console.log("currentTaskIndex:", currentTaskIndex);

    if (!activitiesWithTasks || activitiesWithTasks.length === 0) {
      console.log("No hay actividades disponibles");
      return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${theme === "dark" ? "bg-black/80" : "bg-white/95"}`}>
          <div className={`max-w-2xl w-full mx-4 rounded-xl overflow-hidden shadow-2xl ${theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"}`}>
            <div className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">No hay actividades disponibles</h3>
              <p className="text-sm text-gray-500 mb-4">No se encontraron actividades con tareas para explicar.</p>
              <Button onClick={cancelVoiceMode}>Cerrar</Button>
            </div>
          </div>
        </div>
      );
    }

    const currentActivity = getCurrentActivity();
    const currentTask = getCurrentTask();

    if (!currentActivity) {
      console.error("ERROR: No hay actividad en el índice actual");
      return null;
    }

    const progressPercentage = totalActivities > 0 ?
      ((currentActivityIndex * 100) / totalActivities) +
      ((currentTaskIndex * 100) / (totalActivities * Math.max(currentActivity.tareas.length, 1))) : 0;

    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${theme === "dark" ? "bg-black/80" : "bg-white/95"}`}>
        <div className={`max-w-2xl w-full mx-4 rounded-xl overflow-hidden shadow-2xl ${theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"}`}>
          <div className={`p-4 border-b ${theme === "dark" ? "border-[#2a2a2a] bg-[#252527]" : "border-gray-200 bg-gray-50"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${theme === "dark" ? "bg-[#6841ea]/20" : "bg-[#6841ea]/10"}`}>
                  <Headphones className="w-5 h-5 text-[#6841ea]" />
                </div>
                <div>
                  <h3 className="font-bold">Modo Voz Guiado</h3>
                  <p className="text-xs text-gray-500">
                    {isSpeaking ? "Asistente hablando..." :
                      voiceStep === "confirm-start" ? "Confirmar inicio" :
                        voiceStep === "activity-presentation" ? `Presentando actividad ${currentActivityIndex + 1} de ${totalActivities}` :
                          voiceStep === "task-presentation" ? `Tarea ${currentTaskIndex + 1} de ${currentActivity.tareas.length}` :
                            voiceStep === "waiting-for-explanation" ? "Esperando explicación" :
                              voiceStep === "listening-explanation" ? "Escuchando tu explicación" :
                                voiceStep === "confirmation" ? "Confirmar explicación" :
                                  voiceStep === "summary" ? "Resumen final" :
                                    voiceStep === "sending" ? "Enviando..." : "Listo"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSpeaking && (
                  <div className="flex gap-1">
                    <div className="w-1 h-4 bg-[#6841ea] rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
                    <div className="w-1 h-6 bg-[#6841ea] rounded-full animate-pulse" style={{ animationDelay: "100ms" }} />
                    <div className="w-1 h-5 bg-[#6841ea] rounded-full animate-pulse" style={{ animationDelay: "200ms" }} />
                    <div className="w-1 h-7 bg-[#6841ea] rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
                <Button variant="ghost" size="sm" onClick={cancelVoiceMode}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {totalActivities > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>
                    {voiceStep === "activity-presentation" ?
                      `Actividad ${currentActivityIndex + 1} de ${totalActivities}` :
                      `Actividad ${currentActivityIndex + 1}, Tarea ${currentTaskIndex + 1} de ${currentActivity.tareas.length}`
                    }
                  </span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <div className={`h-1 rounded-full ${theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-200"}`}>
                  <div
                    className="h-full bg-[#6841ea] rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-6">
            {voiceStep === "confirm-start" && (
              <div className="text-center space-y-4">
                <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${theme === "dark" ? "bg-[#6841ea]/20" : "bg-[#6841ea]/10"}`}>
                  <Headphones className="w-8 h-8 text-[#6841ea]" />
                </div>
                <h4 className="text-lg font-bold">Modo voz guiado por actividades</h4>
                <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                  Te guiaré por cada actividad y sus tareas pendientes para que expliques tu plan de acción.
                </p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-[#252527]" : "bg-gray-50"}`}>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">Actividades</span>
                    </div>
                    <div className="text-xl font-bold mt-1">{totalActivities}</div>
                  </div>
                  <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-[#252527]" : "bg-gray-50"}`}>
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Tareas</span>
                    </div>
                    <div className="text-xl font-bold mt-1">{totalTasks}</div>
                  </div>
                </div>
                <div className="flex gap-3 justify-center pt-4">
                  <Button
                    onClick={confirmStartVoiceMode}
                    className="bg-[#6841ea] hover:bg-[#5a36d4] px-6"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Comenzar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelVoiceMode}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {voiceStep === "activity-presentation" && currentActivity && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-blue-900/20 border border-blue-500/20" : "bg-blue-50 border border-blue-200"}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-blue-500/20" : "bg-blue-100"}`}>
                      <FolderOpen className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-bold">Actividad {currentActivityIndex + 1} de {totalActivities}</h4>
                      <p className="text-xs text-gray-500">{currentActivity.actividadHorario}</p>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{currentActivity.actividadTitulo}</h3>
                  <div className="flex items-center gap-3 text-sm">
                    <span className={`px-2 py-1 rounded ${theme === "dark" ? "bg-blue-900/30" : "bg-blue-100"}`}>
                      📋 {currentActivity.tareas.length} tarea{currentActivity.tareas.length !== 1 ? 's' : ''}
                    </span>
                    <span className={`px-2 py-1 rounded ${theme === "dark" ? "bg-purple-900/30" : "bg-purple-100"}`}>
                      ⏱️ {currentActivity.tareas.reduce((sum, t) => sum + t.duracionMin, 0)} min
                    </span>
                  </div>
                </div>

                <div className="text-center">
                  <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"} mb-4`}>
                    Esta actividad tiene {currentActivity.tareas.length} tarea{currentActivity.tareas.length !== 1 ? 's' : ''} pendiente{currentActivity.tareas.length !== 1 ? 's' : ''}. Comenzaré a presentarlas.
                  </p>
                  <Button
                    onClick={() => speakTaskByIndices(currentActivityIndex, 0)}
                    className="bg-[#6841ea] hover:bg-[#5a36d4]"
                    disabled={isSpeaking}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Ver primera tarea
                  </Button>
                </div>
              </div>
            )}

            {(voiceStep === "task-presentation" || voiceStep === "waiting-for-explanation") && currentTask && currentActivity && (
              <div className="space-y-4">
                <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-[#252527]" : "bg-gray-50"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FolderOpen className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">{currentActivity.actividadTitulo}</span>
                  </div>

                  <div className={`p-3 rounded ${theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${currentTask.prioridad === "ALTA" ? "bg-red-500/20 text-red-500" :
                              currentTask.prioridad === "MEDIA" ? "bg-yellow-500/20 text-yellow-500" :
                                "bg-green-500/20 text-green-500"}`}>
                            {currentTaskIndex + 1}
                          </div>
                          <h4 className="font-bold">{currentTask.nombre}</h4>
                        </div>
                        <div className="flex gap-3 text-sm text-gray-500 ml-8">
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {currentTask.prioridad}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {currentTask.duracionMin} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {currentTask.diasPendiente || 0} días
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={currentTask.prioridad === "ALTA" ? "destructive" : "secondary"}
                        className="text-xs shrink-0"
                      >
                        {currentTask.prioridad}
                      </Badge>
                    </div>

                    {taskExplanations.find(exp => exp.taskId === currentTask.id)?.explanation !== "[Tarea saltada]" &&
                      taskExplanations.find(exp => exp.taskId === currentTask.id) && (
                        <div className={`mt-3 p-2 rounded ${theme === "dark" ? "bg-green-900/20 border border-green-500/20" : "bg-green-50 border border-green-200"}`}>
                          <div className="flex items-center gap-2">
                            <Check className="w-3 h-3 text-green-500" />
                            <span className="text-xs font-medium">Explicación guardada</span>
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={startTaskExplanation}
                    className="flex-1 bg-[#6841ea] hover:bg-[#5a36d4] h-12"
                    disabled={isSpeaking || voiceStep === "listening-explanation"}
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    {taskExplanations.find(exp => exp.taskId === currentTask.id) ? "Corregir explicación" : "Explicar esta tarea"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={skipTask}
                    className="h-12"
                    disabled={isSpeaking || voiceStep === "listening-explanation"}
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>

                {voiceStep === "waiting-for-explanation" && (
                  <div className="text-center text-sm text-gray-500">
                    Presiona el botón para empezar a explicar esta tarea, o di "saltar" para omitirla
                  </div>
                )}
              </div>
            )}

            {voiceStep === "listening-explanation" && (
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full mx-auto bg-red-500/20 flex items-center justify-center animate-pulse">
                    <Mic className="w-10 h-10 text-red-500" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="absolute w-24 h-24 rounded-full border-2 border-red-500 animate-ping"
                        style={{ animationDelay: `${i * 0.2}s`, opacity: 0.5 - (i * 0.1) }}
                      />
                    ))}
                  </div>
                </div>

                <h4 className="text-lg font-bold">Escuchando...</h4>

                {currentListeningFor && (
                  <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-blue-900/20 border border-blue-500/20" : "bg-blue-50 border border-blue-200"}`}>
                    <p className={`text-sm font-medium ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
                      🎤 Escuchando para: {currentListeningFor}
                    </p>
                  </div>
                )}

                <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                  {retryCount > 0 ? "Corrige tu explicación, por favor." : "Por favor, explica cómo resolverás esta tarea."}
                </p>

                {voiceTranscript && (
                  <div className={`p-3 rounded ${theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"}`}>
                    <p className="text-sm mb-2">{voiceTranscript}</p>
                    <p className="text-xs text-gray-500">Cuando termines de hablar, haz clic en "Terminar y Confirmar"</p>
                  </div>
                )}

                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={stopRecording}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Terminar y Confirmar
                  </Button>
                  <Button
                    onClick={() => {
                      if (recognitionRef.current) {
                        recognitionRef.current.stop();
                      }
                      setIsRecording(false);
                      setIsListening(false);
                      setVoiceStep("waiting-for-explanation");
                      setCurrentListeningFor("");
                    }}
                    variant="outline"
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {voiceStep === "confirmation" && currentTask && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-blue-900/20 border border-blue-500/20" : "bg-blue-50 border border-blue-200"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Volume2 className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">Tu explicación para:</span>
                  </div>
                  <p className="text-sm font-medium mb-2">{currentTask.nombre}</p>
                  <div className={`p-3 rounded ${theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"}`}>
                    <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                      {voiceConfirmationText}
                    </p>
                  </div>
                </div>

                <p className={`text-sm text-center ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                  ¿Confirmas esta explicación? Di "sí" para confirmar o "no" para corregir.
                </p>

                <div className="flex gap-3">
                  <Button
                    onClick={confirmExplanation}
                    className="flex-1 bg-[#6841ea] hover:bg-[#5a36d4]"
                    disabled={isSpeaking}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Sí, confirmar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={retryExplanation}
                    className="flex-1"
                    disabled={isSpeaking}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    No, corregir
                  </Button>
                </div>
              </div>
            )}

            {voiceStep === "summary" && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${theme === "dark" ? "bg-green-900/20" : "bg-green-100"}`}>
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <h4 className="text-lg font-bold mt-3">¡Todas las tareas explicadas!</h4>
                  <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"} mt-1`}>
                    Has completado {taskExplanations.filter(exp => exp.explanation !== "[Tarea saltada]").length} de {totalTasks} tareas.
                  </p>
                </div>

                <div className={`max-h-60 overflow-y-auto rounded-lg border ${theme === "dark" ? "border-[#2a2a2a]" : "border-gray-200"}`}>
                  {activitiesWithTasks.map((activity, aIdx) => {
                    const activityExplanations = taskExplanations.filter(
                      exp => exp.activityTitle === activity.actividadTitulo && exp.explanation !== "[Tarea saltada]"
                    );

                    if (activityExplanations.length === 0) return null;

                    return (
                      <div key={activity.actividadId} className="border-b border-[#2a2a2a]">
                        <div className={`p-3 ${theme === "dark" ? "bg-[#252527]" : "bg-gray-50"}`}>
                          <div className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-blue-500" />
                            <span className="font-medium text-sm">{activity.actividadTitulo}</span>
                            <Badge variant="outline" className="text-xs">
                              {activityExplanations.length} de {activity.tareas.length}
                            </Badge>
                          </div>
                        </div>
                        {activityExplanations.map((exp, tIdx) => (
                          <div
                            key={exp.taskId}
                            className={`p-3 ${tIdx % 2 === 0 ? (theme === "dark" ? "bg-[#1a1a1a]" : "bg-white") : (theme === "dark" ? "bg-[#252527]" : "bg-gray-50")}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Check className={`w-3 h-3 ${exp.confirmed ? "text-green-500" : "text-yellow-500"}`} />
                              <span className="font-medium text-sm truncate">{exp.taskName}</span>
                              <Badge variant="outline" className="text-xs">{exp.priority}</Badge>
                            </div>
                            <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"} ml-5`}>
                              {exp.explanation}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={sendExplanationsToBackend}
                    className="flex-1 bg-[#6841ea] hover:bg-[#5a36d4]"
                    disabled={isSpeaking}
                  >
                    Comenzar jornada
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelVoiceMode}
                    disabled={isSpeaking}
                  >
                    Ver más tarde
                  </Button>
                </div>
              </div>
            )}

            {voiceStep === "sending" && (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-[#6841ea] animate-spin" />
                  </div>
                </div>
                <h4 className="text-lg font-bold">Guardando...</h4>
                <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                  Tu reporte está siendo enviado.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen font-['Arial'] flex flex-col ${theme === "dark" ? "bg-[#101010] text-white" : "bg-white text-gray-900"}`}>
      <VoiceGuidanceFlow />

      {showVoiceOverlay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
          <div className={`p-8 rounded-2xl max-w-md w-full mx-4 ${theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"}`}>
            <div className="text-center">
              <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${isListening ? "bg-red-500 animate-pulse" : "bg-[#6841ea]"}`}>
                {isListening ? (
                  <Volume2 className="w-10 h-10 text-white animate-pulse" />
                ) : (
                  <MicOff className="w-10 h-10 text-white" />
                )}
              </div>

              <h3 className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {isListening ? "🎤 Escuchando..." : "Micrófono listo"}
              </h3>

              {isListening && currentListeningFor && (
                <div className={`p-3 rounded-lg mb-4 ${theme === "dark" ? "bg-blue-900/30" : "bg-blue-50"}`}>
                  <p className={`text-sm font-medium ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
                    Para: {currentListeningFor}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={stopRecording}
                  className="flex-1 bg-[#6841ea] text-white py-3 rounded-lg font-semibold hover:bg-[#5a36d4] transition"
                >
                  Aceptar
                </button>
                <button
                  onClick={() => {
                    stopRecording();
                    setVoiceTranscript("");
                    setCurrentListeningFor("");
                  }}
                  className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isInPiPWindow && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className={`absolute top-0 left-0 right-0 h-25 bg-gradient-to-b ${theme === "dark" ? "from-[#101010]/90 via-[#101010]/90 to-transparent" : "from-white/70 via-white/40 to-transparent"}`} />
          <div className="relative max-w-4xl mx-auto">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full flex items-center justify-center animate-tilt">
                  <Image src="/icono.webp" alt="Chat" width={80} height={80} className="object-contain rounded-full drop-shadow-[0_0_16px_rgba(168,139,255,0.9)]" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Asistente</h1>
                  <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    {displayName} • {colaborador.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isPiPMode ? (
                  <button onClick={openPiPWindow} className={`w-9 h-9 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-[#2a2a2a] hover:bg-[#353535]" : "bg-gray-100 hover:bg-gray-200"}`} title="Abrir en ventana flotante">
                    <PictureInPicture className="w-4 h-4 text-[#6841ea]" />
                  </button>
                ) : (
                  <button onClick={closePiPWindow} className={`w-9 h-9 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-red-600 hover:bg-red-700" : "bg-red-500 hover:bg-red-600"}`} title="Cerrar ventana flotante">
                    <Minimize2 className="w-4 h-4 text-white" />
                  </button>
                )}
                <button onClick={toggleTheme} className={`w-9 h-9 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-[#2a2a2a] hover:bg-[#353535]" : "bg-gray-100 hover:bg-gray-200"}`}>
                  {theme === "light" ? <Moon className="w-4 h-4 text-gray-700" /> : <Sun className="w-4 h-4 text-gray-300" />}
                </button>
                <button onClick={() => setShowLogoutDialog(true)} className={`px-4 py-2 rounded-lg text-sm font-medium ${theme === "dark" ? "bg-[#2a2a2a] hover:bg-[#353535] text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
                  <LogOut className="w-4 h-4 mr-2 inline" />
                  Salir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isInPiPWindow && (
        <div className={`fixed top-0 left-0 right-0 z-50 ${theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"}`}>
          <div className="max-w-full mx-auto p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-[#252527]" : "bg-gray-100"}`}>
                  <Image src="/icono.webp" alt="Chat" width={16} height={16} className="object-contain" />
                </div>
                <h2 className="text-sm font-bold truncate">Anfeta Asistente</h2>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={toggleTheme} className={`w-7 h-7 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-[#2a2a2a] hover:bg-[#353535]" : "bg-gray-100 hover:bg-gray-200"}`} title="Cambiar tema">
                  {theme === "light" ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                </button>
                <button onClick={() => window.close()} className={`w-7 h-7 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-red-600 hover:bg-red-700" : "bg-red-500 hover:bg-red-600"}`} title="Cerrar ventana">
                  <span className="text-white text-xs font-bold">✕</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto ${isInPiPWindow ? "pt-16" : "pt-20"} ${!isInPiPWindow ? "pb-24" : "pb-20"}`}>
        <div className="max-w-4xl mx-auto w-full px-4">
          {isCheckingHistory && (
            <div className="flex justify-center items-center py-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Restaurando tu sesión anterior...
              </div>
            </div>
          )}

          {isCheckingAfterHours && (
            <div className="flex justify-center items-center py-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Verificando actividades al final del día...
              </div>
            </div>
          )}

          <div className="space-y-3 py-4" ref={scrollRef}>
            {messages.map((message) => (
              <div key={message.id} className={`flex animate-in slide-in-from-bottom-2 duration-300 ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${message.type === "bot" ? theme === "dark" ? "bg-[#2a2a2a] text-white" : "bg-gray-100 text-gray-900" : message.type === "user" ? "bg-[#6841ea] text-white" : message.type === "voice" ? `cursor-pointer hover:opacity-90 transition ${theme === "dark" ? "bg-[#252527]" : "bg-blue-50"}` : theme === "dark" ? "bg-[#2a2a2a] text-gray-300" : "bg-gray-100 text-gray-700"}`} onClick={message.type === "voice" && message.voiceText ? () => handleVoiceMessageClick(message.voiceText!) : undefined}>
                  {message.content}
                  {message.type === "voice" && Date.now() - message.timestamp.getTime() < 2000 && (
                    <div className="flex gap-1 mt-2">
                      <div className="w-1 h-1 bg-[#6841ea] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1 h-1 bg-[#6841ea] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1 h-1 bg-[#6841ea] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                <div className={`rounded-lg px-3 py-2 ${theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"}`}>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#6841ea] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-[#6841ea] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-[#6841ea] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {step === "finished" && assistantAnalysis && activitiesWithTasks.length > 0 && !voiceMode && (
            <div className={`mt-4 rounded-lg p-4 border ${theme === "dark" ? "bg-[#1a1a1a] border-[#6841ea]/30" : "bg-white border-[#6841ea]/20"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${theme === "dark" ? "bg-[#6841ea]/20" : "bg-[#6841ea]/10"}`}>
                    <Headphones className="w-5 h-5 text-[#6841ea]" />
                  </div>
                  <div>
                    <h4 className="font-bold">¿Explicar tus tareas?</h4>
                    <p className="text-sm text-gray-500">Usa el modo guiado por voz para explicar cada actividad y sus tareas</p>
                  </div>
                </div>
                <Button onClick={startVoiceMode} className="bg-[#6841ea] hover:bg-[#5a36d4]">
                  <Play className="w-4 h-4 mr-2" />
                  Activar Modo Voz
                </Button>
              </div>
            </div>
          )}

          {hasExistingSession && step === "finished" && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setHasExistingSession(false);
                  fetchAssistantAnalysis(false);
                }}
                className="text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Obtener nuevo análisis
              </Button>
            </div>
          )}
        </div>
      </div>

      {!voiceMode && (
        <div className={`fixed bottom-0 left-0 right-0 z-50 ${theme === "dark" ? "bg-[#101010]" : "bg-white"}`}>
          <div className="max-w-4xl mx-auto p-4">
            <form onSubmit={handleUserInput} className="flex gap-2 items-center">
              <Input
                ref={inputRef}
                type="text"
                placeholder={canUserType ? "Escribe tu pregunta o comentario..." : "Obteniendo análisis..."}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className={`flex-1 h-12 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#6841ea] focus:border-[#6841ea] ${theme === "dark" ? "bg-[#2a2a2a] text-white placeholder:text-gray-500 border-[#353535] hover:border-[#6841ea]" : "bg-gray-100 text-gray-900 placeholder:text-gray-500 border-gray-200 hover:border-[#6841ea]"}`}
              />
              <Button type="button" onClick={startRecording} className={`h-12 w-14 p-0 rounded-lg transition-all ${isRecording ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-[#6841ea] hover:bg-[#5a36d4]"}`} title={isRecording ? "Detener reconocimiento de voz" : "Iniciar reconocimiento de voz"}>
                {isRecording ? (
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-400 rounded-full animate-ping"></div>
                    <MicOff className="w-5 h-5 text-white relative z-10" />
                  </div>
                ) : (
                  <Mic className="w-5 h-5 text-white" />
                )}
              </Button>
              <Button type="submit" disabled={!canUserType || !userInput.trim()} className="h-12 px-5 bg-[#6841ea] hover:bg-[#5a36d4] text-white rounded-lg disabled:opacity-50">
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </div>
      )}

      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent className={`${theme === "dark" ? "bg-[#1a1a1a] text-white border-[#2a2a2a]" : "bg-white text-gray-900 border-gray-200"} border`}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[#6841ea] text-xl">
              <PartyPopper className="w-6 h-6" />
              ¡Análisis completado!
            </AlertDialogTitle>
            <AlertDialogDescription className={`${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
              El análisis de tus actividades ha sido generado exitosamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={onLogout} className="bg-[#6841ea] hover:bg-[#5a36d4] text-white">
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
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-100"}`}>
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