// Cliente del estado operativo de un escenario (README del back-end, §4 y §12).
// Lo que dibuja el mapa sale de aquí: almacenes y vehículos (estado físico),
// rutas del plan vigente y pedidos. El front-end no inventa nada de esto.

import { type Acumulado, type VistaSimulacion, API_URL, pedir } from './simulacion'

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
  acumulado?: Acumulado | null
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
/** Todos los pedidos del escenario: el back-end entrega como máximo 500 por página (sin límite, solo 100). */
export async function consultarPedidos(escenarioId: number): Promise<Pedido[]> {
  const PAGINA = 500, todos: Pedido[] = []
  for (let desde = 0; ; desde += PAGINA) {
    const pagina = await pedir<Pedido[]>(`/api/escenarios/${escenarioId}/pedidos?limite=${PAGINA}&desplazamiento=${desde}`)
    todos.push(...pagina)
    if (pagina.length < PAGINA) return todos
  }
}
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
  /** Abierto y con la fecha límite ya pasada en el reloj del mapa (el back-end lo cierra en su siguiente paso). */
  vencido?: boolean
}

/** Ruta del plan con su trazado en el tiempo: el mapa anima la unidad sobre ella con el reloj visual. */
export interface RutaMapa { id: number; vehiculoId: number; tipo: TipoVehiculo; inicioH: number; finH: number; trazado: PuntoTrazado[] }

export interface MapaDatos {
  relojH: number
  /** pct: stock disponible en % de la capacidad; null en el almacén central (ilimitado). */
  almacenes: (AlmacenFisico & { vehiculosEnBase: number; pct: number | null; unidadesFuera: number; pedidosPorEntregar: number })[]
  /** Solo los vehículos que están recorriendo una ruta en este instante. */
  vehiculos: { id: number; codigo: string; tipo: TipoVehiculo; x: number; y: number; carga: number; capacidad: number }[]
  /** Rutas del plan vigente que aún no terminan (en curso o por salir), ordenadas por salida. */
  rutas: RutaMapa[]
  /** Pedidos aún no entregados, con su semáforo de margen (fecha límite − ETA); el margen nunca es negativo. */
  pedidos: { id: number; codigo: string; x: number; y: number; cantidad: number; estado: EstadoPedido; semaforo: Semaforo; margenH: number | null; vencido: boolean }[]
  /** Todos los pedidos del escenario, para el buscador. */
  rastreo: PedidoRastreo[]
  /** Toda la flota del escenario (para elegir la unidad de una avería). */
  flota: { id: number; codigo: string; tipo: TipoVehiculo; disponible: boolean; enRuta: boolean; averiada: boolean; carga: number; capacidad: number }[]
  /** Incidencias vigentes en el reloj actual. */
  incidencias: Incidencia[]
  /** Distancia, costo y entregas realmente acumulados en el escenario (null si el back-end no lo informa). */
  acumulado: Acumulado | null
  resumen: { pedidosAbiertos: number; vehiculosEnRuta: number; costoPlan: number | null; distanciaPlanKm: number | null; algoritmo: string | null }
}

/** Umbrales por defecto del semáforo de pedidos (horas de margen); los mismos del panel de parámetros. */
export const UMBRALES_PEDIDO = { verde: 8, rojo: 2 }

export interface Umbrales { verde: number; rojo: number }
/** Semáforo por margen en horas; por defecto con los umbrales de fábrica, o con los que fije el operador. */
export const semaforo = (margen: number | null, u: Umbrales = UMBRALES_PEDIDO): Semaforo => margen == null || margen >= u.verde ? 'verde' : margen < u.rojo ? 'rojo' : 'ambar'

