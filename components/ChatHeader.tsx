import React from "react";
import Image from "next/image";
import { Menu, Moon, Sun, LogOut, BarChart3, MoreVertical } from "lucide-react";
import { SpeedControlHeader } from "./SpeedControlHeader";
import { HeaderProps } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const ChatHeader: React.FC<HeaderProps> = ({
  theme,
  toggleTheme,
  displayName,
  colaborador,
  rate,
  changeRate,
  isSpeaking,
  setShowLogoutDialog,
  onOpenSidebar,
  isMobile,
  isSidebarOpen,
  onViewReports,
}) => {
  const isAdminJohn = colaborador.email === "jjohn@pprin.com";
  const isDark = theme === "dark";

  const leftClass =
    !isMobile && isSidebarOpen ? "left-64 sm:left-72 md:left-80" : "left-0";

  return (
    <div
      className={`
        fixed top-0 right-0 ${leftClass} z-20
        backdrop-blur-2xl border-b
        transition-all duration-300
        ${
          isDark
            ? "bg-black/20 border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/[0.04]"
            : "bg-white/25 border-black/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] ring-1 ring-black/[0.04]"
        }
      `}
      style={{
        WebkitBackdropFilter: "blur(32px) saturate(1.8)",
        backdropFilter: "blur(32px) saturate(1.8)",
      }}
    >
      {/* Degradado inferior */}
      <div
        className={`absolute bottom-0 left-0 right-0 pointer-events-none translate-y-full ${
          isDark
            ? "bg-gradient-to-b from-[#101010]/60 to-transparent"
            : "bg-gradient-to-b from-white/60 to-transparent"
        }`}
        style={{ height: "20px" }}
      />

      <div className="relative max-w-4xl mx-auto px-2 sm:px-3 py-1.5 sm:py-2">
        <div className="flex items-center justify-between gap-2">
          {/* ── LEFT ── */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {/* Botón sidebar — solo móvil cuando está cerrado */}
            {isMobile && !isSidebarOpen && onOpenSidebar && (
              <button
                onClick={onOpenSidebar}
                aria-label="Abrir sidebar"
                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  isDark
                    ? "bg-[#2a2a2a] hover:bg-[#353535]"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <Menu className="w-3.5 h-3.5 text-[#6841ea]" />
              </button>
            )}

            {/* Avatar */}
            <div className="flex-shrink-0 animate-tilt">
              <Image
                src="/icono.webp"
                alt="Chat"
                width={isMobile ? 28 : 52}
                height={isMobile ? 28 : 52}
                className="rounded-full drop-shadow-[0_0_10px_rgba(168,139,255,0.85)]"
              />
            </div>

            {/* Nombre + email */}
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-bold leading-tight truncate">
                Asistente
              </h1>
              <p
                className={`text-[10px] sm:text-xs truncate ${isDark ? "text-gray-400" : "text-gray-600"}`}
              >
                <span className="truncate">{displayName}</span>
                <span className="hidden sm:inline"> • {colaborador.email}</span>
                {isAdminJohn && (
                  <span className="ml-1 inline-flex items-center px-1 py-0.5 text-[9px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 rounded-full">
                    Admin
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Control velocidad — siempre visible */}
            <SpeedControlHeader
              rate={rate}
              changeRate={changeRate}
              isSpeaking={isSpeaking}
              theme={theme}
            />

            {/* ── DESKTOP: botones individuales ── */}
            <div className="hidden sm:flex items-center gap-1.5">
              {isAdminJohn && (
                <button
                  onClick={() => onViewReports?.()}
                  className={`h-8 rounded-lg text-xs font-medium flex items-center gap-1.5 px-2.5 transition-colors ${
                    isDark
                      ? "bg-[#2a2a2a] text-gray-300 hover:bg-[#353535]"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Reportes</span>
                </button>
              )}

              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isDark
                    ? "bg-[#2a2a2a] hover:bg-[#353535]"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {isDark ? (
                  <Sun className="w-3.5 h-3.5 text-gray-300" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-gray-700" />
                )}
              </button>

              <button
                onClick={() => setShowLogoutDialog(true)}
                aria-label="Logout"
                className={`h-8 rounded-lg text-xs font-medium flex items-center gap-1.5 px-2.5 transition-colors ${
                  isDark
                    ? "bg-[#2a2a2a] text-gray-300 hover:bg-[#353535]"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Salir</span>
              </button>
            </div>

            {/* ── MÓVIL: logout + dropdown ── */}
            <div className="flex sm:hidden items-center gap-1">
              <button
                onClick={() => setShowLogoutDialog(true)}
                aria-label="Logout"
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  isDark
                    ? "bg-[#2a2a2a] hover:bg-[#353535]"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <LogOut className="w-3 h-3 text-red-400" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                      isDark
                        ? "bg-[#2a2a2a] hover:bg-[#353535]"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    <MoreVertical
                      className="w-3 h-3"
                      style={{ color: isDark ? "#9ca3af" : "#6b7280" }}
                    />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className={`min-w-[150px] ${
                    isDark
                      ? "bg-[#1a1a1a] border-[#2a2a2a] text-white"
                      : "bg-white border-gray-200 text-gray-900"
                  }`}
                >
                  <DropdownMenuItem
                    onClick={toggleTheme}
                    className={`flex items-center gap-2 cursor-pointer ${
                      isDark
                        ? "hover:bg-[#2a2a2a] focus:bg-[#2a2a2a]"
                        : "hover:bg-gray-100 focus:bg-gray-100"
                    }`}
                  >
                    {isDark ? (
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Moon className="w-3.5 h-3.5 text-gray-600" />
                    )}
                    <span className="text-xs">
                      {isDark ? "Modo claro" : "Modo oscuro"}
                    </span>
                  </DropdownMenuItem>

                  {isAdminJohn && (
                    <>
                      <DropdownMenuSeparator
                        className={isDark ? "bg-[#2a2a2a]" : "bg-gray-200"}
                      />
                      <DropdownMenuItem
                        onClick={() => onViewReports?.()}
                        className={`flex items-center gap-2 cursor-pointer ${
                          isDark
                            ? "hover:bg-[#2a2a2a] focus:bg-[#2a2a2a]"
                            : "hover:bg-gray-100 focus:bg-gray-100"
                        }`}
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs">Reportes</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
