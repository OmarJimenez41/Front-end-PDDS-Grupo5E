import type { MapaDatos } from '../api/operacion'

/** Solo el estado físico vigente y las incidencias confirmadas habilitan una UT. */
export function unidadesParaAveria(mapa: MapaDatos | null, actualizado: boolean) {
  if (!mapa || !actualizado) return []
  const mantenimiento = new Set(mapa.incidencias.filter(i => i.tipo === 'MANTENIMIENTO').map(i => i.vehiculoId))
  return mapa.flota.filter(v => v.disponible && !v.averiada && !mantenimiento.has(v.id))
    .sort((a, b) => Number(b.enRuta) - Number(a.enRuta) || a.codigo.localeCompare(b.codigo))
}
