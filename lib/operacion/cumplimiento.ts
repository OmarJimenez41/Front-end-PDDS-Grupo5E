import type { ServicioFisico } from '../api/operacion'

/** Solo la historia física confirmada acredita la llegada de todos los paquetes. */
export function llegadasConfirmadas(servicios: ServicioFisico[]) {
  const llegadas = new Map<number, { cantidad: number; ultimaH: number }>()
  for (const s of servicios) {
    if (!s.confirmada || !Number.isFinite(s.llegadaH) || !Number.isFinite(s.cantidad) || s.cantidad <= 0) continue
    const anterior = llegadas.get(s.pedidoId)
    llegadas.set(s.pedidoId, { cantidad: (anterior?.cantidad ?? 0) + s.cantidad, ultimaH: Math.max(anterior?.ultimaH ?? -Infinity, s.llegadaH) })
  }
  return llegadas
}

export function cumplimientoPlazo(p: { estado: string; fechaLimiteH: number; llegadaRealH?: number | null }): 'a tiempo' | 'fuera de plazo' | null {
  if (p.estado !== 'ENTREGADO' || p.llegadaRealH == null || !Number.isFinite(p.llegadaRealH)) return null
  return p.llegadaRealH <= p.fechaLimiteH + 1e-9 ? 'a tiempo' : 'fuera de plazo'
}
