// Interfaces basadas en la respuesta real del endpoint
export interface Pendiente {
  pendienteId?: string;
  nombre: string;
  descripcion: string;
  terminada: boolean;
  confirmada: boolean;
  duracionMin: number;
  fechaCreacion: string;
  fechaFinTerminada: string | null;
}
export interface Actividad {
  actividadId: string;
  titulo: string;
  horaInicio: string;
  horaFin: string;
  status: string;
  fecha: string;
  pendientes: Pendiente[];
  ultimaActualizacion: string;
  // Propiedades adicionales que necesita el modal
  colaboradores?: any[]; // Array de colaboradores (opcional)
  tareasCompletadas?: number; // Número de tareas completadas (opcional)
  totalTareas?: number; // Total de tareas (opcional)
  resumenEjecutivo?: {
    texto: string;
    fechaGeneracion?: string;
  };
}


export interface EstadisticasUsuario {
  totalActividades: number;
  totalTareas: number;
  tareasTerminadas: number;
  tareasConfirmadas: number;
  tiempoTotalMinutos: number;
}

export interface Usuario {
  _id: string;
  odooUserId: string;
  email: string;
  nombre: string;
  fuente: string;
  actividades: Actividad[];
  createdAt: string;
  ultimaSincronizacion: string;
  updatedAt: string;
  __v: number;
  estadisticas: EstadisticasUsuario;
  proyectosUnicos: string[];
  tieneActividades: boolean;
}

export interface Metadata {
  totalRegistros: number;
  usuariosConDatos: number;
  fuente: string;
  version: string;
}

export interface EstadisticasGlobales {
  totalUsuarios: number;
  usuariosConActividades: number;
  usuariosSinActividades: number;
  totalActividades: number;
  totalTareas: number;
  totalTareasTerminadas: number;
  totalTareasConfirmadas: number;
  tiempoTotalMinutos: number;
  tiempoTotalFormateado: string;
  proyectosUnicos: number;
  actividadesPorFecha: [string, number][];
  porcentajeTerminadas: number;
  porcentajeConActividades: number;
  porcentajeConfirmadas: number;
}

export interface Resumen {
  fechasConActividad: number;
  proyectoMasComun: string[];
  ultimaActividad: string;
}

export interface ApiResponse {
  success: boolean;
  timestamp: string;
  metadata: Metadata;
  estadisticas: EstadisticasGlobales;
  data: {
    usuarios: Usuario[];
    resumen: Resumen;
  };
}
export interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  completada?: boolean; // Opcional si necesitas este campo
  fechaLimite?: string; // Opcional
}

export type ViewMode = 'dashboard' | 'colaboradores' | 'detalles';
export type DetalleView = 'general' | 'usuario' | 'actividad' | 'tarea';