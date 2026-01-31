// "use client";

// import React, { useMemo } from "react";
// import { History, MessageSquare, Loader2 } from "lucide-react";
// import { ConversacionSidebar } from "@/lib/types";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { obtenerLabelDia } from "@/util/labelDia";

// interface SidebarHistorialProps {
//   conversaciones: ConversacionSidebar[];
//   conversacionActiva: string | null;
//   onSeleccionarConversacion: (conversacion: ConversacionSidebar) => void;
//   theme: "light" | "dark";
//   cargando: boolean;
//   isTyping?: boolean;
// }

// function agruparPorDia(
//   data: ConversacionSidebar[]
// ): Record<string, ConversacionSidebar[]> {
//   return data.reduce(
//     (acc, conv) => {
//       const dia = obtenerLabelDia(conv.createdAt);
//       acc[dia] ??= [];
//       acc[dia].push(conv);
//       return acc;
//     },
//     {} as Record<string, ConversacionSidebar[]>
//   );
// }

// export const SidebarHistorial = ({
//   conversaciones,
//   conversacionActiva,
//   onSeleccionarConversacion,
//   theme,
//   cargando,
//   isTyping = false,
// }: SidebarHistorialProps) => {
//   // Agrupar conversaciones por día (memoizado)
//   const conversacionesAgrupadas = useMemo(
//     () => agruparPorDia(conversaciones),
//     [conversaciones]
//   );

//   return (
//     <>
//       {/* Header del Sidebar */}
//       <div
//         className={`p-4 border-b ${
//           theme === "dark" ? "border-[#1a1a1a]" : "border-gray-200"
//         }`}
//       >
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-2">
//             <History className="w-5 h-5 text-[#6841ea]" />
//             <h2 className="font-semibold text-sm">Historial</h2>
//           </div>
//         </div>
//       </div>

//       {/* Lista de Conversaciones */}
//       <ScrollArea className="flex-1 px-2 py-2">
//         <div className="space-y-4">
//           {Object.entries(conversacionesAgrupadas).map(([dia, convs]) => (
//             <div key={dia}>
//               {/* Label del día */}
//               <div
//                 className={`px-2 py-1.5 text-xs font-medium uppercase tracking-wider ${
//                   theme === "dark" ? "text-gray-500" : "text-gray-400"
//                 }`}
//               >
//                 {dia}
//               </div>
//               {/* Conversaciones del día */}
//               <div className="space-y-1">
//                 {convs.map((conv) => (
//                   <button
//                     key={conv.sessionId}
//                     onClick={() => onSeleccionarConversacion(conv)}
//                     className={`w-full text-left p-2.5 rounded-lg transition-all group relative ${
//                       conversacionActiva === conv.sessionId
//                         ? theme === "dark"
//                           ? "bg-[#6841ea]/20 border border-[#6841ea]/30"
//                           : "bg-[#6841ea]/10 border border-[#6841ea]/20"
//                         : theme === "dark"
//                           ? "hover:bg-[#1a1a1a]"
//                           : "hover:bg-gray-100"
//                     }`}
//                   >
//                     <div className="flex items-start gap-2">
//                       <MessageSquare
//                         className={`w-4 h-4 mt-0.5 shrink-0 ${
//                           conversacionActiva === conv.sessionId
//                             ? "text-[#6841ea]"
//                             : theme === "dark"
//                               ? "text-gray-500"
//                               : "text-gray-400"
//                         }`}
//                       />

//                       <div className="flex-1 min-w-0">
//                         <p className="text-sm font-medium truncate">
//                           {conv.nombreConversacion ||
//                             `${new Date(conv.createdAt).toLocaleDateString("es-MX")}`}
//                         </p>

//                         <p className="text-xs text-gray-500 mt-0.5">
//                           {conv.updatedAt
//                             ? new Date(conv.updatedAt).toLocaleTimeString(
//                                 "es-MX",
//                                 {
//                                   hour: "2-digit",
//                                   minute: "2-digit",
//                                 }
//                               )
//                             : new Date(conv.createdAt).toLocaleTimeString(
//                                 "es-MX",
//                                 {
//                                   hour: "2-digit",
//                                   minute: "2-digit",
//                                 }
//                               )}
//                         </p>
//                       </div>

//                       {conversacionActiva === conv.sessionId && isTyping && (
//                         <div className="absolute right-2 top-1/2 -translate-y-1/2">
//                           <Loader2 className="w-4 h-4 animate-spin text-[#6841ea]" />
//                         </div>
//                       )}
//                     </div>
//                   </button>
//                 ))}
//               </div>
//             </div>
//           ))}

//           {cargando && (
//             <div className="flex items-center justify-center py-4">
//               <Loader2 className="w-4 h-4 animate-spin text-[#6841ea]" />
//               <span className="text-xs text-gray-500 ml-2">
//                 Cargando historial...
//               </span>
//             </div>
//           )}

//           {!cargando && conversaciones.length === 0 && (
//             <div className="p-4 text-center">
//               <p className="text-xs text-gray-500">
//                 No hay conversaciones anteriores
//               </p>
//             </div>
//           )}
//         </div>
//       </ScrollArea>

//       {/* Footer del Sidebar */}
//       <div
//         className={`p-3 border-t ${
//           theme === "dark" ? "border-[#1a1a1a]" : "border-gray-200"
//         }`}
//       >
//         <p
//           className={`text-xs text-center ${
//             theme === "dark" ? "text-gray-600" : "text-gray-400"
//           }`}
//         >
//           {new Date().toLocaleDateString("es-MX", {
//             day: "2-digit",
//             month: "2-digit",
//             year: "numeric",
//           })}
//         </p>
//       </div>
//     </>
//   );
// };