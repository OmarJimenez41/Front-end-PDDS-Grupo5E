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

export interface Tramo { x1: number; y1: number; x2: number; y2: number }
export interface Incidencia { id: number; escenarioId: number; tipo: 'BLOQUEO' | 'AVERIA'; instanteH: number; finH: number | null; vehiculoId: number | null; activa: boolean; descripcion: string | null; tramos: Tramo[] }

export const consultarEstado = (escenarioId: number) => pedir<EstadoOperacion>(`/api/escenarios/${escenarioId}/estado`)
export const consultarPedidos = (escenarioId: number) => pedir<Pedido[]>(`/api/escenarios/${escenarioId}/pedidos`)
export const listarSimulaciones = () => pedir<VistaSimulacion[]>('/api/simulaciones')
export const incidenciasVigentes = (escenarioId: number) => pedir<Incidencia[]>(`/api/escenarios/${escenarioId}/incidencias/vigentes`)

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

/** Ficha de un pedido para buscarlo o rastrearlo, esté abierto o ya cerrado. */
export interface PedidoRastreo {
  id: number; codigo: string; x: number; y: number; cantidad: number; tipo: 'REGULAR' | 'PRIORIZADO'; estado: EstadoPedido
  horaIngresoH: number; fechaLimiteH: number; entregadoEnH: number | null
  /** Llegada estimada según el plan vigente (null si ninguna ruta lo lleva). */
  etaH: number | null
  vehiculoId: number | null; vehiculoCodigo: string | null; tipoVehiculo: TipoVehiculo | null
  margenH: number | null; semaforo: Semaforo | null
}

export interface MapaDatos {
  relojH: number
  /** pct: stock disponible en % de la capacidad; null en el almacén central (ilimitado). */
  almacenes: (AlmacenFisico & { vehiculosEnBase: number; pct: number | null })[]
  /** Solo los vehículos que están recorriendo una ruta en este instante. */
  vehiculos: { id: number; codigo: string; tipo: TipoVehiculo; x: number; y: number; carga: number; capacidad: number }[]
  rutas: { id: number; vehiculoId: number; tipo: TipoVehiculo; puntos: [number, number][]; recorrido: [number, number][] }[]
  /** Pedidos aún no entregados, con su semáforo de margen (fecha límite − ETA). */
  pedidos: { id: number; codigo: string; x: number; y: number; cantidad: number; estado: EstadoPedido; semaforo: Semaforo; margenH: number | null }[]
  /** Todos los pedidos del escenario, para el buscador. */
  rastreo: PedidoRastreo[]
  /** Toda la flota del escenario (para elegir la unidad de una avería). */
  flota: { id: number; codigo: string; tipo: TipoVehiculo; disponible: boolean; enRuta: boolean; averiada: boolean }[]
  /** Incidencias vigentes en el reloj actual. */
  incidencias: Incidencia[]
  resumen: { pedidosAbiertos: number; vehiculosEnRuta: number; costoPlan: number | null; distanciaPlanKm: number | null; algoritmo: string | null }
}

/** Umbrales por defecto del semáforo de pedidos (horas de margen); los mismos del panel de parámetros. */
export const UMBRALES_PEDIDO = { verde: 8, rojo: 2 }

export interface Umbrales { verde: number; rojo: number }
/** Semáforo por margen en horas; por defecto con los umbrales de fábrica, o con los que fije el operador. */
export const semaforo = (margen: number | null, u: Umbrales = UMBRALES_PEDIDO): Semaforo => margen == null || margen >= u.verde ? 'verde' : margen < u.rojo ? 'rojo' : 'ambar'

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

