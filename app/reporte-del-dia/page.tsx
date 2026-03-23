"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import LoadingScreen from "./components/LoadingScreen";
import ErrorScreen from "./components/ErrorScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
  RotateCcw,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  FileText,
  ListChecks,
  X,
  Play,
  Volume2,
  StopCircle,
  PauseCircle,
  VolumeX,
  Settings,
  LogOut,
  Brain,
  Calendar,
  List,
  Mail,
  Phone,
  Briefcase,
  Check,
  Sun,
  CalendarDays,
  CalendarRange,
  Circle,
  Activity,
  Clock as HistoryIcon,
  ArrowLeft
} from "lucide-react";
import {
  useActividadesData,
  obtenerFechaPorDias,
} from "@/app/reporte-del-dia/hooks/useReporteData";
import { Actividad, Tarea } from "./components/types";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api";

// ==================== HOOK DE SÍNTESIS DE VOZ ====================
const useSpeechSynthesis = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voces, setVoces] = useState<SpeechSynthesisVoice[]>([]);
  const [vozSeleccionada, setVozSeleccionada] = useState<string>("");

  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!window.speechSynthesis) {
        setIsSupported(false);
        setError("Tu navegador no soporta síntesis de voz.");
      } else {
        synthesisRef.current = window.speechSynthesis;

        const cargarVoces = () => {
          if (synthesisRef.current) {
            const vocesDisponibles = synthesisRef.current.getVoices();
            setVoces(vocesDisponibles);

            const vozEspanol = vocesDisponibles.find(v =>
              v.lang.includes('es') || v.lang.includes('ES')
            );
            if (vozEspanol) {
              setVozSeleccionada(vozEspanol.name);
            }
          }
        };

        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = cargarVoces;
        }

        cargarVoces();
      }
    }
  }, []);

  const hablar = (texto: string, velocidad: number = 1) => {
    if (!synthesisRef.current || !isSupported) {
      setError("Síntesis de voz no disponible");
      return false;
    }

    detener();

    try {
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'es-ES';
      utterance.rate = velocidad;
      utterance.volume = 1;

      if (vozSeleccionada) {
        const voz = voces.find(v => v.name === vozSeleccionada);
        if (voz) utterance.voice = voz;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setError(null);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };

      utterance.onerror = (event) => {
        console.error('Error de síntesis:', event);
        setError(`Error al reproducir`);
        setIsSpeaking(false);
        setIsPaused(false);
      };

      utterance.onpause = () => {
        setIsPaused(true);
      };

      utterance.onresume = () => {
        setIsPaused(false);
      };

      utteranceRef.current = utterance;
      synthesisRef.current.speak(utterance);
      return true;
    } catch (err) {
      console.error('Error al iniciar síntesis:', err);
      setError("Error al iniciar la reproducción");
      return false;
    }
  };

  const pausar = () => {
    if (synthesisRef.current && isSpeaking) {
      synthesisRef.current.pause();
      return true;
    }
    return false;
  };

  const reanudar = () => {
    if (synthesisRef.current && isSpeaking) {
      synthesisRef.current.resume();
      return true;
    }
    return false;
  };

  const detener = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      return true;
    }
    return false;
  };

  const cambiarVoz = (nombreVoz: string) => {
    setVozSeleccionada(nombreVoz);
  };

  return {
    isSpeaking,
    isPaused,
    isSupported,
    error,
    voces,
    vozSeleccionada,
    hablar,
    pausar,
    reanudar,
    detener,
    cambiarVoz
  };
};

