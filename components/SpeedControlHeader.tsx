import { Volume2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface SpeedControlHeaderProps {
  rate: number;
  changeRate: (value: number) => void;
  isSpeaking: boolean;
  theme: "light" | "dark" | "auto";
}

const PRESET_SPEEDS = [
  { label: "0.8x", value: 0.8 },
  { label: "1.2x", value: 1.2 },
  { label: "1.6x", value: 1.6 },
  { label: "2.0x", value: 2.0 },
];

export function SpeedControlHeader({
  rate,
  changeRate,
  isSpeaking,
  theme,
}: SpeedControlHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isSpeaking}
        aria-label="Controlar velocidad de voz"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
          theme === "dark"
            ? "bg-[#2a2a2a] hover:bg-[#353535] text-gray-300 disabled:opacity-50"
            : "bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
        }`}
      >
        <Volume2 className="w-4 h-4" />
        <span className="text-xs font-medium">{rate.toFixed(1)}x</span>
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 top-12 w-56 rounded-lg border p-3 shadow-lg z-50 ${
            theme === "dark"
              ? "bg-[#1a1a1a] border-[#2a2a2a]"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span>Velocidad</span>
                <span className="text-[#6841ea]">{rate.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={rate}
                onChange={(e) => changeRate(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#6841ea]"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Lenta</span>
                <span>Normal</span>
                <span>Rápida</span>
              </div>
            </div>

            <div
              className={`grid grid-cols-4 gap-1.5 pt-2 border-t ${
                theme === "dark" ? "border-[#2a2a2a]" : "border-gray-200"
              }`}
            >
              {PRESET_SPEEDS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => {
                    changeRate(preset.value);
                    setIsOpen(false);
                  }}
                  aria-label={`Velocidad ${preset.label}`}
                  className={`py-1 rounded text-xs font-medium transition-colors ${
                    rate === preset.value
                      ? "bg-[#6841ea] text-white"
                      : theme === "dark"
                        ? "bg-[#2a2a2a] text-gray-300 hover:bg-[#353535]"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
