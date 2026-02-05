// hooks/useVoiceRecording.ts
import { useState, useRef, useEffect } from "react";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { transcribirAudioCliente } from "@/lib/transcription";

interface UseVoiceRecordingOptions {
  /**
   * Callback que se ejecuta cuando la transcripción se completa exitosamente
   */
  onTranscriptionComplete: (text: string) => void;

  /**
   * Callback opcional que se ejecuta cuando hay un error
   */
  onError?: (error: Error) => void;

  /**
   * Tiempo de silencio en milisegundos antes de enviar el audio
   * @default 3000
   */
  silenceTimeout?: number;

  /**
   * Umbral de detección de voz (0-255). Valores más altos = menos sensible
   * @default 8
   */
  speechThreshold?: number;

  /**
   * Habilitar logs de debug en la consola
   * @default false
   */
  enableDebugLogs?: boolean;
}

interface UseVoiceRecordingReturn {
  /** Si está grabando actualmente */
  isRecording: boolean;

  /** Si está transcribiendo el audio */
  isTranscribing: boolean;

  /** Nivel de audio actual (0-100) */
  audioLevel: number;

  /** Si está procesando (grabando o transcribiendo) */
  isProcessing: boolean;

  /** Iniciar grabación de voz */
  startVoiceRecording: () => Promise<void>;

  /** Detener grabación de voz */
  stopVoiceRecording: () => Promise<void>;

  /** Alternar grabación (si está grabando -> reinicia, si no -> inicia) */
  toggleVoiceRecording: () => Promise<void>;
}

