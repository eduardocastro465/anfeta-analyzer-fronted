import { useEffect, useRef } from "react";
import type { Message, AssistantAnalysis } from "@/lib/types";
import type { MensajeHistorial } from "@/lib/interface/historial.interface";
import { restaurarMensajesConComponentes } from "@/components/chat/restaurarMensaje";

// ✅ INTERFAZ CORREGIDA - Todos los tipos opcionales donde sea necesario
interface UseMessageRestorationProps {
  conversacionActiva?: string | null;              // ✅ Opcional
  mensajesRestaurados?: MensajeHistorial[];        // ✅ Opcional
  analisisRestaurado?: AssistantAnalysis | null;   // ✅ Opcional
  theme: "light" | "dark";
  displayName: string;
  email: string;
  onOpenReport?: () => void;
  onStartVoiceMode?: () => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setStep: (step: any) => void;
  setIsTyping: (isTyping: boolean) => void;
  setAssistantAnalysis: (analysis: AssistantAnalysis | null) => void;
  assistantAnalysisRef: React.MutableRefObject<AssistantAnalysis | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;  // ✅ Acepta null
}

/**
 * Hook personalizado para manejar la restauración de conversaciones
 * desde el historial, manteniendo los componentes React originales
 * 
 * @example
 * ```tsx
 * useMessageRestoration({
 *   conversacionActiva,
 *   mensajesRestaurados,
 *   analisisRestaurado,
 *   theme,
 *   displayName,
 *   email: colaborador.email,
 *   onOpenReport: () => setMostrarModalReporte(true),
 *   onStartVoiceMode: handleStartVoiceMode,
 *   setMessages,
 *   setStep,
 *   setIsTyping,
 *   setAssistantAnalysis,
 *   assistantAnalysisRef,
 *   scrollRef,
 * });
 * ```
 */
export function useMessageRestoration({
  conversacionActiva,
  mensajesRestaurados,
  analisisRestaurado,
  theme,
  displayName,
  email,
  onOpenReport,
  onStartVoiceMode,
  setMessages,
  setStep,
  setIsTyping,
  setAssistantAnalysis,
  assistantAnalysisRef,
  scrollRef,
}: UseMessageRestorationProps) {
  // Ref para evitar procesar la misma conversación múltiples veces
  const restorationProcessedRef = useRef<string | null>(null);

  useEffect(() => {
    // ========== VALIDACIONES ==========
    
    // 1. No hay conversación activa
    if (!conversacionActiva) {
      return;
    }

    // 2. No hay mensajes para restaurar
    if (!mensajesRestaurados || mensajesRestaurados.length === 0) {
      return;
    }

    // 3. Ya procesamos esta conversación
    if (restorationProcessedRef.current === conversacionActiva) {
      return;
    }

    // ========== INICIO DE RESTAURACIÓN ==========
    
    console.log("🔄 Iniciando restauración de conversación");
    console.log("📝 Mensajes a restaurar:", mensajesRestaurados.length);
    console.log("📊 Análisis disponible:", !!analisisRestaurado);

    // Marcar como procesada para evitar re-procesos
    restorationProcessedRef.current = conversacionActiva;

    // ========== PASO 1: CONVERTIR MENSAJES ==========
    
    const mensajes = restaurarMensajesConComponentes(
      mensajesRestaurados,
      analisisRestaurado ?? null,  // ✅ Convertir undefined a null
      theme,
      displayName,
      email,
      onOpenReport,
      onStartVoiceMode
    );

    console.log("✅ Mensajes restaurados con componentes:", mensajes.length);

    // ========== PASO 2: ACTUALIZAR ESTADO ==========
    
    // Actualizar mensajes
    setMessages(mensajes);

    // Restaurar análisis si existe
    if (analisisRestaurado) {
      console.log("📊 Restaurando análisis del asistente");
      assistantAnalysisRef.current = analisisRestaurado;
      setAssistantAnalysis(analisisRestaurado);
    }

    // Actualizar estado de la aplicación
    setStep("ready");
    setIsTyping(false);

    // ========== PASO 3: SCROLL AL FINAL ==========
    
    // Delay para asegurar que el DOM se haya renderizado
    const scrollTimer = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 150);

    console.log("✅ Restauración completada");

    // Cleanup
    return () => {
      clearTimeout(scrollTimer);
    };
  }, [
    conversacionActiva,
    mensajesRestaurados,
    analisisRestaurado,
    theme,
    displayName,
    email,
    onOpenReport,
    onStartVoiceMode,
    setMessages,
    setStep,
    setIsTyping,
    setAssistantAnalysis,
    assistantAnalysisRef,
    scrollRef,
  ]);

  // Resetear cuando se cambia de conversación o se crea una nueva
  useEffect(() => {
    if (!conversacionActiva) {
      restorationProcessedRef.current = null;
    }
  }, [conversacionActiva]);

  // Retornar si la restauración fue exitosa
  return {
    isRestored: restorationProcessedRef.current === conversacionActiva,
  };
}