import {
  Bot,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
  Brain,
  Target,
  User,
  Mail,
  Check,
} from "lucide-react";
import type { AssistantAnalysis } from "@/lib/types";

interface MessageTemplateProps {
  theme: "light" | "dark";
}

// ========== MENSAJES DE SISTEMA ==========

export const systemTemplates = {
  modeIA: ({ theme }: MessageTemplateProps) => (
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
    </div>
  ),

  modeNormal: ({ theme }: MessageTemplateProps) => (
    <div className="text-xs text-gray-500 dark:text-gray-400">
      Modo normal activado
    </div>
  ),

  loadingActivities: ({
    theme,
    showAll,
  }: MessageTemplateProps & { showAll?: boolean }) => (
    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
      <Brain className="w-4 h-4 text-[#6841ea]" />
      {showAll
        ? "Obteniendo todas tus actividades..."
        : "Obteniendo análisis de tus actividades..."}
    </div>
  ),
};

// ========== MENSAJES DE BIENVENIDA ==========

export const welcomeTemplates = {
  userInfo: ({
    theme,
    displayName,
    email,
  }: MessageTemplateProps & { displayName: string; email: string }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-[#6841ea]/5 border border-[#6841ea]/10">
        <div className="p-2 rounded-full bg-[#6841ea]/10">
          <User className="w-5 h-5 text-[#6841ea]" />
        </div>
        <div>
          <p className="font-medium text-sm">Hola, {displayName}!</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {email}
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
              day: "numeric",
            })}
          </p>
        </div>
      </div>
    </div>
  ),
};

// ========== MENSAJES DE ANÁLISIS ==========

