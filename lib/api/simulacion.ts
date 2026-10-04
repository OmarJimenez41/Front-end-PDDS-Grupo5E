// Cliente de la simulación de cinco días del back-end (README del back-end, §12).
// El reloj, la llegada de pedidos y la replanificación ocurren en el servidor:
// el front-end solo inicia, consulta y controla la ejecución.

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export type EstadoSimulacion = 'EJECUTANDO' | 'PAUSADA' | 'FINALIZADA' | 'DETENIDA' | 'ERROR' | 'INTERRUMPIDA'

export interface Cobertura {
  inicio: string
  fin: string
  archivos: string[]
  faltantes: string[]
  pedidos: number
  lineasInvalidas: number
  errores: string[]
}

export interface VistaSimulacion {
  simulacion: {
    escenarioId: number
    estado: EstadoSimulacion
    relojH: number
    pedidosProgramados: number
    pedidosIncorporados: number
    pedidosDescartados: number
    planificaciones: number
    planificacionesFallidas: number
    primerIncumplimientoH: number | null
    pedidoIncumplimientoId: number | null
    archivos: string[]
    ultimoError: string | null
  }
  fechaInicio: string
  fechaFin: string
  /** Fecha y hora que se está simulando, al segundo. */
  fechaSimulada: string
  /** Fracción de los cinco días ya simulada, de 0 a 1. */
  progreso: number
  eventosPendientes: number | null
  pedidos: { incorporados: number; entregados: number; entregadosATiempo: number; noEntregados: number; abiertos: number }
}

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  const respuesta = await fetch(`${API}${ruta}`, { cache: 'no-store', ...init })
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null)
    throw new Error(cuerpo?.mensaje ?? `Error ${respuesta.status} en ${ruta}`)
  }
  return respuesta.json() as Promise<T>
}

/** Fecha local sin zona, como la espera el back-end: 2026-01-29T08:00:00. */
function sinZona(fecha: string): string {
  return fecha.length === 16 ? `${fecha}:00` : fecha
}

export function validarCobertura(fechaHoraInicio: string) {
  return pedir<Cobertura>(`/api/simulaciones/cobertura?inicio=${encodeURIComponent(sinZona(fechaHoraInicio))}`)
}

/** Inicia los cinco días; responde 409 con la causa si faltan archivos de ventas. */
export function iniciarCincoDias(fechaHoraInicio: string, duracionRealMin?: number) {
  return pedir<VistaSimulacion>('/api/simulaciones/cinco-dias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fechaHoraInicio: sinZona(fechaHoraInicio), ...(duracionRealMin ? { duracionRealMin } : {}) }),
  })
}

export function consultarSimulacion(escenarioId: number) {
  return pedir<VistaSimulacion>(`/api/simulaciones/${escenarioId}`)
}

export function pausarSimulacion(escenarioId: number) {
  return pedir<VistaSimulacion>(`/api/simulaciones/${escenarioId}/pausa`, { method: 'POST' })
}

export function reanudarSimulacion(escenarioId: number) {
  return pedir<VistaSimulacion>(`/api/simulaciones/${escenarioId}/reanudacion`, { method: 'POST' })
}

export function detenerSimulacion(escenarioId: number) {
  return pedir<VistaSimulacion>(`/api/simulaciones/${escenarioId}/detencion`, { method: 'POST' })
}
