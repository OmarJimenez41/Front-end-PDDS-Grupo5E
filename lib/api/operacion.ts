// Cliente del estado operativo de un escenario (README del back-end, §4 y §12).
// Lo que dibuja el mapa sale de aquí: almacenes y vehículos (estado físico),
// rutas del plan vigente y pedidos. El front-end no inventa nada de esto.

import { type Acumulado, type VistaSimulacion, pedir } from './simulacion'

export type TipoVehiculo = 'AUTO' | 'MOTO' | 'BICICLETA'

export interface AlmacenFisico { id: number; codigo: string; x: number; y: number; central: boolean; capacidad: number | null; stock: number | null }
export interface VehiculoFisico { id: number; codigo: string; tipo: TipoVehiculo; almacenBaseId: number; capacidad: number; x: number; y: number; carga: number; disponible: boolean; residual?: Residual | null }

export interface ServicioFisico { entregaId: string; vehiculoId: number; pedidoId: number; llegadaH: number; finH: number; cantidad: number; confirmada: boolean }
export interface EstadoOperacion {
  escenarioId: number
  versionEstado: number
  relojH: number
  horizonteH: number | null
  ultimoPlanId: number | null
  fisico: { relojH: number; almacenes: AlmacenFisico[]; vehiculos: VehiculoFisico[]; servicios?: ServicioFisico[] } | null
  acumulado?: Acumulado | null
}

export interface PuntoTrazado { secuencia: number; x: number; y: number; instanteH: number }
export interface Parada { pedidoId: number; codigoPedido: string; secuencia: number; etaH: number; entregado: boolean; cantidad: number | null; entregaId?: string | null }
export interface RutaPlan { id: number; vehiculoId: number; tipoVehiculo: TipoVehiculo; horaInicioH: number; horaFinH: number; distanciaKm: number; costo: number; cargaTotal: number; paradas: Parada[]; trazado: PuntoTrazado[] }
export interface PlanDistribucion { id: number; version: number; algoritmo: string; instanteH: number; costoTotal: number; distanciaTotalKm: number; cantidadRutas: number; pedidosAtendidos: number; rutas: RutaPlan[] }

export type EstadoPedido = 'PENDIENTE' | 'ASIGNADO' | 'EN_RUTA' | 'ENTREGADO' | 'NO_ENTREGADO'
export interface Pedido { id: number; codigo: string; posX: number; posY: number; cantidad: number; tipo: 'REGULAR' | 'PRIORIZADO'; horaIngresoH: number; fechaLimiteH: number; estado: EstadoPedido; entregadoEnH: number | null }

export interface Tramo { x1: number; y1: number; x2: number; y2: number }
export interface Incidencia { id: number; escenarioId: number; tipo: 'BLOQUEO' | 'AVERIA' | 'MANTENIMIENTO'; instanteH: number; finH: number | null; vehiculoId: number | null; activa: boolean; descripcion: string | null; tramos: Tramo[]; tipoAveria?: 1 | 2 | 3 | null; trasladoH?: number | null }

