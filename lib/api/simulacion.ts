// Cliente de la simulación de cinco días del back-end (README del back-end, §12).
// El reloj, la llegada de pedidos y la replanificación ocurren en el servidor:
// el front-end solo inicia, consulta y controla la ejecución.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

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
    /** Fecha cuyo 00:00 es la hora 0 del escenario, 'aaaa-mm-dd'. */
    fechaBase: string
    inicioH: number
    finH: number
    /** Segundos simulados por segundo real. */
    factor: number
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

export type TipoVehiculo = 'AUTO' | 'MOTO' | 'BICICLETA'

/** Arista certificada del plan: la unidad sale de (x1,y1) en salidaH y llega a (x2,y2) en llegadaH. */
export interface Arista { x1: number; y1: number; x2: number; y2: number; salidaH: number; llegadaH: number }

export interface RutaPlan {
  vehiculoId: number
  tipoVehiculo: TipoVehiculo
  horaInicioH: number
  horaFinH: number
  paradas: { pedidoId: number; codigoPedido: string; etaH: number; cantidad: number | null }[]
  trayectoria: Arista[]
}

export interface PlanVigente { id: number; version: number; instanteH: number; aplicable: boolean | null; rutas: RutaPlan[] }

export interface DepositoFisico { id: number; codigo: string; x: number; y: number; central: boolean; capacidad: number | null; stock: number | null }

export interface UnidadFisica {
  id: number
  codigo: string
  tipo: TipoVehiculo
  x: number
  y: number
  carga: number
  capacidad: number
  disponible: boolean
  residual: { x: number; y: number } | null
}

/** Estado operativo versionado del escenario (GET /api/escenarios/{id}/estado). */
export interface EstadoEscenario {
  relojH: number
  ultimoPlanId: number | null
  requierePlanificacion: boolean
  fisico: { almacenes: DepositoFisico[]; vehiculos: UnidadFisica[] } | null
}

export interface PedidoEscenario {
  id: number
  codigo: string
  posX: number
  posY: number
  cantidad: number
  tipo: 'REGULAR' | 'PRIORIZADO'
  horaIngresoH: number
  fechaLimiteH: number
  estado: string
}

export async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  const respuesta = await fetch(`${API_URL}${ruta}`, { cache: 'no-store', ...init })
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

/** Mensaje legible para la interfaz, distinguiendo un back-end apagado de un rechazo. */
export function mensajeError(error: unknown): string {
  if (error instanceof TypeError) return `No se pudo conectar con el back-end (${API_URL}). ¿Está en ejecución?`
  return error instanceof Error ? error.message : 'Error inesperado al llamar al back-end'
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

/** Sube un archivo mensual de ventas a la carpeta de datos del back-end. */
export function subirVentas(archivo: File) {
  const datos = new FormData()
  datos.append('archivo', archivo, archivo.name)
  return pedir<{ guardadoComo: string; pedidos: number; lineasInvalidas: number }>('/api/simulaciones/archivos-ventas', { method: 'POST', body: datos })
}

export function estadoEscenario(escenarioId: number) {
  return pedir<EstadoEscenario>(`/api/escenarios/${escenarioId}/estado`)
}

/** Plan vigente del escenario, o null mientras todavía no hay ninguno publicado. */
export async function planVigente(escenarioId: number): Promise<PlanVigente | null> {
  const respuesta = await fetch(`${API_URL}/api/escenarios/${escenarioId}/plan`, { cache: 'no-store' })
  if (respuesta.status === 404) return null
  if (!respuesta.ok) throw new Error(`Error ${respuesta.status} al leer el plan`)
  return respuesta.json() as Promise<PlanVigente>
}

/** Pedidos que ya entraron a la operación y siguen sin entregar. */
export function pedidosAbiertos(escenarioId: number) {
  return pedir<PedidoEscenario[]>(`/api/escenarios/${escenarioId}/pedidos/pendientes`)
}
