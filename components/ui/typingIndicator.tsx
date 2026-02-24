interface TypingIndicatorProps {
  theme: "light" | "dark";
}

export function TypingIndicator({ theme }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className="flex gap-1">
        {[0, 150, 300].map((delay) => (
          <div
            key={delay}
            className={`w-2 h-2 rounded-full animate-bounce ${
              theme === "dark" ? "bg-gray-500" : "bg-gray-400"
            }`}
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}