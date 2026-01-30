import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Mic,
  X,
  CheckCircle2,
  Loader2,
  Send,
  AlertCircle,
  Check,
} from "lucide-react";

import type { ActividadDiaria, PendienteEstadoLocal } from "@/lib/types";
import { guardarReporteTarde } from "@/lib/api";

interface ReporteActividadesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  theme: "light" | "dark";
  actividadesDiarias: ActividadDiaria[];
  stopVoice: () => void;
  speakText: (text: string) => void;
  isSpeaking: boolean;
  onGuardarReporte: () => void;
  guardandoReporte: boolean;
}
type PasoModal =
  | "inicial" // Mostrar resumen y botón iniciar
  | "preguntando-que-hizo" // Bot pregunta qué hizo
  | "escuchando-que-hizo" // Usuario responde qué hizo
  | "guardando-que-hizo" // Guardando en BD
  | "preguntando-motivo" // Bot pregunta por qué no completó
  | "escuchando-motivo" // Usuario responde motivo
  | "guardando-motivo" // Guardando motivo en BD
  | "completado"; // Todas las tareas procesadas

export function ReporteActividadesModal({
  isOpen,
  onOpenChange,
  theme,
  actividadesDiarias,
  stopVoice,
  speakText,
  isSpeaking,
  onGuardarReporte,
  guardandoReporte,
}: ReporteActividadesModalProps) {
  // ==================== ESTADOS ====================
  const [paso, setPaso] = useState<PasoModal>("inicial");
  const [indiceActual, setIndiceActual] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const SILENCE_LIMIT = 2500;

  // ==================== REFS ====================
  const recognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef("");
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number | null>(null);

  // ==================== TAREAS FILTRADAS ====================
  // Solo tareas con descripción (descripcion !== "" y descripcion !== null)
  const tareasConDescripcion = actividadesDiarias.flatMap((actividad) =>
    actividad.pendientes
      .filter((p) => p.descripcion && p.descripcion.trim().length > 0)
      .map((p) => ({
        // ✅ Todas las propiedades necesarias
        pendienteId: p.pendienteId,
        nombre: p.nombre,
        descripcion: p.descripcion || "",
        duracionMin: p.duracionMin,
        terminada: p.terminada,
        motivoNoCompletado: p.motivoNoCompletado || null,
        actividadId: actividad.actividadId,
        completadoLocal: false,
        motivoLocal: "",
        actividadTitulo: actividad.titulo,
        actividadHorario: `${actividad.horaInicio} - ${actividad.horaFin}`,
      })),
  );

  const tareaActual = tareasConDescripcion[indiceActual];
  const totalTareas = tareasConDescripcion.length;
  const progreso = totalTareas > 0 ? (indiceActual / totalTareas) * 100 : 0;

  // ==================== CONTADOR DE PALABRAS ====================
  const palabrasCount = voiceTranscript
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  const puedeEnviar = palabrasCount >= 5;

  // ==================== FUNCIONES DE VOZ ====================
  const iniciarGrabacion = () => {
    if (typeof window === "undefined") return;
    
    // Si el asistente está hablando, esperamos un momento
    if (window.speechSynthesis.speaking) {
      setTimeout(iniciarGrabacion, 500);
      return;
    }

    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Tu navegador no soporta reconocimiento de voz");
      return;
    }

    setIsRecording(true);
    setVoiceTranscript("");
    voiceTranscriptRef.current = "";
    setErrorValidacion(null);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      lastSpeechTimeRef.current = Date.now();

      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const fullTranscript = (finalTranscript + interimTranscript).trim();
      voiceTranscriptRef.current = fullTranscript;
      setVoiceTranscript(fullTranscript);

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      
      silenceTimerRef.current = setTimeout(() => {
        if (voiceTranscriptRef.current.length > 5) {
          enviarRespuesta();
        }
      }, 3500); // 3.5 segundos de silencio para enviar
    };

    recognition.onerror = (event: any) => {
      console.error("Error reconocimiento:", event.error);
      if (event.error !== 'aborted') setIsRecording(false);
    };

    recognition.onend = () => {
  setIsRecording(false);

  if (voiceTranscriptRef.current.trim().length >= 5) {
    enviarRespuesta();
  }
};

    recognition.start();
  };

  
