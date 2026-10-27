'use client'

import { useEffect, useRef, useState } from 'react'
import { direccionEn, type InstantaneaOperacion } from '../api/operacion'
import { animarIntervalo, movimientoPermitido, puntoCertificado, tramoConfirmado } from './movimiento'

type Posiciones = Record<number, { x: number; y: number; direccion: number | null }>
const posicion = (v: NonNullable<InstantaneaOperacion['fisico']>['vehiculos'][number]) => v.residual ? { x: v.residual.x, y: v.residual.y } : { x: v.x, y: v.y }

/** Interpola únicamente entre dos instantáneas confirmadas; jamás extrapola. */
export function useMovimiento(mapa: InstantaneaOperacion | null, activo: boolean): Posiciones {
  const anterior = useRef<InstantaneaOperacion | null>(null)
  const [posiciones, setPosiciones] = useState<Posiciones>({})
  const id = mapa?.escenarioId, version = mapa?.versionEstado, reloj = mapa?.relojH, planId = mapa?.plan?.id, aplicable = mapa?.aplicable
  useEffect(() => {
    const preferencia = window.matchMedia('(prefers-reduced-motion: reduce)')
    const previo = anterior.current
    anterior.current = mapa
    setPosiciones({})
    if (!movimientoPermitido(previo, mapa, activo, preferencia.matches) || !mapa?.fisico || !previo?.fisico) return
    const anteriores = new Map(previo.fisico.vehiculos.map(v => [v.id, v]))
    const animables = mapa.fisico.vehiculos.flatMap(v => {
      const viejo = anteriores.get(v.id)
      const ruta = mapa.plan?.rutas.find(r => r.vehiculoId === v.id && r.horaInicioH <= previo.relojH && r.horaFinH >= mapa.relojH)
      return viejo && ruta && tramoConfirmado(ruta.trayectoria, previo.relojH, mapa.relojH, posicion(viejo), posicion(v)) ? [{ id: v.id, aristas: ruta.trayectoria }] : []
    })
    if (!animables.length) return
    const pintar = (fraccion: number) => {
      const horaVisual = previo.relojH + (mapa.relojH - previo.relojH) * fraccion
      const nuevos: Posiciones = {}
      for (const v of animables) { const p = puntoCertificado(v.aristas, horaVisual); if (p) nuevos[v.id] = { ...p, direccion: direccionEn(v.aristas, horaVisual) } }
      setPosiciones(nuevos)
      if (fraccion === 1) setPosiciones({})
    }
    const cancelar = animarIntervalo(pintar, requestAnimationFrame, cancelAnimationFrame)
    const detener = (e: MediaQueryListEvent) => { if (e.matches) { cancelar(); setPosiciones({}) } }
    preferencia.addEventListener('change', detener)
    return () => { cancelar(); preferencia.removeEventListener('change', detener) }
  }, [id, version, reloj, planId, aplicable, activo])
  return posiciones
}
