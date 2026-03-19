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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";

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

  const stats = useMemo(() => {
    const totalActividades = actividades.length;
    const totalReportes = actividades.reduce((acc, act) => acc + (act.tareasConExplicacion || 0), 0);
    
    const actividadesConReportes = actividades.filter(act => 
      (act.tareasConExplicacion || 0) > 0
    ).length;

    const colaboradoresConReportes = new Set<string>();
    actividades.forEach(act => {
      if (act.tareasConExplicacion > 0) {
        act.colaboradores?.forEach(email => {
          if (email && email !== "Sin colaborador") colaboradoresConReportes.add(email);
        });
      }
    });

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

  const colaboradoresData = useMemo(() => {
    const colaboradorMap = new Map<string, { 
      nombre: string; 
      email: string; 
      reportes: number;
      actividades: number;
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
            actividades: 0
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

  const reportesPorFecha = useMemo(() => {
    const dias = periodo === 'semana' ? 7 : periodo === 'mes' ? 30 : 90;
    
    const fechasMap = new Map<string, { fecha: string; reportes: number; actividades: number }>();
    
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

    actividades.forEach(act => {
      if (fechasMap.has(act.fecha) && act.tareasConExplicacion > 0) {
        const item = fechasMap.get(act.fecha)!;
        item.reportes += act.tareasConExplicacion || 0;
        item.actividades += 1;
      }
    });

    return Array.from(fechasMap.values());
  }, [actividades, periodo]);

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

  const pieData = [
    { name: 'Con reportes', value: stats.actividadesConReportes, color: '#10b981' },
    { name: 'Sin reportes', value: stats.actividadesSinReportes, color: '#f59e0b' }
  ].filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs">
          <p className="text-gray-400 mb-0.5">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-300">{entry.name}:</span>
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
      <div className="flex flex-col items-center justify-center h-64 text-center p-4 bg-gray-800/50 rounded border border-gray-700">
        <div className="text-red-400 text-sm mb-2">Error al cargar datos</div>
        <div className="text-gray-400 text-xs mb-3">{error}</div>
        <button
          onClick={fetchActividades}
          className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#181717] rounded-xl">
      {/* Header minimalista - sin gradientes, sin iconos */}
      <div className="border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-medium text-white">Dashboard</h1>
            <p className="text-xs text-gray-500">
              {stats.totalReportes} reportes · {stats.actividadesConReportes} actividades
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-gray-800 rounded overflow-hidden">
              {['semana', 'mes', 'trimestre'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p as any)}
                  className={`px-2 py-1 text-xs ${
                    periodo === p 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {p === 'semana' ? '7d' : p === 'mes' ? '30d' : '90d'}
                </button>
              ))}
            </div>
            
            <button
              onClick={fetchActividades}
              disabled={cargando}
              className="px-2 py-1 text-xs bg-gray-800 text-gray-400 rounded hover:bg-gray-700 disabled:opacity-50"
            >
              {cargando ? '...' : 'Actualizar'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats simples - sin iconos */}
      <div className="grid grid-cols-4 gap-3 p-4 border-b border-gray-800">
        <div className="bg-gray-800/50 rounded p-3">
          <div className="text-xs text-gray-500 mb-1">Reportes</div>
          <div className="text-xl font-medium text-white">{stats.totalReportes}</div>
        </div>
        <div className="bg-gray-800/50 rounded p-3">
          <div className="text-xs text-gray-500 mb-1">Actividades</div>
          <div className="text-xl font-medium text-white">{stats.actividadesConReportes}</div>
        </div>
        <div className="bg-gray-800/50 rounded p-3">
          <div className="text-xs text-gray-500 mb-1">Completadas</div>
          <div className="text-xl font-medium text-white">{stats.reportesEnCompletadas}</div>
        </div>
        <div className="bg-gray-800/50 rounded p-3">
          <div className="text-xs text-gray-500 mb-1">Colaboradores</div>
          <div className="text-xl font-medium text-white">{stats.totalColaboradores}</div>
        </div>
      </div>

      {/* Tabs simples */}
      <div className="flex gap-1 px-4 py-2 border-b border-gray-800">
        {['colaboradores', 'actividades', 'tendencias'].map((tab) => (
          <button
            key={tab}
            onClick={() => setVista(tab as any)}
            className={`px-3 py-1 text-xs rounded ${
              vista === tab 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab === 'colaboradores' ? 'Colaboradores' : 
             tab === 'actividades' ? 'Actividades' : 'Tendencias'}
          </button>
        ))}
      </div>

      {/* Contenido principal */}
      <div className="p-4">
        {cargando ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Gráfico principal */}
            <div className="bg-gray-800/50 rounded p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {vista === 'colaboradores' && 'Reportes por colaborador'}
                  {vista === 'actividades' && `Reportes por fecha (${periodo})`}
                  {vista === 'tendencias' && 'Tendencia mensual'}
                </h3>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-xs text-gray-500">Reportes</span>
                </div>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  {vista === 'colaboradores' ? (
                    <BarChart data={colaboradoresData} layout="vertical" margin={{ left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                      <XAxis type="number" stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                      <YAxis dataKey="nombre" type="category" stroke="#666" tick={{ fill: '#999', fontSize: 10 }} width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="reportes" fill="#4f46e5" radius={[0, 2, 2, 0]} />
                    </BarChart>
                  ) : vista === 'actividades' ? (
                    <AreaChart data={reportesPorFecha}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="fecha" stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                      <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="reportes" stroke="#4f46e5" fill="#4f46e520" />
                    </AreaChart>
                  ) : (
                    <LineChart data={tendenciasData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="mes" stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                      <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="reportes" stroke="#4f46e5" strokeWidth={2} dot={{ fill: '#4f46e5', r: 3 }} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Segunda fila - 2 columnas */}
            <div className="grid grid-cols-2 gap-4">
              {/* Gráfico de pastel */}
              <div className="bg-gray-800/50 rounded p-4">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                  Cobertura
                </h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={2}
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
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {pieData.map((item, index) => (
                    <div key={index} className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-gray-500">{item.name}</span>
                      </div>
                      <div className="text-sm font-medium text-white">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top colaboradores simplificado */}
              <div className="bg-gray-800/50 rounded p-4">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                  Top colaboradores
                </h3>
                <div className="space-y-3">
                  {colaboradoresData.slice(0, 4).map((colab, index) => (
                    <div key={colab.email} className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs text-white">{colab.nombre}</span>
                          <span className="text-xs text-gray-500">{colab.reportes}</span>
                        </div>
                        <div className="h-1 bg-gray-700 rounded overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 rounded"
                            style={{ width: `${(colab.reportes / colaboradoresData[0].reportes) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Últimas actividades */}
            <div className="bg-gray-800/50 rounded p-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                Últimas actividades
              </h3>
              <div className="space-y-2">
                {actividades
                  .filter(act => act.tareasConExplicacion > 0)
                  .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                  .slice(0, 5)
                  .map((act) => (
                    <div key={act.actividadId} className="flex items-center justify-between text-sm py-1 border-b border-gray-700 last:border-0">
                      <div className="flex-1">
                        <div className="text-white text-xs truncate max-w-[200px]">{act.titulo}</div>
                        <div className="text-gray-500 text-[10px]">
                          {new Date(act.fecha).toLocaleDateString('es-MX')}
                        </div>
                      </div>
                      <div className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                        {act.tareasConExplicacion}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}