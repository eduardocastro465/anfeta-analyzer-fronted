// lib/websocket.service.ts
import { io, Socket } from "socket.io-client";

export class WebSocketService {
  private socket: Socket | null = null;
  // private anfetaSocket: Socket | null = null; // segunda conexión
  private listeners: Map<string, Function[]> = new Map();
  private onConnectionError?: (message: string) => void;
  private connectionErrorNotified = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  /**
   * Conecta al WebSocket del servidor
   * @param email - Email del usuario para identificar la sala
   */

  setOnConnectionError(callback: (message: string) => void) {
    this.onConnectionError = callback;
  }
  conectar(email: string) {
    if (this.socket?.connected) {
      console.log("WebSocket ya conectado");
      return;
    }

    const backendUrl =
      process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000";

    this.socket = io(backendUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"], // 👈 CAMBIADO: incluir polling como fallback
      path: "/socket.io", // 👈 NUEVO: especificar el path
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      timeout: 10000,
    });

    // Evento de conexión exitosa
    this.socket.on("connect", () => {
      this.connectionErrorNotified = false;
      this.reconnectAttempts = 0;
      // Registrar usuario en su sala personal
      if (email) {
        this.socket?.emit("registrar", email);
      }
    });

    // Escuchar cambios en tareas
    this.socket.on("cambios-tareas", (data) => {
      const listeners = this.listeners.get("cambios-tareas") || [];
      listeners.forEach((callback) => callback(data));
    });

    // Escuchar cambios globales
    this.socket.on("cambios-globales", (data) => {
      const listeners = this.listeners.get("cambios-globales") || [];
      listeners.forEach((callback) => callback(data));
    });

    // Manejar desconexión
    this.socket.on("disconnect", (reason) => {
      if (reason === "io server disconnect") {
        // El servidor cerró la conexión, intentar reconectar manualmente
        setTimeout(() => {
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.conectar(email);
          }
        }, this.reconnectDelay * this.reconnectAttempts);
      }
      // En otros casos (ej: red perdida), socket.io intentará reconectar automáticamente
    });

    // Manejar errores
    this.socket.on("connect_error", (error) => {
      console.error("Error de conexion WebSocket:", error.message);
      if (this.onConnectionError && !this.connectionErrorNotified) {
        this.connectionErrorNotified = true;
        this.onConnectionError?.(
          "No se pudo conectar al servidor. Algunas actualizaciones en tiempo real no estarán disponibles.",
        );
      }
    });

    this.socket.on("error", (error) => {
      console.error("Error WebSocket:", error);
    });
  }

  /**
   * Registra un listener para un evento específico
   * @param evento - Nombre del evento
   * @param callback - Función a ejecutar cuando ocurra el evento
   */
  on(evento: string, callback: Function) {
    if (!this.listeners.has(evento)) {
      this.listeners.set(evento, []);
    }
    this.listeners.get(evento)!.push(callback);
  }

  /**
   * Elimina un listener
   * @param evento - Nombre del evento
   * @param callback - Función específica a eliminar (opcional)
   */
  off(evento: string, callback?: Function) {
    if (callback) {
      const listeners = this.listeners.get(evento) || [];
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    } else {
      this.listeners.delete(evento);
    }
  }

  /**
   * Emite un evento al servidor
   * @param evento - Nombre del evento
   * @param datos - Datos a enviar
   */
  emit(evento: string, datos: any) {
    if (this.socket?.connected) {
      console.log(`[WS emit] ${evento} socketId=${this.socket.id}`);
      this.socket.emit(evento, datos);
    } else {
      console.warn(`No se pudo emitir ${evento}: WebSocket no conectado`);
    }
  }

  /**
   * Desconecta el WebSocket
   */
  desconectar() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      // this.anfetaSocket?.disconnect();
      this.listeners.clear();
      this.reconnectAttempts = 0;
    }
  }

  emitWhenReady(evento: string, datos: any, timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      // Ya conectado → emitir de inmediato
      if (this.socket?.connected) {
        this.socket.emit(evento, datos);
        return resolve();
      }

      // Socket no inicializado → no podemos hacer nada
      if (!this.socket) {
        return reject(
          new Error(
            `Socket no inicializado al emitir: ${evento}. Llama wsService.conectar() primero.`,
          ),
        );
      }

      console.warn(`[WS] esperando conexión para emitir ${evento}...`);

      const timer = setTimeout(() => {
        this.socket?.off("connect", onConnect);
        reject(new Error(`Timeout esperando conexión para emitir: ${evento}`));
      }, timeout);

      const onConnect = () => {
        clearTimeout(timer);
        this.socket?.emit(evento, datos);
        resolve();
      };

      this.socket.once("connect", onConnect);
      this.socket.connect();
    });
  }
  /**
   * Verifica si el WebSocket está conectado
   */
  estaConectado(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Obtiene el ID de la conexión actual
   */
  obtenerId(): string | undefined {
    return this.socket?.id;
  }
}

// Exportar una instancia única (singleton)
export const wsService = new WebSocketService();
