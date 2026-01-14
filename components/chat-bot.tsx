"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Actividad, Colaborador, TaskReport, ReporteCompleto } from "@/lib/types"
import { sendReporte } from "@/lib/api"
import {
  Bot,
  FileText,
  Send,
  LogOut,
  AlertCircle,
  Loader2,
  PartyPopper,
} from "lucide-react"

interface ChatBotProps {
  colaborador: Colaborador
  actividades: Actividad[]
  onLogout: () => void
}

type ChatStep = 
  | "welcome" 
  | "show-tasks" 
  | "ask-task-selection"
  | "loading-pendientes"
  | "show-pendientes"
  | "ask-pendiente-selection"
  | "ask-time"
  | "ask-description"
  | "confirm-next"
  | "finished"
  | "sending"

interface Message {
  id: string
  type: "bot" | "user" | "system"
  content: string | React.ReactNode
  timestamp: Date
}

export interface Pendiente {
  id: string
  text: string
  checked: boolean
  updatedAt: string
  images: string[]
  bloque: number
}


const getDisplayName = (colaborador: Colaborador) => {
  if (colaborador.firstName || colaborador.lastName) {
    return `${colaborador.firstName || ""} ${colaborador.lastName || ""}`.trim()
  }
  return colaborador.email.split("@")[0]
}