/** Posición sobre el trazado en el instante t (interpolación lineal entre puntos). */
export function posicionEn(trazado: PuntoTrazado[], t: number): { x: number; y: number; indice: number } {
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
  const rutasActivas = (plan?.rutas ?? []).filter(r => r.trazado.length > 1 && r.horaFinH >= reloj).sort((a, b) => a.horaInicioH - b.horaInicioH)
  // Viaje en curso de cada vehículo: una unidad puede tener varios viajes seguidos en el plan
  const enCurso = new globalThis.Map<number, RutaPlan>()
  for (const r of rutasActivas) if (r.horaInicioH <= reloj && (enCurso.get(r.vehiculoId)?.horaInicioH ?? -Infinity) < r.horaInicioH) enCurso.set(r.vehiculoId, r)
  const enRuta = new Set(enCurso.keys())

  const vehiculos = [...enCurso.values()].map(r => {
    const f = fisicos.find(v => v.id === r.vehiculoId)
    const p = posicionEn(r.trazado, reloj)
    return { id: r.vehiculoId, codigo: f?.codigo ?? `V-${r.vehiculoId}`, tipo: r.tipoVehiculo, x: p.x, y: p.y, carga: f?.carga ?? r.cargaTotal, capacidad: f?.capacidad ?? r.cargaTotal }
  })

  const rutas = rutasActivas.map(r => ({ id: r.id, vehiculoId: r.vehiculoId, tipo: r.tipoVehiculo, inicioH: r.horaInicioH, finH: r.horaFinH, trazado: r.trazado }))

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
  // Margen = fecha límite − llegada estimada (o − reloj si ninguna ruta lo lleva). Un plan certificado nunca
  // llega tarde y el back-end cierra como no entregado lo que vence sin ruta: un margen negativo solo puede ser
  // el desfase de un instante entre consultas, y se muestra como «plazo vencido», nunca como horas negativas.
  const margenDe = (p: Pedido, llegada: number | undefined | null) => Math.max(0, p.fechaLimiteH - (llegada ?? reloj))
  const vencido = (p: Pedido) => p.fechaLimiteH < reloj - 1e-9
  const marcas = abiertos.map(p => {
    const margen = margenDe(p, eta.get(p.id))
    return { id: p.id, codigo: p.codigo, x: p.posX, y: p.posY, cantidad: p.cantidad, estado: estadoVisto(p), semaforo: vencido(p) ? 'rojo' as const : semaforo(margen), margenH: margen, vencido: vencido(p) }
  })

  const cerrado = (p: Pedido) => p.estado === 'ENTREGADO' || p.estado === 'NO_ENTREGADO'
  const rastreo = pedidos.map(p => {
    const r = lleva.get(p.id)
    const llegada = cerrado(p) ? null : eta.get(p.id) ?? null
    const margen = cerrado(p) ? (p.entregadoEnH != null ? p.fechaLimiteH - p.entregadoEnH : null) : margenDe(p, llegada)
    return {
      id: p.id, codigo: p.codigo, x: p.posX, y: p.posY, cantidad: p.cantidad, tipo: p.tipo, estado: estadoVisto(p),
      horaIngresoH: p.horaIngresoH, fechaLimiteH: p.fechaLimiteH, entregadoEnH: p.entregadoEnH, etaH: llegada,
      vehiculoId: r?.vehiculoId ?? null, vehiculoCodigo: r ? fisicos.find(v => v.id === r.vehiculoId)?.codigo ?? `V-${r.vehiculoId}` : null, tipoVehiculo: r?.tipoVehiculo ?? null,
      margenH: margen, semaforo: cerrado(p) ? null : vencido(p) ? 'rojo' : semaforo(margen), vencido: !cerrado(p) && vencido(p),
    }
  })

  // Por almacén: unidades suyas que están en ruta y pedidos abiertos que esas rutas aún deben entregar
  const baseDe = new globalThis.Map(fisicos.map(v => [v.id, v.almacenBaseId]))
  const abiertosIds = new Set(abiertos.map(p => p.id))
  const almacenes = (estado.fisico?.almacenes ?? []).map(a => {
    const porEntregar = new Set(rutasActivas.filter(r => baseDe.get(r.vehiculoId) === a.id).flatMap(r => r.paradas.filter(s => !s.entregado && abiertosIds.has(s.pedidoId)).map(s => s.pedidoId)))
    return {
      ...a,
      vehiculosEnBase: fisicos.filter(v => v.almacenBaseId === a.id && !enRuta.has(v.id)).length,
      pct: a.central || !a.capacidad ? null : Math.round((a.stock ?? 0) / a.capacidad * 100),
      unidadesFuera: [...enRuta].filter(id => baseDe.get(id) === a.id).length,
      pedidosPorEntregar: porEntregar.size,
    }
  })

  const averiadas = new Set(incidencias.filter(i => i.tipo === 'AVERIA').map(i => i.vehiculoId))
  const flota = fisicos.map(v => ({ id: v.id, codigo: v.codigo, tipo: v.tipo, disponible: v.disponible, enRuta: enRuta.has(v.id), averiada: averiadas.has(v.id), carga: v.carga, capacidad: v.capacidad }))

  return {
    relojH: reloj, almacenes, vehiculos, rutas, pedidos: marcas, rastreo, flota, incidencias, acumulado: estado.acumulado ?? null,
    resumen: { pedidosAbiertos: abiertos.length, vehiculosEnRuta: vehiculos.length, costoPlan: plan?.costoTotal ?? null, distanciaPlanKm: plan?.distanciaTotalKm ?? null, algoritmo: plan?.algoritmo ?? null },
  }
}

