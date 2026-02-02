// En /lib/types.ts - Agregar estos tipos

import { AssistantAnalysis } from "../types";

export interface MensajeHistorial {
  _id?: string;
  role: "usuario" | "bot";
  contenido: string;
  timestamp: Date | string;
  tipoMensaje: "texto" | "analisis_inicial" | "respuesta_ia" | "error" | "sistema";
  analisis?: AssistantAnalysis | null;
}

export interface EstadoTarea {
  taskId: string;
  taskName: string;
  actividadTitulo: string;
  explicada: boolean;
  explicacion: string;
  validada: boolean;
  ultimoIntento: Date | null;
}

export interface ConversacionResponse {
  success: boolean;
  sessionId: string;
  nombreConversacion: string;
  mensajes: MensajeHistorial[];
  ultimoAnalisis: AssistantAnalysis | null;
  tareasEstado: EstadoTarea[];
  estadoConversacion: "inicio" | "esperando_usuario" | "esperando_bot" | "mostrando_actividades" | 
                      "esperando_descripcion_pendientes" | "esperando_confirmacion_pendientes" | 
                      "motivo_pendiente_resagado" | "finalizado";
  actividades?: any[];
  meta: {
    totalMensajes: number;
    createdAt: string;
    updatedAt: string;
  };
}