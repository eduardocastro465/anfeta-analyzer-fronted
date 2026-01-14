"use client"

export function FloatingChatButton() {
  const openChat = () => {
    window.open(
      "/chat",
      "chatbot",
      "width=450,height=700,resizable=yes"
    )
  }

  return (
    <button
      onClick={openChat}
      className="fixed bottom-6 right-6 z-50 rounded-full bg-primary px-4 py-3 text-white shadow-lg hover:scale-105 transition"
    >
      Abrir asistente
    </button>
  )
}