/** Respuesta de GET /api/escenarios/{id}/mapa: todo lo del mapa en una sola lectura coherente, con solo los pedidos abiertos. */
interface MapaLigero {
  escenarioId: number; versionEstado: number; relojH: number
  fisico: EstadoOperacion['fisico']; acumulado: Acumulado | null
  plan: PlanDistribucion | null; pedidos: Pedido[]; incidencias: Incidencia[]
}

/** Los pedidos abiertos recién leídos reemplazan a su versión de la lista completa (que se refresca más despacio). */
function unirPedidos(todos: Pedido[] | null, abiertos: Pedido[]): Pedido[] {
  if (!todos) return abiertos
  const porId = new globalThis.Map(todos.map(p => [p.id, p]))
  for (const p of abiertos) porId.set(p.id, p)
  return [...porId.values()]
}

/** false si el back-end no tiene GET /mapa (versión anterior): se usa la consulta en cuatro llamadas. */
let hayMapaLigero = true

/**
 * Una vuelta de consulta, ya lista para dibujar. Usa GET /mapa (una sola transacción, solo pedidos abiertos);
 * `todos` es la lista completa de pedidos, leída aparte y con menos frecuencia, para el buscador y el rendimiento.
 * Antes se descargaban todos los pedidos (paginados de 500 en 500) en cada vuelta: en una simulación de cinco
 * días con miles de pedidos, cada consulta tardaba más que el propio intervalo de refresco.
 */
export async function consultarMapa(escenarioId: number, todos: Pedido[] | null = null): Promise<MapaDatos> {
  if (hayMapaLigero) {
    const r = await fetch(`${API_URL}/api/escenarios/${escenarioId}/mapa`, { cache: 'no-store' })
    if (r.ok) {
      const m = await r.json() as MapaLigero
      const estado: EstadoOperacion = { escenarioId, versionEstado: m.versionEstado, relojH: m.relojH, horizonteH: null, ultimoPlanId: m.plan?.id ?? null, fisico: m.fisico, acumulado: m.acumulado }
      return datosMapa(estado, m.plan, unirPedidos(todos, m.pedidos), m.incidencias)
    }
    if (r.status !== 404) { const cuerpo = await r.json().catch(() => null); throw new Error(cuerpo?.mensaje ?? `Error ${r.status} en /mapa`) }
  }
  const [estado, plan, pedidos, incidencias] = await Promise.all([consultarEstado(escenarioId), consultarPlan(escenarioId), todos ? Promise.resolve(todos) : consultarPedidos(escenarioId), incidenciasVigentes(escenarioId).catch(() => [])])
  // El escenario existe (si no, consultarEstado habría fallado): el 404 era del endpoint, que este back-end no tiene
  hayMapaLigero = false
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