export const useVoiceRecording = ({
  onTranscriptionComplete,
  onError,
  silenceTimeout = 3000,
  speechThreshold = 8,
  enableDebugLogs = false,
}: UseVoiceRecordingOptions): UseVoiceRecordingReturn => {
  // ==========================================
  // DEPENDENCIAS
  // ==========================================
  const { startRecording, stopRecording } = useAudioRecorder();

  // ==========================================
  // ESTADOS
  // ==========================================
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // ==========================================
  // REFS
  // ==========================================
  const isRecordingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // ==========================================
  // HELPER: LOGGING CONDICIONAL
  // ==========================================
  const log = (...args: any[]) => {
    if (enableDebugLogs) {
      console.log(...args);
    }
  };

  // ==========================================
  // SINCRONIZAR REF CON STATE
  // ==========================================
  useEffect(() => {
    isRecordingRef.current = isRecording;
    log("🔄 [SYNC] isRecordingRef actualizado:", isRecording);
  }, [isRecording]);

  // ==========================================
  // LIMPIAR RECURSOS
  // ==========================================
  const cleanupResources = () => {
    log("🧹 [CLEANUP] Limpiando recursos");

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
  };

  // ==========================================
  // PROCESAR Y ENVIAR AUDIO
  // ==========================================
  const processAndSendAudio = async () => {
    if (isProcessingRef.current) {
      log("⚠️ Ya se está procesando audio");
      return;
    }

    log("📤 [PROCESO] Enviando audio después de silencio");
    isProcessingRef.current = true;
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsTranscribing(true);
    setAudioLevel(0);

    cleanupResources();

    try {
      const audio = await stopRecording();
      log("🔄 [TRANSCRIPCIÓN] Transcribiendo audio...");

      const result = await transcribirAudioCliente(audio);

      if (result && result.trim().length > 0) {
        log("✅ [TRANSCRIPCIÓN] Texto:", result);
        onTranscriptionComplete(result);
      } else {
        log("⚠️ [TRANSCRIPCIÓN] Texto vacío o nulo");
      }
    } catch (error) {
      console.error("❌ [ERROR] Error al transcribir:", error);
      onError?.(error as Error);
    } finally {
      setIsTranscribing(false);
      isProcessingRef.current = false;
      log("✅ [PROCESO] Proceso completado");
    }
  };

  // ==========================================
  // REINICIAR TIMER DE SILENCIO
  // ==========================================
  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    log(`⏱️ [TIMER] Reiniciado - esperando ${silenceTimeout}ms de silencio`);

    silenceTimerRef.current = setTimeout(() => {
      log("✅ [TIMER] Tiempo completado - enviando audio");
      processAndSendAudio();
    }, silenceTimeout);
  };

  // ==========================================
  // DETECTAR NIVEL DE AUDIO
  // ==========================================
  const startAudioLevelDetection = (stream: MediaStream) => {
    try {
      log("🎤 [DETECCIÓN] Configurando detección de audio");

      log("🔍 [DIAG] Stream recibido:", {
        id: stream.id,
        active: stream.active,
        tracks: stream.getTracks().map((t) => ({
          kind: t.kind,
          label: t.label,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState,
        })),
      });

      micStreamRef.current = stream;

      const audioContext = new AudioContext();
      log("🔍 [DIAG] AudioContext state:", audioContext.state);

      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let frameCount = 0;

      // Test inmediato (solo si debug está habilitado)
      if (enableDebugLogs) {
        const testAudioImmediate = () => {
          analyser.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((a, b) => a + b, 0);
          const average = sum / dataArray.length;

          log("🔍 [DIAG] TEST INMEDIATO - Nivel promedio:", average.toFixed(2));
          log(
            "🔍 [DIAG] Primeros 10 valores del array:",
            dataArray.slice(0, 10),
          );

          if (average === 0) {
            console.error("❌ [DIAG] PROBLEMA DETECTADO: Nivel es 0");
          } else {
            log("✅ [DIAG] Audio funcionando correctamente");
          }
        };

        setTimeout(testAudioImmediate, 100);
        setTimeout(testAudioImmediate, 500);
      }

      // Función de detección de audio
      const checkAudioLevel = () => {
        if (!isRecordingRef.current) {
          log("⚠️ [DETECCIÓN] isRecording es false, deteniendo...");
          setAudioLevel(0);
          return;
        }

        analyser.getByteFrequencyData(dataArray);

        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;
        const normalizedLevel = Math.min(average * 2, 100);

        setAudioLevel(normalizedLevel);

        // Log primeros 10 frames (solo si debug está habilitado)
        if (enableDebugLogs && frameCount < 10) {
          log(
            `🔍 [DIAG] Frame ${frameCount} - Average: ${average.toFixed(2)}, Normalized: ${normalizedLevel.toFixed(2)}, isRecording: ${isRecordingRef.current}`,
          );
        }

        frameCount++;

        if (average > speechThreshold) {
          // Voz detectada
          log(
            `🎤 [VOZ] Nivel: ${average.toFixed(1)} | Normalizado: ${normalizedLevel.toFixed(1)} | Frame: ${frameCount}`,
          );
          resetSilenceTimer();
        } else {
          // Silencio
          if (enableDebugLogs && frameCount % 30 === 0) {
            log(
              `🔇 [SILENCIO] Nivel: ${average.toFixed(1)} | Frame: ${frameCount}`,
            );
          }
        }

        animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };

      resetSilenceTimer();
      checkAudioLevel();

      log("✅ [DETECCIÓN] Configuración completada");
    } catch (error) {
      console.error("❌ [ERROR] No se pudo configurar detección:", error);
      resetSilenceTimer();
    }
  };

  // ==========================================
  // INICIAR GRABACIÓN
  // ==========================================
  const startVoiceRecording = async () => {
    if (isTranscribing || isProcessingRef.current) {
      log("⚠️ Ignorando inicio - ya se está procesando");
      return;
    }

    log("🎙️ [INICIO] Iniciando nueva grabación...");

    try {
      log("📞 Llamando a startRecording()...");
      const stream = await startRecording();

      log("✅ Stream obtenido:", {
        id: stream.id,
        active: stream.active,
        tracks: stream.getTracks().map((t) => ({
          kind: t.kind,
          label: t.label,
          enabled: t.enabled,
        })),
      });

      setIsRecording(true);
      isRecordingRef.current = true;
      log("✅ Estado isRecording = true, ref = true");

      log("🎧 Iniciando detección de audio con el mismo stream...");
      startAudioLevelDetection(stream);

      log("✅ [INICIO] Grabación iniciada correctamente");
    } catch (error) {
      console.error("❌ [ERROR] Error al iniciar grabación:", error);

      setIsRecording(false);
      isRecordingRef.current = false;
      setAudioLevel(0);

      // Propagar error
      onError?.(error as Error);
      throw error;
    }
  };

  // ==========================================
  // DETENER GRABACIÓN
  // ==========================================
  const stopVoiceRecording = async () => {
    if (!isRecording) {
      log("⚠️ No hay grabación activa para detener");
      return;
    }

    log("🛑 [STOP] Deteniendo grabación...");

    cleanupResources();

    await stopRecording();
    setIsRecording(false);
    isRecordingRef.current = false;
    setAudioLevel(0);

    log("✅ [STOP] Grabación detenida");
  };

  // ==========================================
  // TOGGLE GRABACIÓN
  // ==========================================
  const toggleVoiceRecording = async () => {
    if (isTranscribing || isProcessingRef.current) {
      log("⚠️ Ignorando toggle - procesando...");
      return;
    }

    if (isRecording) {
      log("🔄 [TOGGLE] Cancelando y reiniciando grabación...");
      await stopVoiceRecording();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await startVoiceRecording();
    } else {
      await startVoiceRecording();
    }
  };

  // ==========================================
  // LIMPIAR AL DESMONTAR
  // ==========================================
  useEffect(() => {
    log("✅ [MOUNT] Hook de voz montado");

    return () => {
      log("🧹 [UNMOUNT] Limpiando hook de voz");
      cleanupResources();
    };
  }, []);

  // ==========================================
  // RETORNAR API PÚBLICA
  // ==========================================
  return {
    // Estados
    isRecording,
    isTranscribing,
    audioLevel,
    isProcessing: isProcessingRef.current || isTranscribing,

    // Acciones
    startVoiceRecording,
    stopVoiceRecording,
    toggleVoiceRecording,
  };
};
