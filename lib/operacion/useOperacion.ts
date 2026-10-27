'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { type InstantaneaOperacion, type UnidadesOperacion } from '../api/operacion'
import { type EstadoDetalle } from './lectura'
import { iniciarControlador } from './controlador'

export interface EstadoConsultaOperacion {
  escenarioId: number | null
  mapa: InstantaneaOperacion | null
  unidades: UnidadesOperacion | null
  detalle: EstadoDetalle
  conexion: 'cargando' | 'actual' | 'desactualizado' | 'error'
  recibidoEn: number | null
  error: string | null
}

const inicial = (escenarioId: number | null): EstadoConsultaOperacion => ({
  escenarioId, mapa: null, unidades: null, detalle: 'pendiente', conexion: 'cargando', recibidoEn: null, error: null,
})

/** Un solo ciclo activo por escenario; refrescar adelanta el próximo ciclo sin solaparlo. */
export function useOperacion(escenarioId: number | null) {
  const [estado, setEstado] = useState<EstadoConsultaOperacion>(() => inicial(escenarioId))
  const solicitar = useRef<() => void>(() => {})
  const refrescar = useCallback(() => solicitar.current(), [])

  useEffect(() => {
    setEstado(inicial(escenarioId))
    if (escenarioId === null) { solicitar.current = () => {}; return }
    const controlador = iniciarControlador(escenarioId, {
      mapa: mapa => {
      setEstado(prev => prev.escenarioId === escenarioId ? {
        ...prev, mapa, conexion: 'actual', recibidoEn: Date.now(), error: null,
        detalle: prev.mapa && (prev.mapa.versionEstado !== mapa.versionEstado || prev.mapa.relojH !== mapa.relojH)
          ? (prev.unidades ? 'desactualizado' : 'pendiente') : prev.detalle,
      } : prev)
      },
      detalle: lectura => setEstado(prev => prev.escenarioId === escenarioId ? { ...prev, unidades: lectura.unidades, detalle: lectura.estadoDetalle } : prev),
      error: (error, tieneMapa) => setEstado(prev => prev.escenarioId === escenarioId ? {
          ...prev, conexion: tieneMapa ? 'desactualizado' : 'error', detalle: prev.unidades ? 'desactualizado' : 'pendiente',
          error: error instanceof Error ? error.message : 'Error de conexión',
        } : prev),
    })
    solicitar.current = controlador.refrescar
    return () => { controlador.cerrar(); solicitar.current = () => {} }
  }, [escenarioId])

  // Effects reset after render: never expose the previous scenario even for one frame.
  return { ...(estado.escenarioId === escenarioId ? estado : inicial(escenarioId)), refrescar }
}
