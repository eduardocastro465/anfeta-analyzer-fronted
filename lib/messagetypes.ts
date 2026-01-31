export type Message = {
  id: string;
  type: "user" | "bot" | "voice" | "system";
  content: string | React.ReactNode;
  timestamp: Date;
  voiceText?: string;
};
export interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  theme: 'light' | 'dark';
  onVoiceMessageClick: (voiceText: string) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
  assistantAnalysis?: any; // Ajusta según tu tipo
  onOpenReport?: () => void;
  onStartVoiceMode?: () => void;
  reportConfig?: {
    horaInicio: number;
    minutoInicio: number;
    horaFin: number;
    minutoFin: number;
  };
}
export type TextMessage = {
  id: string;
  type: "user" | "bot" | "system";
  content: string;
  timestamp: Date;
};

export type JSXMessage = {
  id: string;
  type: "bot" | "system";
  content: React.ReactNode;
  timestamp: Date;
};

export type VoiceMessage = {
  id: string;
  type: "voice";
  content: string;
  voiceText: string;
  timestamp: Date;
};
export type StrictMessage = TextMessage | JSXMessage | VoiceMessage;
