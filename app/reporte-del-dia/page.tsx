"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  ChevronDown,
  ChevronRight,
  Search,
  Target,
  XCircle,
  Calendar,
  Timer,
  RefreshCw,
} from "lucide-react";
// import {  } from "@/lib/api";

// Tipos
type EstadoTarea = "pendiente" | "No completado" | "completado";

interface Pendiente {
  nombre: string;
  descripcion: string;
  estado: EstadoTarea;
  duracionPendienteMin: number;
}

interface Reporte {
  userId: string;
  userName?: string;
  proyectoNombre: string;
  actividadId: string;
  pendientes: Pendiente[];
  motivoNoCompletado: string;
  completado: boolean;
  fechaReporte: string;
}

const DEMO_MODE = true;

// Datos de ejemplo
const reportesData: Reporte[] = [
  {
    userId: "user-001",
    userName: "Carlos Méndez",
    proyectoNombre: "Chatbot IA",
    actividadId: "ACT-01",
    pendientes: [
      {
        nombre: "Configurar cron de reportes",
        descripcion:
          "Definir job diario para generar snapshot matutino y cierre vespertino usando node-cron",
        estado: "completado",
        duracionPendienteMin: 45,
      },
      {
        nombre: "Validar endpoint de reportes",
        descripcion:
          "Probar respuesta del endpoint /reportes/diario con distintos usuarios y fechas",
        estado: "completado",
        duracionPendienteMin: 30,
      },
    ],
    motivoNoCompletado: "",
    completado: true,
    fechaReporte: "2026-01-22",
  },

  {
    userId: "user-001",
    userName: "Carlos Méndez",
    proyectoNombre: "Dashboard Analytics",
    actividadId: "ACT-02",
    pendientes: [
      {
        nombre: "Diseñar gráficas de productividad",
        descripcion:
          "Definir KPIs (completadas, bloqueadas, tiempo) y mockear visualizaciones para stakeholders",
        estado: "completado",
        duracionPendienteMin: 60,
      },
      {
        nombre: "Conectar API de reportes",
        descripcion:
          "Consumir endpoint del backend y mapear datos al modelo del dashboard",
        estado: "No completado",
        duracionPendienteMin: 45,
      },
    ],
    motivoNoCompletado:
      "El cliente no entregó credenciales de acceso al entorno de pruebas",
    completado: false,
    fechaReporte: "2026-01-22",
  },

  {
    userId: "user-002",
    userName: "Ana García",
    proyectoNombre: "App Móvil",
    actividadId: "ACT-03",
    pendientes: [
      {
        nombre: "Implementar login con JWT",
        descripcion:
          "Autenticación con email y contraseña, manejo de tokens y refresh automático",
        estado: "completado",
        duracionPendienteMin: 90,
      },
      {
        nombre: "Pruebas unitarias de autenticación",
        descripcion:
          "Cobertura de login, logout y expiración de sesión usando Jest",
        estado: "completado",
        duracionPendienteMin: 60,
      },
      {
        nombre: "Deploy a staging",
        descripcion:
          "Subir build a entorno staging y validar flujo completo en dispositivos reales",
        estado: "completado",
        duracionPendienteMin: 30,
      },
    ],
    motivoNoCompletado: "",
    completado: true,
    fechaReporte: "2026-01-22",
  },

  {
    userId: "user-003",
    userName: "Roberto Luna",
    proyectoNombre: "Chatbot IA",
    actividadId: "ACT-04",
    pendientes: [
      {
        nombre: "Entrenar modelo NLP",
        descripcion:
          "Reentrenar modelo con nuevos datos de conversaciones reales del último mes",
        estado: "pendiente",
        duracionPendienteMin: 120,
      },
      {
        nombre: "Documentación técnica",
        descripcion:
          "Actualizar README con arquitectura, flujos de reporte y decisiones técnicas",
        estado: "No completado",
        duracionPendienteMin: 45,
      },
    ],
    motivoNoCompletado:
      "El servidor de GPU estuvo fuera de servicio durante la mayor parte del día",
    completado: false,
    fechaReporte: "2026-01-22",
  },

  {
    userId: "user-004",
    userName: "María Rodríguez",
    proyectoNombre: "E-commerce",
    actividadId: "ACT-05",
    pendientes: [
      {
        nombre: "Integrar pasarela de pagos",
        descripcion:
          "Implementar Stripe con manejo de errores y validación de pagos fallidos",
        estado: "completado",
        duracionPendienteMin: 180,
      },
      {
        nombre: "Optimizar carrito de compras",
        descripcion:
          "Mejorar rendimiento y persistencia del carrito entre sesiones",
        estado: "pendiente",
        duracionPendienteMin: 120,
      },
    ],
    motivoNoCompletado: "",
    completado: false,
    fechaReporte: "2026-01-22",
  },
];

