// hooks/useVoskTranscriber.ts
import { useRef, useState, useCallback } from "react";

type VoskStatus = "idle" | "loading" | "ready" | "error";

interface UseVoskTranscriberReturn {
  status: VoskStatus;
  loadProgress: number;
  error: string | null;
  loadModel: () => Promise<void>;
  transcribirConVosk: (audioBlob: Blob) => Promise<string>;
}

const MODEL_URL = "/models/vosk-model-small-es-0.42.tar.gz";
const SAMPLE_RATE = 16000;

const yieldToMain = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

export function useVoskTranscriber(): UseVoskTranscriberReturn {
  const [status, setStatus] = useState<VoskStatus>("idle");
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const modelRef = useRef<any>(null);
  const loadingPromiseRef = useRef<Promise<void> | null>(null);

  const loadModel = useCallback(async () => {
    if (modelRef.current) return;
    if (loadingPromiseRef.current) return loadingPromiseRef.current;

    const doLoad = async () => {
      try {
        setStatus("loading");
        setLoadProgress(0);
        setError(null);

        const Vosk = await import("vosk-browser");
        const model = await Vosk.createModel(MODEL_URL);

        modelRef.current = model;
        setStatus("ready");
        setLoadProgress(100);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Error cargando modelo Vosk";
        setError(msg);
        setStatus("error");
        loadingPromiseRef.current = null;
        throw err;
      }
    };

    loadingPromiseRef.current = doLoad();
    return loadingPromiseRef.current;
  }, []);

  const decodirAudioBlob = useCallback(
    async (audioBlob: Blob): Promise<Float32Array> => {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      const decoded = await audioContext.decodeAudioData(arrayBuffer);
      await audioContext.close();

      const mono = new Float32Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        let sum = 0;
        for (let c = 0; c < decoded.numberOfChannels; c++) {
          sum += decoded.getChannelData(c)[i];
        }
        mono[i] = sum / decoded.numberOfChannels;
      }

      return mono;
    },
    [],
  );

  const transcribirConVosk = useCallback(
    async (audioBlob: Blob): Promise<string> => {
      if (!modelRef.current) await loadModel();
      if (!modelRef.current) throw new Error("El modelo Vosk no pudo cargarse");

      const audioData = await decodirAudioBlob(audioBlob);
      const recognizer = new modelRef.current.KaldiRecognizer(SAMPLE_RATE);

      return new Promise((resolve, reject) => {
        let fullText = "";
        let lastPartial = ""; // ✅ guardar el último parcial como fallback

        recognizer.on("result", (message: any) => {
          const text = message?.result?.text ?? message?.text ?? "";
          if (text) fullText += text + " ";
        });

        recognizer.on("partialresult", (message: any) => {
          // ✅ acumular el parcial más reciente
          const partial = message?.result?.partial ?? message?.partial ?? "";
          if (partial) lastPartial = partial;
        });

        const processAudio = async () => {
          try {
            const CHUNK_SIZE = SAMPLE_RATE * 3;
            for (
              let offset = 0;
              offset < audioData.length;
              offset += CHUNK_SIZE
            ) {
              const chunk = audioData.subarray(
                offset,
                Math.min(offset + CHUNK_SIZE, audioData.length),
              );
              recognizer.acceptWaveformFloat(chunk, SAMPLE_RATE);
              await yieldToMain();
            }

            recognizer.retrieveFinalResult();

            setTimeout(() => {
              // ✅ usar resultado final o, si está vacío, el último parcial
              const text = fullText.trim() || lastPartial.trim();
              try {
                recognizer.remove();
              } catch {}
              resolve(text);
            }, 800);
          } catch (err) {
            try {
              recognizer.remove();
            } catch {}
            reject(
              err instanceof Error ? err : new Error("Error procesando audio"),
            );
          }
        };

        processAudio();
      });
    },
    [loadModel, decodirAudioBlob],
  );

  return { status, loadProgress, error, loadModel, transcribirConVosk };
}
