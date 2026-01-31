// components/chat/ChatInputBar.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff, Bot } from "lucide-react";

interface ChatInputBarProps {
  userInput: string;
  setUserInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onVoiceClick: () => void;
  isRecording: boolean;
  canUserType: boolean;
  theme: "light" | "dark";
  inputRef: React.RefObject<HTMLInputElement | null>;
  chatMode?: "normal" | "ia"; // Nuevo
  onToggleChatMode?: () => void; // Nuevo
}

export function ChatInputBar({
  userInput,
  setUserInput,
  onSubmit,
  onVoiceClick,
  isRecording,
  canUserType,
  theme,
  inputRef,
  chatMode = "normal",
  onToggleChatMode,
}: ChatInputBarProps) {
  return (
    <div
      className={`bottom-0 left-0 right-0 z-10 ${theme === "dark" ? "bg-[#101010]" : "bg-white"}`}
    >
      <div className="max-w-5xl mx-auto p-3">
        {/* Indicador de modo IA */}
        {chatMode === "ia" && (
          <div
            className={`mb-2 px-3 py-2 rounded-lg flex items-center gap-2 ${
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

        <form onSubmit={onSubmit} className="flex gap-4 items-center">
          <Input
            ref={inputRef}
            type="text"
            placeholder={
              chatMode === "ia"
                ? "Pregunta al asistente sobre tus tareas..."
                : canUserType
                  ? "Escribe tu pregunta o comentario..."
                  : "Obteniendo análisis..."
            }
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className={`flex-1 h-12 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#6841ea] focus:border-[#6841ea] ${
              theme === "dark"
                ? "bg-[#2a2a2a] text-white placeholder:text-gray-500 border-[#353535] hover:border-[#6841ea]"
                : "bg-gray-100 text-gray-900 placeholder:text-gray-500 border-gray-200 hover:border-[#6841ea]"
            }`}
          />

          {/* Botón de modo IA */}
          {onToggleChatMode && (
            <Button
              type="button"
              onClick={onToggleChatMode}
              className={`h-12 w-14 p-0 rounded-lg transition-all ${
                chatMode === "ia"
                  ? "bg-[#6841ea] hover:bg-[#5a36d4]"
                  : theme === "dark"
                    ? "bg-[#2a2a2a] hover:bg-[#353535] border border-[#353535]"
                    : "bg-gray-200 hover:bg-gray-300"
              }`}
              title={chatMode === "ia" ? "Desactivar IA" : "Activar IA"}
            >
              <Bot
                className={`w-5 h-5 ${chatMode === "ia" ? "text-white" : "text-gray-600"}`}
              />
            </Button>
          )}

          <Button
            type="button"
            onClick={onVoiceClick}
            className={`h-12 w-14 p-0 rounded-lg transition-all ${
              isRecording
                ? "bg-red-600 hover:bg-red-700 animate-pulse"
                : "bg-[#6841ea] hover:bg-[#5a36d4]"
            }`}
            title={
              isRecording
                ? "Detener reconocimiento de voz"
                : "Iniciar reconocimiento de voz"
            }
          >
            {isRecording ? (
              <div className="relative">
                <div className="absolute inset-0 bg-red-400 rounded-full animate-ping"></div>
                <MicOff className="w-5 h-5 text-white relative z-10" />
              </div>
            ) : (
              <Mic className="w-5 h-5 text-white" />
            )}
          </Button>

          <Button
            type="submit"
            disabled={!userInput.trim()}
            className="h-12 px-5 bg-[#6841ea] hover:bg-[#5a36d4] text-white rounded-lg disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
