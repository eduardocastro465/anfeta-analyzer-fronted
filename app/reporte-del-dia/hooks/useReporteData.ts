import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";

const BASE_URL_BACK = process.env.NEXT_PUBLIC_BASE_URL_BACK;

export const useActividadesData = () => {
  const [actividades, setActividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [totalActividades, setTotalActividades] = useState(0);
  const [totalTareas, setTotalTareas] = useState(0);
  const [tiempoUltimaCarga, setTiempoUltimaCarga] = useState<string>("");
  const { toast } = useToast();

  const cargarActividades = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError(null);
      
      const response = await fetch(
        `${BASE_URL_BACK}/admin/todas-actividades`,
        {
          method: 'GET',
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error("La API respondió con success: false");
      }

      setActividades(result.actividades || []);
      setTotalActividades(result.totalActividades || 0);
      setTotalTareas(result.totalTareas || 0);
      setTiempoUltimaCarga(new Date().toLocaleTimeString());
      
      toast({
        title: "Actividades cargadas",
        description: `${result.totalActividades || 0} actividades con ${result.totalTareas || 0} tareas`,
      });

    } catch (err) {
      console.error("Error cargando actividades:", err);
      const errorMsg = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMsg);
      
      toast({
        title: "Error",
        description: "No se pudieron cargar las actividades",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    cargarActividades();
  }, [cargarActividades]);

  return {
    actividades,
    loading,
    error,
    refreshing,
    totalActividades,
    totalTareas,
    tiempoUltimaCarga,
    cargarActividades,
  };
};

// Funciones helper para trabajar con actividades
export const obtenerIniciales = (nombre: string): string => {
  if (!nombre || nombre === "Usuario") return "U";
  const palabras = nombre.split(" ");
  if (palabras.length >= 2) {
    return (
      palabras[1].charAt(0) + palabras[2]?.charAt(0) || palabras[1].charAt(0)
    ).toUpperCase();
  }
  return nombre.substring(0, 2).toUpperCase();
};

export const calcularProgresoActividad = (tareas: any[]): number => {
  if (!tareas || tareas.length === 0) return 0;
  const terminadas = tareas.filter((t: any) => t.terminada).length;
  return (terminadas / tareas.length) * 100;
};

export const filtrarActividadesPorFecha = (actividades: any[], fecha: string): any[] => {
  if (!actividades) return [];
  return actividades.filter(act => act.fecha === fecha);
};

export const filtrarActividadesPorRango = (
  actividades: any[], 
  fechaInicio: string, 
  fechaFin: string
): any[] => {
  if (!actividades) return [];
  return actividades.filter(act => 
    act.fecha >= fechaInicio && act.fecha <= fechaFin
  );
};

export const obtenerActividadesConExplicaciones = (actividades: any[]): any[] => {
  if (!actividades) return [];
  return actividades.filter(act => act.tareasConExplicacion > 0);
};

export const obtenerTareasConExplicaciones = (actividades: any[]): any[] => {
  if (!actividades) return [];
  const tareasConExplicacion: any[] = [];
  
  actividades.forEach(act => {
    act.tareas.forEach((tarea: any) => {
      if (tarea.tieneExplicacion || tarea.historialExplicaciones?.length > 0) {
        tareasConExplicacion.push({
          ...tarea,
          actividadTitulo: act.titulo,
          actividadFecha: act.fecha,
          actividadId: act.actividadId,
          colaboradores: act.colaboradores
        });
      }
    });
  });
  
  return tareasConExplicacion;
};

export const obtenerEstadisticasGenerales = (actividades: any[]) => {
  if (!actividades || actividades.length === 0) {
    return {
      totalActividades: 0,
      totalTareas: 0,
      tareasConExplicacion: 0,
      tareasSinExplicacion: 0,
      actividadesConTareas: 0,
      actividadesSinTareas: 0,
      proyectosUnicos: 0,
      colaboradoresUnicos: 0
    };
  }

  let totalTareas = 0;
  let tareasConExplicacion = 0;
  let actividadesConTareas = 0;
  const proyectosSet = new Set();
  const colaboradoresSet = new Set();

  actividades.forEach(act => {
    if (act.totalTareas > 0) actividadesConTareas++;
    totalTareas += act.totalTareas;
    tareasConExplicacion += act.tareasConExplicacion;
    
    if (act.proyecto && act.proyecto !== "Sin proyecto") {
      proyectosSet.add(act.proyecto);
    }
    
    act.colaboradores.forEach((email: string) => {
      colaboradoresSet.add(email);
    });
    
    act.usuarios.forEach((user: any) => {
      if (user.email && user.email !== "No registrado") {
        colaboradoresSet.add(user.email);
      }
    });
  });

  return {
    totalActividades: actividades.length,
    totalTareas,
    tareasConExplicacion,
    tareasSinExplicacion: totalTareas - tareasConExplicacion,
    actividadesConTareas,
    actividadesSinTareas: actividades.length - actividadesConTareas,
    proyectosUnicos: proyectosSet.size,
    colaboradoresUnicos: colaboradoresSet.size
  };
};

export const agruparActividadesPorFecha = (actividades: any[]): Record<string, any[]> => {
  if (!actividades) return {};
  
  return actividades.reduce((acc, act) => {
    const fecha = act.fecha || "Sin fecha";
    if (!acc[fecha]) {
      acc[fecha] = [];
    }
    acc[fecha].push(act);
    return acc;
  }, {} as Record<string, any[]>);
};

export const obtenerFechaPorDias = (dias: number): string => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha.toISOString().split("T")[0];
};