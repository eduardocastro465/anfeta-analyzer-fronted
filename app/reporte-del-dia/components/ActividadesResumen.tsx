// components/ActividadesResumen.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  UserCheck,
  UserX,
  Briefcase,
  Volume2,
  Play,
  X,
  PauseCircle,
  StopCircle,
  RotateCcw,
  Settings,
  VolumeX,
  Brain
} from "lucide-react";

// Interfaces (se mantienen igual)
interface Actividad {
  actividadId: string;
  titulo: string;
  proyecto: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  status: string;
  colaboradores: string[];
  totalColaboradores: number;
  usuarios: Array<{
    email: string;
    nombre: string;
  }>;
  totalTareas: number;
  tareasConExplicacion: number;
  tareasSinExplicacion: number;
  tareasCompletadas: number;
  tiempoEstimadoTotal: number;
  resumenEjecutivo: {
    texto: string;
    provider?: string;
    tipo: string;
    estadisticas?: {
      totalTareas: number;
      tareasConReportes: number;
      tareasCompletadas: number;
      reportesManana: number;
      reportesTarde: number;
    };
  };
}

interface ApiResponse {
  success: boolean;
  metadata: {
    totalActividadesUnicas: number;
    totalDocumentos: number;
    totalTareas: number;
    fechaGeneracion: string;
  };
  actividades: Actividad[];
}