/** DTOs de las lecturas versionadas; los tiempos son horas del escenario. */
export interface Residual { x: number; y: number; destinoX: number; destinoY: number; finH: number; distanciaKm: number }
export interface Arista { x1: number; y1: number; x2: number; y2: number; salidaH: number; llegadaH: number }
/** Ángulo en pantalla del tramo certificado activo; espera o tramo degenerado es neutral. */
export function direccionEn(aristas: Arista[], relojH: number): number | null {
  const a = aristas.find(t => t.salidaH <= relojH && relojH < t.llegadaH)
  if (!a || (a.x1 === a.x2 && a.y1 === a.y2)) return null
  const angulo = Math.atan2(-(a.y2 - a.y1), a.x2 - a.x1) * 180 / Math.PI
  return Object.is(angulo, -0) ? 0 : angulo
}
export interface VehiculoInstantanea extends VehiculoFisico { residual: Residual | null }
/** La posición residual es física; no se debe sustituir por un nodo o una ruta estimada. */
export function posicionFisica(v: VehiculoInstantanea): { x: number; y: number } {
  return v.residual ? { x: v.residual.x, y: v.residual.y } : { x: v.x, y: v.y }
}
export function agruparPosiciones<T extends { x: number; y: number }>(unidades: T[]): Map<string, T[]> {
  const grupos = new Map<string, T[]>()
  for (const unidad of unidades) {
    const clave = `${unidad.x},${unidad.y}`
    const grupo = grupos.get(clave) ?? []
    grupo.push(unidad); grupos.set(clave, grupo)
  }
  return grupos
}
export interface RutaInstantanea extends RutaPlan { trayectoria: Arista[] }
export interface PlanInstantanea extends Omit<PlanDistribucion, 'rutas'> { aplicable: boolean | null; rutas: RutaInstantanea[] }
export interface InstantaneaOperacion {
  versionContrato: number; escenarioId: number; versionEstado: number; relojH: number; aplicable: boolean
  fisico: { relojH: number; almacenes: AlmacenFisico[]; vehiculos: VehiculoInstantanea[]; servicios: ServicioFisico[] } | null
  acumulado: Acumulado | null; plan: PlanInstantanea | null; pedidos: Pedido[]; incidencias: Incidencia[]
}
export type EstadoUnidad = 'EN_BASE' | 'PROGRAMADA' | 'EN_RUTA' | 'EN_SERVICIO' | 'AVERIADA' | 'EN_MANTENIMIENTO' | 'NO_DISPONIBLE'
export interface LugarUnidad { tipo: string; codigo: string; x: number; y: number }
export interface UnidadOperativa {
  id: number; codigo: string; tipo: TipoVehiculo; capacidad: number; carga: number; ocupacionPct: number
  estado: EstadoUnidad; x: number; y: number; almacenBase: string | null; origen: LugarUnidad | null; destino: LugarUnidad | null
  salidaH: number | null; llegadaH: number | null
  pedidos: { id: number; codigo: string; cantidad: number; etaH: number | null; enServicio: boolean }[]
  averia: { incidenciaId: number; tipo: 1 | 2 | 3 | null; desdeH: number; hastaH: number | null; trasladoH: number | null } | null
  recorridoKm: number
}
export interface UnidadesOperacion { versionContrato: number; escenarioId: number; relojH: number; unidades: UnidadOperativa[] }

function encabezadoValido(valor: unknown, escenarioId: number): valor is Record<string, unknown> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false
  const v = valor as Record<string, unknown>
  return v.versionContrato === 1 && v.escenarioId === escenarioId && typeof v.relojH === 'number' && Number.isFinite(v.relojH)
}
const objeto = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const numero = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const nullableNumero = (x: unknown) => x === null || numero(x)
const tipoVehiculoValido = (x: unknown) => x === 'AUTO' || x === 'MOTO' || x === 'BICICLETA'
const estadoUnidadValido = (x: unknown) => ['EN_BASE', 'PROGRAMADA', 'EN_RUTA', 'EN_SERVICIO', 'AVERIADA', 'EN_MANTENIMIENTO', 'NO_DISPONIBLE'].includes(String(x))
const numeros = (v: Record<string, unknown>, campos: string[]) => campos.every(k => numero(v[k]))
const residualValido = (r: unknown) => r === null || (objeto(r) && numeros(r, ['x', 'y', 'destinoX', 'destinoY', 'finH', 'distanciaKm']))
const vehiculoValido = (v: unknown) => objeto(v) && numeros(v, ['id', 'almacenBaseId', 'capacidad', 'x', 'y', 'carga']) &&
  typeof v.codigo === 'string' && tipoVehiculoValido(v.tipo) && typeof v.disponible === 'boolean' && residualValido(v.residual)
const servicioValido = (s: unknown) => objeto(s) && typeof s.entregaId === 'string' && numeros(s, ['vehiculoId', 'pedidoId', 'llegadaH', 'finH', 'cantidad']) && typeof s.confirmada === 'boolean'
const almacenValido = (a: unknown) => objeto(a) && numeros(a, ['id', 'x', 'y']) && typeof a.codigo === 'string' &&
  typeof a.central === 'boolean' && nullableNumero(a.capacidad) && nullableNumero(a.stock)
const aristaValida = (a: unknown) => objeto(a) && numeros(a, ['x1', 'y1', 'x2', 'y2', 'salidaH', 'llegadaH'])
const rutaValida = (r: unknown) => objeto(r) && numeros(r, ['id', 'vehiculoId', 'horaInicioH', 'horaFinH', 'distanciaKm', 'costo', 'cargaTotal']) &&
  tipoVehiculoValido(r.tipoVehiculo) && Array.isArray(r.trayectoria) && r.trayectoria.every(aristaValida) && Array.isArray(r.trazado) &&
  r.trazado.every(p => objeto(p) && numeros(p, ['secuencia', 'x', 'y', 'instanteH'])) && Array.isArray(r.paradas) &&
  r.paradas.every(p => objeto(p) && numeros(p, ['pedidoId', 'secuencia', 'etaH']) && typeof p.codigoPedido === 'string' && typeof p.entregado === 'boolean' && nullableNumero(p.cantidad))
