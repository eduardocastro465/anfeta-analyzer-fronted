// components/ActividadesView.tsx
import React from "react";
import { Actividad } from "./types";

interface Props {
  estadisticas: any;
  actividades: Actividad[];
  totalActividades: number;
  totalTareas: number;
  onViewActividad: (actividad: Actividad) => void;
  onViewTarea: (tarea: any, actividad: Actividad) => void;
}

export default function ActividadesView({
  estadisticas,
  actividades,
  totalActividades,
  totalTareas,
  onViewActividad,
  onViewTarea
}: Props) {
  return (
    <div>
      <h2>Dashboard de Actividades</h2>
      <p>Total actividades: {totalActividades}</p>
      <p>Total tareas: {totalTareas}</p>
      
      {actividades.map(act => (
        <div key={act.actividadId}>
          <button onClick={() => onViewActividad(act)}>
            {act.titulo}
          </button>
        </div>
      ))}
    </div>
  );
}