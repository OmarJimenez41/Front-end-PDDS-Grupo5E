// Cliente del estado operativo de un escenario (README del back-end, §4 y §12).
// Lo que dibuja el mapa sale de aquí: almacenes y vehículos (estado físico),
// rutas del plan vigente y pedidos. El front-end no inventa nada de esto.

import { type VistaSimulacion, pedir } from './simulacion'

export type TipoVehiculo = 'AUTO' | 'MOTO' | 'BICICLETA'

export interface AlmacenFisico { id: number; codigo: string; x: number; y: number; central: boolean; capacidad: number | null; stock: number | null }
export interface VehiculoFisico { id: number; codigo: string; tipo: TipoVehiculo; almacenBaseId: number; capacidad: number; x: number; y: number; carga: number; disponible: boolean }

export interface EstadoOperacion {
  escenarioId: number
  versionEstado: number
  relojH: number
  horizonteH: number | null
  ultimoPlanId: number | null
  fisico: { relojH: number; almacenes: AlmacenFisico[]; vehiculos: VehiculoFisico[] } | null
}

export interface PuntoTrazado { secuencia: number; x: number; y: number; instanteH: number }
export interface Parada { pedidoId: number; codigoPedido: string; secuencia: number; etaH: number; entregado: boolean; cantidad: number }
export interface RutaPlan { id: number; vehiculoId: number; tipoVehiculo: TipoVehiculo; horaInicioH: number; horaFinH: number; distanciaKm: number; costo: number; cargaTotal: number; paradas: Parada[]; trazado: PuntoTrazado[] }
export interface PlanDistribucion { id: number; version: number; algoritmo: string; instanteH: number; costoTotal: number; distanciaTotalKm: number; cantidadRutas: number; pedidosAtendidos: number; rutas: RutaPlan[] }

export type EstadoPedido = 'PENDIENTE' | 'ASIGNADO' | 'EN_RUTA' | 'ENTREGADO' | 'NO_ENTREGADO'
export interface Pedido { id: number; codigo: string; posX: number; posY: number; cantidad: number; tipo: 'REGULAR' | 'PRIORIZADO'; horaIngresoH: number; fechaLimiteH: number; estado: EstadoPedido; entregadoEnH: number | null }

export const consultarEstado = (escenarioId: number) => pedir<EstadoOperacion>(`/api/escenarios/${escenarioId}/estado`)
export const consultarPedidos = (escenarioId: number) => pedir<Pedido[]>(`/api/escenarios/${escenarioId}/pedidos`)
export const listarSimulaciones = () => pedir<VistaSimulacion[]>('/api/simulaciones')

/** Plan vigente; antes de la primera planificación el back-end responde 404 y aquí se devuelve null. */
export async function consultarPlan(escenarioId: number): Promise<PlanDistribucion | null> {
  try { return await pedir<PlanDistribucion>(`/api/escenarios/${escenarioId}/plan`) } catch (e) {
    if (e instanceof Error && /todavía no tiene un plan|404/.test(e.message)) return null
    throw e
  }
}

// ---------------------------------------------------------------------------
// Lo que necesita el mapa, ya calculado para el instante del reloj
// ---------------------------------------------------------------------------

export type Semaforo = 'verde' | 'ambar' | 'rojo'

export interface MapaDatos {
  relojH: number
  almacenes: (AlmacenFisico & { vehiculosEnBase: number })[]
  /** Solo los vehículos que están recorriendo una ruta en este instante. */
  vehiculos: { id: number; codigo: string; tipo: TipoVehiculo; x: number; y: number; carga: number; capacidad: number }[]
  rutas: { id: number; vehiculoId: number; tipo: TipoVehiculo; puntos: [number, number][]; recorrido: [number, number][] }[]
  /** Pedidos aún no entregados, con su semáforo de margen (fecha límite − ETA). */
  pedidos: { id: number; codigo: string; x: number; y: number; cantidad: number; estado: EstadoPedido; semaforo: Semaforo; margenH: number | null }[]
  resumen: { pedidosAbiertos: number; vehiculosEnRuta: number; costoPlan: number | null; distanciaPlanKm: number | null; algoritmo: string | null }
}

/** Umbrales por defecto del semáforo de pedidos (horas de margen); los mismos del panel de parámetros. */
export const UMBRALES_PEDIDO = { verde: 8, rojo: 2 }