const incidenciaValida = (i: unknown) => objeto(i) && numeros(i, ['id', 'escenarioId', 'instanteH']) &&
  (i.tipo === 'BLOQUEO' || i.tipo === 'AVERIA' || i.tipo === 'MANTENIMIENTO') && nullableNumero(i.finH) && nullableNumero(i.vehiculoId) &&
  (i.tipoAveria === null || i.tipoAveria === 1 || i.tipoAveria === 2 || i.tipoAveria === 3) && Array.isArray(i.tramos)
const pedidoValido = (p: unknown) => objeto(p) && numeros(p, ['id', 'posX', 'posY', 'cantidad', 'horaIngresoH', 'fechaLimiteH']) &&
  typeof p.codigo === 'string' && (p.tipo === 'REGULAR' || p.tipo === 'PRIORIZADO') &&
  ['PENDIENTE', 'ASIGNADO', 'EN_RUTA', 'ENTREGADO', 'NO_ENTREGADO'].includes(String(p.estado)) && nullableNumero(p.entregadoEnH)
const lugarValido = (l: unknown) => l === null || (objeto(l) && typeof l.tipo === 'string' && typeof l.codigo === 'string' && numeros(l, ['x', 'y']))
const unidadValida = (u: unknown) => objeto(u) && numeros(u, ['id', 'capacidad', 'carga', 'ocupacionPct', 'x', 'y', 'recorridoKm']) &&
  typeof u.codigo === 'string' && tipoVehiculoValido(u.tipo) && estadoUnidadValido(u.estado) &&
  (u.almacenBase === null || typeof u.almacenBase === 'string') && lugarValido(u.origen) && lugarValido(u.destino) &&
  nullableNumero(u.salidaH) && nullableNumero(u.llegadaH) && Array.isArray(u.pedidos) && u.pedidos.every(p => objeto(p) &&
    numeros(p, ['id', 'cantidad']) && typeof p.codigo === 'string' && nullableNumero(p.etaH) && typeof p.enServicio === 'boolean') &&
  (u.averia === null || (objeto(u.averia) && numeros(u.averia, ['incidenciaId', 'desdeH']) && nullableNumero(u.averia.hastaH) &&
    nullableNumero(u.averia.trasladoH) && (u.averia.tipo === null || u.averia.tipo === 1 || u.averia.tipo === 2 || u.averia.tipo === 3)))

/** Rechaza una respuesta incompatible en lugar de inventar una instantánea vacía. */
export async function consultarInstantanea(escenarioId: number, signal?: AbortSignal): Promise<InstantaneaOperacion> {
  const v = await pedir<unknown>(`/api/escenarios/${escenarioId}/mapa`, { signal })
  if (!encabezadoValido(v, escenarioId) || !Number.isSafeInteger(v.versionEstado) || typeof v.aplicable !== 'boolean' ||
      !Array.isArray(v.pedidos) || !v.pedidos.every(pedidoValido) || !Array.isArray(v.incidencias) || !v.incidencias.every(incidenciaValida) ||
      (v.fisico !== null && (!objeto(v.fisico) || !numero(v.fisico.relojH) || !Array.isArray(v.fisico.almacenes) || !v.fisico.almacenes.every(almacenValido) || !Array.isArray(v.fisico.vehiculos) || !v.fisico.vehiculos.every(vehiculoValido) || !Array.isArray(v.fisico.servicios) || !v.fisico.servicios.every(servicioValido))) ||
      (v.plan !== null && (!objeto(v.plan) || !Array.isArray(v.plan.rutas) || !v.plan.rutas.every(rutaValida)))) {
    throw new Error('Contrato inválido de mapa operativo')
  }
  return v as unknown as InstantaneaOperacion
}

export async function consultarUnidades(escenarioId: number, signal?: AbortSignal): Promise<UnidadesOperacion> {
  const v = await pedir<unknown>(`/api/escenarios/${escenarioId}/unidades`, { signal })
  if (!encabezadoValido(v, escenarioId) || !Array.isArray(v.unidades) || !v.unidades.every(unidadValida)) {
    throw new Error('Contrato inválido de unidades operativas')
  }
  return v as unknown as UnidadesOperacion
}

