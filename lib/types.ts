import { MensajeHistorial } from "./interface/historial.interface";

export interface Project {
  id: string | null;
  name: string;
  estatusRevisionYPago: string;
  url: string | null;
  telegram: string | null;
}

export interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  theme: "light" | "dark";
  userEmail?: string;
  onVoiceMessageClick?: (voiceText: string) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  assistantAnalysis?: AssistantAnalysis | null;
  onStartVoiceMode?: () => void;
  onStartVoiceModeWithTasks?: (taskIds: string[]) => void;
  onReportCompleted?: () => Promise<void>;
  setStep?: (step: string) => void;
  reportConfig?: {
    horaInicio: string;
    horaFin: string;
  };
}

export interface HeaderProps {
  isInPiPWindow: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  theme: "light" | "dark" | "auto";
  toggleTheme: () => void;
  displayName: string;
  colaborador: { email: string };
  rate: number;
  changeRate: (rate: number) => void;
  isSpeaking: boolean;
  isPiPMode: boolean;
  openPiPWindow: () => void;
  closePiPWindow: () => void;
  setShowLogoutDialog: (show: boolean) => void;
  // Nueva prop opcional para reportes
  onViewReports?: () => void;
  onOpenSidebar?: () => void;
  isMobile?: boolean;
  isSidebarOpen?: boolean;
}

export interface Actividad {
  id: string;
  titulo: string;
  project: Project;
  assignees: string[];
  status: string;
  prioridad: string;
  tipo: string;
  dueStart: string;
  dueEnd: string;
  tiempoReal: number;
  anotaciones: string;
  pasosYLinks: string;
  documentoCompartido: string | null;
  url: string;
  destacado: boolean;
  destacadoColor: string | null;
  pendientes: string[];
  archivosAdjuntos: string[];
  avanceIA: string;
  estatusMasterRollup: string;
  grupoWhatsapp?: string;
}

export interface Colaborador {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  collaboratorId: string;
  avatar?: {
    url: string;
    dropboxPath: string;
  };
}

export interface TaskReport {
  taskId: string;
  titulo: string;
  tiempoTrabajado: number;
  descripcionTrabajo: string;
  completada: boolean;
}

export interface UsersApiResponse {
  items: Colaborador[];
}

export interface ActividadesApiResponse {
  success: boolean;
  data: Actividad[];
}

interface HistorialMensaje {
  analisis: any;
  role: "usuario" | "bot";
  contenido: string;
  timestamp: string;
  _id: string;
}

export interface PendienteDiario {
  pendienteId: string;
  nombre: string;
  descripcion?: string;
  duracionMin: number;
  terminada: boolean;
  motivoNoCompletado: string | null;
}

export interface ActividadDiaria {
  actividadId: string;
  titulo: string;
  tituloProyecto: string;
  horaInicio: string;
  horaFin: string;
  status: string;
  pendientes: PendienteDiario[];
}

export interface PendienteEstadoLocal extends PendienteDiario {
  actividadId: string;

  completadoLocal: boolean;
  motivoLocal: string;
}

export interface TaskExplanation {
  taskId: string;
  taskName: string;
  activityTitle: string;
  explanation: string;
  confirmed: boolean;
  priority: string;
  duration: number;
  timestamp: Date;
}

export interface ActividadConTareas {
  actividadId: string;
  actividadTitulo: string;
  actividadHorario: string;
  tareas: TareaConTiempo[];
}

export interface TareaConTiempo {
  id: string;
  nombre: string;
  terminada: boolean;
  confirmada: boolean;
  descripcion?: string;
  queHizo?: string;
  resumen?: string | null;
  duracionMin: number;
  fechaCreacion: string;
  fechaFinTerminada: string | null;
  diasPendiente: number;
  prioridad: string;
  reportada: boolean;
  actividadId?: string;
  actividadTitulo?: string;
  explicacionVoz?: {
    emailUsuario: string;
    fechaRegistro: string;
    validadaPorIA: boolean;
    resumen?: string | null;
    razonIA: string;
  } | null;
}

export interface Message {
  id: string;
  type:
    | "bot"
    | "user"
    | "system"
    | "voice"
    | "analysis"
    | "tasks-panel"
    | "no-tasks";
  content: string | React.ReactNode;
  timestamp: Date;
  voiceText?: string;
  analisis?: any;
  isWide?: boolean;
}

export interface AssistantAnalysis {
  success: boolean;
  answer: string;
  provider: string;
  sessionId: string;
  proyectoPrincipal: string;
  metrics: {
    totalActividades: number;
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
      tieneRevisionesConTiempo: boolean;
      colaboradores?: string[];
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
        descripcion?: string;
        resumen?: string | null;
        duracionMin: number;
        queHizo: string;
        fechaCreacion: string;
        fechaFinTerminada: string | null;
        diasPendiente: number;
        prioridad: string;
        reportada: boolean;
        colaboradores?: string[];
        assigneesOriginales?: string[];
        explicacionVoz?: {
          emailUsuario: string;
          fechaRegistro: string;
          validadaPorIA: boolean;
          razonIA: string;
          resumen?: string | null;
        } | null;
      }>;
      totalTareasConTiempo: number;
      tareasAltaPrioridad: number;
      tiempoTotal: number;
      tiempoFormateado: string;
      colaboradores?: string[];
    }>;
  };
  multiActividad: boolean;
  colaboradoresInvolucrados?: string[];
}