const detenerGrabacion = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.abort(); // Fuerza la detención inmediata
      } catch (e) {
        console.log("Error al detener:", e);
      }
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    setIsRecording(false);
  };

  const handleCancelar = () => {
    detenerGrabacion();
    // Detener el habla del sistema inmediatamente
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopVoice(); // Función del padre
    onOpenChange(false);
    // Resetear paso para la próxima vez
    setPaso("inicial");
  };
 const enviarRespuesta = async () => {
  detenerGrabacion();

  const transcript = voiceTranscriptRef.current.trim();

  // Validación de longitud mínima (3 caracteres)
  if (transcript.length < 3) {
    setErrorValidacion("La respuesta es muy corta.");
    setTimeout(() => {
      setErrorValidacion(null);
      setPaso(paso === "escuchando-que-hizo" ? "preguntando-que-hizo" : "preguntando-motivo");
    }, 2000);
    return;
  }

  try {
    if (paso === "escuchando-que-hizo") {
      setPaso("guardando-que-hizo");

      const payload = {
        actividadId: tareaActual.actividadId,
        pendienteId: tareaActual.pendienteId,
        queHizo: transcript,
      };

      const data = await guardarReporteTarde(payload);

      if (data.success) {
        // El backend ahora siempre devuelve completada: true si hay dudas
        if (data.completada) {
          speakText("Perfecto. Siguiente tarea.");
          setTimeout(() => avanzarSiguienteTarea(), 1500);
        } else {
          // Solo si la IA está muy segura de que NO se hizo
          setPaso("preguntando-motivo");
          setTimeout(() => {
            speakText(`¿Por qué no completaste esta tarea?`);
            setTimeout(() => {
              setPaso("escuchando-motivo");
              iniciarGrabacion();
            }, 1800);
          }, 500);
        }
      } else {
        throw new Error(data.error || "Error al guardar");
      }

    } else if (paso === "escuchando-motivo") {
      setPaso("guardando-motivo");

      const response = await fetch("/api/reporte/guardar-motivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendienteId: tareaActual.pendienteId,
          actividadId: tareaActual.actividadId,
          motivo: transcript,
        }),
      });

      const data = await response.json();

      if (data.success) {
        speakText("Entendido. Siguiente.");
        setTimeout(() => avanzarSiguienteTarea(), 1500);
      } else {
        throw new Error(data.error || "Error al guardar motivo");
      }
    }
  } catch (error) {
    console.error("Error al guardar:", error);
    setErrorValidacion("Hubo un problema. Inténtalo de nuevo.");
    setTimeout(() => {
      setErrorValidacion(null);
      setPaso(paso === "guardando-que-hizo" ? "preguntando-que-hizo" : "preguntando-motivo");
    }, 3000);
  }
};



  const avanzarSiguienteTarea = () => {
    setVoiceTranscript("");
    voiceTranscriptRef.current = "";

    if (indiceActual + 1 < totalTareas) {
      setIndiceActual((prev) => prev + 1);
      setPaso("preguntando-que-hizo");
    } else {
      setPaso("completado");
      speakText("¡Excelente! Has completado el reporte de todas tus tareas.");
    }
  };

  const iniciarReporte = () => {
    if (totalTareas === 0) {
      alert("No hay tareas con descripción para reportar");
      return;
    }

    setPaso("preguntando-que-hizo");
    setIndiceActual(0);
  };

  // ==================== EFECTOS ====================
