"use client";

import {
  Check,
  Users,
  User,
  AlertCircle,
  FileText,
  CheckSquare,
  RefreshCw,
  Mic,
  UsersIcon,
  UserIcon,
} from "lucide-react";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { AssistantAnalysis, TareaConTiempo } from "@/lib/types";
import { useTheme } from "@/context/ThemeContext";

interface RevisionConDescripcion {
  actividadId: string;
  actividadTitulo: string;
  actividadHorario: string;
  tareasConDescripcion: TareaConTiempo[];
  colaboradoresReales: string[];
  esActividadIndividual: boolean;
  [key: string]: any;
}

interface TasksPanelWithDescriptionsProps {
  assistantAnalysis: AssistantAnalysis;
  userEmail: string;
  turno: "mañana" | "tarde";
  onStartVoiceModeWithTasks: (selectedTaskIds: string[]) => void;
  onReportCompleted?: () => void;
  stopVoice?: () => void;
  isSpeaking?: boolean;
  speakText?: (text: string) => void;
}

export function TasksPanelWithDescriptions({
  assistantAnalysis,
  turno,
  userEmail,
  onStartVoiceModeWithTasks,
  onReportCompleted,
  stopVoice = () => {},
  isSpeaking = false,
  speakText = () => {},
}: TasksPanelWithDescriptionsProps) {
  const theme = useTheme();

  const [tareasSeleccionadas, setTareasSeleccionadas] = useState<Set<string>>(new Set());
  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const [mensajeAlerta, setMensajeAlerta] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
  const currentUserEmail = userEmail || "";
  const lastDataHashRef = useRef<string>("");
  const renderCountRef = useRef(0);

  useEffect(() => {
    if (assistantAnalysis?.data?.revisionesPorActividad?.length > 0) {
      setUltimaActualizacion(new Date());
    }
  }, [assistantAnalysis]);

  useEffect(() => {
    renderCountRef.current += 1;
    const currentHash = JSON.stringify(assistantAnalysis?.data?.revisionesPorActividad || []);
    if (currentHash !== lastDataHashRef.current) lastDataHashRef.current = currentHash;
  });

  const mostrarAlertaMensaje = useCallback((mensaje: string) => {
    setMensajeAlerta(mensaje);
    setMostrarAlerta(true);
    setTimeout(() => setMostrarAlerta(false), 5000);
  }, []);

  const dataHash = useMemo(() => {
    if (!assistantAnalysis?.data?.revisionesPorActividad) return "";
    return assistantAnalysis.data.revisionesPorActividad
      .flatMap((rev) => rev.tareasConTiempo || [])
      .map((t) => `${t.id}:${t.descripcion || "sin-desc"}:${t.duracionMin}:${t.terminada}:${t.confirmada}`)
      .sort().join("|");
  }, [assistantAnalysis]);

  const actividadesConDescripcion = useMemo(() => {
    if (!assistantAnalysis?.data?.revisionesPorActividad) return [];
    return assistantAnalysis.data.revisionesPorActividad.map((revision) => {
      const colaboradoresReales = revision.colaboradores || assistantAnalysis.colaboradoresInvolucrados || [];
      const todasLasTareas = revision.tareasConTiempo.map((tarea) => {
        const tieneDescripcion = tarea.descripcion && tarea.descripcion.trim().length > 0;
        return { ...tarea, pendienteId: tarea.id, actividadId: revision.actividadId, actividadTitulo: revision.actividadTitulo, actividadHorario: revision.actividadHorario, tieneDescripcion, bloqueada: tieneDescripcion };
      });
      return {
        ...revision,
        colaboradoresReales,
        esActividadIndividual: colaboradoresReales.length <= 1,
        tareasConDescripcion: todasLasTareas,
        tareasNoReportadas: todasLasTareas,
        tareasSinDescripcion: todasLasTareas.filter((t) => !t.tieneDescripcion).length,
        tareasConDescripcionCount: todasLasTareas.filter((t) => t.tieneDescripcion).length,
      } as RevisionConDescripcion;
    }).filter((revision) => revision.tareasConDescripcion.length > 0);
  }, [assistantAnalysis, dataHash]);

  useEffect(() => {
    if (!actividadesConDescripcion.length) return;
    const ids = actividadesConDescripcion.flatMap((a) =>
      a.tareasConDescripcion.filter((t: any) => !t.tieneDescripcion).map((t: any) => t.id)
    );
    if (ids.length > 0) setTareasSeleccionadas(new Set(ids));
  }, [actividadesConDescripcion]);

  const estadisticas = useMemo(() => ({
    totalTareas: actividadesConDescripcion.reduce((s, a) => s + a.tareasConDescripcion.length, 0),
    tareasSinDescripcion: actividadesConDescripcion.reduce((s, a) => s + (a.tareasSinDescripcion || 0), 0),
    tareasBloqueadas: actividadesConDescripcion.reduce((s, a) => s + (a.tareasConDescripcionCount || 0), 0),
    totalActividades: actividadesConDescripcion.length,
  }), [actividadesConDescripcion]);

  const hayTareas = actividadesConDescripcion.length > 0;

  const toggleSeleccionTarea = useCallback((tareaId: string) => {
    setTareasSeleccionadas((prev) => {
      const next = new Set(prev);
      next.has(tareaId) ? next.delete(tareaId) : next.add(tareaId);
      return next;
    });
  }, []);

  const seleccionarTodasTareas = useCallback(() => {
    const ids = actividadesConDescripcion.flatMap((a) =>
      a.tareasConDescripcion.filter((t: any) => !t.tieneDescripcion).map((t: any) => t.id)
    );
    if (!ids.length) { mostrarAlertaMensaje("No hay tareas pendientes para seleccionar"); return; }
    setTareasSeleccionadas(new Set(ids));
    mostrarAlertaMensaje(`${ids.length} tareas seleccionadas`);
  }, [actividadesConDescripcion, mostrarAlertaMensaje]);

  const deseleccionarTodasTareas = useCallback(() => {
    setTareasSeleccionadas(new Set());
    mostrarAlertaMensaje("Todas las tareas deseleccionadas");
  }, [mostrarAlertaMensaje]);

  const handleIniciarModoVoz = useCallback(() => {
    if (!tareasSeleccionadas.size) {
      mostrarAlertaMensaje("Por favor selecciona al menos una tarea para explicar");
      speakText("Por favor selecciona al menos una tarea para explicar");
      return;
    }
    onStartVoiceModeWithTasks(Array.from(tareasSeleccionadas));
    setTareasSeleccionadas(new Set());
  }, [tareasSeleccionadas, mostrarAlertaMensaje, onStartVoiceModeWithTasks, speakText]);

  const handleEditarConVoz = useCallback((tareaId: string) => {
    onStartVoiceModeWithTasks([tareaId]);
  }, [onStartVoiceModeWithTasks]);

  return (
    <div className="w-full animate-in slide-in-from-bottom-2 duration-300">
      {/* Alerta flotante */}
      {mostrarAlerta && (
        <div className="fixed top-3 right-3 z-50 animate-in slide-in-from-right duration-300">
          <div className={`px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-xs ${theme === "dark" ? "bg-gray-800 text-white border border-gray-700" : "bg-white text-gray-800 border border-gray-200 shadow-md"}`}>
            <AlertCircle className="w-4 h-4 text-[#6841ea]" />
            <span>{mensajeAlerta}</span>
            <Button variant="ghost" size="sm" className={`ml-1 p-1 h-auto ${theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"}`} onClick={() => setMostrarAlerta(false)}>×</Button>
          </div>
        </div>
      )}

      {hayTareas ? (
        <div className={`w-full max-w-xl rounded-lg border overflow-hidden ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-white border-gray-200 shadow-sm"}`}>
          {/* Header */}
          <div className={`px-3 py-1.5 border-b ${theme === "dark" ? "bg-[#6841ea]/20 border-[#2a2a2a]" : "bg-[#6841ea]/8 border-gray-200"}`}>
            <div className="flex justify-between items-center">
              <h4 className={`font-medium text-xs flex items-center gap-2 uppercase tracking-wide ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                <FileText className="w-3.5 h-3.5 text-[#6841ea]" />
                Tareas del Día ({estadisticas.totalTareas})
              </h4>
              {ultimaActualizacion && (
                <span className={`text-[10px] hidden sm:inline ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                  {ultimaActualizacion.toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {estadisticas.tareasBloqueadas > 0 && (
                <UIBadge variant="secondary" className={`text-[10px] ${theme === "dark" ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-green-100 text-green-700 border border-green-300"}`}>
                  <Check className="w-3 h-3 mr-1" />{estadisticas.tareasBloqueadas} Completadas
                </UIBadge>
              )}
              <UIBadge variant="secondary" className="text-[10px] bg-[#6841ea] text-white border-none">
                {estadisticas.tareasSinDescripcion} Pendientes
              </UIBadge>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-2">
            {/* Banner informativo */}
            <div className={`text-xs p-2 rounded mb-2 ${theme === "dark" ? "bg-blue-950/60 text-blue-300 border border-blue-800/40" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <Mic className="w-3.5 h-3.5 shrink-0" />
                <strong>{estadisticas.tareasSinDescripcion} tareas necesitan descripción</strong>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${theme === "dark" ? "bg-amber-500/20 text-amber-300" : "bg-amber-500/15 text-amber-700"}`}>Modo Voz</span>
              </div>
              <span className="block mt-1 opacity-80">
                <strong>Tú:</strong> {currentUserEmail.split("@")[0]}
                {estadisticas.tareasBloqueadas > 0 && (
                  <span className={`ml-2 ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>{estadisticas.tareasBloqueadas} ya completadas</span>
                )}
              </span>
            </div>

            {/* Lista de actividades */}
            <div className="space-y-2">
              {actividadesConDescripcion.map((revision: RevisionConDescripcion, idx: number) => {
                const actividad = assistantAnalysis.data.actividades.find((act) => act.id === revision.actividadId);
                if (!actividad) return null;
                return (
                  <ActivityWithDescriptionItem
                    key={`${revision.actividadId}-${dataHash.substring(0, 20)}`}
                    revision={revision}
                    actividad={actividad}
                    index={idx}
                    tareasSeleccionadas={tareasSeleccionadas}
                    onToggleTarea={toggleSeleccionTarea}
                    currentUserEmail={currentUserEmail}
                    onEditarConVoz={handleEditarConVoz}
                  />
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <DescriptionTasksFooter
            totalTareas={estadisticas.tareasSinDescripcion}
            tareasSeleccionadas={tareasSeleccionadas}
            onSeleccionarTodas={seleccionarTodasTareas}
            onDeseleccionarTodas={deseleccionarTodasTareas}
            onIniciarModoVoz={handleIniciarModoVoz}
            isLoading={isLoading}
            currentUserEmail={currentUserEmail}
            turno={turno}
          />
        </div>
      ) : (
        <NoDescriptionTasksMessage currentUserEmail={currentUserEmail} />
      )}
    </div>
  );
}

// ========== COMPONENTES AUXILIARES ==========

interface ActivityWithDescriptionItemProps {
  revision: RevisionConDescripcion;
  actividad: any;
  index: number;
  tareasSeleccionadas: Set<string>;
  onToggleTarea: (tareaId: string) => void;
  currentUserEmail: string;
  onEditarConVoz: (tareaId: string) => void;
}

function ActivityWithDescriptionItem({
  revision, actividad, index,
  tareasSeleccionadas, onToggleTarea,
  currentUserEmail, onEditarConVoz,
}: ActivityWithDescriptionItemProps) {
  const theme = useTheme();
  const badgeColor = useMemo(() => {
    const colors = ["bg-blue-500/20 text-blue-500", "bg-purple-500/20 text-purple-500", "bg-pink-500/20 text-pink-500"];
    return colors[index % 3];
  }, [index]);

  const colaboradoresReales = revision.colaboradoresReales || [];
  const esActividadIndividual = colaboradoresReales.length <= 1;

  return (
    <div className={`p-2 rounded-lg border ${theme === "dark" ? "bg-[#252527] border-[#333335]" : "bg-gray-50 border-gray-200"}`}>
      {/* Header de actividad */}
      <div className="flex items-start justify-between mb-1.5 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${badgeColor}`}>
            {index + 1}
          </div>
          <div className="min-w-0">
            <h5 className={`font-medium text-xs line-clamp-2 ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
              {actividad.titulo}
            </h5>
            <span className={`text-[10px] ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
              {currentUserEmail.split("@")[0]}
            </span>
          </div>
        </div>
        <UIBadge variant="outline" className={`text-[10px] shrink-0 ${theme === "dark" ? "border-[#3a3a3a] text-gray-400 bg-[#1a1a1a]" : "border-gray-300 text-gray-600 bg-white"}`}>
          {actividad.horario}
        </UIBadge>
      </div>

      {/* Indicador tipo de trabajo */}
      <div className="ml-7 mb-2">
        {esActividadIndividual ? (
          <UIBadge variant="secondary" className={`text-[10px] px-1.5 py-0.5 flex items-center gap-1 w-fit ${theme === "dark" ? "bg-blue-500/20 text-blue-300 border border-blue-500/20" : "bg-blue-100 text-blue-700 border border-blue-200"}`}>
            <UserIcon className="w-2.5 h-2.5" />Individual
          </UIBadge>
        ) : (
          <UIBadge variant="secondary" className={`text-[10px] px-1.5 py-0.5 flex items-center gap-1 w-fit ${theme === "dark" ? "bg-green-500/20 text-green-300 border border-green-500/20" : "bg-green-100 text-green-700 border border-green-200"}`}>
            <UsersIcon className="w-2.5 h-2.5" />Equipo ({colaboradoresReales.length})
          </UIBadge>
        )}
      </div>

      {/* Tareas */}
      <div className="space-y-2">
        {/* Tareas SIN descripción */}
        {revision.tareasConDescripcion.filter((t: any) => !t.tieneDescripcion).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <UIBadge variant="outline" className={`text-[10px] ${theme === "dark" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-300"}`}>
                <FileText className="w-2.5 h-2.5 mr-1" />
                Pendientes ({revision.tareasConDescripcion.filter((t: any) => !t.tieneDescripcion).length})
              </UIBadge>
            </div>
            <div className="ml-7 space-y-1.5">
              {revision.tareasConDescripcion.filter((t: any) => !t.tieneDescripcion).map((tarea: any) => (
                <TaskWithDescriptionItem
                  key={tarea.id}
                  tarea={tarea}
                  estaSeleccionada={tareasSeleccionadas.has(tarea.id)}
                  onToggleSeleccion={() => onToggleTarea(tarea.id)}
                  esActividadIndividual={esActividadIndividual}
                  colaboradoresReales={colaboradoresReales}
                  onEditarConVoz={onEditarConVoz}
                  currentUserEmail={currentUserEmail}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tareas CON descripción */}
        {revision.tareasConDescripcion.filter((t: any) => t.tieneDescripcion).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <UIBadge variant="outline" className={`text-[10px] ${theme === "dark" ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-green-50 text-green-700 border-green-300"}`}>
                <Check className="w-2.5 h-2.5 mr-1" />
                Completadas ({revision.tareasConDescripcion.filter((t: any) => t.tieneDescripcion).length})
              </UIBadge>
            </div>
            <div className="ml-7 space-y-1.5">
              {revision.tareasConDescripcion.filter((t: any) => t.tieneDescripcion).map((tarea: any) => (
                <TaskWithDescriptionItem
                  key={tarea.id}
                  tarea={tarea}
                  estaSeleccionada={false}
                  onToggleSeleccion={() => {}}
                  esActividadIndividual={esActividadIndividual}
                  colaboradoresReales={colaboradoresReales}
                  onEditarConVoz={onEditarConVoz}
                  currentUserEmail={currentUserEmail}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface TaskWithDescriptionItemProps {
  tarea: any;
  estaSeleccionada: boolean;
  onToggleSeleccion: () => void;
  esActividadIndividual: boolean;
  colaboradoresReales: string[];
  onEditarConVoz: (tareaId: string) => void;
  currentUserEmail: string;
}

function TaskWithDescriptionItem({
  tarea, estaSeleccionada, onToggleSeleccion,
  esActividadIndividual, colaboradoresReales,
  onEditarConVoz, currentUserEmail,
}: TaskWithDescriptionItemProps) {
  const theme = useTheme();
  const [mostrarDescripcion, setMostrarDescripcion] = useState(false);

  const reportadoPorMi = tarea.explicacionVoz?.emailUsuario === currentUserEmail;
  const reportadoPorCompañero = tarea.bloqueada && tarea.explicacionVoz?.emailUsuario && !reportadoPorMi;
  const nombreReportador = tarea.explicacionVoz?.emailUsuario?.split("@")[0];

  return (
    <div className={`p-2 rounded border transition-all ${
      reportadoPorMi
        ? theme === "dark" ? "bg-blue-950/40 border-blue-500/40" : "bg-blue-50 border-blue-300"
        : reportadoPorCompañero
          ? theme === "dark" ? "bg-purple-950/40 border-purple-500/40" : "bg-purple-50 border-purple-300"
          : estaSeleccionada
            ? theme === "dark" ? "border-[#6841ea] bg-[#6841ea]/15" : "border-[#6841ea] bg-[#6841ea]/8"
            : theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a] hover:bg-[#222224] hover:border-[#333335]" : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
    }`}>
      <div className="flex items-start gap-2">
        {/* Checkbox */}
        <div
          className={`flex items-center mt-0.5 ${tarea.bloqueada ? "cursor-not-allowed" : "cursor-pointer"}`}
          onClick={(e) => { e.stopPropagation(); if (!tarea.bloqueada) onToggleSeleccion(); }}
        >
          <div className={`w-4 h-4 flex items-center justify-center border rounded transition-all ${
            tarea.bloqueada
              ? theme === "dark" ? "bg-green-500/20 border-green-500/40" : "bg-green-100 border-green-400"
              : estaSeleccionada
                ? "bg-[#6841ea] border-[#6841ea]"
                : theme === "dark" ? "border-gray-600 hover:border-[#6841ea]" : "border-gray-400 hover:border-[#6841ea]"
          }`}>
            {tarea.bloqueada
              ? <Check className="w-3 h-3 text-green-500" />
              : estaSeleccionada
                ? <Check className="w-3 h-3 text-white" />
                : null}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-1">
            {/* Nombre + prioridad */}
            <div className="flex items-start justify-between gap-2">
              <span className={`text-xs line-clamp-2 ${tarea.bloqueada ? (theme === "dark" ? "text-green-300" : "text-green-700") : (theme === "dark" ? "text-gray-200" : "text-gray-800")}`}>
                {tarea.nombre}
              </span>
              <UIBadge variant={tarea.prioridad === "ALTA" ? "destructive" : "secondary"}
                className={`text-[10px] shrink-0 ${tarea.prioridad === "ALTA"
                  ? (theme === "dark" ? "bg-red-500/25 text-red-400 border border-red-500/30" : "bg-red-50 text-red-600 border border-red-300")
                  : (theme === "dark" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-amber-50 text-amber-700 border border-amber-300")}`}>
                {tarea.prioridad}
              </UIBadge>
            </div>

            {/* Colaboración */}
            <span className={`text-[10px] ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
              {esActividadIndividual
                ? <><User className="w-3 h-3 inline mr-0.5" />Tú solo</>
                : <><Users className="w-3 h-3 inline mr-0.5" />Equipo ({colaboradoresReales.length})</>}
            </span>

            {/* Duración + estado */}
            <div className="flex items-center justify-between gap-2 text-[10px] flex-wrap">
              <div className="flex items-center gap-2">
                <span className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>{tarea.duracionMin} min</span>
                {tarea.diasPendiente > 0 && (
                  <span className={theme === "dark" ? "text-amber-300" : "text-amber-600"}>{tarea.diasPendiente}d pendiente</span>
                )}
              </div>
              {tarea.bloqueada ? (
                <UIBadge className={`text-[10px] px-1.5 py-0.5 ${
                  reportadoPorMi
                    ? (theme === "dark" ? "bg-blue-500/30 text-blue-300 border border-blue-500/30" : "bg-blue-100 text-blue-700 border border-blue-300")
                    : reportadoPorCompañero
                      ? (theme === "dark" ? "bg-purple-500/30 text-purple-300 border border-purple-500/30" : "bg-purple-100 text-purple-700 border border-purple-300")
                      : (theme === "dark" ? "bg-green-500/25 text-green-300 border border-green-500/30" : "bg-green-100 text-green-700 border border-green-300")
                }`}>
                  <Check className="w-3 h-3 inline mr-0.5" />
                  {reportadoPorMi ? "TÚ LO REPORTASTE" : reportadoPorCompañero ? `REPORTADO POR ${nombreReportador?.toUpperCase()}` : "COMPLETADA"}
                </UIBadge>
              ) : (
                <UIBadge className={`text-[10px] px-1.5 py-0.5 ${theme === "dark" ? "bg-amber-500/25 text-amber-300 border border-amber-500/30" : "bg-amber-50 text-amber-700 border border-amber-300"}`}>
                  <FileText className="w-3 h-3 inline mr-0.5" />SIN DESCRIPCIÓN
                </UIBadge>
              )}
            </div>

            {/* Descripción expandible */}
            {tarea.descripcion && (
              <div className="mt-1">
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="ghost"
                    onClick={(e) => { e.stopPropagation(); setMostrarDescripcion(!mostrarDescripcion); }}
                    className={`text-[10px] h-5 px-2 py-1 ${theme === "dark" ? "text-gray-400 hover:text-gray-200 hover:bg-[#2a2a2a]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-200"}`}>
                    <FileText className="w-2.5 h-2.5 mr-1" />{mostrarDescripcion ? "Ocultar" : "Ver"} descripción
                  </Button>
                  <Button size="sm" variant="ghost"
                    onClick={(e) => { e.stopPropagation(); onEditarConVoz(tarea.id); }}
                    className={`text-[10px] h-5 px-2 py-1 ${theme === "dark" ? "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10" : "text-blue-600 hover:text-blue-800 hover:bg-blue-100"}`}>
                    <Mic className="w-2.5 h-2.5 mr-1" />Re-dictar
                  </Button>
                </div>
                {mostrarDescripcion && (
                  <div className={`mt-1 p-1.5 rounded text-[10px] ${theme === "dark" ? "bg-[#2a2a2a] text-gray-300 border border-[#3a3a3a]" : "bg-gray-100 text-gray-700 border border-gray-200"}`}>
                    <p className="whitespace-pre-wrap">{tarea.descripcion}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface DescriptionTasksFooterProps {
  totalTareas: number;
  tareasSeleccionadas: Set<string>;
  onSeleccionarTodas: () => void;
  onDeseleccionarTodas: () => void;
  onIniciarModoVoz: () => void;
  isLoading?: boolean;
  currentUserEmail: string;
  turno: "mañana" | "tarde";
}

function DescriptionTasksFooter({
  totalTareas, tareasSeleccionadas,
  onSeleccionarTodas, onDeseleccionarTodas,
  onIniciarModoVoz, isLoading = false,
  currentUserEmail, turno,
}: DescriptionTasksFooterProps) {
  const theme = useTheme();
  const countSeleccionadas = tareasSeleccionadas.size;
  const todasSeleccionadas = countSeleccionadas === totalTareas && totalTareas > 0;
  const nombreUsuario = currentUserEmail.split("@")[0];

  return (
    <div className={`p-2 border-t ${theme === "dark" ? "border-[#2a2a2a] bg-[#202022]" : "border-gray-200 bg-gray-50"}`}>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs">
          <div className="flex flex-col gap-0.5">
            <span className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
              {totalTareas} tarea{totalTareas !== 1 ? "s" : ""} pendiente{totalTareas !== 1 ? "s" : ""}
            </span>
            {countSeleccionadas > 0 && (
              <span className="text-[10px] flex items-center gap-1 text-[#6841ea]">
                <CheckSquare className="w-3 h-3" />{countSeleccionadas} seleccionada{countSeleccionadas !== 1 ? "s" : ""}
              </span>
            )}
            <span className={`text-[10px] ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>{nombreUsuario}</span>
          </div>
          <UIBadge variant="outline" className={`text-[10px] px-1.5 py-0.5 flex items-center gap-1 ${theme === "dark" ? "bg-purple-500/15 text-purple-300 border-purple-500/30" : "bg-purple-50 text-purple-700 border-purple-300"}`}>
            <Mic className="w-3 h-3" />Modo Voz
          </UIBadge>
        </div>

        {totalTareas > 0 && (
          <Button
            onClick={todasSeleccionadas ? onDeseleccionarTodas : onSeleccionarTodas}
            size="sm" variant="outline"
            className={`w-full text-xs h-6 ${theme === "dark" ? "border-[#3a3a3a] text-gray-300 hover:bg-[#2a2a2a] bg-transparent" : "border-gray-300 text-gray-700 hover:bg-gray-100 bg-white"}`}>
            <CheckSquare className="w-3 h-3 mr-1.5" />
            {todasSeleccionadas ? "Deseleccionar todas" : "Seleccionar todas"}
          </Button>
        )}

        <Button
          onClick={onIniciarModoVoz} size="sm"
          className={`w-full text-white text-xs h-7 transition-colors ${
            countSeleccionadas === 0
              ? (theme === "dark" ? "bg-gray-700 cursor-not-allowed text-gray-500" : "bg-gray-300 cursor-not-allowed text-gray-500")
              : "bg-[#6841ea] hover:bg-[#5a36d4] active:bg-[#4f2fc4]"
          }`}
          disabled={countSeleccionadas === 0 || isLoading}>
          {isLoading ? (
            <><RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />Iniciando...</>
          ) : (
            <><Mic className="w-3 h-3 mr-1.5" />Explicar con Voz{countSeleccionadas > 0 && ` (${countSeleccionadas})`}</>
          )}
        </Button>
      </div>
    </div>
  );
}

function NoDescriptionTasksMessage({ currentUserEmail }: { currentUserEmail: string }) {
  const theme = useTheme();
  return (
    <div className="animate-in slide-in-from-bottom-2 duration-300 flex justify-center">
      <div className={`p-4 rounded-lg border text-center ${theme === "dark" ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-white border-gray-200 shadow-sm"}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${theme === "dark" ? "bg-green-500/15" : "bg-green-100"}`}>
          <Check className="w-5 h-5 text-green-500" />
        </div>
        <h4 className={`font-semibold mb-1 text-xs ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>¡Todo listo!</h4>
        <p className={`text-[11px] ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
          {currentUserEmail.split("@")[0]}, todas tus tareas ya tienen descripción. ¡Buen trabajo!
        </p>
      </div>
    </div>
  );
}