const API_KEYS = [
  process.env.NEXT_PUBLIC_GROQ_API_KEY_1,
  process.env.NEXT_PUBLIC_GROQ_API_KEY_2,
].filter((key) => key && key.trim() !== "");

const GEMINI_API_KEYS = [
  process.env.NEXT_PUBLIC_GEMINI_API_KEY_1,
  process.env.NEXT_PUBLIC_GEMINI_API_KEY_2,
].filter((key) => key && key.trim() !== "");

let groqIndiceActual = 0;
let geminiIndiceActual = 0;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192; // procesar en chunks
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}


// ==================== GROQ ====================
export async function transcribirConGroq(
  audioBlob: Blob,
): Promise<string> {
  if (API_KEYS.length === 0) {
    throw new Error("No hay API keys de Groq configuradas");
  }

  // Intentar con cada API key disponible
  for (let i = 0; i < API_KEYS.length; i++) {
    const apiKey = API_KEYS[groqIndiceActual];

    // Rotar al siguiente índice para la próxima llamada
    groqIndiceActual = (groqIndiceActual + 1) % API_KEYS.length;

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.wav");
      formData.append("model", "whisper-large-v3-turbo");
      formData.append("language", "es");
      formData.append("response_format", "json");

      const response = await fetch(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: formData,
        },
      );

      // Si es error 429 (rate limit) y hay más keys, continuar al siguiente
      if (response.status === 429 && i < API_KEYS.length - 1) {
        continue;
      }

      if (!response.ok) {
        console.log(response);
        throw new Error(
          `Error en transcripción: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      return data.text || "";
    } catch (error) {
      // Si es un error de red o fetch y hay más keys, intentar con la siguiente
      if (i < API_KEYS.length - 1) {
        continue;
      }

      // Si ya probamos todas las keys, lanzar el error

      throw error;
    }
  }

  throw new Error("No se pudo transcribir con ninguna API key disponible");
}

// ==================== GEMINI ====================
async function transcribirConGemini(audioBlob: Blob): Promise<string> {
  if (GEMINI_API_KEYS.length === 0) throw new Error("No hay API keys de Gemini");

  for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
    const apiKey = GEMINI_API_KEYS[geminiIndiceActual];
    geminiIndiceActual = (geminiIndiceActual + 1) % GEMINI_API_KEYS.length;

    try {
      // Convertir blob a base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = arrayBufferToBase64(arrayBuffer);

      const mimeType = audioBlob.type || "audio/webm";

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Audio,
                    },
                  },
                  {
                    text: "Transcribe exactamente lo que se dice en este audio en español. Devuelve solo el texto transcrito, sin explicaciones ni comentarios.",
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0,
            },
          }),
        },
      );

      if (response.status === 429 && i < GEMINI_API_KEYS.length - 1) continue;

      if (!response.ok) {
        throw new Error(`Gemini error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return text.trim();
    } catch (error) {
      if (i < GEMINI_API_KEYS.length - 1) continue;
      throw error;
    }
  }

  throw new Error("No se pudo transcribir con ninguna API key de Gemini");
}

// ==================== PRINCIPAL: Groq → Gemini fallback ====================
export async function transcribirAudioCliente(audioBlob: Blob): Promise<string> {
  // 1. Intentar con Groq primero
  try {
    const transcript = await transcribirConGroq(audioBlob);
    if (transcript.trim()) return transcript;
  } catch (error) {
    console.warn("Groq falló, intentando con Gemini...", error);
  }

  // 2. Fallback a Gemini
  try {
    const transcript = await transcribirConGemini(audioBlob);
    if (transcript.trim()) return transcript;
  } catch (error) {
    console.error("Gemini también falló:", error);
  }

  throw new Error("No se pudo transcribir el audio con ningún servicio");
}