export interface TaskExplanation {
  taskId: string;
  taskName: string;
  activityTitle: string;
  explanation: string;
  confirmed: boolean;
  priority: string;
  duration: number;
  timestamp: Date;
}

export interface ChatBotProps {
  colaborador: Colaborador;
  onLogout: () => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
  conversacionActiva?: string | null;
  mensajesRestaurados?: MensajeHistorial[];
  analisisRestaurado?: AssistantAnalysis | null;
  onNuevaConversacion?: (conv: ConversacionSidebar) => void;
  onActualizarNombre?: (sessionId: string, nombre: string) => void;
  onActualizarTyping?: (isTyping: boolean) => void;
  onViewReports?: () => void;
  preferencias?: any;
  onGuardarPreferencias?: (nuevasPrefs: any) => void;
  showSettings?: boolean;
  setShowSettings?: (show: boolean) => void;
}

export type ChatStep =
  | "welcome"
  | "loading-analysis"
  | "show-analysis"
  | "finished"
  | "ready"
  | "error";

export type VoiceModeStep =
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

interface Activity {
  actividadId: string;
  actividadTitulo: string;
  actividadHorario: string;
  tareas: Task[];
}

interface Task {
  id: string;
  nombre: string;
  prioridad: string;
  duracionMin: number;
  diasPendiente: number;
}

export interface VoiceGuidanceFlowProps {
  voiceMode: boolean;
  voiceStep: VoiceModeStep;
  theme: "light" | "dark";
  isSpeaking: boolean;
  currentActivityIndex: number;
  currentTaskIndex: number;
  activitiesWithTasks: Activity[];
  taskExplanations: TaskExplanation[];
  voiceTranscript: string;
  currentListeningFor: string;
  retryCount: number;
  voiceConfirmationText: string;
  finishVoiceMode: () => void;
  rate: number;
  changeRate: (newRate: number) => void;
  cancelVoiceMode: () => void;
  confirmStartVoiceMode: () => void;
  speakTaskByIndices: (activityIndex: number, taskIndex: number) => void;
  startTaskExplanation: () => void;
  skipTask: () => void;
  stopRecording: () => void;
  retryExplanation: () => void;
  recognitionRef: React.MutableRefObject<any>;
  setIsRecording: (recording: boolean) => void;
  setIsListening: (listening: boolean) => void;
  setVoiceStep: (step: VoiceModeStep) => void;
  processVoiceExplanation?: (transcript: string) => void;
  setCurrentListeningFor: (text: string) => void;
}

export interface ExtendedVoiceGuidanceFlowProps extends VoiceGuidanceFlowProps {
  autoSendVoice: {
    isRecording: boolean;
    isTranscribing: boolean;
    audioLevel: number;
    startVoiceRecording: () => Promise<void>;
    cancelVoiceRecording: () => Promise<void>;
  };
}

export interface ConsultarIAPayload {
  pregunta: string;
  pendienteNombre?: string;
  actividadTitulo?: string;
}

export interface ChatGeneralIAPayload {
  mensaje: string;
  historial?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface IAResponse {
  success: boolean;
  respuesta?: string;
  timestamp?: Date;
  error?: string;
}

export interface ChatContainerProps {
  colaborador: Colaborador;
  actividades: any[];
  onLogout: () => void;
  onViewReports?: () => void;
  preferencias: any;
  onGuardarPreferencias: (nuevasPrefs: any) => void;
}

export type ConversacionSidebar = {
  sessionId: string;
  userId: string;
  nombreConversacion?: string;
  estadoConversacion: string;
  createdAt: string;
  updatedAt?: string;
};

export interface RevisionProcesada {
  actividadId: string;
  actividadTitulo: string;
  actividadHorario: string;
  tareasConTiempo: TareaConTiempo[];
  colaboradoresReales: string[];
  esActividadIndividual: boolean;
  tareasReportadas: TareaConTiempo[];
  tareasNoReportadas: TareaConTiempo[];
  [key: string]: any;
  onDescripcionActualizada?: () => void;
}

export interface PanelReporteTareasTardeProps {
  assistantAnalysis: AssistantAnalysis;
  theme?: "light" | "dark";
  userEmail: string;
  turno: "mañana" | "tarde";
  onStartVoiceMode: () => void;
  onStartVoiceModeWithTasks: (selectedTaskIds: string[]) => void;
  onReportCompleted?: () => void;
  actividadesDiarias?: any[];
  stopVoice?: () => void;
  isSpeaking?: boolean;
  speakText?: (text: string) => void;
  rate: number;
  engine?: "vosk" | "groq";
  transcriptionService?: (blob: Blob) => Promise<string>;
  audioRecorder?: {
    startRecording: (onChunk?: (chunk: Blob) => void) => Promise<MediaStream>;
    stopRecording: () => Promise<Blob>;
  };
  esHistorial?: boolean;
}