useEffect(() => {
    let active = true;

    if (paso === "preguntando-que-hizo" && tareaActual && isOpen) {
      const textoPrompt = `Tarea ${indiceActual + 1} de ${totalTareas}: ${tareaActual.nombre}. ¿Qué hiciste hoy?`;
      
      // Detener cualquier audio previo
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      
      speakText(textoPrompt);

      // Calculamos el tiempo aproximado que tarda en hablar (promedio 150ms por palabra + margen)
      const palabras = textoPrompt.split(" ").length;
      const tiempoEstimado = (palabras * 450) + 1000; 

      const timer = setTimeout(() => {
        if (active && paso === "preguntando-que-hizo") {
          setPaso("escuchando-que-hizo");
          iniciarGrabacion();
        }
      }, tiempoEstimado);

      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [paso, indiceActual, isOpen]);

  // Limpieza total al desmontar o cerrar
  useEffect(() => {
    if (!isOpen) {
      detenerGrabacion();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);
  useEffect(() => {
  if (!isRecording) return;

  const interval = setInterval(() => {
    if (!lastSpeechTimeRef.current) return;

    const diff = Date.now() - lastSpeechTimeRef.current;

    if (diff > 2500 && voiceTranscriptRef.current.length >= 5) {
      clearInterval(interval);
      enviarRespuesta();
    }
  }, 500);

  return () => clearInterval(interval);
}, [isRecording]);


  // ==================== RENDER ====================
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if(!open) handleCancelar();
      else onOpenChange(true);
    }}>
      <DialogContent
        className={`max-w-2xl max-h-[85vh] overflow-hidden flex flex-col ${
          theme === "dark"
            ? "bg-[#1a1a1a] border-[#2a2a2a]"
            : "bg-white border-gray-200"
        }`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#6841ea]" />
              Reporte de Actividades del Día
            </div>
            {paso !== "inicial" && paso !== "completado" && (
              <Badge variant="outline">
                Tarea {indiceActual + 1} de {totalTareas}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {/* ========== PASO: INICIAL ========== */}
          {paso === "inicial" && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-lg border ${
                  theme === "dark"
                    ? "bg-[#252527] border-[#2a2a2a]"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Tareas a reportar</span>
                  <Badge>{totalTareas} tareas</Badge>
                </div>
                <p className="text-sm text-gray-500">
                  El asistente te preguntará qué hiciste en cada tarea. Responde
                  con voz.
                </p>
              </div>

              {totalTareas === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    No hay tareas con descripción para reportar hoy.
                  </p>
                </div>
              ) : (
                <Button
                  onClick={iniciarReporte}
                  className="w-full bg-[#6841ea] hover:bg-[#5a36d4] h-12"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Iniciar Reporte por Voz
                </Button>
              )}
            </div>
          )}

          {/* ========== BARRA DE PROGRESO ========== */}
          {paso !== "inicial" && paso !== "completado" && (
            <div className="mb-6">
              <div className="w-full h-2 bg-gray-200 dark:bg-[#2a2a2a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#6841ea] transition-all duration-300"
                  style={{ width: `${progreso}%` }}
                />
              </div>
            </div>
          )}

          {/* ========== TAREA ACTUAL ========== */}
          {tareaActual && paso !== "inicial" && paso !== "completado" && (
            <div
              className={`p-4 rounded-lg border mb-6 ${
                theme === "dark"
                  ? "bg-[#252527] border-[#2a2a2a]"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
                    theme === "dark"
                      ? "bg-[#6841ea]/20 text-[#6841ea]"
                      : "bg-[#6841ea]/10 text-[#6841ea]"
                  }`}
                >
                  {indiceActual + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold mb-1">{tareaActual.nombre}</h4>
                  <p className="text-sm text-gray-500 mb-2">
                    {tareaActual.descripcion}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{tareaActual.actividadTitulo}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {tareaActual.duracionMin} min
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========== PASO: PREGUNTANDO QUÉ HIZO ========== */}
          {paso === "preguntando-que-hizo" && (
            <div className="text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                El asistente está hablando...
              </p>
            </div>
          )}

          {/* ========== PASO: ESCUCHANDO QUÉ HIZO ========== */}
          {paso === "escuchando-que-hizo" && (
            <div className="text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                  <Mic className="w-10 h-10 text-red-500" />
                </div>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div
                      className="absolute w-24 h-24 rounded-full border-2 border-red-500 animate-ping"
                      style={{
                        animationDelay: `${i * 0.2}s`,
                        opacity: 0.5 - i * 0.1,
                      }}
                    />
                  </div>
                ))}
              </div>

              <div
                className={`inline-block px-4 py-2 rounded-full ${
                  theme === "dark"
                    ? "bg-[#252527] border border-[#2a2a2a]"
                    : "bg-gray-100 border border-gray-200"
                }`}
              >
                <span
                  className={`text-sm font-medium ${
                    puedeEnviar ? "text-green-500" : "text-gray-500"
                  }`}
                >
                  {palabrasCount} palabra{palabrasCount !== 1 ? "s" : ""}
                  {!puedeEnviar && (
                    <span className="text-xs ml-1 opacity-70">(mín. 5)</span>
                  )}
                </span>
              </div>

              {voiceTranscript && (
                <div
                  className={`p-3 rounded text-sm ${
                    theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"
                  }`}
                >
                  <p className="italic">{voiceTranscript}</p>
                </div>
              )}

              <Button
                onClick={enviarRespuesta}
                disabled={!puedeEnviar}
                className={`${
                  puedeEnviar
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar Respuesta
              </Button>
            </div>
          )}

          {/* ========== PASO: GUARDANDO QUÉ HIZO ========== */}
          {paso === "guardando-que-hizo" && (
            <div className="text-center space-y-4 py-8">
              <Loader2 className="w-12 h-12 text-[#6841ea] animate-spin mx-auto" />
              <p className="text-sm text-gray-500">Guardando tu respuesta...</p>
            </div>
          )}

          {/* ========== PASO: PREGUNTANDO MOTIVO ========== */}
          {paso === "preguntando-motivo" && (
            <div className="text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                El asistente está preguntando...
              </p>
            </div>
          )}

          {/* ========== PASO: ESCUCHANDO MOTIVO ========== */}
          {paso === "escuchando-motivo" && (
            <div className="text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                  <Mic className="w-10 h-10 text-red-500" />
                </div>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div
                      className="absolute w-24 h-24 rounded-full border-2 border-red-500 animate-ping"
                      style={{
                        animationDelay: `${i * 0.2}s`,
                        opacity: 0.5 - i * 0.1,
                      }}
                    />
                  </div>
                ))}
              </div>

              <div
                className={`inline-block px-4 py-2 rounded-full ${
                  theme === "dark"
                    ? "bg-[#252527] border border-[#2a2a2a]"
                    : "bg-gray-100 border border-gray-200"
                }`}
              >
                <span
                  className={`text-sm font-medium ${
                    puedeEnviar ? "text-green-500" : "text-gray-500"
                  }`}
                >
                  {palabrasCount} palabra{palabrasCount !== 1 ? "s" : ""}
                  {!puedeEnviar && (
                    <span className="text-xs ml-1 opacity-70">(mín. 5)</span>
                  )}
                </span>
              </div>

              {voiceTranscript && (
                <div
                  className={`p-3 rounded text-sm ${
                    theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"
                  }`}
                >
                  <p className="italic">{voiceTranscript}</p>
                </div>
              )}

              <Button
                onClick={enviarRespuesta}
                disabled={!puedeEnviar}
                className={`${
                  puedeEnviar
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar Motivo
              </Button>
            </div>
          )}

          {/* ========== PASO: GUARDANDO MOTIVO ========== */}
          {paso === "guardando-motivo" && (
            <div className="text-center space-y-4 py-8">
              <Loader2 className="w-12 h-12 text-[#6841ea] animate-spin mx-auto" />
              <p className="text-sm text-gray-500">Guardando motivo...</p>
            </div>
          )}

          {/* ========== PASO: COMPLETADO ========== */}
          {paso === "completado" && (
            <div className="text-center space-y-4 py-8">
              <div
                className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
                  theme === "dark" ? "bg-green-900/20" : "bg-green-100"
                }`}
              >
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold">¡Reporte Completado!</h3>
              <p className="text-sm text-gray-500">
                Has reportado todas las tareas del día correctamente.
              </p>
              <div className="flex gap-3 justify-center pt-4">

                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}

          {/* ========== ERROR DE VALIDACIÓN ========== */}
          {errorValidacion && (
            <div
              className={`mt-4 p-3 rounded-lg border ${
                theme === "dark"
                  ? "bg-red-900/20 border-red-500/20"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-sm text-red-500">{errorValidacion}</p>
              </div>
            </div>
          )}
        </div>

        {/* ========== BOTÓN CANCELAR (solo si no está en paso inicial o completado) ========== */}
       {paso !== "inicial" && paso !== "completado" && (
          <div className={`flex justify-center p-4 border-t ${
              theme === "dark" ? "border-[#2a2a2a]" : "border-gray-200"
            }`}
          >
            <Button
              variant="outline"
              onClick={handleCancelar} // USAR LA NUEVA FUNCIÓN
              className="hover:bg-red-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar Reporte
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