export function ChatBot({ colaborador, actividades, onLogout }: ChatBotProps) {
  const [step, setStep] = useState<ChatStep>("welcome")
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(0)
  const [taskReports, setTaskReports] = useState<TaskReport[]>([])
  const [userInput, setUserInput] = useState<string>("")
  const [messages, setMessages] = useState<Message[]>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const welcomeSentRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [selectedTasks, setSelectedTasks] = useState<Actividad[]>([])
const [currentTaskPendientes, setCurrentTaskPendientes] = useState<Pendiente[]>([])
  const [selectedPendienteIds, setSelectedPendienteIds] = useState<string[]>([])
  const [currentTime, setCurrentTime] = useState<string>("")
  const [currentDescription, setCurrentDescription] = useState<string>("")

  const HORA_INICIO = 9
  const HORA_FIN = 24

  // Filtrar actividades por horario
  const actividadesEnHorario = actividades.filter((actividad) => {
    if (!actividad || !actividad.id || !actividad.titulo || actividad.titulo.trim() === "") {
      return false
    }
    if (!actividad.dueStart && !actividad.dueEnd) return false
    
    try {
      const startDate = new Date(actividad.dueStart || actividad.dueEnd)
      const endDate = new Date(actividad.dueEnd || actividad.dueStart)
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false
      
      const startHour = startDate.getHours()
      const endHour = endDate.getHours()
      
      const isDuranteHorario = 
        (startHour >= HORA_INICIO && startHour < HORA_FIN) ||
        (endHour > HORA_INICIO && endHour <= HORA_FIN) ||
        (startHour < HORA_INICIO && endHour > HORA_FIN)
      
      return isDuranteHorario
    } catch (error) {
      return false
    }
  }).filter(Boolean)

  const currentTask = selectedTasks[currentTaskIndex]
  const displayName = getDisplayName(colaborador)

  const addMessage = (type: Message["type"], content: string | React.ReactNode) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newMessage])
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (inputRef.current && step !== "loading-pendientes" && step !== "sending") {
      inputRef.current.focus()
    }
  }, [step])

  useEffect(() => {
    if (!welcomeSentRef.current) {
      welcomeSentRef.current = true
      
      setTimeout(() => {
        addMessage("bot", `¡Hola ${displayName}! Soy tu asistente para registro de actividades.`)
        setTimeout(() => {
          showTaskList()
        }, 800)
      }, 500)
    }
  }, [])

  const showTaskList = () => {
    const taskList = (
      <div className="space-y-2 mt-2">
        {actividadesEnHorario.map((task, idx) => (
          <div key={task.id} className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">{idx + 1}</Badge>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{task.titulo}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">{task.status}</Badge>
                  {task.prioridad && task.prioridad !== "Sin prioridad" && (
                    <Badge variant="default" className="text-xs">{task.prioridad}</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
    
    addMessage("bot", (
      <div>
        <p className="mb-2">
          Tienes {actividadesEnHorario.length} tarea{actividadesEnHorario.length !== 1 ? "s" : ""} para hoy (9:00 AM - 5:00 PM):
        </p>
        {taskList}
      </div>
    ))
    
    setTimeout(() => {
      addMessage("bot", "Escribe los números de las tareas que trabajarás hoy, separados por comas. Ejemplo: 1, 2, 3")
      setStep("ask-task-selection")
    }, 1000)
  }

const handleTaskSelection = (input: string) => {
  const numbers = input
    .split(",")
    .map(n => parseInt(n.trim()))
    .filter(n => !isNaN(n) && n > 0 && n <= actividadesEnHorario.length)

  if (numbers.length === 0) {
    addMessage("bot", "No reconocí números válidos.")
    return
  }

  const selected = numbers.map(n => actividadesEnHorario[n - 1])

  addMessage("user", input)
  addMessage("system", `Seleccionadas: ${selected.map(t => t.titulo).join(", ")}`)

  // ⬇️ IMPORTANTE
  setSelectedTasks(selected)
  setCurrentTaskIndex(0)

  setTimeout(() => {
    startTaskWorkflow(selected, 0)
  }, 300)
}

const startTaskWorkflow = async (
  tasks = selectedTasks,
  index = currentTaskIndex
) => {
  const task = tasks[index]

  if (!task) {
    console.error("No hay tarea seleccionada")
    addMessage("bot", "Hubo un problema al cargar la tarea.")
    return
  }

  addMessage("bot", `Perfecto! Trabajaremos en: "${task.titulo}"`)
    
    try {
      const response = await fetch(
        `https://wlserver-production.up.railway.app/api/actividades/${task.id}`
      )

      
console.log("📦 RESPUESTA COMPLETA API /actividades/:id", response)
    const result: {
  success: boolean
  data?: {
    pendientes?: Pendiente[]
  }
} = await response.json()
      
if (result.success && result.data?.pendientes) {
  setCurrentTaskPendientes(result.data.pendientes)

  if (result.data.pendientes.length > 0) {
    showPendientesList(result.data.pendientes)
  } else {
    noPendientes()
  }
}

    } catch (error) {
      console.error("Error:", error)
      noPendientes()
    }
  }


  

  const showPendientesList = (pendientes: any[]) => {
    const pendientesList = (
      <div className="space-y-1.5 mt-2">
        {pendientes.map((p, idx) => (
          <div key={p.id || idx} className="p-2 bg-muted/50 rounded text-sm flex gap-2">
            <Badge variant="outline" className="shrink-0">{idx + 1}</Badge>
            <span className={p.checked ? "line-through text-muted-foreground" : ""}>
              {p.text}
            </span>
            {p.checked && <Badge variant="secondary" className="text-xs ml-auto">✓</Badge>}
          </div>
        ))}
      </div>
    )
    
    addMessage("bot", (
      <div>
        <p className="mb-2">Esta tarea tiene {pendientes.length} pendiente{pendientes.length !== 1 ? "s" : ""}:</p>
        {pendientesList}
      </div>
    ))
    
    setTimeout(() => {
      addMessage("bot", "Escribe los números de los pendientes en los que trabajaste, separados por comas. O escribe '0' si trabajaste en la tarea en general.")
      setStep("ask-pendiente-selection")
    }, 1000)
  }

  const noPendientes = () => {
    addMessage("bot", "Esta tarea no tiene pendientes específicos.")
    setTimeout(() => {
      askForTime()
    }, 500)
  }

  const handlePendienteSelection = (input: string) => {
    addMessage("user", input)
    
    if (input.trim() === "0") {
      addMessage("system", "Trabajaste en la tarea en general")
      setSelectedPendienteIds([])
    } else {
      const numbers = input.split(",").map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n > 0 && n <= currentTaskPendientes.length)
      
      if (numbers.length === 0) {
        addMessage("bot", "No reconocí números válidos. Escribe los números de los pendientes o '0' para ninguno.")
        return
      }

      const selected = numbers.map(n => currentTaskPendientes[n - 1].id || currentTaskPendientes[n - 1].text)
      setSelectedPendienteIds(selected)
      
      const selectedNames = numbers.map(n => currentTaskPendientes[n - 1].text).join(", ")
      addMessage("system", `Pendientes: ${selectedNames}`)
    }
    
    setTimeout(() => {
      askForTime()
    }, 500)
  }

  const askForTime = () => {
    addMessage("bot", "¿Cuántos minutos trabajaste en esta tarea?")
    setStep("ask-time")
  }

  const handleTimeInput = (input: string) => {
    const minutes = parseInt(input.trim())
    
    if (isNaN(minutes) || minutes <= 0) {
      addMessage("bot", "Por favor escribe un número válido de minutos.")
      return
    }

    setCurrentTime(input)
    addMessage("user", `${minutes} minutos`)
    
    setTimeout(() => {
      addMessage("bot", "Describe brevemente qué trabajaste en esta tarea:")
      setStep("ask-description")
    }, 500)
  }

  const handleDescriptionInput = (input: string) => {
    if (!input.trim()) {
      addMessage("bot", "Por favor describe tu trabajo para continuar.")
      return
    }

    setCurrentDescription(input)
    addMessage("user", input)
    
    // Crear reporte
    const report: TaskReport = {
      taskId: currentTask.id,
      titulo: currentTask.titulo,
      tiempoTrabajado: parseInt(currentTime),
      descripcionTrabajo: input.trim(),
      completada: true,
    }

    setTaskReports((prev) => [...prev, report])
    addMessage("system", "✓ Tarea registrada")
    
    setTimeout(() => {
      if (currentTaskIndex < selectedTasks.length - 1) {
        addMessage("bot", `Te quedan ${selectedTasks.length - currentTaskIndex - 1} tarea${selectedTasks.length - currentTaskIndex - 1 !== 1 ? "s" : ""}. ¿Continuamos con la siguiente? (sí/no)`)
        setStep("confirm-next")
      } else {
        finishAllTasks()
      }
    }, 500)
    
    // Reset
    setCurrentTime("")
    setCurrentDescription("")
    setSelectedPendienteIds([])
  }

  const handleConfirmNext = (input: string) => {
    const response = input.toLowerCase().trim()
    addMessage("user", input)
    
    if (response === "si" || response === "sí" || response === "s") {
      setCurrentTaskIndex((prev) => prev + 1)
      setTimeout(() => {
        startTaskWorkflow()
      }, 500)
    } else {
      finishAllTasks()
    }
  }

  const finishAllTasks = () => {
    addMessage("bot", `¡Excelente trabajo! Has registrado ${taskReports.length} tarea${taskReports.length !== 1 ? "s" : ""} con un total de ${taskReports.reduce((acc, t) => acc + t.tiempoTrabajado, 0)} minutos.`)
    setTimeout(() => {
      addMessage("bot", "¿Quieres enviar el reporte? (sí/no)")
      setStep("finished")
    }, 800)
  }

  const handleSendConfirmation = async (input: string) => {
    const response = input.toLowerCase().trim()
    addMessage("user", input)
    
    if (response === "si" || response === "sí" || response === "s") {
      await sendReport()
    } else {
      addMessage("bot", "Entendido. Tu reporte no fue enviado. Puedes cerrar sesión cuando quieras.")
    }
  }

  const sendReport = async () => {
    setStep("sending")
    addMessage("system", "Enviando reporte...")

    const reporte: ReporteCompleto = {
      colaborador,
      fecha: new Date().toISOString(),
      tareas: taskReports,
      totalTiempo: taskReports.reduce((acc, t) => acc + t.tiempoTrabajado, 0),
    }

    try {
      await sendReporte(reporte)
      setShowSuccessDialog(true)
      addMessage("system", "✓ Reporte enviado exitosamente")
    } catch (error) {
      addMessage("system", `✗ Error: ${error instanceof Error ? error.message : "Error desconocido"}`)
      addMessage("bot", "Hubo un error al enviar. ¿Quieres intentar nuevamente? (sí/no)")
      setStep("finished")
    }
  }

  const handleUserInput = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userInput.trim()) return

    const input = userInput.trim()
    setUserInput("")

    switch (step) {
      case "ask-task-selection":
        handleTaskSelection(input)
        break
      case "ask-pendiente-selection":
        handlePendienteSelection(input)
        break
      case "ask-time":
        handleTimeInput(input)
        break
      case "ask-description":
        handleDescriptionInput(input)
        break
      case "confirm-next":
        handleConfirmNext(input)
        break
      case "finished":
        handleSendConfirmation(input)
        break
      default:
        break
    }
  }

  const canUserType = ![
    "welcome",
    "show-tasks",
    "loading-pendientes",
    "show-pendientes",
    "sending"
  ].includes(step)

  return (
   <div className="h-full bg-muted/30 p-4">

      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Asistente de Tareas</CardTitle>
                <p className="text-sm text-muted-foreground">{displayName}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowLogoutDialog(true)}>
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </CardHeader>
        </Card>

        {/* Chat Area */}
        <Card className="flex flex-col">
          <div className="max-h-[60vh] overflow-y-auto p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-2 ${
                      message.type === "bot"
                        ? "bg-muted text-foreground"
                        : message.type === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100 text-sm"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 border-t">
            <form onSubmit={handleUserInput} className="flex gap-2">
              <Input
                ref={inputRef}
                type="text"
                placeholder={
                  canUserType
                    ? "Escribe tu respuesta..."
                    : "Espera a que el asistente termine..."
                }
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={!canUserType}
                className="flex-1"
              />
              <Button type="submit" disabled={!canUserType || !userInput.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </Card>

        {/* Summary Card */}
        {taskReports.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Resumen del Reporte
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="space-y-2">
                {taskReports.map((report, idx) => (
                  <div
                    key={report.taskId}
                    className="flex items-center justify-between text-sm py-1 border-b last:border-0"
                  >
                    <span className="truncate flex-1">
                      {idx + 1}. {report.titulo}
                    </span>
                    <Badge variant="outline">{report.tiempoTrabajado} min</Badge>
                  </div>
                ))}
                <div className="flex items-center justify-between font-medium pt-2">
                  <span>Total:</span>
                  <span>{taskReports.reduce((acc, t) => acc + t.tiempoTrabajado, 0)} minutos</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Success Dialog */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <PartyPopper className="w-5 h-5" />
              ¡Reporte enviado!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tu reporte ha sido enviado exitosamente.
              <br />
              <br />
              Resumen:
              <ul className="list-disc list-inside mt-2">
                <li>
                  {taskReports.length} tarea{taskReports.length !== 1 ? "s" : ""} registrada
                  {taskReports.length !== 1 ? "s" : ""}
                </li>
                <li>{taskReports.reduce((acc, t) => acc + t.tiempoTrabajado, 0)} minutos totales</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={onLogout}>Cerrar sesión</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout Confirm Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              {taskReports.length > 0
                ? `Tienes ${taskReports.length} tarea${taskReports.length !== 1 ? "s" : ""} registrada${taskReports.length !== 1 ? "s" : ""}. ¿Estás seguro que deseas salir?`
                : "¿Estás seguro que deseas salir?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onLogout}>Salir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}