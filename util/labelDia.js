export function obtenerLabelDia(fechaISO) {
  const fecha = new Date(fechaISO);
  const hoy = new Date();

  const esHoy =
    fecha.toDateString() === hoy.toDateString();

  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);

  const esAyer =
    fecha.toDateString() === ayer.toDateString();

  if (esHoy) return "Hoy";
  if (esAyer) return "Ayer";

  return fecha.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

export function agruparPorDia(data) {
  return data.reduce(
    (acc, conv) => {
      const label = obtenerLabelDia(conv.createdAt);
      acc[label] ??= [];
      acc[label].push(conv);
      return acc;
    },
    {}
  );
}

