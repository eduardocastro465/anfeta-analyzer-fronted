import type { Message, AssistantAnalysis } from "@/lib/types";
import type { MensajeHistorial } from "@/lib/interface/historial.interface";
import { messageTemplates } from "@/components/chat/messageTemplates";
import { NoTasksMessage } from "@/components/chat/PanelReporteTareasTarde";

/**
 * Convierte mensajes del historial a mensajes con componentes React
 * Mantiene el diseño visual original
 */
export function restaurarMensajesConComponentes(
  mensajesHistorial: MensajeHistorial[],
  analisisRestaurado: AssistantAnalysis | null,
  displayName: string,
  email: string,
  crearPanel?: (analysis: AssistantAnalysis) => React.ReactNode,
): Message[] {
  if (!mensajesHistorial || mensajesHistorial.length === 0) {
    return [];
  }

  const mensajesRestaurados: Message[] = [];

  for (let i = 0; i < mensajesHistorial.length; i++) {
    const msg = mensajesHistorial[i];
    const esUsuario = msg.role === "usuario";

    // ========== MENSAJE DE USUARIO ==========
    if (esUsuario) {
      mensajesRestaurados.push({
        id: msg._id || `${Date.now()}-${Math.random()}`,
        type: "user",
        content: msg.contenido,
        timestamp: new Date(msg.timestamp),
      });
      continue;
    }

    // ========== MENSAJE DEL BOT ==========

    // Verificar si es un mensaje de análisis inicial
    const esAnalisisInicial = msg.tipoMensaje === "analisis_inicial";
    const tieneAnalisis = msg.analisis && msg.analisis.success;

    if (esAnalisisInicial && analisisRestaurado) {
      // RECONSTRUIR MENSAJES CON COMPONENTES ORIGINALES

      // 1. Mensaje de bienvenida con info del usuario
      mensajesRestaurados.push({
        id: `${msg._id}-welcome`,
        type: "bot",
        content: messageTemplates.welcome.userInfo({
          displayName,
          email,
        }),
        timestamp: new Date(msg.timestamp),
        isWide: true,
      });

      // 2. Mensaje con métricas del análisis
      mensajesRestaurados.push({
        id: `${msg._id}-metrics`,
        type: "bot",
        content: messageTemplates.analysis.metrics({
          analysis: analisisRestaurado,
        }),
        timestamp: new Date(msg.timestamp),
        isWide: false,
      });

      // 3. Panel de tareas o mensaje de "sin tareas"
      const hayTareas = analisisRestaurado.data.revisionesPorActividad.some(
        (r) => r.tareasConTiempo.length > 0,
      );

      if (hayTareas) {
        if (crearPanel) {
          mensajesRestaurados.push({
            id: `historial-panel-${msg._id}-tasks`,
            type: "bot",
            content: crearPanel(analisisRestaurado),
            timestamp: new Date(msg.timestamp),
            isWide: true,
          });
        }
        // sin crearPanel → el useEffect de conversacionActiva lo inserta
      } else {
        mensajesRestaurados.push({
          id: `${msg._id}-no-tasks`,
          type: "bot",
          content: <NoTasksMessage />,
          timestamp: new Date(msg.timestamp),
        });
      }
    } else {
      // MENSAJE DE BOT NORMAL (sin análisis)
      mensajesRestaurados.push({
        id: msg._id || `${Date.now()}-${Math.random()}`,
        type: "bot",
        content: msg.contenido,
        timestamp: new Date(msg.timestamp),
      });
    }
  }

  return mensajesRestaurados;
}

/**
 * Detecta si un mensaje del historial debe renderizarse como componente
 */
export function esMensajeConComponente(
  msg: MensajeHistorial,
  analisisRestaurado: AssistantAnalysis | null,
): boolean {
  return (
    msg.tipoMensaje === "analisis_inicial" &&
    msg.analisis?.success === true &&
    analisisRestaurado !== null
  );
}

/**
 * Obtiene el análisis desde el historial si está disponible
 */
export function extraerAnalisisDeHistorial(
  mensajes: MensajeHistorial[],
): AssistantAnalysis | null {
  const mensajeConAnalisis = mensajes.find(
    (m) =>
      m.tipoMensaje === "analisis_inicial" &&
      m.analisis &&
      m.analisis.success === true,
  );

  if (!mensajeConAnalisis?.analisis) {
    return null;
  }

  return mensajeConAnalisis.analisis as AssistantAnalysis;
}