// ==================== MODAL DE CONFIRMACIÓN DE LECTURA ====================
const ModalConfirmacionLectura = ({
  isOpen,
  onClose,
  onConfirm,
  actividad,
  tareas
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tareasSeleccionadas: Tarea[]) => void;
  actividad: Actividad | null;
  tareas: Tarea[];
}) => {
  const [tareasSeleccionadas, setTareasSeleccionadas] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && tareas.length > 0) {
      const tareasConExplicacion = tareas
        .filter(t => t.tieneExplicacion === true)
        .map(t => t.pendienteId);
      setTareasSeleccionadas(new Set(tareasConExplicacion));
    }
  }, [isOpen, tareas]);

  if (!isOpen || !actividad) return null;

  const totalTareasConExplicacion = tareas.filter(t => t.tieneExplicacion === true).length;

  const toggleTarea = (tareaId: string) => {
    const newSelection = new Set(tareasSeleccionadas);
    if (newSelection.has(tareaId)) {
      newSelection.delete(tareaId);
    } else {
      newSelection.add(tareaId);
    }
    setTareasSeleccionadas(newSelection);
  };

  const seleccionarTodas = () => {
    setTareasSeleccionadas(new Set(
      tareas
        .filter(t => t.tieneExplicacion === true)
        .map(t => t.pendienteId)
    ));
  };

  const limpiarSeleccion = () => {
    setTareasSeleccionadas(new Set());
  };

  const handleConfirm = () => {
    if (tareasSeleccionadas.size === 0) {
      toast({
        title: "No hay tareas seleccionadas",
        description: "Selecciona al menos una tarea para leer",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    const tareasAConfirmar = tareas.filter(t => tareasSeleccionadas.has(t.pendienteId));
    onConfirm(tareasAConfirmar);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="relative border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Volume2 className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-white/90">
                    Confirmar lectura
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">
                    {tareasSeleccionadas.size}/{totalTareasConExplicacion}
                  </span>
                </div>
                <p className="text-xs text-white/40 mt-0.5">
                  {actividad.titulo} · {new Date(actividad.fecha).toLocaleDateString('es-MX')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-white/40 hover:text-white/60 hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(90vh - 180px)" }}>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/[0.02] rounded-lg p-3">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Total</p>
              <p className="text-lg font-semibold text-white/90">{tareas.length}</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-3">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Con IA</p>
              <p className="text-lg font-semibold text-indigo-400">{totalTareasConExplicacion}</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-3">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Selección</p>
              <p className="text-lg font-semibold text-indigo-400">{tareasSeleccionadas.size}</p>
            </div>
          </div>

          {/* Instrucciones */}
          <div className="bg-white/[0.02] rounded-lg p-3">
            <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Instrucciones</h3>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2 text-xs text-white/40">
                <CheckCircle className="w-3.5 h-3.5 text-indigo-400/40 mt-0.5 flex-shrink-0" />
                <span>Se leerán <span className="text-white/60 font-medium">{tareasSeleccionadas.size}</span> tareas con explicaciones</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-white/40">
                <CheckCircle className="w-3.5 h-3.5 text-indigo-400/40 mt-0.5 flex-shrink-0" />
                <span>Puedes seleccionar/deseleccionar tareas específicas</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-white/40">
                <CheckCircle className="w-3.5 h-3.5 text-indigo-400/40 mt-0.5 flex-shrink-0" />
                <span>La lectura se realizará en orden, puedes pausar y reanudar</span>
              </li>
            </ul>
          </div>

          {/* Header de tareas */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">
              Tareas disponibles
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={seleccionarTodas}
                disabled={totalTareasConExplicacion === 0}
                className="text-[10px] px-2 py-1 text-indigo-400/60 hover:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Seleccionar todas
              </button>
              <button
                onClick={limpiarSeleccion}
                className="text-[10px] px-2 py-1 text-white/40 hover:text-white/60 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Lista de tareas */}
          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
            {tareas.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <AlertCircle className="w-5 h-5 text-white/20" />
                </div>
                <p className="text-xs text-white/40">No hay tareas en esta actividad</p>
              </div>
            ) : (
              tareas.map((tarea, index) => {
                const tieneExplicacion = tarea.tieneExplicacion === true;
                const estaSeleccionada = tareasSeleccionadas.has(tarea.pendienteId);

                return (
                  <motion.div
                    key={tarea.pendienteId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => tieneExplicacion && toggleTarea(tarea.pendienteId)}
                    className={`
                      group relative rounded-lg border transition-all duration-200 cursor-pointer
                      ${tieneExplicacion
                        ? estaSeleccionada
                          ? 'bg-indigo-500/5 border-indigo-500/30'
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.03] hover:border-white/10'
                        : 'bg-white/[0.01] border-white/5 opacity-40 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className="p-3">
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className="relative flex items-center justify-center w-4 h-4 mt-0.5">
                          <input
                            type="checkbox"
                            checked={estaSeleccionada}
                            onChange={() => {}}
                            disabled={!tieneExplicacion}
                            className="absolute opacity-0 w-4 h-4 cursor-pointer"
                          />
                          <div className={`
                            w-4 h-4 rounded border transition-all duration-200 flex items-center justify-center
                            ${tieneExplicacion
                              ? estaSeleccionada
                                ? 'bg-indigo-500 border-indigo-500'
                                : 'border-white/20 group-hover:border-white/40'
                              : 'border-white/10'
                            }
                          `}>
                            {estaSeleccionada && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>

                        {/* Número de tarea */}
                        <div className={`
                          w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-medium
                          ${tieneExplicacion
                            ? estaSeleccionada
                              ? 'bg-indigo-500/20 text-indigo-400'
                              : 'bg-white/5 text-white/40'
                            : 'bg-white/5 text-white/20'
                          }
                        `}>
                          {index + 1}
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`
                              text-xs font-medium truncate max-w-[200px]
                              ${tieneExplicacion
                                ? estaSeleccionada
                                  ? 'text-white'
                                  : 'text-white/80'
                                : 'text-white/40'
                              }
                            `}>
                              {tarea.nombre}
                            </span>
                            {tarea.prioridad && (
                              <span className={`
                                text-[8px] px-1.5 py-0.5 rounded-full
                                ${tarea.prioridad === 'ALTA' ? 'bg-red-500/10 text-red-400' :
                                  tarea.prioridad === 'MEDIA' ? 'bg-yellow-500/10 text-yellow-400' :
                                    'bg-blue-500/10 text-blue-400'}
                              `}>
                                {tarea.prioridad}
                              </span>
                            )}
                          </div>

                          {/* Metadatos */}
                          <div className="flex items-center gap-2 text-[10px] text-white/30">
                            {tarea.duracionMin > 0 && (
                              <>
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />
                                  {tarea.duracionMin} min
                                </span>
                                <span className="w-1 h-1 rounded-full bg-white/20" />
                              </>
                            )}
                            <span className={tarea.terminada ? 'text-green-400/60' : 'text-yellow-400/60'}>
                              {tarea.terminada ? 'Completada' : 'Pendiente'}
                            </span>
                          </div>

                          {/* Preview de explicación */}
                          {tarea.explicacionActual && (
                            <div className="mt-2 pt-2 border-t border-white/5">
                              <p className="text-[10px] text-white/40 leading-relaxed line-clamp-2">
                                {tarea.explicacionActual.texto}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[8px]">
                                <span className="text-white/30">
                                  {tarea.explicacionActual.email?.split('@')[0]}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                <span className="text-white/30">
                                  {new Date(tarea.explicacionActual.fecha).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Badge IA */}
                        {tieneExplicacion && (
                          <div className="flex items-center gap-1 text-[8px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400/60 rounded-full">
                            <Brain className="w-2.5 h-2.5" />
                            <span>IA</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-6 h-6 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                <Volume2 className="w-3 h-3 text-indigo-400" />
              </div>
              <span className="text-white/40">
                {tareasSeleccionadas.size} tarea{tareasSeleccionadas.size !== 1 ? 's' : ''} seleccionada{tareasSeleccionadas.size !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-white/40 hover:text-white/60 bg-transparent hover:bg-white/5 rounded-lg transition-colors border border-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={tareasSeleccionadas.size === 0}
                className={`
                  px-4 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-2
                  ${tareasSeleccionadas.size > 0
                    ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-white/5 text-white/20 cursor-not-allowed'
                  }
                `}
              >
                <Play className="w-3 h-3" />
                Iniciar lectura ({tareasSeleccionadas.size})
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ==================== MODAL DE LECTURA DE TAREAS ====================
const ModalLecturaTareas = ({
  isOpen,
  onClose,
  tareas,
  onCompletado
}: {
  isOpen: boolean;
  onClose: () => void;
  tareas: Tarea[];
  onCompletado: () => void;
}) => {
  const [tareaActual, setTareaActual] = useState(0);
  const [velocidad, setVelocidad] = useState(1);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [modoLectura, setModoLectura] = useState<'que-se-hara' | 'que-se-hizo'>('que-se-hizo');
  const { toast } = useToast();

  const speech = useSpeechSynthesis();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (speech.isSpeaking) {
        speech.detener();
      }
    };
  }, [speech]);

  const obtenerTextoALeer = (tarea: Tarea): string | null => {
    if (modoLectura === 'que-se-hizo') {
      return tarea.explicacionActual ? `${tarea.nombre}. ${tarea.explicacionActual.texto}` : null;
    } else {
      return tarea.descripcion ? `${tarea.nombre}. ${tarea.descripcion}` : null;
    }
  };

  useEffect(() => {
    if (isOpen && tareas.length > 0 && tareaActual < tareas.length) {
      const timer = setTimeout(() => {
        if (isMounted.current) {
          const tarea = tareas[tareaActual];
          const textoALeer = obtenerTextoALeer(tarea);
          if (textoALeer) {
            speech.hablar(textoALeer, velocidad);
          } else {
            toast({
              title: modoLectura === 'que-se-hizo' ? "Sin explicación" : "Sin descripción",
              description: `Esta tarea no tiene ${modoLectura === 'que-se-hizo' ? 'explicación' : 'descripción'} para leer`,
              variant: "destructive",
              duration: 2000
            });
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, modoLectura]);

  useEffect(() => {
    if (isOpen && tareas.length > 0 && tareaActual < tareas.length) {
      if (speech.isSpeaking) {
        speech.detener();
      }
      const timer = setTimeout(() => {
        if (isMounted.current) {
          const tarea = tareas[tareaActual];
          const textoALeer = obtenerTextoALeer(tarea);
          if (textoALeer) {
            speech.hablar(textoALeer, velocidad);
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [tareaActual, modoLectura]);

  const handleClose = () => {
    if (speech.isSpeaking) {
      speech.detener();
    }
    setTimeout(() => {
      if (isMounted.current) {
        onClose();
        setTareaActual(0);
      }
    }, 50);
  };

  if (!isOpen) return null;

  if (tareas.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/30">
        <div className="bg-[#0a0a0a] border border-yellow-500/30 rounded-xl p-5 max-w-md">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">No hay tareas</h3>
            <p className="text-xs text-gray-400 mb-3">No hay tareas disponibles para leer.</p>
            <Button onClick={handleClose} size="sm" className="bg-[#6841ea] hover:bg-[#7a4cf5] h-8 text-xs px-3">
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!speech.isSupported) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/30">
        <div className="bg-[#0a0a0a] border border-yellow-500/30 rounded-xl w-full max-w-md p-5">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">Navegador no compatible</h3>
            <p className="text-xs text-gray-400 mb-3">
              {speech.error || "Tu navegador no soporta síntesis de voz."}
            </p>
            <Button onClick={handleClose} size="sm" className="bg-[#6841ea] hover:bg-[#7a4cf5] h-8 text-xs px-3">
              Entendido
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const tareaAct = tareas[tareaActual];
  const progreso = ((tareaActual + 1) / tareas.length) * 100;

  const pausarReanudar = () => {
    if (speech.isPaused) {
      speech.reanudar();
      toast({ title: "Reanudado", description: "Continuando con la lectura", duration: 2000 });
    } else if (speech.isSpeaking) {
      speech.pausar();
      toast({ title: "Pausado", description: "Lectura pausada", duration: 2000 });
    }
  };

  const detenerLectura = () => {
    speech.detener();
    toast({ title: "Lectura detenida", duration: 2000 });
  };

  const siguienteTarea = () => {
    speech.detener();
    if (tareaActual < tareas.length - 1) {
      setTareaActual(tareaActual + 1);
    } else {
      toast({
        title: "Lectura completada",
        description: `Se leyeron ${tareas.length} tareas correctamente`,
        duration: 4000
      });
      onCompletado();
      handleClose();
    }
  };

  const tareaAnterior = () => {
    if (tareaActual > 0) {
      speech.detener();
      setTareaActual(tareaActual - 1);
    }
  };

  const repetirTarea = () => {
    speech.detener();
    const textoALeer = obtenerTextoALeer(tareaAct);
    if (textoALeer) {
      speech.hablar(textoALeer, velocidad);
    }
  };

  const cambiarVelocidad = (nuevaVelocidad: number) => {
    setVelocidad(nuevaVelocidad);
    if (speech.isSpeaking) {
      repetirTarea();
    }
  };

  const irATarea = (index: number) => {
    speech.detener();
    setTareaActual(index);
  };

  const tieneTextoParaLeer = (tarea: Tarea): boolean => {
    if (modoLectura === 'que-se-hizo') {
      return !!tarea.explicacionActual;
    } else {
      return !!tarea.descripcion;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/30">
      <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl w-full max-w-3xl shadow-2xl">
        <div className="flex items-center justify-between p-3 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 ${speech.isSpeaking ? 'bg-[#6841ea]/20' : 'bg-[#1a1a1a]'} rounded-lg`}>
              <Volume2 className={`w-4 h-4 ${speech.isSpeaking ? 'text-[#6841ea]' : 'text-gray-500'}`} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Lectura de Tareas</h2>
              <p className="text-xs text-gray-400">Tarea {tareaActual + 1} de {tareas.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setMostrarConfig(!mostrarConfig)} className="p-1 hover:bg-[#1a1a1a] rounded-lg">
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={handleClose} className="p-1 hover:bg-[#1a1a1a] rounded-lg">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="px-3 pt-3 pb-1 border-b border-[#2a2a2a] bg-[#0d0d0d]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Leer:</span>
            <div className="flex items-center gap-2 bg-[#1a1a1a] p-1 rounded-lg">
              <button
                onClick={() => setModoLectura('que-se-hizo')}
                className={`px-3 py-1 text-[10px] rounded-md transition-colors flex items-center gap-1 ${
                  modoLectura === 'que-se-hizo' 
                    ? 'bg-indigo-500/20 text-indigo-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Brain className="w-3 h-3" />
                QUE SE HIZO
              </button>
              <button
                onClick={() => setModoLectura('que-se-hara')}
                className={`px-3 py-1 text-[10px] rounded-md transition-colors flex items-center gap-1 ${
                  modoLectura === 'que-se-hara' 
                    ? 'bg-indigo-500/20 text-indigo-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FileText className="w-3 h-3" />
                QUE SE HARÁ
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 text-[8px] text-gray-500">
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${tieneTextoParaLeer(tareaAct) ? 'bg-green-400' : 'bg-red-400'}`} />
              Tarea actual: {tieneTextoParaLeer(tareaAct) ? 'disponible' : 'sin contenido'}
            </span>
            <span>•</span>
            <span>
              {tareas.filter(t => modoLectura === 'que-se-hizo' ? t.explicacionActual : t.descripcion).length} de {tareas.length} disponibles
            </span>
          </div>
        </div>

        <div className="h-0.5 bg-[#1a1a1a]">
          <div className="h-full bg-[#6841ea] transition-all duration-300" style={{ width: `${progreso}%` }} />
        </div>

        {mostrarConfig && (
          <div className="p-3 border-b border-[#2a2a2a] bg-[#111]">
            <h3 className="text-xs font-medium text-gray-300 mb-2">Configuración de voz</h3>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Velocidad</label>
                <div className="flex items-center gap-2">
                  <VolumeX className="w-3 h-3 text-gray-500" />
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={velocidad}
                    onChange={(e) => cambiarVelocidad(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer"
                  />
                  <Volume2 className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-white w-12">{velocidad.toFixed(1)}x</span>
                </div>
              </div>
              {speech.voces.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Voz</label>
                  <select
                    value={speech.vozSeleccionada}
                    onChange={(e) => speech.cambiarVoz(e.target.value)}
                    className="w-full h-8 text-xs bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 text-gray-300"
                  >
                    {speech.voces.map((voz) => (
                      <option key={voz.name} value={voz.name}>{voz.name} ({voz.lang})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row p-3 gap-3">
          <div className="flex-1 space-y-3">
            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">TAREA ACTUAL</h3>
                <span className="text-xs bg-[#1a1a1a] text-gray-400 px-2 py-0.5 rounded-full">#{tareaActual + 1}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-medium text-white">{tareaAct.nombre}</p>
                {tareaAct.prioridad && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    tareaAct.prioridad === 'ALTA' ? 'bg-red-500/10 text-red-400' :
                    tareaAct.prioridad === 'MEDIA' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    {tareaAct.prioridad}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                {tareaAct.duracionMin > 0 && (
                  <>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tareaAct.duracionMin} min</span>
                    <span>•</span>
                  </>
                )}
                <span className={tareaAct.terminada ? 'text-green-400' : 'text-yellow-400'}>
                  {tareaAct.terminada ? 'Completada' : 'Pendiente'}
                </span>
              </div>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
                <div className="flex items-center gap-1 mb-1">
                  {modoLectura === 'que-se-hizo' ? (
                    <>
                      <Brain className="w-3 h-3 text-indigo-400" />
                      <p className="text-[10px] text-indigo-400 uppercase tracking-wider">QUE SE HIZO</p>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3 h-3 text-amber-400" />
                      <p className="text-[10px] text-amber-400 uppercase tracking-wider">QUE SE HARÁ</p>
                    </>
                  )}
                </div>
                {modoLectura === 'que-se-hizo' ? (
                  tareaAct.explicacionActual ? (
                    <>
                      <p className="text-xs text-gray-300 leading-relaxed">{tareaAct.explicacionActual.texto}</p>
                      {tareaAct.explicacionActual.fecha && (
                        <p className="text-[10px] text-gray-500 mt-2 text-right">
                          {new Date(tareaAct.explicacionActual.fecha).toLocaleString('es-MX')}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No hay explicación disponible</p>
                  )
                ) : (
                  tareaAct.descripcion ? (
                    <>
                      <p className="text-xs text-gray-300 leading-relaxed">{tareaAct.descripcion}</p>
                      {tareaAct.descripcion.includes('(por') && (
                        <p className="text-[10px] text-gray-500 mt-2 text-right">
                          {tareaAct.descripcion.split('(por')[1]?.replace(')', '')}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No hay descripción disponible</p>
                  )
                )}
              </div>
            </div>

            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">ESTADO</span>
                {speech.isSpeaking && !speech.isPaused && (
                  <span className="flex items-center gap-1 text-xs text-[#6841ea]">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6841ea] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#6841ea]"></span>
                    </span>
                    Leyendo...
                  </span>
                )}
                {speech.isPaused && <span className="text-xs text-yellow-400">Pausado</span>}
              </div>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2 min-h-[40px]">
                <p className="text-xs text-gray-400">
                  {speech.isSpeaking ? (speech.isPaused ? "Lectura pausada" : "Reproduciendo...") : "Listo para leer"}
                </p>
              </div>
            </div>

            {speech.error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                <p className="text-xs text-red-400 text-center">{speech.error}</p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2">
              <Button onClick={tareaAnterior} disabled={tareaActual === 0} variant="ghost" size="sm" className="h-8 px-3 text-xs text-gray-400 hover:text-white border border-[#2a2a2a] disabled:opacity-50">
                ← Anterior
              </Button>
              <Button onClick={repetirTarea} variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white border border-[#2a2a2a]" title="Repetir tarea actual">
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button onClick={pausarReanudar} disabled={!speech.isSpeaking} variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white border border-[#2a2a2a] disabled:opacity-50">
                {speech.isPaused ? <Play className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
              </Button>
              <Button onClick={detenerLectura} disabled={!speech.isSpeaking} variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white border border-[#2a2a2a] disabled:opacity-50">
                <StopCircle className="w-3.5 h-3.5" />
              </Button>
              <Button onClick={siguienteTarea} variant="ghost" size="sm" className="h-8 px-3 text-xs text-gray-400 hover:text-white border border-[#2a2a2a]">
                {tareaActual < tareas.length - 1 ? 'Siguiente →' : 'Finalizar'}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-1 pt-1">
              {[0.75, 1, 1.25, 1.5, 2].map((v) => (
                <button
                  key={v}
                  onClick={() => cambiarVelocidad(v)}
                  className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                    velocidad === v ? 'bg-[#6841ea] text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a]'
                  }`}
                >
                  {v}x
                </button>
              ))}
            </div>
          </div>

          <div className="w-full md:w-72 lg:w-80 bg-[#111] border border-[#2a2a2a] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-300 flex items-center gap-1">
                <List className="w-3.5 h-3.5" />
                Listado de tareas
              </h3>
              <span className="text-xs bg-[#1a1a1a] text-gray-400 px-1.5 py-0.5 rounded-full">
                {tareaActual + 1}/{tareas.length}
              </span>
            </div>
            <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
              {tareas.map((tarea, index) => {
                const esPasada = index < tareaActual;
                const esActual = index === tareaActual;
                const esFutura = index > tareaActual;
                const tieneContenido = modoLectura === 'que-se-hizo' ? !!tarea.explicacionActual : !!tarea.descripcion;

                return (
                  <motion.div
                    key={tarea.pendienteId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => irATarea(index)}
                    className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all duration-300 group border ${
                      esActual ? 'bg-[#6841ea]/20 border-[#6841ea]/50' : 'hover:bg-[#1a1a1a] border-transparent hover:border-[#2a2a2a]'
                    } ${!tieneContenido && !esActual ? 'opacity-40' : ''}`}
                  >
                    <div className="relative mt-1">
                      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        esActual ? 'bg-[#6841ea]' : esPasada ? 'bg-gray-600' : 'bg-gray-400'
                      }`} />
                      {esActual && <span className="absolute inset-0 rounded-full bg-[#6841ea] animate-ping opacity-75" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-xs font-medium truncate max-w-[120px] transition-all duration-300 ${
                          esPasada ? 'text-gray-500' : esActual ? 'text-white' : 'text-gray-300'
                        }`}>
                          {tarea.nombre}
                        </p>
                        <span className={`text-[8px] px-1 py-0.5 rounded-full whitespace-nowrap transition-all duration-300 ${
                          esPasada ? 'bg-gray-800 text-gray-500' : esActual ? 'bg-[#6841ea]/20 text-[#6841ea]' : 'bg-[#1a1a1a] text-gray-600'
                        }`}>
                          {esPasada ? 'Leída' : esActual ? 'Actual' : 'Pendiente'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mb-1">
                        {tarea.prioridad && (
                          <span className={`text-[8px] px-1 py-0.5 rounded ${
                            tarea.prioridad === 'ALTA' ? 'bg-red-500/10 text-red-400' :
                            tarea.prioridad === 'MEDIA' ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-blue-500/10 text-blue-400'
                          }`}>
                            {tarea.prioridad}
                          </span>
                        )}
                        {tarea.duracionMin > 0 && (
                          <span className={`text-[8px] flex items-center gap-0.5 ${esPasada ? 'text-gray-600' : 'text-gray-500'}`}>
                            <Clock className="w-2.5 h-2.5" />
                            {tarea.duracionMin}min
                          </span>
                        )}
                      </div>
                      {modoLectura === 'que-se-hizo' ? (
                        tarea.explicacionActual && (
                          <p className={`text-[8px] leading-tight line-clamp-2 transition-all duration-300 ${
                            esPasada ? 'text-gray-600' : esActual ? 'text-gray-300' : 'text-gray-400'
                          }`}>
                            {tarea.explicacionActual.texto.substring(0, 70)}...
                          </p>
                        )
                      ) : (
                        tarea.descripcion && (
                          <p className={`text-[8px] leading-tight line-clamp-2 transition-all duration-300 ${
                            esPasada ? 'text-gray-600' : esActual ? 'text-gray-300' : 'text-gray-400'
                          }`}>
                            {tarea.descripcion.substring(0, 70)}...
                          </p>
                        )
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== MODAL DE LECTURA DE RESÚMENES IA ====================
const ModalLecturaResumenes = ({
  isOpen,
  onClose,
  actividadId
}: {
  isOpen: boolean;
  onClose: () => void;
  actividadId: string | null;
}) => {
  const [actividadActual, setActividadActual] = useState(0);
  const [velocidad, setVelocidad] = useState(1);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [actividadesAgrupadas, setActividadesAgrupadas] = useState<{ [key: string]: Actividad[] }>({});
  const [cargando, setCargando] = useState(false);
  const [modoLectura, setModoLectura] = useState<'planeado' | 'ejecutado'>('planeado');
  const { toast } = useToast();

  const speech = useSpeechSynthesis();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (speech.isSpeaking) {
        speech.detener();
      }
    };
  }, [speech]);

  const agruparPorFecha = (acts: Actividad[]) => {
    const grupos: { [key: string]: Actividad[] } = {};

    acts.forEach(act => {
      const fecha = new Date(act.fecha).toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      if (!grupos[fecha]) {
        grupos[fecha] = [];
      }
      grupos[fecha].push(act);
    });

    const fechasOrdenadas = Object.keys(grupos).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });

    const gruposOrdenados: { [key: string]: Actividad[] } = {};
    fechasOrdenadas.forEach(fecha => {
      grupos[fecha].sort((a, b) => {
        if (a.horaInicio && b.horaInicio) {
          return a.horaInicio.localeCompare(b.horaInicio);
        }
        return 0;
      });
      gruposOrdenados[fecha] = grupos[fecha];
    });

    return gruposOrdenados;
  };

  const obtenerTextoALeer = (actividad: Actividad): string | null => {
    if (modoLectura === 'planeado') {
      return actividad.resumenPlaneado?.texto ? `Actividad: ${actividad.titulo}. ${actividad.resumenPlaneado.texto}` : null;
    } else {
      return actividad.resumenEjecutado?.texto ? `Actividad: ${actividad.titulo}. ${actividad.resumenEjecutado.texto}` : null;
    }
  };

  useEffect(() => {
    const cargarActividades = async () => {
      if (!isOpen) return;

      setCargando(true);
      try {
        const response = await fetch("http://localhost:4000/api/v1/admin/todas-actividades-resumen-ia", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.actividades) {
          let actividadesFiltradas: Actividad[];

          if (actividadId) {
            const actividadFiltrada = data.actividades.find((a: Actividad) => a.actividadId === actividadId);
            actividadesFiltradas = actividadFiltrada ? [actividadFiltrada] : [];
          } else {
            actividadesFiltradas = data.actividades.filter((a: Actividad) => 
              a.resumenPlaneado?.texto || a.resumenEjecutado?.texto
            );
          }

          setActividades(actividadesFiltradas);
          setActividadesAgrupadas(agruparPorFecha(actividadesFiltradas));
        }
      } catch (error) {
        console.error("Error cargando actividades:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los resúmenes",
          variant: "destructive",
          duration: 3000
        });
      } finally {
        setCargando(false);
      }
    };

    cargarActividades();
  }, [isOpen, actividadId]);

  useEffect(() => {
    if (actividades.length > 0) {
      setActividadesAgrupadas(agruparPorFecha(actividades));
    }
  }, [actividades]);

  useEffect(() => {
    if (isOpen && actividades.length > 0 && actividadActual < actividades.length && !cargando) {
      const timer = setTimeout(() => {
        if (isMounted.current) {
          const actividad = actividades[actividadActual];
          const textoALeer = obtenerTextoALeer(actividad);
          if (textoALeer) {
            speech.hablar(textoALeer, velocidad);
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, actividades, cargando, modoLectura]);

  useEffect(() => {
    if (isOpen && actividades.length > 0 && actividadActual < actividades.length && !cargando) {
      if (speech.isSpeaking) {
        speech.detener();
      }
      const timer = setTimeout(() => {
        if (isMounted.current) {
          const actividad = actividades[actividadActual];
          const textoALeer = obtenerTextoALeer(actividad);
          if (textoALeer) {
            speech.hablar(textoALeer, velocidad);
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [actividadActual, actividades, cargando, modoLectura]);

  const handleClose = () => {
    if (speech.isSpeaking) {
      speech.detener();
    }
    setTimeout(() => {
      if (isMounted.current) {
        onClose();
        setActividadActual(0);
      }
    }, 50);
  };

  if (!isOpen) return null;

  if (cargando) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
        <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-6 max-w-md">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-3 border-[#6841ea] border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm text-gray-400">Cargando resúmenes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (actividades.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
        <div className="bg-[#0a0a0a] border border-yellow-500/30 rounded-xl p-5 max-w-md">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">No hay resúmenes disponibles</h3>
            <p className="text-xs text-gray-400 mb-3">
              No se encontraron actividades con resúmenes para leer.
            </p>
            <Button onClick={handleClose} size="sm" className="bg-[#6841ea] hover:bg-[#7a4cf5] h-8 text-xs px-3">
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!speech.isSupported) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
        <div className="bg-[#0a0a0a] border border-yellow-500/30 rounded-xl w-full max-w-md p-5">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">Navegador no compatible</h3>
            <p className="text-xs text-gray-400 mb-3">
              {speech.error || "Tu navegador no soporta síntesis de voz."}
            </p>
            <Button onClick={handleClose} size="sm" className="bg-[#6841ea] hover:bg-[#7a4cf5] h-8 text-xs px-3">
              Entendido
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const actividadAct = actividades[actividadActual];
  if (!actividadAct) return null;

  const progreso = ((actividadActual + 1) / actividades.length) * 100;

  const pausarReanudar = () => {
    if (speech.isPaused) {
      speech.reanudar();
      toast({ title: "Reanudado", description: "Continuando con la lectura", duration: 2000 });
    } else if (speech.isSpeaking) {
      speech.pausar();
      toast({ title: "Pausado", description: "Lectura pausada", duration: 2000 });
    }
  };

  const detenerLectura = () => {
    speech.detener();
    toast({ title: "Lectura detenida", duration: 2000 });
  };

  const siguienteActividad = () => {
    speech.detener();
    if (actividadActual < actividades.length - 1) {
      setActividadActual(actividadActual + 1);
    } else {
      toast({
        title: "Lectura completada",
        description: `Se leyeron ${actividades.length} resúmenes correctamente`,
        duration: 4000
      });
      handleClose();
    }
  };

  const actividadAnterior = () => {
    if (actividadActual > 0) {
      speech.detener();
      setActividadActual(actividadActual - 1);
    }
  };

  const repetirActividad = () => {
    speech.detener();
    const textoALeer = obtenerTextoALeer(actividadAct);
    if (textoALeer) {
      speech.hablar(textoALeer, velocidad);
    }
  };

  const cambiarVelocidad = (nuevaVelocidad: number) => {
    setVelocidad(nuevaVelocidad);
    if (speech.isSpeaking) {
      repetirActividad();
    }
  };

  const irAActividad = (index: number) => {
    speech.detener();
    setActividadActual(index);
  };

  const obtenerIndiceGlobal = (actividad: Actividad) => {
    return actividades.findIndex(a => a.actividadId === actividad.actividadId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/30">
      <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl w-full max-w-3xl shadow-2xl">
        <div className="flex items-center justify-between p-3 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 ${speech.isSpeaking ? 'bg-[#6841ea]/20' : 'bg-[#1a1a1a]'} rounded-lg`}>
              <Brain className={`w-4 h-4 ${speech.isSpeaking ? 'text-[#6841ea]' : 'text-gray-500'}`} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Lectura de Resúmenes</h2>
              <p className="text-xs text-gray-400">Actividad {actividadActual + 1} de {actividades.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setMostrarConfig(!mostrarConfig)} className="p-1 hover:bg-[#1a1a1a] rounded-lg">
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={handleClose} className="p-1 hover:bg-[#1a1a1a] rounded-lg">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="px-3 pt-3 pb-1 border-b border-[#2a2a2a] bg-[#0d0d0d]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Leer:</span>
            <div className="flex items-center gap-2 bg-[#1a1a1a] p-1 rounded-lg">
              <button
                onClick={() => setModoLectura('planeado')}
                className={`px-3 py-1 text-[10px] rounded-md transition-colors flex items-center gap-1 ${
                  modoLectura === 'planeado' 
                    ? 'bg-indigo-500/20 text-indigo-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FileText className="w-3 h-3" />
                QUE SE PLANEÓ
              </button>
              <button
                onClick={() => setModoLectura('ejecutado')}
                className={`px-3 py-1 text-[10px] rounded-md transition-colors flex items-center gap-1 ${
                  modoLectura === 'ejecutado' 
                    ? 'bg-indigo-500/20 text-indigo-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Brain className="w-3 h-3" />
                QUE SE HIZO
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 text-[8px] text-gray-500">
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${
                modoLectura === 'planeado' 
                  ? (actividadAct.resumenPlaneado?.texto ? 'bg-green-400' : 'bg-red-400')
                  : (actividadAct.resumenEjecutado?.texto ? 'bg-green-400' : 'bg-red-400')
              }`} />
              Actividad actual: {modoLectura === 'planeado' 
                ? (actividadAct.resumenPlaneado?.texto ? 'disponible' : 'sin resumen')
                : (actividadAct.resumenEjecutado?.texto ? 'disponible' : 'sin resumen')}
            </span>
          </div>
        </div>

        <div className="h-0.5 bg-[#1a1a1a]">
          <div className="h-full bg-[#6841ea] transition-all duration-300" style={{ width: `${progreso}%` }} />
        </div>

        {mostrarConfig && (
          <div className="p-3 border-b border-[#2a2a2a] bg-[#111]">
            <h3 className="text-xs font-medium text-gray-300 mb-2">Configuración de voz</h3>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Velocidad</label>
                <div className="flex items-center gap-2">
                  <VolumeX className="w-3 h-3 text-gray-500" />
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={velocidad}
                    onChange={(e) => cambiarVelocidad(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer"
                  />
                  <Volume2 className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-white w-12">{velocidad.toFixed(1)}x</span>
                </div>
              </div>
              {speech.voces.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Voz</label>
                  <select
                    value={speech.vozSeleccionada}
                    onChange={(e) => speech.cambiarVoz(e.target.value)}
                    className="w-full h-8 text-xs bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 text-gray-300"
                  >
                    {speech.voces.map((voz) => (
                      <option key={voz.name} value={voz.name}>{voz.name} ({voz.lang})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row p-3 gap-3">
          <div className="flex-1 space-y-3">
            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIVIDAD ACTUAL</h3>
                <span className="text-xs bg-[#1a1a1a] text-gray-400 px-2 py-0.5 rounded-full">
                  {new Date(actividadAct.fecha).toLocaleDateString('es-MX')}
                </span>
              </div>
              <p className="text-sm font-medium text-white mb-2">{actividadAct.titulo}</p>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
                <div className="flex items-center gap-1 mb-1">
                  {modoLectura === 'planeado' ? (
                    <>
                      <FileText className="w-3 h-3 text-amber-400" />
                      <p className="text-[10px] text-amber-400 uppercase tracking-wider">QUE SE PLANEÓ</p>
                    </>
                  ) : (
                    <>
                      <Brain className="w-3 h-3 text-indigo-400" />
                      <p className="text-[10px] text-indigo-400 uppercase tracking-wider">QUE SE HIZO</p>
                    </>
                  )}
                </div>
                {modoLectura === 'planeado' ? (
                  actividadAct.resumenPlaneado?.texto ? (
                    <p className="text-xs text-gray-300 leading-relaxed">{actividadAct.resumenPlaneado.texto}</p>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No hay resumen disponible</p>
                  )
                ) : (
                  actividadAct.resumenEjecutado?.texto ? (
                    <p className="text-xs text-gray-300 leading-relaxed">{actividadAct.resumenEjecutado.texto}</p>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No hay resumen disponible</p>
                  )
                )}
                {modoLectura === 'planeado' && actividadAct.resumenPlaneado?.provider && (
                  <p className="text-[8px] text-gray-500 mt-2 text-right">
                    Generado por: {actividadAct.resumenPlaneado.provider}
                  </p>
                )}
                {modoLectura === 'ejecutado' && actividadAct.resumenEjecutado?.provider && (
                  <p className="text-[8px] text-gray-500 mt-2 text-right">
                    Generado por: {actividadAct.resumenEjecutado.provider}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-[#111] border border-[#2a2a2a] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">ESTADO</span>
                {speech.isSpeaking && !speech.isPaused && (
                  <span className="flex items-center gap-1 text-xs text-[#6841ea]">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6841ea] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#6841ea]"></span>
                    </span>
                    Leyendo...
                  </span>
                )}
                {speech.isPaused && <span className="text-xs text-yellow-400">Pausado</span>}
              </div>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2 min-h-[40px]">
                <p className="text-xs text-gray-400">
                  {speech.isSpeaking ? (speech.isPaused ? "Lectura pausada" : "Reproduciendo...") : "Listo para leer"}
                </p>
              </div>
            </div>

            {speech.error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                <p className="text-xs text-red-400 text-center">{speech.error}</p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2">
              <Button onClick={actividadAnterior} disabled={actividadActual === 0} variant="ghost" size="sm" className="h-8 px-3 text-xs text-gray-400 hover:text-white border border-[#2a2a2a] disabled:opacity-50">
                ← Anterior
              </Button>
              <Button onClick={repetirActividad} variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white border border-[#2a2a2a]" title="Repetir actividad actual">
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button onClick={pausarReanudar} disabled={!speech.isSpeaking} variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white border border-[#2a2a2a] disabled:opacity-50">
                {speech.isPaused ? <Play className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
              </Button>
              <Button onClick={detenerLectura} disabled={!speech.isSpeaking} variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white border border-[#2a2a2a] disabled:opacity-50">
                <StopCircle className="w-3.5 h-3.5" />
              </Button>
              <Button onClick={siguienteActividad} variant="ghost" size="sm" className="h-8 px-3 text-xs text-gray-400 hover:text-white border border-[#2a2a2a]">
                {actividadActual < actividades.length - 1 ? 'Siguiente →' : 'Finalizar'}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-1 pt-1">
              {[0.75, 1, 1.25, 1.5, 2].map((v) => (
                <button
                  key={v}
                  onClick={() => cambiarVelocidad(v)}
                  className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                    velocidad === v ? 'bg-[#6841ea] text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a]'
                  }`}
                >
                  {v}x
                </button>
              ))}
            </div>
          </div>

          <div className="w-full md:w-72 lg:w-80 bg-[#111] border border-[#2a2a2a] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-300 flex items-center gap-1">
                <List className="w-3.5 h-3.5" />
                Actividades por fecha
              </h3>
              <span className="text-xs bg-[#1a1a1a] text-gray-400 px-1.5 py-0.5 rounded-full">
                {actividadActual + 1}/{actividades.length}
              </span>
            </div>

            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
              {Object.entries(actividadesAgrupadas).map(([fecha, acts]) => (
                <div key={fecha} className="space-y-1.5">
                  <div className="flex items-center gap-2 sticky top-0 bg-[#111] py-1">
                    <Calendar className="w-3 h-3 text-[#6841ea]" />
                    <h4 className="text-[10px] font-medium text-[#6841ea] uppercase tracking-wider">{fecha}</h4>
                    <div className="flex-1 h-px bg-gradient-to-r from-[#6841ea]/30 to-transparent" />
                    <span className="text-[8px] bg-[#1a1a1a] text-gray-500 px-1.5 py-0.5 rounded-full">
                      {acts.length} {acts.length === 1 ? 'actividad' : 'actividades'}
                    </span>
                  </div>

                  {acts.map((act) => {
                    const indexGlobal = obtenerIndiceGlobal(act);
                    const esPasada = indexGlobal < actividadActual;
                    const esActual = indexGlobal === actividadActual;
                    const esFutura = indexGlobal > actividadActual;
                    const tieneResumen = modoLectura === 'planeado' 
                      ? act.resumenPlaneado?.texto 
                      : act.resumenEjecutado?.texto;

                    return (
                      <motion.div
                        key={act.actividadId}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: indexGlobal * 0.02 }}
                        onClick={() => irAActividad(indexGlobal)}
                        className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all duration-300 group border ${
                          esActual ? 'bg-[#6841ea]/20 border-[#6841ea]/50' : 'hover:bg-[#1a1a1a] border-transparent hover:border-[#2a2a2a]'
                        } ${!tieneResumen && !esActual ? 'opacity-40' : ''}`}
                      >
                        <div className="relative mt-1">
                          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            esActual ? 'bg-[#6841ea]' : esPasada ? 'bg-gray-600' : 'bg-gray-400'
                          }`} />
                          {esActual && <span className="absolute inset-0 rounded-full bg-[#6841ea] animate-ping opacity-75" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <p className={`text-xs font-medium truncate max-w-[100px] transition-all duration-300 ${
                              esPasada ? 'text-gray-500' : esActual ? 'text-white' : 'text-gray-300'
                            }`}>
                              {act.titulo}
                            </p>
                            <span className={`text-[8px] px-1 py-0.5 rounded-full whitespace-nowrap transition-all duration-300 ${
                              esPasada ? 'bg-gray-800 text-gray-500' : esActual ? 'bg-[#6841ea]/20 text-[#6841ea]' : 'bg-[#1a1a1a] text-gray-600'
                            }`}>
                              {esPasada ? 'Leída' : esActual ? 'Actual' : 'Pendiente'}
                            </span>
                          </div>
                          {act.horaInicio && (
                            <span className={`text-[8px] block mb-1 transition-all duration-300 ${
                              esPasada ? 'text-gray-600' : esActual ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {act.horaInicio.substring(0,5)} {act.horaFin && `- ${act.horaFin.substring(0,5)}`}
                            </span>
                          )}
                          {modoLectura === 'planeado' ? (
                            act.resumenPlaneado?.texto && (
                              <p className={`text-[8px] leading-tight line-clamp-2 mt-1 transition-all duration-300 ${
                                esPasada ? 'text-gray-600' : esActual ? 'text-gray-300' : 'text-gray-400'
                              }`}>
                                {act.resumenPlaneado.texto.substring(0, 80)}...
                              </p>
                            )
                          ) : (
                            act.resumenEjecutado?.texto && (
                              <p className={`text-[8px] leading-tight line-clamp-2 mt-1 transition-all duration-300 ${
                                esPasada ? 'text-gray-600' : esActual ? 'text-gray-300' : 'text-gray-400'
                              }`}>
                                {act.resumenEjecutado.texto.substring(0, 80)}...
                              </p>
                            )
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== COMPONENTE DE LECTURA DE ACTIVIDADES ====================
const LecturaActividades = ({ actividades }: { actividades: Actividad[] }) => {
  const [expandedActividad, setExpandedActividad] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {actividades.length === 0 ? (
        <div className="text-center py-8 text-white/30 text-sm">No hay actividades</div>
      ) : (
        actividades.map((actividad) => (
          <div key={actividad.actividadId} className="bg-white/[0.02] rounded-lg border border-white/5 overflow-hidden">
            <div
              onClick={() => setExpandedActividad(expandedActividad === actividad.actividadId ? null : actividad.actividadId)}
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  actividad.status === 'Completada' ? 'bg-green-400' :
                  actividad.status === 'En progreso' ? 'bg-yellow-400' : 'bg-gray-400'
                }`} />
                <div>
                  <h3 className="text-sm font-medium text-white/90">{actividad.titulo}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-white/40 mt-1">
                    <span>{actividad.fecha}</span>
                    {actividad.horaInicio && (
                      <>
                        <span>•</span>
                        <span>{actividad.horaInicio.substring(0,5)}-{actividad.horaFin?.substring(0,5)}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{actividad.totalTareas} tareas</span>
                    {actividad.tareasConExplicacion > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-indigo-400">{actividad.tareasConExplicacion} IA</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {expandedActividad === actividad.actividadId ? 
                  <ChevronUp className="w-4 h-4 text-white/40" /> : 
                  <ChevronDown className="w-4 h-4 text-white/40" />
                }
              </div>
            </div>

            <AnimatePresence>
              {expandedActividad === actividad.actividadId && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-white/5"
                >
                  <div className="p-3 space-y-2 bg-white/[0.01]">
                    {actividad.tareas.map((tarea, index) => (
                      <div key={tarea.pendienteId} className="space-y-1">
                        <div className="flex items-center gap-1.5 px-2">
                          <span className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-medium ${
                            tarea.terminada ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="text-[11px] font-medium text-white/80 truncate max-w-[200px]">{tarea.nombre}</span>
                          {tarea.prioridad && (
                            <span className={`text-[7px] px-1 py-0.5 rounded ${
                              tarea.prioridad === 'ALTA' ? 'bg-red-500/10 text-red-400' :
                              tarea.prioridad === 'MEDIA' ? 'bg-yellow-500/10 text-yellow-400' :
                              'bg-blue-500/10 text-blue-400'
                            }`}>
                              {tarea.prioridad}
                            </span>
                          )}
                          {tarea.duracionMin > 0 && (
                            <span className="text-[7px] text-white/40 flex items-center gap-0.5 ml-auto">
                              <Clock className="w-2.5 h-2.5" />
                              {tarea.duracionMin}min
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pl-6">
                          <div className="bg-white/[0.02] rounded-md p-2 border border-white/5">
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-[8px] font-medium text-white/40 uppercase tracking-wider">QUE SE HARÁ</span>
                            </div>
                            <p className="text-[10px] text-white/60 leading-relaxed line-clamp-3">
                              {tarea.descripcion || "Sin descripción"}
                            </p>
                            {tarea.descripcion && tarea.descripcion.includes('(por') && (
                              <p className="text-[7px] text-white/30 mt-1">
                                {tarea.descripcion.split('(por')[1]?.replace(')', '')}
                              </p>
                            )}
                          </div>

                          <div className={`rounded-md p-2 border ${
                            tarea.explicacionActual 
                              ? 'bg-indigo-500/[0.02] border-indigo-500/20' 
                              : 'bg-white/[0.01] border-white/5'
                          }`}>
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-[8px] font-medium text-white/40 uppercase tracking-wider">QUE SE HIZO</span>
                              {tarea.explicacionActual && <Brain className="w-2.5 h-2.5 text-indigo-400/60" />}
                            </div>
                            {tarea.explicacionActual ? (
                              <>
                                <p className="text-[10px] text-white/70 leading-relaxed line-clamp-3">
                                  {tarea.explicacionActual.texto}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                  <div className="flex items-center gap-1 text-[6px]">
                                    <span className="text-white/40">
                                      {tarea.explicacionActual.email?.split('@')[0]}
                                    </span>
                                    <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
                                    <span className="text-white/40">
                                      {new Date(tarea.explicacionActual.fecha).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <p className="text-[10px] text-white/30 italic">Sin registro</p>
                            )}
                          </div>
                        </div>

                        {index < actividad.tareas.length - 1 && (
                          <div className="border-t border-white/5 my-2" />
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))
      )}
    </div>
  );
};

// ==================== COMPONENTE PRINCIPAL ====================
export default function PanelAdminActividades() {
  const { toast } = useToast();
  const router = useRouter();

  const {
    actividades,
    loading,
    error,
    refreshing,
    totalActividades,
    totalTareas,
    cargarActividades,
  } = useActividadesData();

  // Estados de filtros
  const [filtroColaborador, setFiltroColaborador] = useState<string>("todos");
  const [busquedaColaborador, setBusquedaColaborador] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busquedaTexto, setBusquedaTexto] = useState<string>("");
  const [filtroTareasConIA, setFiltroTareasConIA] = useState<boolean>(false);
  const [filtroFecha, setFiltroFecha] = useState<string>("hoy");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [fechaExacta, setFechaExacta] = useState<string>("");
  const [ordenarPor, setOrdenarPor] = useState<string>("fecha");
  const [ordenAsc, setOrdenAsc] = useState<boolean>(false);
  const [actividadSeleccionada, setActividadSeleccionada] = useState<Actividad | null>(null);
  const [modalLecturaAbierto, setModalLecturaAbierto] = useState(false);
  const [modalLecturaVivoAbierto, setModalLecturaVivoAbierto] = useState(false);
  const [modalLecturaResumenesAbierto, setModalLecturaResumenesAbierto] = useState(false);
  const [actividadParaLectura, setActividadParaLectura] = useState<Actividad | null>(null);
  const [tareasParaLectura, setTareasParaLectura] = useState<Tarea[]>([]);
  const [actividadResumenSeleccionada, setActividadResumenSeleccionada] = useState<string | null>(null);
  const [tabActivo, setTabActivo] = useState<"colaboradores" | "actividades">("colaboradores");

  const fechaActual = new Date().toISOString().split("T")[0];

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: "Sesión cerrada", description: "Hasta pronto", duration: 2000 });
    } catch (error) {
      console.error("Error al cerrar sesion:", error);
      toast({ title: "Error al cerrar sesión", description: "Intenta nuevamente", variant: "destructive", duration: 3000 });
    } finally {
      localStorage.removeItem("colaborador");
      localStorage.removeItem("actividades");
      router.push("/");
    }
  };

  const abrirConfirmacionLectura = (actividad: Actividad) => {
    const tareasConExplicacion = actividad.tareas.filter(t => t.tieneExplicacion === true);
    if (tareasConExplicacion.length === 0) {
      toast({ title: "No hay tareas para leer", description: "Esta actividad no tiene tareas con explicaciones", variant: "destructive", duration: 3000 });
      return;
    }
    setActividadParaLectura(actividad);
    setTareasParaLectura(tareasConExplicacion);
    setModalLecturaAbierto(true);
    toast({ title: "Preparando lectura", description: `Se encontraron ${tareasConExplicacion.length} tareas con explicaciones`, duration: 3000 });
  };

  const iniciarLecturaGlobal = () => {
    const actividadesFiltradasActuales = actividadesFiltradas;
    if (actividadesFiltradasActuales.length === 0) {
      toast({ title: "No hay actividades", description: "No se encontraron actividades con los filtros actuales", variant: "destructive", duration: 3000 });
      return;
    }
    const tareasConExplicacion = actividadesFiltradasActuales.flatMap(act =>
      act.tareas.filter(t => t.tieneExplicacion === true)
    );
    if (tareasConExplicacion.length === 0) {
      toast({ title: "No hay tareas para leer", description: "No se encontraron tareas con explicaciones", variant: "destructive", duration: 3000 });
      return;
    }
    setModalLecturaAbierto(false);
    setTareasParaLectura(tareasConExplicacion);
    setTimeout(() => { setModalLecturaVivoAbierto(true); }, 100);
    toast({ title: "Iniciando lectura", description: `Se leerán ${tareasConExplicacion.length} tareas`, duration: 3000 });
  };

  const iniciarLecturaResumenes = () => {
    setActividadResumenSeleccionada(null);
    setModalLecturaResumenesAbierto(true);
    toast({ title: "Iniciando lectura de resúmenes", description: "Cargando todos los resúmenes...", duration: 3000 });
  };

  const iniciarLecturaResumenActividad = (actividad: Actividad) => {
    if (!actividad.resumenPlaneado?.texto && !actividad.resumenEjecutado?.texto) {
      toast({
        title: "No hay resúmenes disponibles",
        description: "Esta actividad no tiene resúmenes generados",
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    setActividadResumenSeleccionada(actividad.actividadId);
    setModalLecturaResumenesAbierto(true);
    toast({ title: "Leyendo resúmenes", description: actividad.titulo, duration: 3000 });
  };

  const iniciarLecturaConfirmada = (tareasSeleccionadas: Tarea[]) => {
    setModalLecturaAbierto(false);
    setTareasParaLectura(tareasSeleccionadas);
    setTimeout(() => { setModalLecturaVivoAbierto(true); }, 100);
    toast({ title: "Lectura iniciada", description: `Comenzando con ${tareasSeleccionadas.length} tarea${tareasSeleccionadas.length !== 1 ? 's' : ''}`, duration: 3000 });
  };

  const colaboradoresUnicos = useMemo(() => {
    if (!actividades) return [];
    const colaboradores = new Set<string>();
    actividades.forEach(act => {
      act.colaboradores?.forEach((email: string) => {
        if (email && email !== "Sin colaborador") {
          colaboradores.add(email);
        }
      });
    });
    return Array.from(colaboradores).sort();
  }, [actividades]);

  const statusUnicos = useMemo(() => {
    if (!actividades) return [];
    const status = new Set(actividades.map(a => a.status).filter(Boolean));
    return Array.from(status).sort();
  }, [actividades]);

  const actividadesFiltradas = useMemo(() => {
    if (!actividades) return [];
    return actividades.filter(act => {
      if (filtroColaborador !== "todos") {
        if (!act.colaboradores?.includes(filtroColaborador)) return false;
      }
      if (filtroStatus !== "todos" && act.status !== filtroStatus) return false;
      if (busquedaTexto) {
        const t = busquedaTexto.toLowerCase();
        if (!act.titulo.toLowerCase().includes(t) &&
          !act.tareas.some(ta =>
            ta.nombre.toLowerCase().includes(t) ||
            (ta.descripcion && ta.descripcion.toLowerCase().includes(t)) ||
            (ta.explicacionActual?.texto.toLowerCase().includes(t))
          )) return false;
      }
      if (filtroTareasConIA) {
        if (act.tareasConExplicacion === 0) return false;
      }
      if (filtroFecha === "exacta" && fechaExacta) {
        if (act.fecha !== fechaExacta) return false;
      } else {
        const fechaAct = new Date(act.fecha);
        switch (filtroFecha) {
          case "hoy":
            if (act.fecha !== fechaActual) return false;
            break;
          case "ayer":
            if (act.fecha !== obtenerFechaPorDias(1)) return false;
            break;
          case "ultima_semana": {
            const semanaPasada = new Date();
            semanaPasada.setDate(semanaPasada.getDate() - 7);
            if (fechaAct < semanaPasada) return false;
            break;
          }
          case "ultimo_mes": {
            const mesPasado = new Date();
            mesPasado.setDate(mesPasado.getDate() - 30);
            if (fechaAct < mesPasado) return false;
            break;
          }
          case "rango":
            if (fechaInicio && act.fecha < fechaInicio) return false;
            if (fechaFin && act.fecha > fechaFin) return false;
            break;
          case "todos":
          default:
            break;
        }
      }
      return true;
    });
  }, [actividades, filtroColaborador, filtroStatus, busquedaTexto, filtroTareasConIA, filtroFecha, fechaExacta, fechaInicio, fechaFin, fechaActual]);

  const actividadesOrdenadas = useMemo(() => {
    return [...actividadesFiltradas].sort((a, b) => {
      let cmp = 0;
      if (ordenarPor === "fecha") cmp = a.fecha.localeCompare(b.fecha);
      else if (ordenarPor === "titulo") cmp = a.titulo.localeCompare(b.titulo);
      else if (ordenarPor === "tareas") cmp = (a.totalTareas || 0) - (b.totalTareas || 0);
      else if (ordenarPor === "explicaciones") cmp = (a.tareasConExplicacion || 0) - (b.tareasConExplicacion || 0);
      return ordenAsc ? cmp : -cmp;
    });
  }, [actividadesFiltradas, ordenarPor, ordenAsc]);

  const limpiarFiltrosTab = () => {
    switch(tabActivo) {
      case "colaboradores":
        setFiltroColaborador("todos");
        setBusquedaColaborador("");
        setFiltroFecha("hoy");
        setFechaInicio("");
        setFechaFin("");
        setFechaExacta("");
        break;
      case "actividades":
        setFiltroStatus("todos");
        setBusquedaTexto("");
        setFiltroTareasConIA(false);
        break;
    }
    toast({ title: "Filtros limpiados", description: `Filtros de ${tabActivo} restablecidos`, duration: 2000 });
  };

  const limpiarTodosLosFiltros = () => {
    setFiltroColaborador("todos");
    setBusquedaColaborador("");
    setFiltroStatus("todos");
    setBusquedaTexto("");
    setFiltroTareasConIA(false);
    setFiltroFecha("hoy");
    setFechaInicio("");
    setFechaFin("");
    setFechaExacta("");
    toast({ title: "Todos los filtros limpiados", description: "Filtros restablecidos", duration: 2000 });
  };

  const volverALista = () => {
    setActividadSeleccionada(null);
  };

  if (loading) return <LoadingScreen />;
  if (error || !actividades) return <ErrorScreen onRetry={() => cargarActividades(true)} />;

  return (
    <div className="min-h-screen bg-[#222121] font-sans antialiased">
      <ModalConfirmacionLectura
        isOpen={modalLecturaAbierto}
        onClose={() => setModalLecturaAbierto(false)}
        onConfirm={iniciarLecturaConfirmada}
        actividad={actividadParaLectura}
        tareas={tareasParaLectura}
      />

      <ModalLecturaTareas
        isOpen={modalLecturaVivoAbierto}
        onClose={() => setModalLecturaVivoAbierto(false)}
        tareas={tareasParaLectura}
        onCompletado={() => {
          toast({ title: "Lectura completada", description: "Todas las tareas han sido leídas", duration: 4000 });
        }}
      />

      <ModalLecturaResumenes
        isOpen={modalLecturaResumenesAbierto}
        onClose={() => {
          setModalLecturaResumenesAbierto(false);
          setActividadResumenSeleccionada(null);
        }}
        actividadId={actividadResumenSeleccionada}
      />

      <header className="sticky top-0 z-40 bg-[#0a0a0a]/10 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold text-sm">A</span>
              </div>
              <div>
                <h1 className="text-sm font-medium text-white/90">Panel de Actividades</h1>
                <p className="text-xs text-white/40">
                  {actividadesFiltradas.length} actividades · {totalTareas} tareas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={iniciarLecturaResumenes}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors border border-purple-500/20"
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Resúmenes IA</span>
                {actividades.filter(act => act.resumenPlaneado?.texto || act.resumenEjecutado?.texto).length > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 rounded-full">
                    {actividades.filter(act => act.resumenPlaneado?.texto || act.resumenEjecutado?.texto).length}
                  </span>
                )}
              </button>

              <button
                onClick={iniciarLecturaGlobal}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors border border-indigo-500/20"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Leer reportes</span>
                {actividadesFiltradas.flatMap(act => act.tareas).filter(t => t.tieneExplicacion === true).length > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-indigo-500/20 text-indigo-300 rounded-full">
                    {actividadesFiltradas.flatMap(act => act.tareas).filter(t => t.tieneExplicacion === true).length}
                  </span>
                )}
              </button>

              <button
                onClick={() => cargarActividades(true)}
                disabled={refreshing}
                className="p-1.5 text-white/40 hover:text-white/60 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleLogout}
                className="p-1.5 text-red-400/40 hover:text-red-400/60 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          <aside className="w-80 bg-[#1a1a1a] p-4 rounded-2xl flex-shrink-0">
            <div className="flex border-b border-white/5 mb-5">
              <button
                onClick={() => setTabActivo("colaboradores")}
                className={`flex-1 pb-2 text-xs font-medium transition-colors relative ${tabActivo === "colaboradores" ? "text-indigo-400" : "text-white/40 hover:text-white/60"}`}
              >
                Colaboradores
                {tabActivo === "colaboradores" && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400" initial={false} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                )}
              </button>
              <button
                onClick={() => setTabActivo("actividades")}
                className={`flex-1 pb-2 text-xs font-medium transition-colors relative ${tabActivo === "actividades" ? "text-indigo-400" : "text-white/40 hover:text-white/60"}`}
              >
                Actividades
                {tabActivo === "actividades" && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400" initial={false} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                )}
              </button>
            </div>

            {tabActivo === "colaboradores" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-white/40" />
                    <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider">Colaboradores</h2>
                  </div>
                  <span className="text-[10px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full">{colaboradoresUnicos.length}</span>
                </div>

                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                  <input
                    type="text"
                    placeholder="Buscar colaborador..."
                    value={busquedaColaborador}
                    onChange={(e) => setBusquedaColaborador(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white/5 rounded-lg text-white/60 placeholder:text-white/20 focus:outline-none focus:bg-white/10 transition-colors"
                  />
                </div>

                <button
                  onClick={() => setFiltroColaborador('todos')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${filtroColaborador === 'todos' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}
                >
                  <div className="w-7 h-7 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">Todos</p>
                    <p className="text-[10px] text-white/30">{actividades.length} actividades</p>
                  </div>
                  {filtroColaborador === 'todos' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </button>

                <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                  {colaboradoresUnicos
                    .filter(email => email.toLowerCase().includes(busquedaColaborador.toLowerCase()))
                    .map(email => {
                      const actividadesColaborador = actividades.filter(act => act.colaboradores?.includes(email));
                      const totalTareasColab = actividadesColaborador.reduce((acc, act) => acc + act.tareasConExplicacion, 0);
                      const inicial = email.charAt(0).toUpperCase();
                      const colorClasses = [
                        'from-blue-500/20 to-cyan-500/20 text-blue-400',
                        'from-green-500/20 to-emerald-500/20 text-green-400',
                        'from-orange-500/20 to-amber-500/20 text-orange-400',
                        'from-pink-500/20 to-rose-500/20 text-pink-400',
                        'from-purple-500/20 to-indigo-500/20 text-purple-400',
                      ];
                      const colorIndex = email.length % colorClasses.length;
                      return (
                        <button
                          key={email}
                          onClick={() => setFiltroColaborador(email)}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all group ${filtroColaborador === email ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}
                        >
                          <div className={`w-6 h-6 bg-gradient-to-br ${colorClasses[colorIndex]} rounded-lg flex items-center justify-center text-xs font-medium flex-shrink-0`}>
                            {inicial}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="text-xs font-medium truncate max-w-[70px]">{email.split('@')[0]}</p>
                              {totalTareasColab > 0 && (
                                <span className="px-1 py-0.5 text-[7px] bg-indigo-500/10 text-indigo-400 rounded-full">{totalTareasColab}</span>
                              )}
                            </div>
                            <p className="text-[8px] text-white/30 truncate">{actividadesColaborador.length} actividades</p>
                          </div>
                          {filtroColaborador === email && <Check className="w-3 h-3 text-indigo-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                </div>

                <div className="border-t border-white/5 my-2"></div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-white/60" />
                    <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">Filtrar por fecha</h3>
                  </div>
                  <div className="space-y-1">
                    {[
                      { value: 'hoy', label: 'Hoy', icon: Sun },
                      { value: 'ayer', label: 'Ayer', icon: Calendar },
                      { value: 'ultima_semana', label: 'Última semana', icon: CalendarDays },
                      { value: 'ultimo_mes', label: 'Último mes', icon: CalendarRange },
                      { value: 'todos', label: 'Todas las fechas', icon: HistoryIcon }
                    ].map((opcion) => {
                      const Icono = opcion.icon;
                      return (
                        <button
                          key={opcion.value}
                          onClick={() => { setFiltroFecha(opcion.value); setFechaExacta(""); }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${filtroFecha === opcion.value ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}
                        >
                          <Icono className="w-3.5 h-3.5" />
                          <span className="text-sm">{opcion.label}</span>
                          {filtroFecha === opcion.value && <Check className="w-3.5 h-3.5 text-indigo-400 ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <h4 className="text-xs font-medium text-white/40 mb-2">Fecha exacta</h4>
                    <input
                      type="date"
                      value={fechaExacta}
                      onChange={(e) => { setFechaExacta(e.target.value); setFiltroFecha("exacta"); }}
                      className="w-full px-3 py-2 text-xs bg-white/5 rounded-lg text-white/60 border border-white/10 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <h4 className="text-xs font-medium text-white/40 mb-2">Rango personalizado</h4>
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => { setFechaInicio(e.target.value); setFiltroFecha("rango"); setFechaExacta(""); }}
                        className="w-full px-3 py-2 text-xs bg-white/5 rounded-lg text-white/60 border border-white/10 focus:outline-none focus:border-indigo-500/50"
                      />
                      <input
                        type="date"
                        value={fechaFin}
                        onChange={(e) => { setFechaFin(e.target.value); setFiltroFecha("rango"); setFechaExacta(""); }}
                        className="w-full px-3 py-2 text-xs bg-white/5 rounded-lg text-white/60 border border-white/10 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tabActivo === "actividades" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-white/60" />
                    <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">Actividades</h3>
                  </div>
                  <span className="text-[10px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full">
                    {actividades.length}
                  </span>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                  <input
                    type="text"
                    placeholder="Buscar en actividades..."
                    value={busquedaTexto}
                    onChange={(e) => setBusquedaTexto(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white/5 rounded-lg text-white/60 placeholder:text-white/20 focus:outline-none focus:bg-white/10 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-white/40">Estado</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFiltroStatus('todos')}
                      className={`px-2 py-1 text-[10px] rounded-full transition-colors ${filtroStatus === 'todos' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                    >
                      Todos
                    </button>
                    {statusUnicos.map(status => (
                      <button
                        key={status}
                        onClick={() => setFiltroStatus(status)}
                        className={`px-2 py-1 text-[10px] rounded-full transition-colors ${filtroStatus === status ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-white/40">Solo con explicaciones IA</span>
                  <button
                    onClick={() => setFiltroTareasConIA(!filtroTareasConIA)}
                    className={`relative w-8 h-4 rounded-full transition-colors ${filtroTareasConIA ? 'bg-indigo-500' : 'bg-white/20'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${filtroTareasConIA ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <button
                onClick={limpiarFiltrosTab}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-white/40 hover:text-white/60 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar filtros de {tabActivo}
              </button>
              <button
                onClick={limpiarTodosLosFiltros}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-red-400/40 hover:text-red-400/60 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar todos los filtros
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">Actividades filtradas</h3>
                <span className="text-[10px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full">{actividadesFiltradas.length}</span>
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {actividadesOrdenadas.map((act) => (
                  <button
                    key={act.actividadId}
                    onClick={() => setActividadSeleccionada(act)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${actividadSeleccionada?.actividadId === act.actividadId ? 'bg-indigo-500/20 border border-indigo-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${act.status === 'Completada' ? 'bg-green-400' : act.status === 'En progreso' ? 'bg-yellow-400' : 'bg-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/90 truncate">{act.titulo}</p>
                        <div className="flex items-center gap-2 text-[10px] text-white/40 mt-1">
                          <span>{act.fecha}</span>
                          {act.horaInicio && <><span>•</span><span>{act.horaInicio.substring(0,5)}</span></>}
                          <span>•</span>
                          <span>{act.totalTareas} tareas</span>
                          {act.tareasConExplicacion > 0 && <><span>•</span><span className="text-indigo-400">{act.tareasConExplicacion} IA</span></>}
                        </div>
                        {act.colaboradores && act.colaboradores.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Users className="w-3 h-3 text-white/30" />
                            <span className="text-[8px] text-white/30 truncate">
                              {act.colaboradores.map(e => e.split('@')[0]).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                {actividadesFiltradas.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-xs text-white/30">No hay actividades con los filtros actuales</p>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <main className="flex-1">
            <AnimatePresence mode="wait">
              {actividadSeleccionada ? (
                <motion.div
                  key="detalle"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <button onClick={volverALista} className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors">
                      <ArrowLeft className="w-4 h-4" />
                      Volver a lista
                    </button>
                    <div className="flex items-center gap-2">
                      {(actividadSeleccionada.resumenPlaneado?.texto || actividadSeleccionada.resumenEjecutado?.texto) && (
                        <button
                          onClick={() => iniciarLecturaResumenActividad(actividadSeleccionada)}
                          className="p-1.5 text-purple-400/60 hover:text-purple-400 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          title="Leer resúmenes IA"
                        >
                          <Brain className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => abrirConfirmacionLectura(actividadSeleccionada)}
                        disabled={actividadSeleccionada.tareasConExplicacion === 0}
                        className={`p-1.5 rounded-lg transition-colors ${actividadSeleccionada.tareasConExplicacion > 0 ? 'text-indigo-400/60 hover:text-indigo-400 bg-white/5 hover:bg-white/10' : 'text-white/10 cursor-not-allowed'}`}
                        title="Leer tareas con explicación"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] rounded-xl p-6 border border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-3 h-3 rounded-full ${actividadSeleccionada.status === 'Completada' ? 'bg-green-400' : actividadSeleccionada.status === 'En progreso' ? 'bg-yellow-400' : 'bg-gray-400'}`} />
                      <span className="text-xs text-white/40">{actividadSeleccionada.fecha}</span>
                      {actividadSeleccionada.horaInicio && (
                        <>
                          <span className="text-xs text-white/20">•</span>
                          <span className="text-xs text-white/40">
                            {actividadSeleccionada.horaInicio.substring(0,5)}
                            {actividadSeleccionada.horaFin && ` - ${actividadSeleccionada.horaFin.substring(0,5)}`}
                          </span>
                        </>
                      )}
                    </div>

                    <h2 className="text-xl font-semibold text-white/90 mb-4">{actividadSeleccionada.titulo}</h2>

                    {(actividadSeleccionada.resumenPlaneado?.texto || actividadSeleccionada.resumenEjecutado?.texto) && (
                      <div className="mb-6 p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-4 h-4 text-purple-400" />
                          <h3 className="text-xs font-medium text-purple-400 uppercase tracking-wider">Resúmenes IA</h3>
                        </div>
                        {actividadSeleccionada.resumenPlaneado?.texto && (
                          <div className="mb-3">
                            <p className="text-[10px] text-amber-400 mb-1">QUE SE PLANEÓ:</p>
                            <p className="text-sm text-white/70 leading-relaxed">{actividadSeleccionada.resumenPlaneado.texto}</p>
                          </div>
                        )}
                        {actividadSeleccionada.resumenEjecutado?.texto && (
                          <div>
                            <p className="text-[10px] text-indigo-400 mb-1">QUE SE HIZO:</p>
                            <p className="text-sm text-white/70 leading-relaxed">{actividadSeleccionada.resumenEjecutado.texto}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">
                      Tareas ({actividadSeleccionada.tareas.length})
                    </h3>

                    <div className="space-y-3">
                      {actividadSeleccionada.tareas.map((tarea, index) => (
                        <motion.div
                          key={tarea.pendienteId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-white/[0.02] rounded-lg p-4 border border-white/5 hover:border-white/10 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-medium ${tarea.terminada ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-white/90">{tarea.nombre}</span>
                                {tarea.prioridad && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${tarea.prioridad === 'ALTA' ? 'bg-red-500/10 text-red-400' :
                                    tarea.prioridad === 'MEDIA' ? 'bg-yellow-500/10 text-yellow-400' :
                                    'bg-blue-500/10 text-blue-400'}`}>
                                    {tarea.prioridad}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-white/30 mb-2">
                                {tarea.duracionMin > 0 && (
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tarea.duracionMin} min</span>
                                )}
                                <span className={tarea.terminada ? 'text-green-400/60' : 'text-yellow-400/60'}>
                                  {tarea.terminada ? 'Completada' : 'Pendiente'}
                                </span>
                              </div>
                              {tarea.explicacionActual && (
                                <div className="mt-3 pt-3 border-t border-white/5">
                                  <p className="text-xs text-white/60 leading-relaxed">{tarea.explicacionActual.texto}</p>
                                  <div className="flex items-center gap-2 mt-2 text-[10px]">
                                    <span className="text-white/30">{tarea.explicacionActual.email?.split('@')[0]}</span>
                                    <span className="w-1 h-1 rounded-full bg-white/20" />
                                    <span className="text-white/30">{new Date(tarea.explicacionActual.fecha).toLocaleDateString()}</span>
                                    <Brain className="w-2.5 h-2.5 text-indigo-400/40 ml-auto" />
                                  </div>
                                </div>
                              )}
                            </div>
                            {tarea.explicacionActual && (
                              <button
                                onClick={(e) => { e.stopPropagation(); iniciarLecturaConfirmada([tarea]); }}
                                className="p-1.5 text-indigo-400/40 hover:text-indigo-400 rounded-lg transition-colors"
                                title="Leer esta tarea"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {actividadSeleccionada.colaboradores && actividadSeleccionada.colaboradores.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-white/5">
                        <h4 className="text-xs font-medium text-white/40 mb-2">Colaboradores</h4>
                        <div className="flex flex-wrap gap-2">
                          {actividadSeleccionada.colaboradores.map((email, i) => (
                            <div key={i} className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg text-xs text-white/60">
                              <Users className="w-3 h-3" />
                              {email.split('@')[0]}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="lectura"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full"
                >
                  <LecturaActividades actividades={actividadesOrdenadas} />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}