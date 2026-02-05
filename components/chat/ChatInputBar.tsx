// components/chat/ChatInputBar.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, Bot, Volume2, RotateCcw } from "lucide-react";

interface ChatInputBarProps {
  userInput: string;
  setUserInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onVoiceClick: () => void;
  isRecording: boolean;
  isTranscribing?: boolean;
  audioLevel?: number; // ✅ Nueva prop
  canUserType: boolean;
  theme: "light" | "dark";
  inputRef: React.RefObject<HTMLInputElement | null>;
  chatMode?: "normal" | "ia";
  onToggleChatMode?: () => void;
  isLoadingIA?: boolean;
  isSpeaking?: boolean;
}

export function ChatInputBar({
  userInput,
  setUserInput,
  onSubmit,
  onVoiceClick,
  isRecording,
  isTranscribing = false,
  audioLevel = 0, // ✅ Nueva prop
  canUserType,
  theme,
  inputRef,
  chatMode = "normal",
  isLoadingIA = false,
  onToggleChatMode,
  isSpeaking = false,
}: ChatInputBarProps) {
  const isInteractionDisabled =
    !canUserType || isSpeaking || isLoadingIA || isTranscribing;

  const getPlaceholder = () => {
    if (isTranscribing) return "Transcribiendo audio...";
    if (isSpeaking) return "El asistente está hablando...";
    if (!canUserType) return "Obteniendo análisis...";
    if (chatMode === "ia") return "Pregunta al asistente sobre tus tareas...";
    return "Escribe tu pregunta o comentario...";
  };

  // ✅ Calcular porcentaje de nivel de audio (0-100)
  const audioLevelPercent = Math.min((audioLevel / 100) * 100, 100);

  return (
    <div
      className={`sticky bottom-0 left-0 right-0 z-10 border-t ${
        theme === "dark"
          ? "bg-[#101010] border-[#2a2a2a]"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="max-w-5xl mx-auto p-3">
        {/* Indicador de modo IA */}
        {chatMode === "ia" && !isSpeaking && !isRecording && (
          <div
            className={`mb-2 px-3 py-2 rounded-lg flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200 ${
              theme === "dark"
                ? "bg-[#6841ea]/10 border border-[#6841ea]/20"
                : "bg-purple-50 border border-purple-200"
            }`}
          >
            <Bot className="w-4 h-4 text-[#6841ea]" />
            <span className="text-xs font-medium text-[#6841ea]">
              Modo Asistente IA Activado
            </span>
          </div>
        )}

        {/* ✅ Indicador cuando está grabando CON NIVEL DE AUDIO */}
        {isRecording && (
          <div
            className={`mb-2 px-3 py-2 rounded-lg animate-in slide-in-from-bottom-2 duration-200 ${
              theme === "dark"
                ? "bg-red-500/10 border border-red-500/20"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Mic className="w-4 h-4 text-red-500 animate-pulse" />
              <span className="text-xs font-medium text-red-500">
                Escuchando... (Toca de nuevo para corregir)
              </span>
              <span className="ml-auto text-xs text-gray-500">
                Nivel: {Math.round(audioLevel)}
              </span>
            </div>
            {/* Barra de nivel de audio */}
            <div
              className={`w-full h-1.5 rounded-full overflow-hidden ${
                theme === "dark" ? "bg-gray-700" : "bg-gray-200"
              }`}
            >
              <div
                className={`h-full transition-all duration-75 ${
                  audioLevel > 15
                    ? "bg-green-500"
                    : theme === "dark"
                      ? "bg-gray-600"
                      : "bg-gray-300"
                }`}
                style={{ width: `${audioLevelPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Indicador cuando está transcribiendo */}
        {isTranscribing && (
          <div
            className={`mb-2 px-3 py-2 rounded-lg flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200 ${
              theme === "dark"
                ? "bg-blue-500/10 border border-blue-500/20"
                : "bg-blue-50 border border-blue-200"
            }`}
          >
            <Volume2 className="w-4 h-4 text-blue-500 animate-pulse" />
            <span className="text-xs font-medium text-blue-500">
              Transcribiendo y enviando...
            </span>
          </div>
        )}

        {/* Indicador cuando el bot está hablando */}
        {isSpeaking && (
          <div
            className={`mb-2 px-3 py-2 rounded-lg flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200 ${
              theme === "dark"
                ? "bg-blue-500/10 border border-blue-500/20"
                : "bg-blue-50 border border-blue-200"
            }`}
          >
            <Volume2 className="w-4 h-4 text-blue-500 animate-pulse" />
            <span className="text-xs font-medium text-blue-500">
              El asistente está hablando...
            </span>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex gap-2 items-center">
          <Input
            ref={inputRef}
            type="text"
            placeholder={getPlaceholder()}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={isInteractionDisabled}
            className={`flex-1 h-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6841ea] focus:border-[#6841ea] transition-all ${
              theme === "dark"
                ? "bg-[#2a2a2a] text-white placeholder:text-gray-500 border-[#353535] hover:border-[#6841ea] disabled:bg-[#1a1a1a] disabled:text-gray-600 disabled:cursor-not-allowed"
                : "bg-gray-100 text-gray-900 placeholder:text-gray-500 border-gray-200 hover:border-[#6841ea] disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
            }`}
          />

          {/* Botón de modo IA */}
          {onToggleChatMode && (
            <Button
              type="button"
              onClick={onToggleChatMode}
              disabled={isInteractionDisabled}
              className={`h-12 w-12 p-0 rounded-lg transition-all ${
                chatMode === "ia"
                  ? "bg-[#6841ea] hover:bg-[#5a36d4] text-white"
                  : theme === "dark"
                    ? "bg-[#2a2a2a] hover:bg-[#353535] text-gray-400 hover:text-white border border-[#353535]"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-900"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={
                isSpeaking
                  ? "Espera a que termine de hablar"
                  : chatMode === "ia"
                    ? "Desactivar IA"
                    : "Activar IA"
              }
            >
              <Bot
                className={`w-5 h-5 ${chatMode === "ia" ? "text-white" : ""}`}
              />
            </Button>
          )}

          {/* Botón de voz */}
          <Button
            type="button"
            onClick={onVoiceClick}
            disabled={isTranscribing || isSpeaking || isLoadingIA}
            className={`
              relative h-12 w-12 p-0 rounded-full transition-all
              ${
                isRecording
                  ? "bg-orange-600 hover:bg-orange-700 scale-110 shadow-lg shadow-orange-500/40"
                  : "bg-[#6841ea] hover:bg-[#5a36d4]"
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            title={
              isRecording
                ? "Toca para corregir"
                : isTranscribing
                  ? "Procesando..."
                  : "Grabar audio"
            }
          >
            {isRecording && (
              <>
                <span className="absolute inset-0 rounded-full animate-ping bg-orange-500/50"></span>
                <RotateCcw className="w-5 h-5 text-white relative z-10" />
              </>
            )}

            {!isRecording && (
              <Mic className="w-5 h-5 text-white relative z-10" />
            )}
          </Button>

          {/* Botón de enviar */}
          <Button
            type="submit"
            disabled={!userInput.trim() || isInteractionDisabled}
            className="h-12 w-12 p-0 bg-[#6841ea] hover:bg-[#5a36d4] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title={
              isSpeaking ? "Espera a que termine de hablar" : "Enviar mensaje"
            }
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
