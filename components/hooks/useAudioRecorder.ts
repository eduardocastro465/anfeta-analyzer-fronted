// hooks/useAudioRecorder.ts
import { useRef, useState } from "react";

export const useAudioRecorder = () => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const mimeTypeRef = useRef<string>("");

  const startRecording = async (
    onChunk?: (chunk: Blob) => void,
  ): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
    });
    setCurrentStream(stream);

    // ✅ Detectar codec soportado
    const mimeType =
      [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

    const mediaRecorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    mimeTypeRef.current = mediaRecorder.mimeType;
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
        onChunk?.(e.data);
      }
    };

    mediaRecorder.start(1500);
    return stream;
  };

  const stopRecording = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder) {
        return resolve(new Blob());
      }

      mediaRecorder.onstop = () => {
        // Crear blob de audio
        const audioBlob = new Blob(chunksRef.current, {
          type: mimeTypeRef.current || "audio/webm",
        });

        // Limpiar
        chunksRef.current = [];
        mediaRecorderRef.current = null;

        // Detener el stream
        if (currentStream) {
          currentStream.getTracks().forEach((track) => track.stop());
          setCurrentStream(null);
        }

        resolve(audioBlob);
      };

      mediaRecorder.stop();
    });
  };

  return {
    startRecording,
    stopRecording,
    currentStream, // ✅ Exponer el stream actual
  };
};
