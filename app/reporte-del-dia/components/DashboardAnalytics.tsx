"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import {
  Users,
  Calendar,
  FileText,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Download,
  RefreshCw,
  BarChart3,
  AlertCircle,
  ChevronRight,
  MessageSquare
} from "lucide-react";

interface Tarea {
  pendienteId: string;
  nombre: string;
  terminada: boolean;
  tieneExplicacion: boolean;
}

interface Actividad {
  actividadId: string;
  titulo: string;
  fecha: string;
  status: string;
  colaboradores: string[];
  tareas: Tarea[];
  totalTareas: number;
  tareasConExplicacion: number;
}

export default function DashboardAnalytics() {
  const [periodo, setPeriodo] = useState<'semana' | 'mes' | 'trimestre'>('semana');
  const [vista, setVista] = useState<'colaboradores' | 'actividades' | 'tendencias'>('colaboradores');
  const [cargando, setCargando] = useState(false);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchActividades = async () => {
    setCargando(true);
    setError(null);
    
    try {
      const response = await fetch("http://localhost:4000/api/v1/admin/todas-actividades", {
        credentials: "include",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }
      
      const data = await response.json();
      setActividades(data.actividades || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchActividades();
  }, []);

  // Calcular stats basados en REPORTES (explicaciones)
  const stats = useMemo(() => {
    const totalActividades = actividades.length;
    const totalReportes = actividades.reduce((acc, act) => acc + (act.tareasConExplicacion || 0), 0);
    
    // Actividades que tienen al menos un reporte
    const actividadesConReportes = actividades.filter(act => 
      (act.tareasConExplicacion || 0) > 0
    ).length;

    // Colaboradores que han hecho reportes
    const colaboradoresConReportes = new Set<string>();
    actividades.forEach(act => {
      if (act.tareasConExplicacion > 0) {
        act.colaboradores?.forEach(email => {
          if (email && email !== "Sin colaborador") colaboradoresConReportes.add(email);
        });
      }
    });

    // Total de reportes por estado de actividad (solo para métrica)
    const reportesEnCompletadas = actividades
      .filter(act => act.status?.toLowerCase().includes('complet') || act.status?.toLowerCase().includes('termin'))
      .reduce((acc, act) => acc + (act.tareasConExplicacion || 0), 0);
    
    const reportesEnPendientes = totalReportes - reportesEnCompletadas;

    return {
      totalActividades,
      totalReportes,
      actividadesConReportes,
      actividadesSinReportes: totalActividades - actividadesConReportes,
      totalColaboradores: colaboradoresConReportes.size,
      reportesEnCompletadas,
      reportesEnPendientes
    };
  }, [actividades]);

  // Datos por colaborador (basado en reportes)
  const colaboradoresData = useMemo(() => {
    const colaboradorMap = new Map<string, { 
      nombre: string; 
      email: string; 
      reportes: number;
      actividades: number;
      color: string;
    }>();

    actividades.forEach(act => {
      if (act.tareasConExplicacion > 0) {
        act.colaboradores?.forEach(email => {
          if (!email || email === "Sin colaborador") return;
          
          const nombre = email.split('@')[0];
          const actual = colaboradorMap.get(email) || {
            nombre,
            email,
            reportes: 0,
            actividades: 0,
            color: `#${Math.floor(Math.random()*16777215).toString(16)}`
          };
          
          actual.reportes += act.tareasConExplicacion || 0;
          actual.actividades += 1;
          
          colaboradorMap.set(email, actual);
        });
      }
    });

    return Array.from(colaboradorMap.values())
      .sort((a, b) => b.reportes - a.reportes)
      .slice(0, 10);
  }, [actividades]);

  // Reportes por fecha (según período)
  const reportesPorFecha = useMemo(() => {
    const dias = periodo === 'semana' ? 7 : periodo === 'mes' ? 30 : 90;
    
    const fechasMap = new Map<string, { fecha: string; reportes: number; actividades: number }>();
    
    // Inicializar últimos N días
    for (let i = dias - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const fechaStr = date.toISOString().split('T')[0];
      const fechaLabel = date.toLocaleDateString('es-MX', { 
        day: '2-digit', 
        month: '2-digit'
      });
      fechasMap.set(fechaStr, { fecha: fechaLabel, reportes: 0, actividades: 0 });
    }

    // Contar reportes por fecha
    actividades.forEach(act => {
      if (fechasMap.has(act.fecha) && act.tareasConExplicacion > 0) {
        const item = fechasMap.get(act.fecha)!;
        item.reportes += act.tareasConExplicacion || 0;
        item.actividades += 1;
      }
    });

    return Array.from(fechasMap.values());
  }, [actividades, periodo]);

  // Tendencias mensuales de reportes
  const tendenciasData = useMemo(() => {
    const mesesMap = new Map<string, { mes: string; reportes: number; actividades: number }>();
    
    actividades.forEach(act => {
      if (act.tareasConExplicacion > 0) {
        const fecha = new Date(act.fecha);
        const mesKey = `${fecha.getFullYear()}-${fecha.getMonth()}`;
        const mesLabel = fecha.toLocaleDateString('es-MX', { month: 'short' });
        
        const actual = mesesMap.get(mesKey) || { mes: mesLabel, reportes: 0, actividades: 0 };
        actual.reportes += act.tareasConExplicacion || 0;
        actual.actividades += 1;
        
        mesesMap.set(mesKey, actual);
      }
    });

    return Array.from(mesesMap.values()).slice(-6);
  }, [actividades]);

  // Datos para gráfico de pastel (actividades con/sin reportes)
  const pieData = [
    { name: 'Con reportes', value: stats.actividadesConReportes, color: '#10b981' },
    { name: 'Sin reportes', value: stats.actividadesSinReportes, color: '#f59e0b' }
  ].filter(item => item.value > 0);

  const COLORS = ['#6841ea', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-3 shadow-xl">
          <p className="text-xs text-white/40 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-white/60">{entry.name}:</span>
              <span className="text-white font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-white/[0.02] rounded-xl border border-white/5">
        <AlertCircle className="w-12 h-12 text-red-400/60 mb-3" />
        <p className="text-sm text-white/60 mb-2">Error al cargar datos</p>
        <p className="text-xs text-white/30 mb-4">{error}</p>
        <button
          onClick={fetchActividades}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors border border-indigo-500/20"
        >
          <RefreshCw className="w-3 h-3" />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#181717] rounded-3xl font-sans antialiased">
      {/* Header */}
      <header className="sticky  z-40  backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-medium text-white/90">Dashboard de Reportes</h1>
                <p className="text-xs text-white/40">
                  {stats.totalReportes} reportes en {stats.actividadesConReportes} actividades
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg">
                <button
                  onClick={() => setPeriodo('semana')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    periodo === 'semana' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => setPeriodo('mes')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    periodo === 'mes' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  Mes
                </button>
                <button
                  onClick={() => setPeriodo('trimestre')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    periodo === 'trimestre' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  Trimestre
                </button>
              </div>

              <button
                onClick={fetchActividades}
                disabled={cargando}
                className="p-2 text-white/40 hover:text-white/60 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {cargando ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/[0.02] hover:bg-white/[0.03] rounded-xl p-4 border border-white/5 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                  </div>
                  <TrendingUp className="w-4 h-4 text-green-400/60" />
                </div>
                <p className="text-2xl font-semibold text-white/90">{stats.totalReportes}</p>
                <p className="text-xs text-white/40">Total de reportes</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/[0.02] hover:bg-white/[0.03] rounded-xl p-4 border border-white/5 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                </div>
                <p className="text-2xl font-semibold text-white/90">{stats.actividadesConReportes}</p>
                <p className="text-xs text-white/40">Actividades con reportes</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/[0.02] hover:bg-white/[0.03] rounded-xl p-4 border border-white/5 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Activity className="w-4 h-4 text-blue-400" />
                  </div>
                </div>
                <p className="text-2xl font-semibold text-white/90">{stats.reportesEnCompletadas}</p>
                <p className="text-xs text-white/40">Reportes en completadas</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/[0.02] hover:bg-white/[0.03] rounded-xl p-4 border border-white/5 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-400" />
                  </div>
                  <TrendingDown className="w-4 h-4 text-red-400/60" />
                </div>
                <p className="text-2xl font-semibold text-white/90">{stats.totalColaboradores}</p>
                <p className="text-xs text-white/40">Colaboradores con reportes</p>
              </motion.div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setVista('colaboradores')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  vista === 'colaboradores' 
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
                    : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                <Users className="w-4 h-4" />
                Reportes por colaborador
              </button>
              <button
                onClick={() => setVista('actividades')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  vista === 'actividades' 
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
                    : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Reportes por fecha
              </button>
              <button
                onClick={() => setVista('tendencias')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  vista === 'tendencias' 
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
                    : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Tendencias
              </button>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico principal según vista */}
              <motion.div
                key={vista}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/[0.02] rounded-xl p-4 border border-white/5 lg:col-span-2"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-white/60">
                    {vista === 'colaboradores' && 'Reportes por colaborador'}
                    {vista === 'actividades' && `Reportes por fecha (último ${periodo})`}
                    {vista === 'tendencias' && 'Tendencia mensual de reportes'}
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-400" />
                      <span className="text-[10px] text-white/30">Reportes</span>
                    </div>
                  </div>
                </div>

                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    {vista === 'colaboradores' ? (
                      <BarChart data={colaboradoresData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis type="number" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                        <YAxis dataKey="nombre" type="category" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} width={100} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="reportes" fill="#6841ea" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    ) : vista === 'actividades' ? (
                      <AreaChart data={reportesPorFecha}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="fecha" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                        <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area type="monotone" dataKey="reportes" stroke="#6841ea" fill="#6841ea20" />
                      </AreaChart>
                    ) : (
                      <LineChart data={tendenciasData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="mes" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                        <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="reportes" stroke="#6841ea" strokeWidth={2} dot={{ fill: '#6841ea' }} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Gráfico de pastel - Actividades con/sin reportes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/[0.02] rounded-xl p-4 border border-white/5"
              >
                <h3 className="text-sm font-medium text-white/60 mb-4">Cobertura de reportes</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {pieData.map((item, index) => (
                    <div key={index} className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[10px] text-white/40">{item.name}</span>
                      </div>
                      <p className="text-sm font-medium text-white/90">{item.value}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Top colaboradores por reportes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/[0.02] rounded-xl p-4 border border-white/5"
              >
                <h3 className="text-sm font-medium text-white/60 mb-4">Top colaboradores por reportes</h3>
                <div className="space-y-3">
                  {colaboradoresData.slice(0, 5).map((colab, index) => {
                    const maxReportes = Math.max(...colaboradoresData.map(c => c.reportes));
                    return (
                      <div key={colab.email} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-medium text-white/40">
                          #{index + 1}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-xs font-medium text-indigo-400">
                          {colab.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-medium text-white/80">{colab.nombre}</p>
                            <p className="text-[10px] text-white/40">{colab.reportes} reps.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full bg-indigo-500" 
                                style={{ width: `${(colab.reportes / maxReportes) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Últimas actividades con reportes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/[0.02] rounded-xl p-4 border border-white/5 lg:col-span-2"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-white/60">Últimas actividades con reportes</h3>
                </div>
                <div className="space-y-2">
                  {actividades
                    .filter(act => act.tareasConExplicacion > 0)
                    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                    .slice(0, 5)
                    .map((act) => (
                      <div key={act.actividadId} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-indigo-400/60" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-white/80 line-clamp-1">{act.titulo}</p>
                          <p className="text-[10px] text-white/30">
                            {new Date(act.fecha).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400/60 rounded-full">
                            {act.tareasConExplicacion} {act.tareasConExplicacion === 1 ? 'reporte' : 'reportes'}
                          </span>
                        </div>
                      </div>
                    ))}
                  
                  {actividades.filter(act => act.tareasConExplicacion > 0).length === 0 && (
                    <div className="text-center py-8 text-white/30 text-xs">
                      No hay actividades con reportes
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}