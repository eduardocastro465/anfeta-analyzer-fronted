import axiosClient from "./axios";
import { ConversacionResponse } from "./interface/historial.interface";

export const obtenerMensajesConversacion = async (
  sessionId: string
): Promise<ConversacionResponse> =>
  axiosClient.get(`/assistant/historial/sesion/${sessionId}`);