interface UserSummary {
  userId: string;
  userName: string;
  totalTareas: number;
  completadas: number;
  pendientes: number;
  noCompletadas: number;
  tiempoTotal: number;
  proyectos: string[];
  reportes: Reporte[];
  porcentaje: number;
}

type FilterStatus = "todos" | "completado" | "pendiente" | "no-completado";

export default function ReporteDiaPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("todos");
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [fechaFormateada, setFechaFormateada] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarReportes = async () => {
      try {
        const hoy = new Date();
        setFechaFormateada(
          hoy.toLocaleDateString("es-MX", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        );
        // const data = 
        
        const data = reportesData;

        console.log("Reporte crudo:", data);

        const reportesValidos = Array.isArray(data)
          ? data.filter(
              (r) => Array.isArray(r.pendientes) && r.pendientes.length > 0,
            )
          : [];

        console.log("Reporte limpio:", reportesValidos);

        // ✅ SIEMPRE setear, aunque esté vacío
        setReportes(reportesValidos);
      } catch (error) {
        console.error("Error al obtener reportes", error);
        // ❌ NO usar datos fake
        setReportes([]);
      } finally {
        setLoading(false);
      }
    };

    cargarReportes();
  }, []);

  // Agrupar por usuario con useMemo para optimización
  const userSummaries = useMemo<UserSummary[]>(() => {
    return Object.values(
      reportes.reduce(
        (acc, reporte) => {
          if (!acc[reporte.userId]) {
            acc[reporte.userId] = {
              userId: reporte.userId,
              userName: reporte.userName || reporte.userId,
              totalTareas: 0,
              completadas: 0,
              pendientes: 0,
              noCompletadas: 0,
              tiempoTotal: 0,
              proyectos: [],
              reportes: [],
              porcentaje: 0,
            };
          }

          const user = acc[reporte.userId];
          user.reportes.push(reporte);

          if (!user.proyectos.includes(reporte.proyectoNombre)) {
            user.proyectos.push(reporte.proyectoNombre);
          }

          reporte.pendientes.forEach((p) => {
            user.totalTareas++;
            user.tiempoTotal += p.duracionPendienteMin;
            if (p.estado === "completado") user.completadas++;
            else if (p.estado === "pendiente") user.pendientes++;
            else if (p.estado === "No completado") user.noCompletadas++;
          });

          user.porcentaje =
            user.totalTareas > 0
              ? Math.round((user.completadas / user.totalTareas) * 100)
              : 0;

          return acc;
        },
        {} as Record<string, UserSummary>,
      ),
    );
  }, [reportes]);

  // Filtrar usuarios
  const filteredUsers = useMemo(() => {
    return userSummaries.filter((user) => {
      const matchesSearch =
        user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.proyectos.some((p) =>
          p.toLowerCase().includes(searchTerm.toLowerCase()),
        );

      if (filterStatus === "todos") return matchesSearch;
      if (filterStatus === "completado")
        return matchesSearch && user.porcentaje === 100;
      if (filterStatus === "pendiente")
        return matchesSearch && user.pendientes > 0;
      if (filterStatus === "no-completado")
        return matchesSearch && user.noCompletadas > 0;

      return matchesSearch;
    });
  }, [userSummaries, searchTerm, filterStatus]);

  // Stats globales
  const globalStats = useMemo(() => {
    const stats = {
      totalUsuarios: userSummaries.length,
      totalTareas: userSummaries.reduce((acc, u) => acc + u.totalTareas, 0),
      completadas: userSummaries.reduce((acc, u) => acc + u.completadas, 0),
      pendientes: userSummaries.reduce((acc, u) => acc + u.pendientes, 0),
      noCompletadas: userSummaries.reduce((acc, u) => acc + u.noCompletadas, 0),
      tiempoTotal: userSummaries.reduce((acc, u) => acc + u.tiempoTotal, 0),
    };
    return {
      ...stats,
      porcentaje:
        stats.totalTareas > 0
          ? Math.round((stats.completadas / stats.totalTareas) * 100)
          : 0,
    };
  }, [userSummaries]);

  const toggleUser = (userId: string) => {
    setExpandedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) newSet.delete(userId);
      else newSet.add(userId);
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedUsers(new Set(userSummaries.map((u) => u.userId)));
  };

  const collapseAll = () => {
    setExpandedUsers(new Set());
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      //   const data = await obtenerReportesDelDia();

      if (DEMO_MODE) {
        console.warn("🚧 DEMO MODE: usando datos estáticos");
        setReportes(reportesData);
        return;
      }

      //   const reportesValidos = Array.isArray(data)
      //     ? data.filter(
      //         (r) => Array.isArray(r.pendientes) && r.pendientes.length > 0,
      //       )
      //     : [];
      //   console.log(data);
      //   setReportes(reportesValidos);
    } catch {
      setReportes([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return "bg-emerald-500";
    if (percentage >= 75) return "bg-emerald-500";
    if (percentage >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusConfig = (estado: EstadoTarea) => {
    const configs = {
      completado: {
        icon: <CheckCircle2 className="w-4 h-4" />,
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        text: "text-emerald-400",
        label: "Completado",
      },
      pendiente: {
        icon: <Clock className="w-4 h-4" />,
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
        text: "text-amber-400",
        label: "Pendiente",
      },
      "No completado": {
        icon: <XCircle className="w-4 h-4" />,
        bg: "bg-red-500/10",
        border: "border-red-500/20",
        text: "text-red-400",
        label: "No completado",
      },
    };
    return configs[estado] || configs.pendiente;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Cargando reportes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-100">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#09090b]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="hover:bg-white/5 text-gray-400 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="hidden sm:block h-6 w-px bg-white/10" />
              <div>
                <h1 className="text-lg font-semibold text-white">
                  Panel de Reportes
                </h1>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span className="capitalize">{fechaFormateada}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="hidden sm:flex items-center gap-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                <span className="text-sm">Actualizar</span>
              </Button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-emerald-400">
                  En vivo
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <MetricCard
            icon={<Users className="w-4 h-4" />}
            label="Usuarios"
            value={globalStats.totalUsuarios}
            trend={`${globalStats.totalUsuarios} activos`}
            color="violet"
          />
          <MetricCard
            icon={<Target className="w-4 h-4" />}
            label="Total"
            value={globalStats.totalTareas}
            trend="tareas asignadas"
            color="slate"
          />
          <MetricCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Completadas"
            value={globalStats.completadas}
            trend={`${globalStats.porcentaje}% del total`}
            color="emerald"
          />
          <MetricCard
            icon={<Clock className="w-4 h-4" />}
            label="Pendientes"
            value={globalStats.pendientes}
            trend="en progreso"
            color="amber"
          />
          <MetricCard
            icon={<XCircle className="w-4 h-4" />}
            label="Bloqueadas"
            value={globalStats.noCompletadas}
            trend="requieren atención"
            color="red"
          />
          <MetricCard
            icon={<Timer className="w-4 h-4" />}
            label="Tiempo"
            value={formatDuration(globalStats.tiempoTotal)}
            trend="tiempo total"
            color="blue"
          />
        </div>

        {/* Progress Overview */}
        <div className="mb-6 p-5 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-white">
                Progreso General
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Rendimiento del equipo hoy
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-white">
                {globalStats.porcentaje}%
              </span>
              <p className="text-xs text-gray-500">
                {globalStats.completadas} de {globalStats.totalTareas}
              </p>
            </div>
          </div>

          {/* Stacked Progress Bar */}
          <div className="h-2 bg-white/5 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-700 ease-out"
              style={{
                width: `${
                  globalStats.totalTareas > 0
                    ? (globalStats.completadas / globalStats.totalTareas) * 100
                    : 0
                }%`,
              }}
            />
            <div
              className="h-full bg-amber-500 transition-all duration-700 ease-out"
              style={{
                width: `${(globalStats.pendientes / globalStats.totalTareas) * 100}%`,
              }}
            />
            <div
              className="h-full bg-red-500 transition-all duration-700 ease-out"
              style={{
                width: `${(globalStats.noCompletadas / globalStats.totalTareas) * 100}%`,
              }}
            />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-3">
            <LegendItem
              color="bg-emerald-500"
              label="Completadas"
              value={globalStats.completadas}
            />
            <LegendItem
              color="bg-amber-500"
              label="Pendientes"
              value={globalStats.pendientes}
            />
            <LegendItem
              color="bg-red-500"
              label="Bloqueadas"
              value={globalStats.noCompletadas}
            />
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col lg:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por nombre o proyecto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-lg p-1">
              {[
                { key: "todos", label: "Todos", count: userSummaries.length },
                {
                  key: "completado",
                  label: "Completados",
                  count: userSummaries.filter((u) => u.porcentaje === 100)
                    .length,
                },
                {
                  key: "pendiente",
                  label: "Pendientes",
                  count: userSummaries.filter((u) => u.pendientes > 0).length,
                },
                {
                  key: "no-completado",
                  label: "Bloqueados",
                  count: userSummaries.filter((u) => u.noCompletadas > 0)
                    .length,
                },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setFilterStatus(filter.key as FilterStatus)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    filterStatus === filter.key
                      ? "bg-violet-500 text-white shadow-lg shadow-violet-500/25"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {filter.label}
                  <span
                    className={`ml-1.5 ${filterStatus === filter.key ? "text-violet-200" : "text-gray-500"}`}
                  >
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-1 border-l border-white/10 pl-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={expandAll}
                className="text-xs text-gray-400 hover:text-white hover:bg-white/5 h-8 px-2"
              >
                Expandir
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={collapseAll}
                className="text-xs text-gray-400 hover:text-white hover:bg-white/5 h-8 px-2"
              >
                Colapsar
              </Button>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-3">
          {filteredUsers.length === 0 ? (
            <EmptyState searchTerm={searchTerm} />
          ) : (
            filteredUsers.map((user) => (
              <UserCard
                key={user.userId}
                user={user}
                isExpanded={expandedUsers.has(user.userId)}
                onToggle={() => toggleUser(user.userId)}
                formatDuration={formatDuration}
                getProgressColor={getProgressColor}
                getInitials={getInitials}
                getStatusConfig={getStatusConfig}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}

// Componentes auxiliares
function MetricCard({
  icon,
  label,
  value,
  trend,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend: string;
  color: "violet" | "slate" | "emerald" | "amber" | "red" | "blue";
}) {
  const colorStyles = {
    violet: "text-violet-400 bg-violet-500/10",
    slate: "text-gray-400 bg-white/5",
    emerald: "text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    red: "text-red-400 bg-red-500/10",
    blue: "text-blue-400 bg-blue-500/10",
  };

  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
      <div
        className={`w-8 h-8 rounded-lg ${colorStyles[color]} flex items-center justify-center mb-3`}
      >
        {icon}
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function LegendItem({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs font-medium text-gray-300">{value}</span>
    </div>
  );
}

function EmptyState({ searchTerm }: { searchTerm: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
        <Users className="w-8 h-8 text-gray-600" />
      </div>
      <h3 className="text-lg font-medium text-white mb-1">
        No se encontraron resultados
      </h3>
      <p className="text-sm text-gray-500 text-center max-w-sm">
        {searchTerm
          ? `No hay usuarios que coincidan con "${searchTerm}"`
          : "No hay usuarios con el filtro seleccionado"}
      </p>
    </div>
  );
}

function UserCard({
  user,
  isExpanded,
  onToggle,
  formatDuration,
  getProgressColor,
  getInitials,
  getStatusConfig,
}: {
  user: UserSummary;
  isExpanded: boolean;
  onToggle: () => void;
  formatDuration: (min: number) => string;
  getProgressColor: (pct: number) => string;
  getInitials: (name: string) => string;
  getStatusConfig: (estado: EstadoTarea) => {
    icon: React.ReactNode;
    bg: string;
    border: string;
    text: string;
    label: string;
  };
}) {
  const avatarColors = [
    "from-violet-600 to-purple-700",
    "from-blue-600 to-cyan-700",
    "from-emerald-600 to-teal-700",
    "from-amber-600 to-orange-700",
    "from-pink-600 to-rose-700",
  ];

  const colorIndex =
    user.userId.charCodeAt(user.userId.length - 1) % avatarColors.length;

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        isExpanded
          ? "bg-white/[0.03] border-white/10"
          : "bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
      }`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-4 text-left"
      >
        {/* Avatar */}
        <div
          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarColors[colorIndex]} flex items-center justify-center font-semibold text-white text-sm shadow-lg shrink-0`}
        >
          {getInitials(user.userName)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-medium text-white truncate">{user.userName}</h3>
            {user.porcentaje === 100 && (
              <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-400">
                  Completado
                </span>
              </span>
            )}
            {user.noCompletadas > 0 && (
              <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-3 h-3 text-red-400" />
                <span className="text-[10px] font-medium text-red-400">
                  {user.noCompletadas} bloqueadas
                </span>
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">
            {user.proyectos.join(" · ")}
          </p>
        </div>

        {/* Desktop Stats */}
        <div className="hidden md:flex items-center gap-8">
          <div className="flex items-center gap-4">
            <StatBadge
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              value={user.completadas}
              color="emerald"
            />
            <StatBadge
              icon={<Clock className="w-3.5 h-3.5" />}
              value={user.pendientes}
              color="amber"
            />
            <StatBadge
              icon={<XCircle className="w-3.5 h-3.5" />}
              value={user.noCompletadas}
              color="red"
            />
          </div>

          <div className="w-px h-8 bg-white/10" />

          <div className="w-32">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                Progreso
              </span>
              <span className="text-xs font-semibold text-white">
                {user.porcentaje}%
              </span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor(user.porcentaje)} transition-all duration-500`}
                style={{ width: `${user.porcentaje}%` }}
              />
            </div>
          </div>

          <div className="text-right min-w-[60px]">
            <p className="text-sm font-semibold text-white">
              {formatDuration(user.tiempoTotal)}
            </p>
            <p className="text-[10px] text-gray-500">tiempo</p>
          </div>
        </div>

        {/* Expand Icon */}
        <div
          className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            isExpanded
              ? "bg-violet-500/10 text-violet-400"
              : "text-gray-500 hover:bg-white/5"
          }`}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Mobile Stats */}
      <div className="md:hidden px-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatBadge
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              value={user.completadas}
              color="emerald"
            />
            <StatBadge
              icon={<Clock className="w-3.5 h-3.5" />}
              value={user.pendientes}
              color="amber"
            />
            <StatBadge
              icon={<XCircle className="w-3.5 h-3.5" />}
              value={user.noCompletadas}
              color="red"
            />
          </div>
          <span className="text-xs font-semibold text-white">
            {user.porcentaje}%
          </span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-2">
          <div
            className={`h-full ${getProgressColor(user.porcentaje)} transition-all`}
            style={{ width: `${user.porcentaje}%` }}
          />
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-white/5 p-4">
          <div className="space-y-3">
            {user.reportes.map((reporte, idx) => (
              <div
                key={`${reporte.actividadId}-${reporte.proyectoNombre}`}
                className="p-4 rounded-lg bg-black/20 border border-white/5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm">
                      {reporte.proyectoNombre}
                    </span>
                    <span className="text-[10px] text-gray-500 px-1.5 py-0.5 rounded bg-white/5 font-mono">
                      {reporte.actividadId}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                      reporte.completado
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {reporte.completado ? "Completado" : "En progreso"}
                  </span>
                </div>

                <div className="space-y-2">
                  {reporte.pendientes.map((tarea, tIdx) => {
                    const config = getStatusConfig(tarea.estado);
                    return (
                      <div
                        key={tIdx}
                        className={`flex items-center justify-between p-2.5 rounded-lg ${config.bg} border ${config.border}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={config.text}>{config.icon}</span>
                          <span className="text-sm text-gray-300 truncate">
                            {tarea.nombre}
                            {tarea.descripcion && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                {tarea.descripcion}
                              </p>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-medium ${config.text}`}
                          >
                            {config.label}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {formatDuration(tarea.duracionPendienteMin)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {reporte.motivoNoCompletado && (
                  <div className="mt-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <div className="flex gap-3">
                      <div className="shrink-0 w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-red-400 uppercase tracking-wide mb-1">
                          Motivo de bloqueo
                        </p>
                        <p className="text-sm text-gray-300 leading-relaxed">
                          {reporte.motivoNoCompletado}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBadge({
  icon,
  value,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  color: "emerald" | "amber" | "red";
}) {
  const colors = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
  };

  return (
    <div className={`flex items-center gap-1 ${colors[color]}`}>
      {icon}
      <span className="text-xs font-semibold">{value}</span>
    </div>
  );
}
