// components/types.ts

export interface Tarea {
  pendienteId: string;
  nombre: string;
  descripcion: string;
  duracionMin: number;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA' | 'URGENTE';
  complejidad: 'BAJA' | 'MEDIA' | 'ALTA';
  terminada: boolean;
  confirmada: boolean;
  fechaCreacion: string | null;
  fechaFinTerminada: string | null;
  tags: string[];
  requiereAtencion: boolean;
  tieneExplicacion: boolean;
  explicacionActual: {
    texto: string;
    fecha: string;
    email: string;
    validada: boolean;
    razon?: string;
    metadata?: any;
  } | null;
  historialExplicaciones: Array<{
    texto: string;
    fecha: string;
    email: string;
    validada: boolean;
    razon?: string;
    sessionId?: string;
  }>;
}

export interface Actividad {
  actividadId: string;
  titulo: string;
  proyecto: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  status: string;
  colaboradores: string[];
  idsColaboradores: string[];
  totalColaboradores: number;
  usuarios: Array<{
    id: string;
    odooUserId: string;
    email: string;
    nombre: string;
  }>;
  totalUsuarios: number;
  tareas: Tarea[];
  totalTareas: number;
  tareasConExplicacion: number;
  tareasSinExplicacion: number;
}

export interface ActividadesResponse {
  success: boolean;
  totalActividades: number;
  totalTareas: number;
  actividades: Actividad[];
}

export type ViewMode = "dashboard" | "colaboradores" | "detalles";
export type DetalleView = "general" | "actividad" | "tarea";