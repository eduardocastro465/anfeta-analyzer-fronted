// ============================================
// UTILIDAD: Verificar si es hora de reporte
// ============================================

/**
 * Verifica si la hora actual está dentro del rango de reporte
 * @param horaInicio - Hora de inicio en formato "3:20 PM"
 * @param horaFin - Hora de fin en formato "11:59 PM"
 * @returns true si es hora de reporte, false si no
 */
export function isReportTime(horaInicio: string, horaFin: string): boolean {
  const now = new Date();
  const currentTime = now.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  // Convertir formato "3:20 PM" a "15:20"
  const convertTo24Hour = (time12h: string): string => {
    const [time, modifier] = time12h.split(" ");
    let [hours, minutes] = time.split(":");

    if (modifier === "PM" && hours !== "12") {
      hours = String(parseInt(hours, 10) + 12);
    }
    if (modifier === "AM" && hours === "12") {
      hours = "00";
    }

    return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
  };

  const inicio24 = convertTo24Hour(horaInicio);
  const fin24 = convertTo24Hour(horaFin);

  // Detectar si cruza medianoche
  if (inicio24 > fin24) {
    return currentTime >= inicio24 || currentTime <= fin24;
  }

  return currentTime >= inicio24 && currentTime <= fin24;
}