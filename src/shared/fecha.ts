export const ZONA_HORARIA_MEXICO = "America/Mexico_City"

export function fechaActualMexicoISO(): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_HORARIA_MEXICO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date())
  const valores = Object.fromEntries(
    partes.map((parte) => [parte.type, parte.value])
  )
  return `${valores.year}-${valores.month}-${valores.day}`
}

export function formatearFechaHoraMexico(valor: string | null): string {
  if (!valor) return "—"
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor
  const fecha = new Date(`${valor.replace(" ", "T")}Z`)
  if (Number.isNaN(fecha.getTime())) return valor
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: ZONA_HORARIA_MEXICO,
    dateStyle: "short",
    timeStyle: "short"
  }).format(fecha)
}