export function datosMapa(estado: EstadoOperacion, plan: PlanDistribucion | null, pedidos: Pedido[], incidencias: Incidencia[] = []): MapaDatos {
  const reloj = estado.fisico?.relojH ?? estado.relojH
  const fisicos = estado.fisico?.vehiculos ?? []
  const rutasActivas = (plan?.rutas ?? []).filter(r => r.trazado.length > 1 && r.horaFinH >= reloj)
  // Viaje en curso de cada vehículo: una unidad puede tener varios viajes seguidos en el plan
  const enCurso = new globalThis.Map<number, RutaPlan>()
  for (const r of rutasActivas) if (r.horaInicioH <= reloj && (enCurso.get(r.vehiculoId)?.horaInicioH ?? -Infinity) < r.horaInicioH) enCurso.set(r.vehiculoId, r)
  const enRuta = new Set(enCurso.keys())

  const vehiculos = [...enCurso.values()].map(r => {
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

  // Qué ruta lleva cada pedido y cuándo llega su última parte (un pedido puede repartirse en varias paradas)
  const eta = new globalThis.Map<number, number>()
  const lleva = new globalThis.Map<number, RutaPlan>()
  for (const r of plan?.rutas ?? []) for (const s of r.paradas) {
    lleva.set(s.pedidoId, r)
    if (!s.entregado) eta.set(s.pedidoId, Math.max(eta.get(s.pedidoId) ?? 0, s.etaH))
  }
  // El back-end deja PENDIENTE hasta la entrega; si una ruta del plan ya lo lleva, se muestra como asignado
  const estadoVisto = (p: Pedido): EstadoPedido => p.estado === 'PENDIENTE' && lleva.has(p.id) ? 'ASIGNADO' : p.estado
  const abiertos = pedidos.filter(p => p.estado !== 'ENTREGADO' && p.estado !== 'NO_ENTREGADO')
  const marcas = abiertos.map(p => {
    const llegada = eta.get(p.id)
    const margen = llegada != null ? p.fechaLimiteH - llegada : p.fechaLimiteH - reloj
    return { id: p.id, codigo: p.codigo, x: p.posX, y: p.posY, cantidad: p.cantidad, estado: estadoVisto(p), semaforo: semaforo(margen), margenH: margen }
  })

  const cerrado = (p: Pedido) => p.estado === 'ENTREGADO' || p.estado === 'NO_ENTREGADO'
  const rastreo = pedidos.map(p => {
    const r = lleva.get(p.id)
    const llegada = cerrado(p) ? null : eta.get(p.id) ?? null
    const margen = cerrado(p) ? (p.entregadoEnH != null ? p.fechaLimiteH - p.entregadoEnH : null) : llegada != null ? p.fechaLimiteH - llegada : p.fechaLimiteH - reloj
    return {
      id: p.id, codigo: p.codigo, x: p.posX, y: p.posY, cantidad: p.cantidad, tipo: p.tipo, estado: estadoVisto(p),
      horaIngresoH: p.horaIngresoH, fechaLimiteH: p.fechaLimiteH, entregadoEnH: p.entregadoEnH, etaH: llegada,
      vehiculoId: r?.vehiculoId ?? null, vehiculoCodigo: r ? fisicos.find(v => v.id === r.vehiculoId)?.codigo ?? `V-${r.vehiculoId}` : null, tipoVehiculo: r?.tipoVehiculo ?? null,
      margenH: margen, semaforo: cerrado(p) ? null : semaforo(margen),
    }
  })

  const almacenes = (estado.fisico?.almacenes ?? []).map(a => ({
    ...a,
    vehiculosEnBase: fisicos.filter(v => v.almacenBaseId === a.id && !enRuta.has(v.id)).length,
    pct: a.central || !a.capacidad ? null : Math.round((a.stock ?? 0) / a.capacidad * 100),
  }))

  const averiadas = new Set(incidencias.filter(i => i.tipo === 'AVERIA').map(i => i.vehiculoId))
  const flota = fisicos.map(v => ({ id: v.id, codigo: v.codigo, tipo: v.tipo, disponible: v.disponible, enRuta: enRuta.has(v.id), averiada: averiadas.has(v.id) }))

  return {
    relojH: reloj, almacenes, vehiculos, rutas, pedidos: marcas, rastreo, flota, incidencias,
    resumen: { pedidosAbiertos: abiertos.length, vehiculosEnRuta: vehiculos.length, costoPlan: plan?.costoTotal ?? null, distanciaPlanKm: plan?.distanciaTotalKm ?? null, algoritmo: plan?.algoritmo ?? null },
  }
}

/** Una vuelta de consulta: estado, plan y pedidos del escenario, ya listos para dibujar. */
export async function consultarMapa(escenarioId: number): Promise<MapaDatos> {
  const [estado, plan, pedidos, incidencias] = await Promise.all([consultarEstado(escenarioId), consultarPlan(escenarioId), consultarPedidos(escenarioId), incidenciasVigentes(escenarioId).catch(() => [])])
  return datosMapa(estado, plan, pedidos, incidencias)
}

// ---------------------------------------------------------------------------
// Registro desde la interfaz: pedidos, averías y bloqueos (README del back-end, §5 y §6)
// El instante lo pone el sistema: es el reloj del escenario al confirmar, no lo elige el usuario.
// ---------------------------------------------------------------------------

const json = (cuerpo: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })
/** Reloj del escenario tal cual lo da el back-end: redondearlo puede dejarlo un instante en el pasado, que el back-end rechaza. */
const relojActual = async (escenarioId: number) => (await consultarEstado(escenarioId)).relojH
/** Código corto y único, p. ej. «REG-MGX3K2»: el back-end exige código por pedido y por cliente. */
const codigoNuevo = (prefijo: string) => `${prefijo}-${Date.now().toString(36).toUpperCase()}`

interface Cliente { id: number; codigo: string; nombre: string }

/** Cliente con ese nombre (sin distinguir mayúsculas); si no existe, se da de alta con el punto de entrega. */
async function clientePorNombre(nombre: string, x: number, y: number): Promise<Cliente> {
  const r = await pedir<{ datos: Cliente[] }>(`/api/clientes?busqueda=${encodeURIComponent(nombre)}&limite=20`)
  const igual = r.datos.find(c => c.nombre.trim().toLowerCase() === nombre.trim().toLowerCase())
  return igual ?? pedir<Cliente>('/api/clientes', json({ codigo: codigoNuevo('CLI'), nombre: nombre.trim(), posX: x, posY: y }))
}

export interface NuevoPedido { cliente: string; x: number; y: number; cantidad: number; tipo: 'REGULAR' | 'PRIORIZADO'; plazoHoras: number }

/** Registra el pedido con hora de ingreso = reloj actual del escenario; el plazo fija su fecha límite. */
export async function registrarPedido(escenarioId: number, p: NuevoPedido): Promise<Pedido> {
  const [cliente, horaIngresoH] = await Promise.all([clientePorNombre(p.cliente, p.x, p.y), relojActual(escenarioId)])
  return pedir<Pedido>(`/api/escenarios/${escenarioId}/pedidos`, json({ codigo: codigoNuevo('REG'), clienteId: cliente.id, posX: p.x, posY: p.y, cantidad: p.cantidad, tipo: p.tipo, plazoHoras: p.plazoHoras, horaIngresoH }))
}

/** El reloj puede avanzar entre la lectura y el registro; si el back-end lo rechaza por «pasado», se reintenta una vez. */
async function enElReloj<T>(escenarioId: number, registrar: (relojH: number) => Promise<T>): Promise<T> {
  try { return await registrar(await relojActual(escenarioId)) } catch (e) {
    if (e instanceof Error && /pasado/.test(e.message)) return registrar(await relojActual(escenarioId))
    throw e
  }
}

/** Avería de una unidad: queda fuera de la flota disponible y el escenario pide replanificar. */
export const registrarAveria = (escenarioId: number, vehiculoId: number, descripcion: string) =>
  enElReloj(escenarioId, instanteH => pedir<Incidencia>(`/api/escenarios/${escenarioId}/incidencias/averias`, json({ vehiculoId, instanteH, descripcion })))

/** Tramos de 1 km entre dos nodos de una misma calle (misma x o misma y), de un extremo al otro. */
export function tramosEntre(x1: number, y1: number, x2: number, y2: number): Tramo[] {
  if (x1 !== x2 && y1 !== y2) throw new Error('El bloqueo debe seguir una sola calle: misma X o misma Y en ambos extremos.')
  if (x1 === x2 && y1 === y2) throw new Error('Los dos extremos del bloqueo son el mismo punto.')
  const tramos: Tramo[] = []
  if (x1 === x2) for (let y = Math.min(y1, y2); y < Math.max(y1, y2); y++) tramos.push({ x1, y1: y, x2: x1, y2: y + 1 })
  else for (let x = Math.min(x1, x2); x < Math.max(x1, x2); x++) tramos.push({ x1: x, y1, x2: x + 1, y2: y1 })
  return tramos
}

/** Bloqueo vial desde el reloj actual y durante las horas indicadas. */
export const registrarBloqueo = (escenarioId: number, tramos: Tramo[], duracionH: number, descripcion: string) =>
  enElReloj(escenarioId, instanteH => pedir<Incidencia>(`/api/escenarios/${escenarioId}/incidencias/bloqueos`, json({ instanteH, finH: instanteH + duracionH, descripcion, tramos })))

/** Levanta la incidencia en el reloj actual: el tramo se libera o la unidad vuelve a estar operativa. */
export const levantarIncidencia = (escenarioId: number, incidenciaId: number) =>
  pedir<void>(`/api/escenarios/${escenarioId}/incidencias/${incidenciaId}`, { method: 'DELETE' })
