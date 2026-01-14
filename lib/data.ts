import type { Actividad, Colaborador } from "./types"
import actividadesData from "@/data/actividades.json"

export function getColaboradores(): Colaborador[] {
  const actividades = actividadesData as Actividad[]
  const emailsSet = new Set<string>()

  actividades.forEach((act) => {
    act.assignees.forEach((email) => emailsSet.add(email))
  })

  return Array.from(emailsSet).map((email) => ({
    email,
    nombre: extractNameFromEmail(email),
  }))
}

// Helper to extract name from email (e.g., "jjohn@pprin.com" -> "John")
function extractNameFromEmail(email: string): string {
  const localPart = email.split("@")[0]
  // Remove first letter if duplicated (jjohn -> john, eedwi -> edwi, aandr -> andr)
  const cleanName = localPart.replace(/^(.)\1/, "$1")
  return cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
}

export const colaboradores = getColaboradores()

export function getActividades(): Actividad[] {
  return actividadesData as Actividad[]
}

export function getActividadesByUser(email: string): Actividad[] {
  const actividades = getActividades()
  return actividades.filter((act) => act.assignees.includes(email))
}

export function getColaboradorByEmail(email: string): Colaborador | undefined {
  return colaboradores.find((c) => c.email === email)
}
