import type { AssistantAnalysis } from "@/lib/types";

export const adaptarDatosAnalisis = (
  data: any,
): AssistantAnalysis & { colaboradoresInvolucrados?: any[] } => ({
  success: data.success,
  answer: data.answer,
  provider: data.provider || "Gemini",
  sessionId: data.sessionId,
  proyectoPrincipal: data.proyectoPrincipal || "Sin proyecto principal",
  colaboradoresInvolucrados: data.colaboradoresInvolucrados || [],
  metrics: {
    totalActividades: data.metrics?.totalActividades || 0,
    tareasConTiempo:
      data.metrics?.tareasConTiempo ??
      data.metrics?.pendientesConTiempo ??
      0,
    tareasAltaPrioridad:
      data.metrics?.tareasAltaPrioridad ??
      data.metrics?.pendientesAltaPrioridad ??
      0,
    tiempoEstimadoTotal: data.metrics?.tiempoEstimadoTotal || "0h 0m",
  },
  data: {
    actividades: (data.data?.actividades || []).map((a: any) => ({
      id: a.id,
      titulo: a.titulo,
      horario: a.horario,
      status: a.status,
      proyecto: a.proyecto,
      colaboradores: a.colaboradores || [],
      esHorarioLaboral: a.esHorarioLaboral || false,
      tieneRevisionesConTiempo: a.tieneRevisionesConTiempo || false,
    })),
    revisionesPorActividad: (data.data?.revisionesPorActividad || []).map(
      (act: any) => ({
        actividadId: act.actividadId,
        actividadTitulo: act.actividadTitulo,
        actividadHorario: act.actividadHorario,
        colaboradores: act.colaboradores || [],
        assigneesOriginales: act.assigneesOriginales || [],
        tareasConTiempo: (act.tareasConTiempo || []).map((t: any) => ({
          id: t.id,
          nombre: t.nombre,
          terminada: t.terminada || false,
          confirmada: t.confirmada || false,
          reportada: t.reportada || false,
          duracionMin: t.duracionMin || 0,
          descripcion: t.descripcion || "",
          resumen: t.resumen ?? t.explicacionVoz?.resumen ?? null,
          fechaCreacion: t.fechaCreacion,
          fechaFinTerminada: t.fechaFinTerminada || null,
          diasPendiente: t.diasPendiente || 0,
          prioridad: t.prioridad || "BAJA",
          colaboradores: t.colaboradores || [],
          explicacionVoz: t.explicacionVoz || null,
        })),
        totalTareasConTiempo: act.totalTareasConTiempo || 0,
        tareasAltaPrioridad: act.tareasAltaPrioridad || 0,
        tiempoTotal: act.tiempoTotal || 0,
        tiempoFormateado: act.tiempoFormateado || "0h 0m",
      }),
    ),
  },
  multiActividad: data.multiActividad || false,
});