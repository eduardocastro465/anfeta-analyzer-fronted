import { useState } from "react";
import { Clock, Users, ArrowLeftRight } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { AssistantAnalysis } from "@/lib/types";
import { TasksPanelWithDescriptions } from "./chat/TasksPanelWithDescriptions";
import { PanelReporteTareasTarde } from "./chat/PanelReporteTareasTarde";

interface TurnoPanelProps {
  turno: "mañana" | "tarde";
  colaboradoresUnicos: string[];
  assistantAnalysis: AssistantAnalysis;
  userEmail: string;
  onStartVoiceMode: () => void;
  onStartVoiceModeWithTasks: (ids: string[]) => void;
  onReportCompleted: () => Promise<void>;
  stopVoice: () => void;
  isSpeaking: boolean;
  speakText: (text: string) => void;
  rate: number;
  esHistorial?: boolean;
  onRefrescarDatos?: () => void;
  engine?: "vosk" | "groq";
  transcriptionService?: (blob: Blob) => Promise<string>;
  audioRecorder?: {
    startRecording: (onChunk?: (chunk: Blob) => void) => Promise<MediaStream>;
    stopRecording: () => Promise<Blob>;
  };
}

export function TurnoPanel({
  turno,
  colaboradoresUnicos,
  assistantAnalysis,
  userEmail,
  onStartVoiceMode,
  onStartVoiceModeWithTasks,
  onReportCompleted,
  stopVoice,
  isSpeaking,
  speakText,
  rate,
  esHistorial = false,
  onRefrescarDatos,
  engine,
  transcriptionService,
  audioRecorder,
}: TurnoPanelProps) {
  const theme = useTheme();

  // null = seguir lógica real del turno, "mañana"/"tarde" = override manual
  const [turnoOverride, setTurnoOverride] = useState<"mañana" | "tarde" | null>(
    null,
  );

  const turnoEfectivo = turnoOverride ?? turno;
  const esMañana = turnoEfectivo === "mañana";

  const color = esMañana ? "blue" : "purple";

  const bannerClasses = esMañana
    ? theme === "dark"
      ? "bg-blue-900/20 border-blue-700/30"
      : "bg-blue-50 border-blue-200"
    : theme === "dark"
      ? "bg-purple-900/20 border-purple-700/30"
      : "bg-purple-50 border-purple-200";

  const titleClasses = esMañana
    ? theme === "dark"
      ? "text-blue-300"
      : "text-blue-700"
    : theme === "dark"
      ? "text-purple-300"
      : "text-purple-700";

  const subtitleClasses = esMañana
    ? theme === "dark"
      ? "text-blue-200"
      : "text-blue-600"
    : theme === "dark"
      ? "text-purple-200"
      : "text-purple-600";

  const colChipClasses = esMañana
    ? theme === "dark"
      ? "bg-blue-800/30 text-blue-200"
      : "bg-blue-100 text-blue-700"
    : theme === "dark"
      ? "bg-purple-800/30 text-purple-200"
      : "bg-purple-100 text-purple-700";

  const dividerClass = esMañana ? "border-blue-200/30" : "border-purple-200/30";

  const toggleBtnClasses = esMañana
    ? theme === "dark"
      ? "bg-blue-800/30 hover:bg-blue-700/40 text-blue-300 border border-blue-700/30"
      : "bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200"
    : theme === "dark"
      ? "bg-purple-800/30 hover:bg-purple-700/40 text-purple-300 border border-purple-700/30"
      : "bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-200";

  const handleToggle = () => {
    setTurnoOverride((prev) => {
      // Si no hay override, invertimos el turno real
      const base = prev ?? turno;
      return base === "mañana" ? "tarde" : "mañana";
    });
  };

  return (
    <div className="space-y-3">
      {/* Banner informativo del turno */}
      <div className={`p-3 rounded-lg border ${bannerClasses}`}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 text-${color}-500`} />
            <span className={`text-sm font-medium ${titleClasses}`}>
              {esMañana
                ? "Turno Mañana (12:00 AM - 2:29 PM)"
                : "Turno Tarde (2:30 PM - 11:59 PM)"}
            </span>
          </div>

          {/* Botón para cambiar formulario manualmente */}
          <button
            onClick={handleToggle}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${toggleBtnClasses}`}
            title={`Cambiar a formulario de ${esMañana ? "tarde" : "mañana"}`}
          >
            <ArrowLeftRight className="w-3 h-3" />
            Ver {esMañana ? "tarde" : "mañana"}
          </button>
        </div>

        <p className={`text-xs ${subtitleClasses}`}>
          {esMañana
            ? "Es hora de explicar cómo resolverás las tareas que ya tienen descripción."
            : "Es hora de reportar tus tareas pendientes del día."}
          {turnoOverride !== null && (
            <span className="ml-1 opacity-60">(vista manual)</span>
          )}
        </p>

        {colaboradoresUnicos.length > 0 && (
          <div className={`mt-3 pt-2 border-t ${dividerClass}`}>
            <div className="flex items-center gap-2 mb-2">
              <Users className={`w-4 h-4 text-${color}-500`} />
              <span
                className={`text-xs font-medium ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Colaboradores en tus actividades:
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {colaboradoresUnicos.map((col, idx) => (
                <span
                  key={idx}
                  className={`text-xs px-2 py-1 rounded ${colChipClasses}`}
                >
                  {col}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Panel de tareas según el turno efectivo */}

      {esMañana ? (
        <TasksPanelWithDescriptions
          assistantAnalysis={assistantAnalysis}
          userEmail={userEmail}
          turno={turno}
          onStartVoiceModeWithTasks={onStartVoiceModeWithTasks}
          onReportCompleted={onReportCompleted}
          stopVoice={stopVoice}
          isSpeaking={isSpeaking}
          speakText={speakText}
          esHistorial={esHistorial}
          onRefrescarDatos={onRefrescarDatos}
        />
      ) : (
        <PanelReporteTareasTarde
          assistantAnalysis={assistantAnalysis}
          userEmail={userEmail}
          turno={turno}
          onStartVoiceMode={onStartVoiceMode}
          onStartVoiceModeWithTasks={onStartVoiceModeWithTasks}
          onReportCompleted={onReportCompleted}
          stopVoice={stopVoice}
          isSpeaking={isSpeaking}
          speakText={speakText}
          rate={rate}
          engine={engine}
          transcriptionService={transcriptionService}
          audioRecorder={audioRecorder}
          esHistorial={esHistorial}
        />
      )}
    </div>
  );
}
