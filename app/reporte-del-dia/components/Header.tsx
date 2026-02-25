import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  RefreshCw,
  Loader2,
  Clock,
  LogOut,
  Calendar,
  LayoutDashboard,
  Users,
  FileText,
  Activity,
  CheckSquare,
  FolderKanban
} from "lucide-react";
import { ViewMode, DetalleView, Actividad, Tarea } from "./types";
import {
  logout,
} from "@/lib/api";
import { Colaborador } from "@/lib/types";

interface HeaderProps {
  viewMode: ViewMode;
  detalleView: DetalleView;
  selectedActividad: Actividad | null;
  selectedTarea: Tarea | null;
  tiempoUltimaCarga: string;
  refreshing: boolean;
  onExport?: () => void;
  onRefresh?: () => void;
  fechaFiltro?: string;
  onFechaFiltroChange?: (value: string) => void;
  totalActividades?: number;
  totalTareas?: number;
}

export default function Header({
  viewMode,
  detalleView,
  selectedActividad,
  selectedTarea,
  tiempoUltimaCarga,
  refreshing,
  onExport,
  onRefresh,
  fechaFiltro = "hoy",
  onFechaFiltroChange,
  totalActividades,
  totalTareas
}: HeaderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentColaborador, setCurrentColaborador] = useState<Colaborador | null>(null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
    } finally {
      clearSession();
      setIsLoggedIn(false);
      setCurrentColaborador(null);
    }
  };
  
  const clearSession = () => {
    localStorage.removeItem("colaborador");
    localStorage.removeItem("actividades");
  };

  const getIcon = () => {
    if (viewMode === 'dashboard') return <LayoutDashboard className="w-6 h-6 text-[#6841ea]" />;
    if (viewMode === 'colaboradores') return <Users className="w-6 h-6 text-[#6841ea]" />;
    if (viewMode === 'detalles') {
      if (detalleView === 'general') return <FolderKanban className="w-6 h-6 text-[#6841ea]" />;
      if (detalleView === 'actividad') return <Activity className="w-6 h-6 text-[#6841ea]" />;
      if (detalleView === 'tarea') return <CheckSquare className="w-6 h-6 text-[#6841ea]" />;
    }
    return <LayoutDashboard className="w-6 h-6 text-[#6841ea]" />;
  };

  const getTitulo = () => {
    if (viewMode === 'dashboard') return 'Dashboard de Actividades';
    if (viewMode === 'colaboradores') return 'Colaboradores';
    if (viewMode === 'detalles') {
      if (detalleView === 'general') return 'Todas las Actividades';
      if (detalleView === 'actividad') return selectedActividad?.titulo || 'Actividad';
      if (detalleView === 'tarea') return selectedTarea?.nombre || 'Tarea';
    }
    return 'Panel de Actividades';
  };

  const getSubtitulo = () => {
    if (viewMode === 'dashboard') {
      return `Visión general · ${totalActividades || 0} actividades · ${totalTareas || 0} tareas`;
    }
    if (viewMode === 'colaboradores') return 'Gestión de equipo y actividades asignadas';
    if (viewMode === 'detalles') {
      if (detalleView === 'general') return 'Listado completo de actividades';
      if (detalleView === 'actividad') {
        const tareasConExp = selectedActividad?.tareasConExplicacion || 0;
        const totalTareasAct = selectedActividad?.totalTareas || 0;
        return `${totalTareasAct} tareas totales · ${tareasConExp} con explicación`;
      }
      if (detalleView === 'tarea') {
        return selectedTarea?.tieneExplicacion 
          ? 'Tarea con explicación de voz' 
          : 'Tarea sin explicación';
      }
    }
    return '';
  };

  return (
    <div className="font-['Inter',system-ui,sans-serif] bg-transparent">
      <div className="flex items-start justify-between">
        {/* Izquierda - Título e icono */}
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#6841ea] to-[#8b5cf6] rounded-xl blur-lg opacity-20"></div>
            <div className="relative bg-gradient-to-b from-[#1e1e1e] to-[#141414] p-3 rounded-xl border border-white/5">
              {getIcon()}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                {getTitulo()}
              </h1>

              {/* Badge de vista actual */}
              <span className="px-2.5 py-1 text-xs font-medium bg-[#6841ea]/10 text-[#6841ea] rounded-full border border-[#6841ea]/20">
                {viewMode === 'dashboard' && 'Dashboard'}
                {viewMode === 'colaboradores' && 'Equipo'}
                {viewMode === 'detalles' && detalleView === 'general' && 'Lista'}
                {viewMode === 'detalles' && detalleView === 'actividad' && 'Actividad'}
                {viewMode === 'detalles' && detalleView === 'tarea' && 'Tarea'}
              </span>

              {/* Badges de contadores (solo en dashboard) */}
              {viewMode === 'dashboard' && (
                <>
                  <span className="px-2.5 py-1 text-xs font-medium bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                    {totalActividades || 0} actividades
                  </span>
                  <span className="px-2.5 py-1 text-xs font-medium bg-green-500/10 text-green-400 rounded-full border border-green-500/20">
                    {totalTareas || 0} tareas
                  </span>
                </>
              )}
            </div>

            <p className="text-sm text-gray-500">
              {getSubtitulo()}
            </p>
          </div>
        </div>

        {/* Derecha - Acciones */}
        <div className="flex items-center gap-3">
          {/* Indicador de última carga mejorado */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-[#1e1e1e] to-[#141414] rounded-xl border border-white/5">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500 rounded-full animate-pulse opacity-50"></div>
              <Clock className="w-4 h-4 text-green-400 relative z-10" />
            </div>
            <span className="text-xs text-gray-400">
              {tiempoUltimaCarga}
            </span>
          </div>

          {/* Selector de fecha (solo en colaboradores) */}
          {viewMode === 'colaboradores' && onFechaFiltroChange && (
            <div className="relative">
              <select
                value={fechaFiltro}
                onChange={(e) => onFechaFiltroChange(e.target.value)}
                className="appearance-none bg-gradient-to-b from-[#1e1e1e] to-[#141414] border border-white/5 text-gray-300 text-sm rounded-xl pl-4 pr-10 py-2.5 hover:border-[#6841ea]/30 focus:border-[#6841ea] focus:outline-none focus:ring-2 focus:ring-[#6841ea]/20 transition-all duration-300 cursor-pointer min-w-[140px]"
              >
                <option value="hoy">Hoy</option>
                <option value="ayer">Ayer</option>
                <option value="ultima_semana">Última semana</option>
                <option value="ultimo_mes">Último mes</option>
                <option value="todos">Todos</option>
              </select>
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          )}

          {/* Botón Exportar (opcional) */}
          {onExport && (
            <Button
              variant="ghost"
              onClick={onExport}
              disabled={refreshing}
              className="relative group bg-gradient-to-b from-[#1e1e1e] to-[#141414] border border-white/5 hover:border-[#6841ea]/30 text-gray-400 hover:text-white rounded-xl px-5 py-2.5 h-auto transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#6841ea]/0 via-[#6841ea]/5 to-[#6841ea]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <Download className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
              <span className="relative z-10">Exportar</span>
            </Button>
          )}

          {/* Botón Actualizar (opcional) */}
          {onRefresh && (
            <Button
              onClick={onRefresh}
              disabled={refreshing}
              className="relative group bg-gradient-to-r from-[#6841ea] to-[#8b5cf6] hover:from-[#5a36d1] hover:to-[#7c4ad6] text-white rounded-xl px-5 py-2.5 h-auto transition-all duration-300 shadow-lg shadow-[#6841ea]/25 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              {refreshing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
              )}
              <span className="relative z-10">Actualizar</span>
            </Button>
          )}

          {/* Botón Cerrar Sesión */}
          <Button
            onClick={handleLogout}
            className="relative group bg-gradient-to-b from-[#1e1e1e] to-[#141414] border border-white/5 hover:border-red-500/30 text-gray-400 hover:text-red-400 rounded-xl px-5 py-2.5 h-auto transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/5 to-red-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <LogOut className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
            <span className="relative z-10">Salir</span>
          </Button>
        </div>
      </div>

      {/* Barra de progreso decorativa */}
      <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-[#6841ea]/20 to-transparent"></div>
    </div>
  );
}