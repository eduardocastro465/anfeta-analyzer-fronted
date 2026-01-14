import type { Colaborador, Actividad, UsersApiResponse, ActividadesApiResponse } from "./types"

const BASE_URL = "https://wlserver-production.up.railway.app"

export async function fetchColaboradores(): Promise<Colaborador[]> {
  try {
    const response = await fetch(`${BASE_URL}/api/users/search`)
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
    const data: UsersApiResponse = await response.json()
    return data.items || []
  } catch (error) {
    console.error("Error fetching colaboradores:", error)
    throw error
  }
}

export async function fetchActividadesByUser(email: string): Promise<Actividad[]> {
  try {
    // Use the assignee endpoint as per API documentation
    const response = await fetch(`${BASE_URL}/api/actividades/assignee/${encodeURIComponent(email)}`)
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
    const data: ActividadesApiResponse = await response.json()
    return data.data || []
  } catch (error) {
    console.error("Error fetching actividades:", error)
    throw error
  }
}

export async function sendReporte(reporte: unknown): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/actividades`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-device-id": "chatbot-web-app",
    },
    body: JSON.stringify(reporte),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
  }
}
