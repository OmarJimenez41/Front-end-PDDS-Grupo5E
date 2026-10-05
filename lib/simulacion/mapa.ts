// Geometría del mapa de la simulación a partir del plan certificado y del estado físico del back-end.

import type { Arista, DepositoFisico, EstadoEscenario, PedidoEscenario, PlanVigente, TipoVehiculo } from '@/lib/api/simulacion'

export type Punto = { x: number; y: number }
export type Semaforo = 'verde' | 'ambar' | 'rojo'

export interface VehiculoMapa { id: number; codigo: string; tipo: TipoVehiculo; posicion: Punto; carga: number; capacidad: number; disponible: boolean; enRuta: boolean }
export interface RutaMapa { vehiculoId: number; tipo: TipoVehiculo; puntos: Punto[] }
export interface PedidoMapa { id: number; codigo: string; posicion: Punto; cantidad: number; margenH: number; semaforo: Semaforo; priorizado: boolean }
export interface AlmacenMapa { id: number; codigo: string; posicion: Punto; central: boolean; stock: number | null; capacidad: number | null }
export interface CapasMapa { almacenes: AlmacenMapa[]; vehiculos: VehiculoMapa[]; rutas: RutaMapa[]; pedidos: PedidoMapa[] }

/** Umbrales del semáforo de pedidos: margen = fecha límite − reloj (horas). */
export interface Umbrales { verdeH: number; rojoH: number }

/**
 * Dónde está una unidad en el instante t según su trayectoria: interpola dentro de la arista en
 * curso; antes de la primera salida, o entre dos aristas (espera), queda en el último nodo alcanzado.
 */
export function posicionEn(aristas: Arista[], t: number, base: Punto): Punto {
  let posicion = base
  for (const a of aristas) {
    if (t < a.salidaH) break
    if (t >= a.llegadaH) { posicion = { x: a.x2, y: a.y2 }; continue }
    const f = (t - a.salidaH) / (a.llegadaH - a.salidaH)
    return { x: a.x1 + (a.x2 - a.x1) * f, y: a.y1 + (a.y2 - a.y1) * f }
  }
  return posicion
}

/** Lo que falta recorrer desde la posición actual: el trazo que el mapa dibuja como ruta vigente. */
export function recorridoRestante(aristas: Arista[], t: number, desde: Punto): Punto[] {
  const pendientes = aristas.filter(a => a.llegadaH > t)
  if (pendientes.length === 0) return []
  return [desde, ...pendientes.map(a => ({ x: a.x2, y: a.y2 }))]
}

export function semaforo(margenH: number, u: Umbrales): Semaforo {
  return margenH >= u.verdeH ? 'verde' : margenH < u.rojoH ? 'rojo' : 'ambar'
}

/** Arma las capas del mapa para el instante t que muestra el reloj visual. */
export function capasEn(t: number, estado: EstadoEscenario | null, plan: PlanVigente | null, pedidos: PedidoEscenario[], umbrales: Umbrales): CapasMapa {
  const fisico = estado?.fisico
  const almacenes: AlmacenMapa[] = (fisico?.almacenes ?? []).map((a: DepositoFisico) => ({
    id: a.id, codigo: a.codigo, posicion: { x: a.x, y: a.y }, central: a.central, stock: a.stock, capacidad: a.capacidad,
  }))
  const aristasPorUnidad = new Map<number, Arista[]>()
  for (const ruta of plan?.rutas ?? []) {
    aristasPorUnidad.set(ruta.vehiculoId, [...(aristasPorUnidad.get(ruta.vehiculoId) ?? []), ...ruta.trayectoria])
  }
  aristasPorUnidad.forEach(a => a.sort((p, q) => p.salidaH - q.salidaH))
  const vehiculos: VehiculoMapa[] = []
  const rutas: RutaMapa[] = []
  for (const u of fisico?.vehiculos ?? []) {
    const base = u.residual ? { x: u.residual.x, y: u.residual.y } : { x: u.x, y: u.y }
    const aristas = aristasPorUnidad.get(u.id) ?? []
    const posicion = posicionEn(aristas, t, base)
    const restante = recorridoRestante(aristas, t, posicion)
    vehiculos.push({ id: u.id, codigo: u.codigo, tipo: u.tipo, posicion, carga: u.carga, capacidad: u.capacidad, disponible: u.disponible, enRuta: restante.length > 0 })
    if (restante.length > 1) rutas.push({ vehiculoId: u.id, tipo: u.tipo, puntos: restante })
  }
  const visibles = pedidos.filter(p => p.horaIngresoH <= t).map(p => {
    const margenH = p.fechaLimiteH - t
    return { id: p.id, codigo: p.codigo, posicion: { x: p.posX, y: p.posY }, cantidad: p.cantidad, margenH, semaforo: semaforo(margenH, umbrales), priorizado: p.tipo === 'PRIORIZADO' }
  })
  return { almacenes, vehiculos, rutas, pedidos: visibles }
}
