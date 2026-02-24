import React from "react";
import Image from "next/image";
import {
  Menu,
  PictureInPicture,
  Minimize2,
  Moon,
  Sun,
  LogOut,
  BarChart3,
} from "lucide-react";
import { SpeedControlHeader } from "./SpeedControlHeader";
import { HeaderProps } from "@/lib/types";

export const ChatHeader: React.FC<HeaderProps> = ({
  isInPiPWindow,
  theme,
  toggleTheme,
  displayName,
  colaborador,
  rate,
  changeRate,
  isSpeaking,
  isPiPMode,
  openPiPWindow,
  closePiPWindow,
  setShowLogoutDialog,
  onOpenSidebar,
  isMobile,
  isSidebarOpen,
  onViewReports,
}) => {
  const isAdminJohn = colaborador.email === "jjohn@pprin.com";

  // ── PiP MODE ──────────────────────────────────────────────────────────────
  if (isInPiPWindow) {
    return (
      <div
        className={`fixed top-0 left-0 right-0 z-20 ${
          theme === "dark" ? "bg-[#1a1a1a]" : "bg-white"
        } border-b ${theme === "dark" ? "border-white/5" : "border-black/5"}`}
      >
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  theme === "dark" ? "bg-[#252527]" : "bg-gray-100"
                }`}
              >
                <Image
                  src="/icono.webp"
                  alt="Chat"
                  width={16}
                  height={16}
                  className="object-contain"
                />
              </div>
              <h2 className="text-sm font-bold truncate">Anfeta Asistente</h2>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  theme === "dark"
                    ? "bg-[#2a2a2a] hover:bg-[#353535]"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {theme === "light" ? (
                  <Moon className="w-3 h-3" />
                ) : (
                  <Sun className="w-3 h-3" />
                )}
              </button>
              <button
                onClick={() => window.close()}
                aria-label="Close"
                className="w-7 h-7 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700 transition-colors"
              >
                <span className="text-white text-xs font-bold leading-none">
                  ✕
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── NORMAL MODE ───────────────────────────────────────────────────────────
  return (
    <div className="relative top-0 left-0 right-0 z-20">
      <div
        className={`absolute top-0 left-0 right-0 h-24 pointer-events-none bg-gradient-to-b ${
          theme === "dark"
            ? "from-[#101010]/90 via-[#101010]/60 to-transparent"
            : "from-white/80 via-white/40 to-transparent"
        }`}
      />

      <div className="relative max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          {/* ── LEFT ─────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {isMobile && !isSidebarOpen && onOpenSidebar && (
              <button
                onClick={onOpenSidebar}
                aria-label="Open sidebar"
                className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  theme === "dark"
                    ? "bg-[#2a2a2a] hover:bg-[#353535]"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <Menu className="w-4 h-4 text-[#6841ea]" />
              </button>
            )}

            <div className="flex-shrink-0 animate-tilt">
              <Image
                src="/icono.webp"
                alt="Chat"
                width={isMobile ? 48 : 64}
                height={isMobile ? 48 : 64}
                className="rounded-full drop-shadow-[0_0_12px_rgba(168,139,255,0.85)]"
              />
            </div>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold leading-tight">
                Asistente
              </h1>
              <p
                className={`text-xs sm:text-sm truncate ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              >
                <span>{displayName}</span>
                <span className="hidden sm:inline"> • {colaborador.email}</span>
                {isAdminJohn && (
                  <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 rounded-full">
                    Admin
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* ── RIGHT ────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <SpeedControlHeader
              rate={rate}
              changeRate={changeRate}
              isSpeaking={isSpeaking}
              theme={theme}
            />

            {isAdminJohn && (
              <button
                onClick={() => onViewReports?.()}
                className={`h-9 rounded-lg text-sm font-medium flex items-center gap-1.5 px-2 sm:px-3 transition-colors ${
                  theme === "dark"
                    ? "bg-[#2a2a2a] text-gray-300 hover:bg-[#353535]"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <BarChart3 className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Reportes</span>
              </button>
            )}

            <button
              onClick={isPiPMode ? closePiPWindow : openPiPWindow}
              aria-label={isPiPMode ? "Exit PiP" : "Enter PiP"}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                isPiPMode
                  ? "bg-red-600 hover:bg-red-700"
                  : theme === "dark"
                    ? "bg-[#2a2a2a] hover:bg-[#353535]"
                    : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {isPiPMode ? (
                <Minimize2 className="w-4 h-4 text-white" />
              ) : (
                <PictureInPicture className="w-4 h-4 text-[#6841ea]" />
              )}
            </button>

            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                theme === "dark"
                  ? "bg-[#2a2a2a] hover:bg-[#353535]"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4 text-gray-700" />
              ) : (
                <Sun className="w-4 h-4 text-gray-300" />
              )}
            </button>

            <button
              onClick={() => setShowLogoutDialog(true)}
              aria-label="Logout"
              className={`h-9 rounded-lg text-sm font-medium flex items-center gap-1.5 px-2 sm:px-3 transition-colors ${
                theme === "dark"
                  ? "bg-[#2a2a2a] text-gray-300 hover:bg-[#353535]"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
