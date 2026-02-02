// En /lib/helpers/conversationHelpers.ts

import type { MensajeHistorial } from "@/lib/interface/historial.interface";

export interface MensajeTransformado {
  id: string;
  type: "user" | "bot" | "system";
  content: string;
  timestamp: Date;
  tipoMensaje?: string;
  analisis?: any;
  shouldRenderAsTemplate?: boolean;
}

export function transformarMensajesHistorial(
  mensajes: MensajeHistorial[]
): MensajeTransformado[] {
  return mensajes.map((msg) => ({
    id: msg._id || `${Date.now()}-${Math.random()}`,
    type: msg.role === "usuario" ? "user" : "bot",
    content: msg.contenido,
    timestamp: new Date(msg.timestamp),
    tipoMensaje: msg.tipoMensaje,
    analisis: msg.analisis,
    shouldRenderAsTemplate: msg.tipoMensaje === "analisis_inicial" && !!msg.analisis,
  }));
}