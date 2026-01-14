"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fetchColaboradores, fetchActividadesByUser } from "@/lib/api"
import type { Colaborador, Actividad } from "@/lib/types"
import { User, Mail, ListTodo, ArrowRight, Loader2, AlertCircle, RefreshCw } from "lucide-react"

interface LoginFormProps {
  onLogin: (colaborador: Colaborador, actividades: Actividad[]) => void
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [selectedId, setSelectedId] = useState<string>("")
  const [colaboradorInfo, setColaboradorInfo] = useState<Colaborador | null>(null)
  const [actividadesCount, setActividadesCount] = useState<number>(0)
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [isLoadingColaboradores, setIsLoadingColaboradores] = useState(true)
  const [isLoadingActividades, setIsLoadingActividades] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadColaboradores()
  }, [])

  const loadColaboradores = async () => {
    setIsLoadingColaboradores(true)
    setError(null)
    try {
      const data = await fetchColaboradores()
      setColaboradores(data)
    } catch (err) {
      setError("Error al cargar colaboradores. Verifica tu conexión.")
      console.error(err)
    } finally {
      setIsLoadingColaboradores(false)
    }
  }

  useEffect(() => {
    if (selectedId) {
      const colaborador = colaboradores.find((c) => c._id === selectedId)
      setColaboradorInfo(colaborador || null)

      if (colaborador?.email) {
        loadActividades(colaborador.email)
      }
    } else {
      setColaboradorInfo(null)
      setActividadesCount(0)
      setActividades([])
    }
  }, [selectedId, colaboradores])

  const loadActividades = async (email: string) => {
    setIsLoadingActividades(true)
    try {
      const data = await fetchActividadesByUser(email)
      setActividades(data)
      setActividadesCount(data.length)
    } catch (err) {
      console.error(err)
      setActividades([])
      setActividadesCount(0)
    } finally {
      setIsLoadingActividades(false)
    }
  }

  const handleAcceder = () => {
    if (colaboradorInfo && actividades.length > 0) {
      onLogin(colaboradorInfo, actividades)
    }
  }

  const getDisplayName = (colaborador: Colaborador) => {
    if (colaborador.firstName || colaborador.lastName) {
      return `${colaborador.firstName || ""} ${colaborador.lastName || ""}`.trim()
    }
    return colaborador.email.split("@")[0]
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Registro de Actividades</CardTitle>
          <CardDescription>Selecciona tu usuario para comenzar a registrar tus tareas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
              <Button variant="outline" size="sm" className="mt-2 bg-transparent" onClick={loadColaboradores}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Colaborador</label>
            {isLoadingColaboradores ? (
              <div className="flex items-center justify-center p-4 border rounded-md">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Cargando colaboradores...</span>
              </div>
            ) : (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona tu usuario..." />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.map((colaborador) => (
                    <SelectItem key={colaborador._id} value={colaborador._id}>
                      <div className="flex items-center gap-2">
                        {colaborador.avatar ? (
                          <img
                            src={colaborador.avatar || "/placeholder.svg"}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                        {getDisplayName(colaborador)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {colaboradorInfo && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  {colaboradorInfo.avatar ? (
                    <img
                      src={colaboradorInfo.avatar || "/placeholder.svg"}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                      {getDisplayName(colaboradorInfo).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{getDisplayName(colaboradorInfo)}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {colaboradorInfo.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <ListTodo className="w-4 h-4" />
                    Tareas asignadas
                  </span>
                  {isLoadingActividades ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Badge variant={actividadesCount > 0 ? "default" : "secondary"}>
                      {actividadesCount} {actividadesCount === 1 ? "tarea" : "tareas"}
                    </Badge>
                  )}
                </div>
              </div>

              <Button
                onClick={handleAcceder}
                className="w-full"
                disabled={actividadesCount === 0 || isLoadingActividades}
              >
                {isLoadingActividades ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cargando tareas...
                  </>
                ) : actividadesCount > 0 ? (
                  <>
                    Acceder al ChatBot
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  "No hay tareas asignadas"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