export const consultarEstado = (escenarioId: number) => pedir<EstadoOperacion>(`/api/escenarios/${escenarioId}/estado`)
/** Todos los pedidos del escenario: el back-end entrega como máximo 500 por página (sin límite, solo 100). */
export async function consultarPedidos(escenarioId: number, signal?: AbortSignal): Promise<Pedido[]> {
  const PAGINA = 500, todos: Pedido[] = []
  let desdeId = 0
  for (;;) {
    const pagina = await pedir<Pedido[]>(`/api/escenarios/${escenarioId}/pedidos?limite=${PAGINA}&desdeId=${desdeId}`, { signal })
    if (!Array.isArray(pagina) || pagina.some((p, i) => !pedidoValido(p) || p.id <= (i ? pagina[i - 1].id : desdeId))) throw new Error('Contrato inválido del historial de pedidos')
    todos.push(...pagina)
    if (pagina.length < PAGINA) return todos
    desdeId = pagina[pagina.length - 1].id
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
  asociaciones: { rutaId: number | null; vehiculoId: number; vehiculoCodigo: string | null; tipoVehiculo: TipoVehiculo | null; cantidad: number | null; etaH: number; entregado: boolean; enServicio: boolean }[]
  margenH: number | null; semaforo: Semaforo | null
}

export interface MapaDatos {
  relojH: number
  /** pct: stock disponible en % de la capacidad; null en el almacén central (ilimitado). */
  almacenes: (AlmacenFisico & { vehiculosEnBase: number; pct: number | null; unidadesFuera: number; pedidosPorEntregar: number })[]
  /** Posiciones físicas confirmadas, incluidas unidades sin ruta. */
  vehiculos: { id: number; codigo: string; tipo: TipoVehiculo; x: number; y: number; carga: number; capacidad: number; ocupacionPct?: number; estado?: EstadoUnidad; direccion?: number | null }[]
  rutas: { id: number; vehiculoId: number; tipo: TipoVehiculo; puntos: [number, number][]; recorrido: [number, number][] }[]
  /** Pedidos aún no entregados, con su semáforo de margen (fecha límite − ETA). */
  pedidos: { id: number; codigo: string; x: number; y: number; cantidad: number; estado: EstadoPedido; semaforo: Semaforo; margenH: number | null }[]
  /** Todos los pedidos del escenario, para el buscador. */
  rastreo: PedidoRastreo[]
  /** Toda la flota del escenario (para elegir la unidad de una avería). */
  flota: { id: number; codigo: string; tipo: TipoVehiculo; disponible: boolean; enRuta: boolean; averiada: boolean }[]
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
  for (const v of fisicos) if (v.residual) enRuta.add(v.id)
  for (const s of estado.fisico?.servicios ?? []) if (!s.confirmada) enRuta.add(s.vehiculoId)

  const vehiculos = fisicos.map(v => ({ id: v.id, codigo: v.codigo, tipo: v.tipo,
    x: v.residual?.x ?? v.x, y: v.residual?.y ?? v.y, carga: v.carga, capacidad: v.capacidad }))

  const rutas = rutasActivas.map(r => {
    const p = posicionEn(r.trazado, reloj)
    const puntos = r.trazado.map(q => [q.x, q.y] as [number, number])
    // Lo ya recorrido se dibuja tenue; lo que falta, sólido
    const recorrido = r.horaInicioH <= reloj ? [...puntos.slice(0, p.indice), [p.x, p.y] as [number, number]] : []
    return { id: r.id, vehiculoId: r.vehiculoId, tipo: r.tipoVehiculo, puntos, recorrido }
  })

  // Qué ruta lleva cada pedido y cuándo llega su última parte (un pedido puede repartirse en varias paradas)
  const eta = new globalThis.Map<number, number>()
  const lleva = new globalThis.Map<number, { ruta: RutaPlan; parada: Parada }[]>()
  for (const r of plan?.rutas ?? []) for (const s of r.paradas) {
    const partes = lleva.get(s.pedidoId) ?? []
    partes.push({ ruta: r, parada: s }); lleva.set(s.pedidoId, partes)
    if (!s.entregado) eta.set(s.pedidoId, Math.max(eta.get(s.pedidoId) ?? 0, s.etaH))
  }
  for (const s of estado.fisico?.servicios ?? []) if (!s.confirmada) eta.set(s.pedidoId, Math.max(eta.get(s.pedidoId) ?? 0, s.llegadaH))
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
    const partes = cerrado(p) ? [] : lleva.get(p.id) ?? []
    const servicios = cerrado(p) ? [] : (estado.fisico?.servicios ?? []).filter(s => s.pedidoId === p.id && !s.confirmada && !partes.some(x => x.parada.entregaId === s.entregaId))
    const r = partes[0]?.ruta
    const vehiculoServicio = servicios.length ? fisicos.find(v => v.id === servicios[0].vehiculoId) : undefined
    const llegada = cerrado(p) ? null : Math.max(eta.get(p.id) ?? -Infinity, ...servicios.map(s => s.llegadaH))
    const llegadaReal = llegada === -Infinity ? null : llegada
    const margen = cerrado(p) ? (p.entregadoEnH != null ? p.fechaLimiteH - p.entregadoEnH : null) : llegadaReal != null ? p.fechaLimiteH - llegadaReal : p.fechaLimiteH - reloj
    return {
      id: p.id, codigo: p.codigo, x: p.posX, y: p.posY, cantidad: p.cantidad, tipo: p.tipo, estado: estadoVisto(p),
      horaIngresoH: p.horaIngresoH, fechaLimiteH: p.fechaLimiteH, entregadoEnH: p.entregadoEnH, etaH: llegadaReal,
      vehiculoId: r?.vehiculoId ?? vehiculoServicio?.id ?? null, vehiculoCodigo: r ? fisicos.find(v => v.id === r.vehiculoId)?.codigo ?? null : vehiculoServicio?.codigo ?? null, tipoVehiculo: r?.tipoVehiculo ?? vehiculoServicio?.tipo ?? null,
      asociaciones: [...partes.map(({ ruta, parada }) => ({ rutaId: ruta.id, vehiculoId: ruta.vehiculoId, vehiculoCodigo: fisicos.find(v => v.id === ruta.vehiculoId)?.codigo ?? null, tipoVehiculo: ruta.tipoVehiculo, cantidad: parada.cantidad, etaH: parada.etaH, entregado: parada.entregado, enServicio: (estado.fisico?.servicios ?? []).some(s => !s.confirmada && s.entregaId === parada.entregaId) })), ...servicios.map(s => { const v = fisicos.find(v => v.id === s.vehiculoId); return { rutaId: null, vehiculoId: s.vehiculoId, vehiculoCodigo: v?.codigo ?? null, tipoVehiculo: v?.tipo ?? null, cantidad: s.cantidad, etaH: s.llegadaH, entregado: false, enServicio: true } })],
      margenH: margen, semaforo: cerrado(p) ? null : semaforo(margen),
    }
  })

  // Por almacén: unidades suyas que están en ruta y pedidos abiertos que esas rutas aún deben entregar
  const baseDe = new globalThis.Map(fisicos.map(v => [v.id, v.almacenBaseId]))
  const abiertosIds = new Set(abiertos.map(p => p.id))
  const almacenes = (estado.fisico?.almacenes ?? []).map(a => {
    const porEntregar = new Set(rutasActivas.filter(r => baseDe.get(r.vehiculoId) === a.id).flatMap(r => r.paradas.filter(s => !s.entregado && abiertosIds.has(s.pedidoId)).map(s => s.pedidoId)))
    return {
      ...a,
      vehiculosEnBase: fisicos.filter(v => v.almacenBaseId === a.id && !enRuta.has(v.id) && (v.residual?.x ?? v.x) === a.x && (v.residual?.y ?? v.y) === a.y).length,
      pct: a.central || !a.capacidad || a.stock == null ? null : Math.round(a.stock / a.capacidad * 100),
      unidadesFuera: fisicos.filter(v => v.almacenBaseId === a.id && (enRuta.has(v.id) || (v.residual?.x ?? v.x) !== a.x || (v.residual?.y ?? v.y) !== a.y)).length,
      pedidosPorEntregar: porEntregar.size,
    }
  })

  const averiadas = new Set(incidencias.filter(i => i.tipo === 'AVERIA').map(i => i.vehiculoId))
  const flota = fisicos.map(v => ({ id: v.id, codigo: v.codigo, tipo: v.tipo, disponible: v.disponible, enRuta: enRuta.has(v.id), averiada: averiadas.has(v.id) }))

  return {
    relojH: reloj, almacenes, vehiculos, rutas, pedidos: marcas, rastreo, flota, incidencias, acumulado: estado.acumulado ?? null,
    resumen: { pedidosAbiertos: abiertos.length, vehiculosEnRuta: enRuta.size, costoPlan: plan?.costoTotal ?? null, distanciaPlanKm: plan?.distanciaTotalKm ?? null, algoritmo: plan?.algoritmo ?? null },
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

/** El servidor aplica las reglas de cada tipo de avería. */
export const registrarAveria = (escenarioId: number, vehiculoId: number, tipoAveria: 1 | 2 | 3, descripcion: string) =>
  enElReloj(escenarioId, instanteH => pedir<Incidencia>(`/api/escenarios/${escenarioId}/incidencias/averias`, json({ vehiculoId, instanteH, tipoAveria, descripcion })))

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
