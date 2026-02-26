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
  Users,
} from "lucide-react";
import type { AssistantAnalysis } from "@/lib/types";
import { useTheme } from "@/context/ThemeContext";

// ─────────────────────────────────────────────────────────────────────────────
// NOTA DE ARQUITECTURA
// Todos los templates son componentes React que obtienen el tema via useTheme().
// NO reciben `theme` como prop — eso generaba closures congelados cuando los
// mensajes se guardaban en el array de estado de ChatBot.
// ─────────────────────────────────────────────────────────────────────────────

// ========== MENSAJES DE SISTEMA ==========

function ModeIA() {
  const theme = useTheme();
  return (
    <div
      className={`px-2.5 py-2 rounded-lg border ${
        theme === "dark"
          ? "bg-[#6841ea]/10 border-[#6841ea]/20"
          : "bg-purple-50 border-purple-200"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <Bot className="w-3.5 h-3.5 text-[#6841ea] flex-shrink-0" />
        <span className="text-xs font-medium text-[#6841ea]">
          Modo Asistente IA activado
        </span>
      </div>
      <p
        className={`text-[11px] mt-0.5 leading-snug ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
      >
        Ahora puedes hacer preguntas sobre tus tareas y recibir ayuda personalizada.
      </p>
    </div>
  );
}

function ModeNormal() {
  const theme = useTheme();
  return (
    <div
      className={`text-[11px] ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
    >
      Modo normal activado
    </div>
  );
}

function LoadingActivities({ showAll }: { showAll?: boolean }) {
  const theme = useTheme();
  return (
    <div
      className={`flex items-center gap-1.5 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
    >
      <Brain className="w-3.5 h-3.5 text-[#6841ea] flex-shrink-0" />
      <span className="text-xs">
        {showAll
          ? "Obteniendo todas tus actividades..."
          : "Obteniendo análisis de tus actividades..."}
      </span>
    </div>
  );
}

export const systemTemplates = {
  modeIA: () => <ModeIA />,
  modeNormal: () => <ModeNormal />,
  loadingActivities: ({ showAll }: { showAll?: boolean }) => (
    <LoadingActivities showAll={showAll} />
  ),
};

// ========== MENSAJES DE BIENVENIDA ==========

function UserInfo({
  displayName,
  email,
}: {
  displayName: string;
  email: string;
}) {
  const theme = useTheme();
  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Card Usuario */}
      <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#6841ea]/5 border border-[#6841ea]/10 w-full">
        <div className="p-1.5 rounded-full bg-[#6841ea]/10 shrink-0">
          <User className="w-3.5 h-3.5 text-[#6841ea]" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={`font-semibold text-xs leading-tight ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}
          >
            Hola, {displayName}!
          </p>
          <div
            className={`flex items-center gap-1 text-[11px] min-w-0 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
          >
            <Mail className="w-2.5 h-2.5 shrink-0" />
            <span className="break-all leading-tight">{email}</span>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="flex items-center gap-2 w-full">
        <div className="p-1.5 rounded-full bg-[#6841ea]/10 shrink-0">
          <Brain className="w-3.5 h-3.5 text-[#6841ea]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className={`font-bold text-xs ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}
          >
            Resumen de tu día
          </h3>
          <p
            className={`text-[11px] ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
          >
            {new Date().toLocaleDateString("es-MX", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

export const welcomeTemplates = {
  userInfo: ({
    displayName,
    email,
  }: {
    displayName: string;
    email: string;
  }) => <UserInfo displayName={displayName} email={email} />,
};

// ========== MENSAJES DE ANÁLISIS ==========

function AnalysisMetrics({ analysis }: { analysis: AssistantAnalysis }) {
  const theme = useTheme();
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-1.5 mt-1">
        {/* Alta prioridad */}
        <div
          className={`px-2 py-1.5 rounded-lg border ${
            theme === "dark"
              ? "bg-gradient-to-br from-red-950/20 to-red-900/10 border-red-500/20"
              : "bg-gradient-to-br from-red-50 to-red-100/50 border-red-200"
          }`}
        >
          <div className="flex items-center gap-1 mb-0.5">
            <Target className="w-2.5 h-2.5 text-red-500 flex-shrink-0" />
            <span
              className={`text-[10px] font-medium truncate ${theme === "dark" ? "text-red-300" : "text-red-700"}`}
            >
              Alta
            </span>
          </div>
          <div className="text-base font-bold text-red-500 truncate">
            {analysis.metrics.tareasAltaPrioridad || 0}
          </div>
        </div>

        {/* Total */}
        <div
          className={`px-2 py-1.5 rounded-lg border ${
            theme === "dark"
              ? "bg-gradient-to-br from-green-950/20 to-green-900/10 border-green-500/20"
              : "bg-gradient-to-br from-green-50 to-green-100/50 border-green-200"
          }`}
        >
          <div className="flex items-center gap-1 mb-0.5">
            <FileText className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />
            <span
              className={`text-[10px] font-medium truncate ${theme === "dark" ? "text-green-300" : "text-green-700"}`}
            >
              Total
            </span>
          </div>
          <div
            className={`text-base font-bold truncate ${theme === "dark" ? "text-green-400" : "text-green-600"}`}
          >
            {analysis.metrics.tareasConTiempo || 0}
          </div>
        </div>

        {/* Tiempo */}
        <div
          className={`px-2 py-1.5 rounded-lg border ${
            theme === "dark"
              ? "bg-gradient-to-br from-yellow-950/20 to-yellow-900/10 border-yellow-500/20"
              : "bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200"
          }`}
        >
          <div className="flex items-center gap-1 mb-0.5">
            <Clock className="w-2.5 h-2.5 text-yellow-500 flex-shrink-0" />
            <span
              className={`text-[10px] font-medium truncate ${theme === "dark" ? "text-yellow-300" : "text-yellow-700"}`}
            >
              Tiempo
            </span>
          </div>
          <div className="text-sm font-bold text-yellow-500 truncate">
            {analysis.metrics.tiempoEstimadoTotal || "0h 0m"}
          </div>
        </div>
      </div>

      {/* Texto descriptivo */}
      {analysis.answer && (
        <div
          className={`px-2.5 py-2 rounded-lg border ${
            theme === "dark"
              ? "bg-gradient-to-br from-[#6841ea]/10 to-[#8b5cf6]/5 border-[#6841ea]/20"
              : "bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200"
          }`}
        >
          <div className="flex items-start gap-1.5">
            <Bot className="w-3.5 h-3.5 text-[#6841ea] mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-0.5">
              {analysis.answer
                .split("\n")
                .filter((line) => line.trim().length > 0)
                .map((line, i) => {
                  const isBold = line.includes("**");
                  const clean = line.replace(/\*\*/g, "").trim();
                  return (
                    <p
                      key={i}
                      className={`text-xs leading-relaxed ${
                        isBold
                          ? "font-semibold text-[#6841ea]"
                          : theme === "dark"
                            ? "text-gray-200"
                            : "text-gray-700"
                      }`}
                    >
                      {clean}
                    </p>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const analysisTemplates = {
  metrics: ({ analysis }: { analysis: AssistantAnalysis }) => (
    <AnalysisMetrics analysis={analysis} />
  ),
};

// ========== MENSAJES DE TAREAS ==========

function TasksLoaded({
  total,
  reportadas,
  pendientes,
}: {
  total: number;
  reportadas: number;
  pendientes: number;
}) {
  const theme = useTheme();
  return (
    <div
      className={`px-2.5 py-2 rounded-lg border ${
        theme === "dark"
          ? "bg-[#6841ea]/10 border-[#6841ea]/20"
          : "bg-purple-50 border-purple-200"
      }`}
    >
      <div className="flex items-start gap-2">
        <Target className="w-3.5 h-3.5 text-[#6841ea] mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p
            className={`font-medium text-xs mb-1.5 ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}
          >
            Tareas encontradas
          </p>
          <div className="flex gap-1.5 text-[10px] flex-wrap">
            <span
              className={`px-1.5 py-0.5 rounded whitespace-nowrap ${theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"}`}
            >
              Total: {total}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded whitespace-nowrap ${theme === "dark" ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-700"}`}
            >
              Reportadas: {reportadas}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded whitespace-nowrap ${theme === "dark" ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700"}`}
            >
              Pendientes: {pendientes}
            </span>
          </div>
          <p
            className={`text-[11px] mt-1.5 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
          >
            {pendientes > 0
              ? "Selecciona las tareas que deseas reportar abajo"
              : "¡Todas las tareas han sido reportadas!"}
          </p>
        </div>
      </div>
    </div>
  );
}

function TasksLoadedColaborative({
  total,
  miasReportadas,
  otrosReportadas,
  pendientes,
}: {
  total: number;
  miasReportadas: number;
  otrosReportadas: number;
  pendientes: number;
}) {
  const theme = useTheme();
  return (
    <div
      className={`px-2.5 py-2 rounded-lg border ${
        theme === "dark"
          ? "bg-purple-900/20 border-purple-500/20"
          : "bg-purple-50 border-purple-200"
      }`}
    >
      <div className="flex items-start gap-2">
        <Users className="w-3.5 h-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p
            className={`font-medium text-xs mb-1.5 ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}
          >
            Trabajo colaborativo detectado
          </p>
          <div className="flex flex-wrap gap-1.5 text-[10px] mb-1.5">
            <span
              className={`px-1.5 py-0.5 rounded whitespace-nowrap ${theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"}`}
            >
              Total: {total}
            </span>
            {miasReportadas > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded whitespace-nowrap ${theme === "dark" ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-700"}`}
              >
                Tuyas: {miasReportadas}
              </span>
            )}
            {otrosReportadas > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded whitespace-nowrap ${theme === "dark" ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-700"}`}
              >
                Colaboradores: {otrosReportadas}
              </span>
            )}
            {pendientes > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded whitespace-nowrap ${theme === "dark" ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700"}`}
              >
                Pendientes: {pendientes}
              </span>
            )}
          </div>
          <p
            className={`text-[11px] ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
          >
            {otrosReportadas > 0 && miasReportadas === 0
              ? "Hay reportes de tus colaboradores. Puedes ver el progreso del equipo abajo"
              : pendientes > 0
                ? "Selecciona las tareas que deseas reportar abajo"
                : "¡Todo el equipo ha reportado sus tareas!"}
          </p>
        </div>
      </div>
    </div>
  );
}

function NoTasksFound() {
  const theme = useTheme();
  return (
    <div
      className={`px-2.5 py-2 rounded-lg border ${
        theme === "dark"
          ? "bg-gray-800/50 border-gray-700"
          : "bg-gray-50 border-gray-200"
      }`}
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
        <div className="min-w-0">
          <p
            className={`font-medium text-xs ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}
          >
            No hay tareas pendientes
          </p>
          <p
            className={`text-[11px] mt-0.5 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
          >
            Todas tus tareas han sido reportadas o no hay tareas asignadas para hoy.
          </p>
        </div>
      </div>
    </div>
  );
}

export const tasksTemplates = {
  tasksLoaded: ({
    total,
    reportadas,
    pendientes,
  }: {
    total: number;
    reportadas: number;
    pendientes: number;
  }) => (
    <TasksLoaded
      total={total}
      reportadas={reportadas}
      pendientes={pendientes}
    />
  ),
  tasksLoadedColaborative: ({
    total,
    miasReportadas,
    otrosReportadas,
    pendientes,
  }: {
    total: number;
    miasReportadas: number;
    otrosReportadas: number;
    pendientes: number;
  }) => (
    <TasksLoadedColaborative
      total={total}
      miasReportadas={miasReportadas}
      otrosReportadas={otrosReportadas}
      pendientes={pendientes}
    />
  ),
  noTasksFound: () => <NoTasksFound />,
};

// ========== MENSAJES DE ÉXITO ==========

function ReportSaved({ count }: { count: number }) {
  const theme = useTheme();
  return (
    <div
      className={`px-2.5 py-2 rounded-lg border ${
        theme === "dark"
          ? "bg-green-900/20 border-green-500/20"
          : "bg-green-50 border-green-200"
      }`}
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
        <div className="min-w-0">
          <span
            className={`font-medium text-xs ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}
          >
            Reporte guardado
          </span>
          <p
            className={`text-[11px] mt-0.5 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
          >
            Se actualizaron {count} tareas correctamente. ¡Buen trabajo hoy!
          </p>
        </div>
      </div>
    </div>
  );
}

function JourneyStarted({ tasksCount }: { tasksCount: number }) {
  const theme = useTheme();
  return (
    <div
      className={`px-2.5 py-2 rounded-lg border ${
        theme === "dark"
          ? "bg-green-900/20 border-green-500/20"
          : "bg-green-50 border-green-200"
      }`}
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
        <div className="min-w-0">
          <span
            className={`font-medium text-xs ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}
          >
            ¡Jornada iniciada!
          </span>
          <p
            className={`text-[11px] mt-0.5 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
          >
            Has explicado {tasksCount} tareas correctamente. ¡Mucho éxito!
          </p>
        </div>
      </div>
    </div>
  );
}

function ExplanationsSaved({ tasksCount }: { tasksCount: number }) {
  const theme = useTheme();
  return (
    <div
      className={`px-2.5 py-2 rounded-lg border ${
        theme === "dark"
          ? "bg-green-900/20 border-green-500/20"
          : "bg-green-50 border-green-200"
      }`}
    >
      <div className="flex items-center gap-2">
        <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
        <div className="min-w-0">
          <span
            className={`font-medium text-xs ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}
          >
            Actividades guardadas
          </span>
          <p
            className={`text-[11px] mt-0.5 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
          >
            Has explicado {tasksCount} tareas.
          </p>
        </div>
      </div>
    </div>
  );
}

export const successTemplates = {
  reportSaved: ({ count }: { count: number }) => <ReportSaved count={count} />,
  journeyStarted: ({ tasksCount }: { tasksCount: number }) => (
    <JourneyStarted tasksCount={tasksCount} />
  ),
  explanationsSaved: ({ tasksCount }: { tasksCount: number }) => (
    <ExplanationsSaved tasksCount={tasksCount} />
  ),
};

// ========== MENSAJES DE ERROR ==========

function ReportError() {
  const theme = useTheme();
  return (
    <div
      className={`px-2.5 py-2 rounded-lg border ${
        theme === "dark"
          ? "bg-red-900/20 border-red-500/20"
          : "bg-red-50 border-red-200"
      }`}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
        <span
          className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
        >
          Error al guardar el reporte. Intenta nuevamente.
        </span>
      </div>
    </div>
  );
}

function ActivitiesError() {
  const theme = useTheme();
  return (
    <div
      className={`px-2.5 py-2 rounded-lg border ${
        theme === "dark"
          ? "bg-red-900/20 border-red-500/20"
          : "bg-red-50 border-red-200"
      }`}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
        <div className="min-w-0">
          <span
            className={`font-medium text-xs ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}
          >
            Error al obtener actividades
          </span>
          <p
            className={`text-[11px] mt-0.5 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
          >
            Hubo un problema al obtener tus actividades. Por favor, intenta nuevamente más tarde.
          </p>
        </div>
      </div>
    </div>
  );
}

function GenericError({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <div
      className={`px-2.5 py-2 rounded-lg border ${
        theme === "dark"
          ? "bg-red-900/20 border-red-500/20"
          : "bg-red-50 border-red-200"
      }`}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
        <span
          className={`text-xs min-w-0 break-words ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
        >
          {message}
        </span>
      </div>
    </div>
  );
}

export const errorTemplates = {
  reportError: () => <ReportError />,
  activitiesError: () => <ActivitiesError />,
  generic: ({ message }: { message: string }) => (
    <GenericError message={message} />
  ),
};

// ========== EXPORT UNIFICADO ==========

export const messageTemplates = {
  system: systemTemplates,
  welcome: welcomeTemplates,
  analysis: analysisTemplates,
  tasks: tasksTemplates,
  success: successTemplates,
  error: errorTemplates,
};

// ========== MENSAJES DE TEXTO SIMPLE ==========
// Estos son strings puros, no JSX — no necesitan tema.

export const textMessages = {
  greeting: (displayName: string) => `¡Hola ${displayName}! Soy tu asistente.`,

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

  voiceStart: (count: number) =>
    `Vamos a explicar ${count} actividades con tareas programadas. ¿Listo para comenzar?`,

  activityPresentation: (
    index: number,
    total: number,
    title: string,
    taskCount: number,
  ) =>
    `Actividad ${index + 1} de ${total}: ${title}. Tiene ${taskCount} tarea${taskCount !== 1 ? "s" : ""}.`,

  taskPresentation: (index: number, total: number, name: string) =>
    `Tarea ${index + 1} de ${total}: ${name}. ¿Cómo planeas resolver esta tarea?`,

  taskQuestion: (index: number, name: string) =>
    `Tarea ${index + 1}: ${name}. ¿La completaste y qué hiciste? O si no, ¿por qué no?`,

  chatError: "Lo siento, hubo un error al procesar tu mensaje.",
};