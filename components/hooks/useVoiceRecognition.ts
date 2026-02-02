// hooks/useVoiceRecognition.ts
import { useRef, useState } from 'react';

export function useVoiceRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef<string>("");

  const startRecording = (
    onResult?: (transcript: string) => void,
    onError?: (error: string) => void
  ) => {
    if (typeof window === "undefined") return;
    
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      onError?.("Tu navegador no soporta reconocimiento de voz");
      return;
    }

    console.log("🎤 Iniciando grabación...");

    setIsRecording(true);
    setIsListening(true);
    setVoiceTranscript("");
    voiceTranscriptRef.current = "";

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      console.log("✅ Reconocimiento de voz INICIADO");
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
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
      
      console.log("📝 Transcripción actualizada:", fullTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error("❌ Error en reconocimiento:", event.error);
      setIsListening(false);
      setIsRecording(false);
      onError?.(event.error);
    };

    recognition.onend = () => {
      console.log("🛑 Reconocimiento finalizado");
      setIsListening(false);
      setIsRecording(false);
      
      // ✅ Solo llamar onResult si hay transcripción Y se proporcionó el callback
      if (onResult && voiceTranscriptRef.current.trim().length > 0) {
        console.log("📤 Enviando transcripción final:", voiceTranscriptRef.current);
        onResult(voiceTranscriptRef.current);
      }
    };

    try {
      recognition.start();
    } catch (error) {
      console.error("❌ Error al iniciar:", error);
      onError?.("No se pudo iniciar el reconocimiento de voz");
    }
  };

  const stopRecording = () => {
    console.log("⏹️ Deteniendo grabación...");
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error("Error al detener:", error);
      }
    }
    
    setIsRecording(false);
    setIsListening(false);
  };

  return {
    isRecording,
    isListening,
    voiceTranscript,
    startRecording,
    stopRecording,
    recognitionRef,
    voiceTranscriptRef,
  };
}