const semaforo = (margen: number | null): Semaforo => margen == null || margen >= UMBRALES_PEDIDO.verde ? 'verde' : margen < UMBRALES_PEDIDO.rojo ? 'rojo' : 'ambar'

/** Posición sobre el trazado en el instante t (interpolación lineal entre puntos). */
function posicionEn(trazado: PuntoTrazado[], t: number): { x: number; y: number; indice: number } {
  if (t <= trazado[0].instanteH) return { x: trazado[0].x, y: trazado[0].y, indice: 0 }
  for (let i = 1; i < trazado.length; i++) {
    const a = trazado[i - 1], b = trazado[i]
    if (t <= b.instanteH) {
      const f = b.instanteH > a.instanteH ? (t - a.instanteH) / (b.instanteH - a.instanteH) : 1
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, indice: i }
    }
  }
  const u = trazado[trazado.length - 1]
  return { x: u.x, y: u.y, indice: trazado.length - 1 }
}

export function datosMapa(estado: EstadoOperacion, plan: PlanDistribucion | null, pedidos: Pedido[]): MapaDatos {
  const reloj = estado.fisico?.relojH ?? estado.relojH
  const fisicos = estado.fisico?.vehiculos ?? []
  const rutasActivas = (plan?.rutas ?? []).filter(r => r.trazado.length > 1 && r.horaFinH >= reloj)
  const enRuta = new Set(rutasActivas.filter(r => r.horaInicioH <= reloj).map(r => r.vehiculoId))

  const vehiculos = rutasActivas.filter(r => enRuta.has(r.vehiculoId)).map(r => {
    const f = fisicos.find(v => v.id === r.vehiculoId)
    const p = posicionEn(r.trazado, reloj)
    return { id: r.vehiculoId, codigo: f?.codigo ?? `V-${r.vehiculoId}`, tipo: r.tipoVehiculo, x: p.x, y: p.y, carga: f?.carga ?? r.cargaTotal, capacidad: f?.capacidad ?? r.cargaTotal }
  })

  const rutas = rutasActivas.map(r => {
    const p = posicionEn(r.trazado, reloj)
    const puntos = r.trazado.map(q => [q.x, q.y] as [number, number])
    // Lo ya recorrido se dibuja tenue; lo que falta, sólido
    const recorrido = r.horaInicioH <= reloj ? [...puntos.slice(0, p.indice), [p.x, p.y] as [number, number]] : []
    return { id: r.id, vehiculoId: r.vehiculoId, tipo: r.tipoVehiculo, puntos, recorrido }
  })

  const eta = new globalThis.Map<number, number>()
  for (const r of plan?.rutas ?? []) for (const s of r.paradas) if (!s.entregado) eta.set(s.pedidoId, Math.max(eta.get(s.pedidoId) ?? 0, s.etaH))
  const abiertos = pedidos.filter(p => p.estado !== 'ENTREGADO' && p.estado !== 'NO_ENTREGADO')
  const marcas = abiertos.map(p => {
    const llegada = eta.get(p.id)
    const margen = llegada != null ? p.fechaLimiteH - llegada : p.fechaLimiteH - reloj
    return { id: p.id, codigo: p.codigo, x: p.posX, y: p.posY, cantidad: p.cantidad, estado: p.estado, semaforo: semaforo(margen), margenH: margen }
  })

  const almacenes = (estado.fisico?.almacenes ?? []).map(a => ({ ...a, vehiculosEnBase: fisicos.filter(v => v.almacenBaseId === a.id && !enRuta.has(v.id)).length }))

  return {
    relojH: reloj, almacenes, vehiculos, rutas, pedidos: marcas,
    resumen: { pedidosAbiertos: abiertos.length, vehiculosEnRuta: vehiculos.length, costoPlan: plan?.costoTotal ?? null, distanciaPlanKm: plan?.distanciaTotalKm ?? null, algoritmo: plan?.algoritmo ?? null },
  }
}

/** Una vuelta de consulta: estado, plan y pedidos del escenario, ya listos para dibujar. */
export async function consultarMapa(escenarioId: number): Promise<MapaDatos> {
  const [estado, plan, pedidos] = await Promise.all([consultarEstado(escenarioId), consultarPlan(escenarioId), consultarPedidos(escenarioId)])
  return datosMapa(estado, plan, pedidos)
}