export const analysisTemplates = {
  metrics: ({
    theme,
    analysis,
  }: MessageTemplateProps & { analysis: AssistantAnalysis }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div
          className={`p-3 rounded-lg border ${
            theme === "dark"
              ? "bg-[#1a1a1a] border-[#2a2a2a]"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-3 h-3 text-red-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Alta
            </span>
          </div>
          <div className="text-xl font-bold text-red-500">
            {analysis.metrics.tareasAltaPrioridad || 0}
          </div>
        </div>

        <div
          className={`p-3 rounded-lg border ${
            theme === "dark"
              ? "bg-[#1a1a1a] border-[#2a2a2a]"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-3 h-3 text-green-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Total
            </span>
          </div>
          <div className="text-xl font-bold">
            {analysis.metrics.tareasConTiempo || 0}
          </div>
        </div>

        <div
          className={`p-3 rounded-lg border ${
            theme === "dark"
              ? "bg-[#1a1a1a] border-[#2a2a2a]"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3 h-3 text-yellow-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Tiempo
            </span>
          </div>
          <div className="text-xl font-bold text-yellow-500">
            {analysis.metrics.tiempoEstimadoTotal || "0h 0m"}
          </div>
        </div>
      </div>

      {analysis.answer && (
        <div
          className={`p-3 rounded-lg border ${
            theme === "dark"
              ? "bg-[#1a1a1a] border-[#2a2a2a]"
              : "bg-gray-50 border-gray-200"
          }`}
        >
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
    </div>
  ),
};

// ========== MENSAJES DE ÉXITO ==========

export const successTemplates = {
  reportSaved: ({ theme, count }: MessageTemplateProps & { count: number }) => (
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
            Se actualizaron {count} tareas correctamente. ¡Buen trabajo hoy!
          </p>
        </div>
      </div>
    </div>
  ),

  journeyStarted: ({
    theme,
    tasksCount,
  }: MessageTemplateProps & { tasksCount: number }) => (
    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-500" />
        <div>
          <span className="font-medium">¡Jornada iniciada!</span>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            Has explicado {tasksCount} tareas correctamente. ¡Mucho éxito!
          </p>
        </div>
      </div>
    </div>
  ),

  explanationsSaved: ({
    theme,
    tasksCount,
  }: MessageTemplateProps & { tasksCount: number }) => (
    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
      <div className="flex items-center gap-3">
        <Check className="w-5 h-5 text-green-500" />
        <div>
          <span className="font-medium">Actividades guardadas</span>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            Has explicado {tasksCount} tareas.
          </p>
        </div>
      </div>
    </div>
  ),
};

// ========== MENSAJES DE ERROR ==========

export const errorTemplates = {
  reportError: ({ theme }: MessageTemplateProps) => (
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
    </div>
  ),

  activitiesError: ({ theme }: MessageTemplateProps) => (
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
    </div>
  ),

  generic: ({ theme, message }: MessageTemplateProps & { message: string }) => (
    <div
      className={`p-4 rounded-lg border ${
        theme === "dark"
          ? "bg-red-900/20 border-red-500/20"
          : "bg-red-50 border-red-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-500" />
        <span>{message}</span>
      </div>
    </div>
  ),
};

// ========== EXPORT UNIFICADO ==========

export const messageTemplates = {
  system: systemTemplates,
  welcome: welcomeTemplates,
  analysis: analysisTemplates,
  success: successTemplates,
  error: errorTemplates,
};

// ========== MENSAJES DE TEXTO SIMPLE ==========

export const textMessages = {
  // Bienvenida
  greeting: (displayName: string) =>
    `¡Hola ${displayName}! 👋 Soy tu asistente.`,

  // Voz
  voiceValidating: "Validando tu explicación...",
  voiceValidated:
    "Perfecto, explicación validada. Pasamos a la siguiente tarea.",
  voiceRetry: "Por favor, explica nuevamente cómo resolverás esta tarea.",
  voiceShortResponse: "Tu respuesta es muy corta. Por favor, da más detalles.",
  voiceNoResponse: "No escuché tu explicación. Por favor, intenta de nuevo.",
  voiceError: "Hubo un error. Por favor, intenta de nuevo.",
  voiceMicError: "Hubo un error con el micrófono. Por favor, intenta de nuevo.",
  voiceNoActivities: "No hay actividades para explicar.",
  voiceNoTasks: "No hay tareas con tiempo asignado para explicar.",
  voiceComplete:
    "¡Excelente! Has completado todas las tareas. ¿Quieres enviar el reporte?",
  voicePerfect:
    "¡Perfecto! Has explicado todas las tareas. ¿Quieres enviar este reporte?",
  voiceJourneyStart:
    "¡Perfecto! Tu jornada ha comenzado. Mucho éxito con tus tareas.",

  // Reporte
  reportSending: "Enviando tu reporte...",
  reportSent: "¡Correcto! Tu reporte ha sido enviado.",
  reportSendError: "Hubo un error al enviar tu reporte.",
  reportSaved: (count: number) =>
    `Reporte guardado. Se actualizaron ${count} tareas. Buen trabajo hoy.`,
  reportMissingReasons:
    "Por favor, explica por qué no completaste todas las tareas marcadas como incompletas.",
  reportFinish: "Terminamos. ¿Quieres guardar el reporte?",
  reportTaskCompleted: "Ok, completada.",
  reportTaskNotCompleted: "Entendido, no completada.",

  // Modo voz - confirmación inicio
  voiceStart: (count: number) =>
    `Vamos a explicar ${count} actividades con tareas programadas. ¿Listo para comenzar?`,

  // Actividad
  activityPresentation: (
    index: number,
    total: number,
    title: string,
    taskCount: number,
  ) =>
    `Actividad ${index + 1} de ${total}: ${title}. Tiene ${taskCount} tarea${taskCount !== 1 ? "s" : ""}.`,

  // Tarea
  taskPresentation: (index: number, total: number, name: string) =>
    `Tarea ${index + 1} de ${total}: ${name}. ¿Cómo planeas resolver esta tarea?`,

  taskQuestion: (index: number, name: string) =>
    `Tarea ${index + 1}: ${name}. ¿La completaste y qué hiciste? O si no, ¿por qué no?`,

  // Chat IA
  chatError: "Lo siento, hubo un error al procesar tu mensaje.",
};