// Hook personalizado para síntesis de voz (se mantiene igual)
const useSpeechSynthesis = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voces, setVoces] = useState<SpeechSynthesisVoice[]>([]);
  const [vozSeleccionada, setVozSeleccionada] = useState<string>("");
  
  const synthesisRef = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!window.speechSynthesis) {
        setIsSupported(false);
        setError("Tu navegador no soporta síntesis de voz.");
      } else {
        const cargarVoces = () => {
          const vocesDisponibles = window.speechSynthesis.getVoices();
          setVoces(vocesDisponibles);
             
          const vozEspanol = vocesDisponibles.find(v => 
            v.lang.includes('es') || v.lang.includes('ES')
          );
          if (vozEspanol) {
            setVozSeleccionada(vozEspanol.name);
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
    if (!synthesisRef || !isSupported) {
      setError("Síntesis de voz no disponible");
      return false;
    }

    detener();

    try {
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'es-ES';
      utterance.rate = velocidad;
      utterance.volume = 1;
      utterance.pitch = 1;

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
      synthesisRef.speak(utterance);
      return true;
    } catch (err) {
      console.error('Error al iniciar síntesis:', err);
      setError("Error al iniciar la reproducción");
      return false;
    }
  };

  const pausar = () => {
    if (synthesisRef && isSpeaking) {
      synthesisRef.pause();
      return true;
    }
    return false;
  };

  const reanudar = () => {
    if (synthesisRef && isSpeaking) {
      synthesisRef.resume();
      return true;
    }
    return false;
  };

  const detener = () => {
    if (synthesisRef) {
      synthesisRef.cancel();
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

// Modal de lectura en vivo - VERSIÓN OSCURA
const ModalLecturaVivo = ({ 
  isOpen, 
  onClose, 
  textos,
  titulo
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  textos: string[];
  titulo: string;
}) => {
  const [textoActual, setTextoActual] = useState(0);
  const [velocidad, setVelocidad] = useState(1);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  
  const speech = useSpeechSynthesis();

  useEffect(() => {
    if (isOpen && textos.length > 0 && !speech.isSpeaking) {
      speech.hablar(textos[textoActual], velocidad);
    }
  }, [textoActual, isOpen, textos]);

  if (!isOpen) return null;
  
  if (textos.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
        <div className="bg-[#1a1a1a] rounded-lg border border-[#333333] shadow-2xl w-full max-w-md p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No hay textos para leer</h3>
            <Button onClick={onClose} className="mt-4 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white">
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const progreso = ((textoActual + 1) / textos.length) * 100;

  const pausarReanudar = () => {
    if (speech.isPaused) {
      speech.reanudar();
    } else if (speech.isSpeaking) {
      speech.pausar();
    }
  };

  const detenerLectura = () => {
    speech.detener();
  };

  const siguienteTexto = () => {
    speech.detener();
    
    if (textoActual < textos.length - 1) {
      setTextoActual(textoActual + 1);
    } else {
      onClose();
    }
  };

  const textoAnterior = () => {
    if (textoActual > 0) {
      speech.detener();
      setTextoActual(textoActual - 1);
    }
  };

  const repetirTexto = () => {
    speech.detener();
    speech.hablar(textos[textoActual], velocidad);
  };

  const cambiarVelocidad = (nuevaVelocidad: number) => {
    setVelocidad(nuevaVelocidad);
    if (speech.isSpeaking) {
      repetirTexto();
    }
  };

  if (!speech.isSupported) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
        <div className="bg-[#1a1a1a] rounded-lg border border-[#333333] shadow-2xl w-full max-w-md p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Navegador no compatible</h3>
            <p className="text-sm text-gray-400 mb-4">
              {speech.error || "Tu navegador no soporta síntesis de voz."}
            </p>
            <Button onClick={onClose} className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white">
              Entendido
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
      <div className="bg-[#1a1a1a] rounded-lg border border-[#333333] shadow-2xl w-full max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#333333]">
          <div className="flex items-center gap-4">
            <div className={`p-2 ${speech.isSpeaking ? 'bg-[#8b5cf6]/20' : 'bg-[#333333]'} rounded-lg`}>
              <Volume2 className={`w-5 h-5 ${speech.isSpeaking ? 'text-[#8b5cf6]' : 'text-gray-400'}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {titulo}
              </h2>
              <p className="text-sm text-gray-400">
                Texto {textoActual + 1} de {textos.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarConfig(!mostrarConfig)}
              className="p-1 hover:bg-[#333333] rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#333333] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="h-1 bg-[#333333]">
          <div 
            className="h-full bg-[#8b5cf6] transition-all duration-300"
            style={{ width: `${progreso}%` }}
          />
        </div>

        {/* Configuración */}
        {mostrarConfig && (
          <div className="p-5 border-b border-[#333333] bg-[#222222]">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Configuración de voz</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Velocidad</label>
                <div className="flex items-center gap-2">
                  <VolumeX className="w-4 h-4 text-gray-500" />
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={velocidad}
                    onChange={(e) => cambiarVelocidad(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-[#333333] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#8b5cf6] [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <Volume2 className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-300 w-12">{velocidad.toFixed(1)}x</span>
                </div>
              </div>

              {speech.voces.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Voz</label>
                  <select
                    value={speech.vozSeleccionada}
                    onChange={(e) => speech.cambiarVoz(e.target.value)}
                    className="w-full h-9 text-sm bg-[#333333] border border-[#444444] rounded-lg px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] focus:border-transparent"
                  >
                    {speech.voces.map((voz) => (
                      <option key={voz.name} value={voz.name}>
                        {voz.name} ({voz.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contenido principal */}
        <div className="p-5 space-y-4">
          {/* Texto actual */}
          <div className="bg-[#222222] border border-[#333333] rounded-lg p-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">TEXTO ACTUAL</h3>
            <p className="text-base text-gray-300 leading-relaxed">
              {textos[textoActual]}
            </p>
          </div>

          {/* Estado */}
          <div className="bg-[#222222] border border-[#333333] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">ESTADO</span>
              {speech.isSpeaking && !speech.isPaused && (
                <span className="flex items-center gap-2 text-xs text-[#8b5cf6]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8b5cf6] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8b5cf6]"></span>
                  </span>
                  Leyendo...
                </span>
              )}
              {speech.isPaused && (
                <span className="text-xs text-yellow-500">Pausado</span>
              )}
            </div>
            <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-3 min-h-[60px]">
              <p className="text-sm text-gray-400">
                {speech.isSpeaking 
                  ? (speech.isPaused ? "Lectura pausada" : "Hablando...") 
                  : "Listo para leer"}
              </p>
            </div>
          </div>

          {/* Error */}
          {speech.error && (
            <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3">
              <p className="text-xs text-red-400 text-center">{speech.error}</p>
            </div>
          )}

          {/* Controles */}
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={textoAnterior}
              disabled={textoActual === 0}
              variant="outline-dark"
              className="h-10 px-4 text-gray-300 border-[#444444] hover:bg-[#333333] disabled:opacity-50"
            >
              ← Anterior
            </Button>

            <Button
              onClick={repetirTexto}
              variant="outline-dark"
              className="h-10 w-10 p-0 text-gray-300 border-[#444444] hover:bg-[#333333]"
              title="Repetir texto actual"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <Button
              onClick={pausarReanudar}
              disabled={!speech.isSpeaking}
              variant="outline-dark"
              className="h-10 w-10 p-0 text-gray-300 border-[#444444] hover:bg-[#333333] disabled:opacity-50"
            >
              {speech.isPaused ? <Play className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
            </Button>

            <Button
              onClick={detenerLectura}
              disabled={!speech.isSpeaking}
              variant="outline-dark"
              className="h-10 w-10 p-0 text-gray-300 border-[#444444] hover:bg-[#333333] disabled:opacity-50"
            >
              <StopCircle className="w-4 h-4" />
            </Button>

            <Button
              onClick={siguienteTexto}
              variant="outline-dark"
              className="h-10 px-4 text-gray-300 border-[#444444] hover:bg-[#333333]"
            >
              {textoActual < textos.length - 1 ? 'Siguiente →' : 'Finalizar'}
            </Button>
          </div>

          {/* Presets de velocidad */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {[0.75, 1, 1.25, 1.5].map((v) => (
              <button
                key={v}
                onClick={() => cambiarVelocidad(v)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  velocidad === v
                    ? 'bg-[#8b5cf6] text-white'
                    : 'bg-[#333333] text-gray-400 hover:bg-[#444444]'
                }`}
              >
                {v}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Button component reutilizable (actualizado con variante dark)
const Button = ({ children, className = "", variant = "default", ...props }: any) => {
  const baseStyle = "inline-flex items-center justify-center font-medium transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b5cf6] disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    default: "bg-[#8b5cf6] hover:bg-[#7c3aed] text-white",
    outline: "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700",
    "outline-dark": "border border-[#444444] bg-transparent hover:bg-[#333333] text-gray-300",
    ghost: "hover:bg-[#333333] text-gray-400"
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export function ActividadesResumen() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedActividades, setExpandedActividades] = useState<Set<string>>(new Set());
  const [filterColaborador, setFilterColaborador] = useState<string>("");
  const [filterProyecto, setFilterProyecto] = useState<string>("");
  const [ordenarPor, setOrdenarPor] = useState<"fecha" | "tareas" | "completadas">("fecha");
  
  // Estados para el modal de lectura
  const [modalLecturaAbierto, setModalLecturaAbierto] = useState(false);
  const [textosParaLectura, setTextosParaLectura] = useState<string[]>([]);
  const [tituloLectura, setTituloLectura] = useState("");

  const fetchActividades = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:4000/api/v1/admin/todas-actividades-resumen-ia", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar actividades");
      console.error("Error fetching actividades:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActividades();
  }, []);

  // Función para leer todos los resúmenes (existente)
  const leerTodosLosResumenes = () => {
    if (!data?.actividades) return;
    
    const textos = data.actividades
      .filter(act => act.resumenEjecutivo?.texto)
      .map(act => {
        const fecha = new Date(act.fecha).toLocaleDateString('es-MX');
        return `Actividad: ${act.titulo}. Fecha: ${fecha}. Colaboradores: ${act.colaboradores.join(', ')}. ${act.resumenEjecutivo.texto}`;
      });
    
    if (textos.length === 0) {
      alert("No hay resúmenes disponibles para leer");
      return;
    }
    
    setTextosParaLectura(textos);
    setTituloLectura(`Leyendo ${textos.length} resúmenes de actividades`);
    setModalLecturaAbierto(true);
  };

  // NUEVA FUNCIÓN: Leer resúmenes IA (versión morada)
  const leerResumenesIA = () => {
    if (!data?.actividades) return;
    
    const textos = data.actividades
      .filter(act => act.resumenEjecutivo?.texto)
      .map(act => {
        const fecha = new Date(act.fecha).toLocaleDateString('es-MX');
        return `Actividad: ${act.titulo}. Fecha: ${fecha}. Colaboradores: ${act.colaboradores.join(', ')}. ${act.resumenEjecutivo.texto}`;
      });
    
    if (textos.length === 0) {
      alert("No hay resúmenes IA disponibles para leer");
      return;
    }
    
    setTextosParaLectura(textos);
    setTituloLectura(`Resúmenes IA (${textos.length} actividades)`);
    setModalLecturaAbierto(true);
  };

  // Función para leer una actividad específica
  const leerActividad = (actividad: Actividad) => {
    if (!actividad.resumenEjecutivo?.texto) {
      alert("Esta actividad no tiene resumen disponible");
      return;
    }
    
    const fecha = new Date(actividad.fecha).toLocaleDateString('es-MX');
    const texto = `Actividad: ${actividad.titulo}. Fecha: ${fecha}. Colaboradores: ${actividad.colaboradores.join(', ')}. ${actividad.resumenEjecutivo.texto}`;
    
    setTextosParaLectura([texto]);
    setTituloLectura(actividad.titulo);
    setModalLecturaAbierto(true);
  };

  const toggleActividad = (actividadId: string) => {
    setExpandedActividades(prev => {
      const newSet = new Set(prev);
      if (newSet.has(actividadId)) {
        newSet.delete(actividadId);
      } else {
        newSet.add(actividadId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    if (data?.actividades) {
      setExpandedActividades(new Set(data.actividades.map(a => a.actividadId)));
    }
  };

  const collapseAll = () => {
    setExpandedActividades(new Set());
  };

  // Filtrar y ordenar actividades
  const actividadesFiltradas = data?.actividades
    .filter(act => {
      const matchesSearch = searchTerm === "" || 
        act.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        act.proyecto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        act.colaboradores.some(c => c.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (act.resumenEjecutivo?.texto?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      
      const matchesColaborador = filterColaborador === "" || 
        act.colaboradores.includes(filterColaborador);
      
      const matchesProyecto = filterProyecto === "" || 
        act.proyecto === filterProyecto;
      
      return matchesSearch && matchesColaborador && matchesProyecto;
    })
    .sort((a, b) => {
      if (ordenarPor === "fecha") {
        return b.fecha.localeCompare(a.fecha);
      } else if (ordenarPor === "tareas") {
        return b.totalTareas - a.totalTareas;
      } else {
        return (b.tareasCompletadas / b.totalTareas || 0) - (a.tareasCompletadas / a.totalTareas || 0);
      }
    }) || [];

  // Obtener colaboradores únicos para el filtro
  const todosColaboradores = [...new Set(
    data?.actividades.flatMap(a => a.colaboradores) || []
  )].sort();

  // Obtener proyectos únicos para el filtro
  const todosProyectos = [...new Set(
    data?.actividades.map(a => a.proyecto) || []
  )].sort();

  const formatTiempo = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-gray-200" />
          <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-t-transparent border-[#6841ea] animate-spin" />
        </div>
        <p className="mt-4 text-gray-600">Cargando actividades...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-red-700 mb-2">Error al cargar</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchActividades}
            className="px-4 py-2 bg-[#6841ea] text-white rounded-lg hover:bg-[#5a36d4] transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modal de lectura - VERSIÓN OSCURA */}
      <ModalLecturaVivo 
        isOpen={modalLecturaAbierto}
        onClose={() => setModalLecturaAbierto(false)}
        textos={textosParaLectura}
        titulo={tituloLectura}
      />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Resumen de Actividades
            </h1>
            <div className="flex items-center gap-2">
              {/* NUEVO BOTÓN MORADO PARA LEER RESÚMENES IA */}
              <button
                onClick={leerResumenesIA}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                title="Leer resúmenes IA"
              >
                <Brain className="w-4 h-4" />
                Leer resúmenes IA
                {data?.actividades && (
                  <span className="ml-1 bg-purple-500 px-2 py-0.5 rounded-full text-xs">
                    {data.actividades.filter(a => a.resumenEjecutivo?.texto).length}
                  </span>
                )}
              </button>

              {/* Botón existente (se mantiene) */}
              <button
                onClick={leerTodosLosResumenes}
                className="px-4 py-2 bg-[#6841ea] text-white rounded-lg hover:bg-[#7a4cf5] transition-colors flex items-center gap-2"
                title="Leer todos los resúmenes"
              >
                <Volume2 className="w-4 h-4" />
                Leer todos
                {data?.actividades && (
                  <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {data.actividades.filter(a => a.resumenEjecutivo?.texto).length}
                  </span>
                )}
              </button>
              
              <button
                onClick={fetchActividades}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Actualizar"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Métricas globales */}
          {data && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Actividades</p>
                <p className="text-xl font-bold text-gray-900">{data.metadata.totalActividadesUnicas}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Tareas totales</p>
                <p className="text-xl font-bold text-gray-900">{data.metadata.totalTareas}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Colaboradores</p>
                <p className="text-xl font-bold text-gray-900">{todosColaboradores.length}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Resúmenes</p>
                <p className="text-xl font-bold text-gray-900">
                  {data.actividades.filter(a => a.resumenEjecutivo?.texto).length}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Provider</p>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {data.actividades.find(a => a.resumenEjecutivo?.provider)?.resumenEjecutivo?.provider || 'N/A'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filtros y búsqueda (se mantiene igual) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar actividades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6841ea] focus:border-transparent"
              />
            </div>

            {/* Filtro por colaborador */}
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filterColaborador}
                onChange={(e) => setFilterColaborador(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6841ea] focus:border-transparent appearance-none bg-white"
              >
                <option value="">Todos los colaboradores</option>
                {todosColaboradores.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {/* Filtro por proyecto */}
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filterProyecto}
                onChange={(e) => setFilterProyecto(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6841ea] focus:border-transparent appearance-none bg-white"
              >
                <option value="">Todos los proyectos</option>
                {todosProyectos.map(proj => (
                  <option key={proj} value={proj}>{proj}</option>
                ))}
              </select>
            </div>

            {/* Ordenar por */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={ordenarPor}
                onChange={(e) => setOrdenarPor(e.target.value as any)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6841ea] focus:border-transparent appearance-none bg-white"
              >
                <option value="fecha">Más recientes</option>
                <option value="tareas">Más tareas</option>
                <option value="completadas">Mayor avance</option>
              </select>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Expandir todo
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Colapsar todo
            </button>
          </div>
        </div>
      </div>

      {/* Lista de actividades (se mantiene igual) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {actividadesFiltradas.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No se encontraron actividades</p>
          </div>
        ) : (
          <div className="space-y-4">
            {actividadesFiltradas.map((actividad) => (
              <div
                key={actividad.actividadId}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Header de la actividad */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleActividad(actividad.actividadId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {actividad.titulo}
                        </h2>
                        {actividad.resumenEjecutivo?.texto && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              leerActividad(actividad);
                            }}
                            className="p-1 text-[#6841ea] hover:bg-[#6841ea]/10 rounded-lg transition-colors"
                            title="Leer resumen"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          actividad.status === "COMPLETADA" ? "bg-green-100 text-green-700" :
                          actividad.status === "EN PROGRESO" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {actividad.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(actividad.fecha).toLocaleDateString('es-MX')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{actividad.horaInicio} - {actividad.horaFin}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          <span className="truncate max-w-[200px]">{actividad.proyecto}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{actividad.totalColaboradores} colaboradores</span>
                        </div>
                      </div>

                      {/* Barra de progreso */}
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#6841ea] rounded-full"
                            style={{
                              width: `${actividad.totalTareas > 0 
                                ? (actividad.tareasCompletadas / actividad.totalTareas) * 100 
                                : 0}%`
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">
                          {actividad.tareasCompletadas}/{actividad.totalTareas} tareas
                        </span>
                      </div>
                    </div>

                    <div className="ml-4">
                      {expandedActividades.has(actividad.actividadId) ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Contenido expandido (se mantiene igual) */}
                {expandedActividades.has(actividad.actividadId) && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Columna izquierda: Información de la actividad */}
                      <div className="lg:col-span-1 space-y-4">
                        {/* Colaboradores */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Colaboradores
                          </h3>
                          <div className="space-y-2">
                            {actividad.colaboradores.map((colaborador, idx) => (
                              <div key={idx} className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">{colaborador}</span>
                                {actividad.usuarios.some(u => u.email === colaborador) ? (
                                  <UserCheck className="w-4 h-4 text-green-500" />
                                ) : (
                                  <UserX className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Estadísticas */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <h3 className="text-sm font-semibold text-gray-700 mb-3">Estadísticas</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tareas totales:</span>
                              <span className="font-medium">{actividad.totalTareas}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Con explicación:</span>
                              <span className="font-medium text-[#6841ea]">{actividad.tareasConExplicacion}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Sin explicación:</span>
                              <span className="font-medium text-gray-500">{actividad.tareasSinExplicacion}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Completadas:</span>
                              <span className="font-medium text-green-600">{actividad.tareasCompletadas}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-gray-200">
                              <span className="text-gray-600">Tiempo estimado:</span>
                              <span className="font-medium">{formatTiempo(actividad.tiempoEstimadoTotal)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Columna derecha: Resumen ejecutivo */}
                      <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg border border-gray-200 p-4 h-full">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-[#6841ea]" />
                              Resumen Ejecutivo
                            </h3>
                            {actividad.resumenEjecutivo?.texto && (
                              <button
                                onClick={() => leerActividad(actividad)}
                                className="p-1.5 text-[#6841ea] hover:bg-[#6841ea]/10 rounded-lg transition-colors flex items-center gap-1 text-xs"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                                Leer
                              </button>
                            )}
                          </div>
                          
                          {actividad.resumenEjecutivo ? (
                            <div>
                              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                {actividad.resumenEjecutivo.texto}
                              </p>
                              
                              {actividad.resumenEjecutivo.estadisticas && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div>
                                      <p className="text-xs text-gray-500">Tareas reportadas</p>
                                      <p className="text-sm font-medium">
                                        {actividad.resumenEjecutivo.estadisticas.tareasConReportes}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Reportes mañana</p>
                                      <p className="text-sm font-medium">
                                        {actividad.resumenEjecutivo.estadisticas.reportesManana}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Reportes tarde</p>
                                      <p className="text-sm font-medium">
                                        {actividad.resumenEjecutivo.estadisticas.reportesTarde}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Proveedor IA</p>
                                      <p className="text-sm font-medium capitalize">
                                        {actividad.resumenEjecutivo.provider || 'fallback'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {actividad.resumenEjecutivo.tipo === 'sin_reportes' && (
                                <div className="mt-3 flex items-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="text-sm">Esta actividad no tiene reportes registrados</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-500 italic">No hay resumen disponible</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { ModalLecturaVivo };