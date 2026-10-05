'use client'

// Motor de la simulación de cinco días en el front-end.
// El back-end avanza el estado físico, incorpora los pedidos por tiempo y replanifica con ALNS;
// este motor sube los archivos de ventas, inicia y controla la ejecución, consulta estado, plan y
// pedidos, y anima el mapa entre consultas con el reloj visual.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type EstadoEscenario, type PedidoEscenario, type PlanVigente, type VistaSimulacion,
  consultarSimulacion, detenerSimulacion, estadoEscenario, iniciarCincoDias, mensajeError, pausarSimulacion,
  pedidosAbiertos, planVigente, reanudarSimulacion, subirVentas,
} from '@/lib/api/simulacion'
import { type CapasMapa, type Umbrales, capasEn } from './mapa'
import { RelojVisual, fechaDeHora } from './reloj'

/** Cada cuánto se consulta el progreso y el estado físico. */
const SONDEO_MS = 1000
/** Los pedidos abiertos cambian menos y la lista puede ser larga. */
const SONDEO_PEDIDOS_MS = 3000
/** Cuadros por segundo del reloj visual: suficiente para ver moverse las unidades. */
const CUADRO_MS = 100

export interface MotorSimulacion {
  vista: VistaSimulacion | null
  /** Hora del escenario que muestra el mapa, interpolada entre consultas. */
  relojH: number | null
  /** 'dd/mm/aaaa · hh:mm:ss' de relojH. */
  fecha: string | null
  progreso: number
  capas: CapasMapa | null
  /** Último error de comunicación; la simulación sigue en el servidor aunque falle una consulta. */
  error: string | null
  ocupado: boolean
  viva: boolean
  iniciar: (inicio: string, archivos: File[]) => Promise<void>
  pausar: () => Promise<void>
  reanudar: () => Promise<void>
  /** Detiene en el servidor si sigue viva y olvida la simulación; false si el servidor no la detuvo. */
  cerrar: () => Promise<boolean>
}

const estaViva = (v: VistaSimulacion | null) => v?.simulacion.estado === 'EJECUTANDO' || v?.simulacion.estado === 'PAUSADA'

export function useMotorSimulacion(umbrales: Umbrales = { verdeH: 8, rojoH: 2 }): MotorSimulacion {
  const [vista, setVista] = useState<VistaSimulacion | null>(null)
  const [estado, setEstado] = useState<EstadoEscenario | null>(null)
  const [plan, setPlan] = useState<PlanVigente | null>(null)
  const [pedidos, setPedidos] = useState<PedidoEscenario[]>([])
  const [relojH, setRelojH] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const reloj = useRef(new RelojVisual())
  const planCargado = useRef<number | null>(null)

  const id = vista?.simulacion.escenarioId ?? null
  const viva = estaViva(vista)

  /** Toma una vista del servidor y resincroniza el reloj visual con su hora. */
  const aplicar = useCallback((v: VistaSimulacion) => {
    setVista(v)
    const s = v.simulacion
    reloj.current.sincronizar(s.relojH, s.estado === 'EJECUTANDO' ? s.factor : 0, s.finH, performance.now(), SONDEO_MS)
  }, [])

  // Progreso, estado físico y plan: el plan solo se vuelve a pedir cuando el servidor publica otro.
  useEffect(() => {
    if (id == null) return
    let activo = true
    const consultar = async () => {
      try {
        const [v, e] = await Promise.all([consultarSimulacion(id), estadoEscenario(id)])
        if (!activo) return
        aplicar(v)
        setEstado(e)
        if (e.ultimoPlanId !== planCargado.current) {
          const p = await planVigente(id)
          if (!activo) return
          planCargado.current = p?.id ?? null
          setPlan(p)
        }
        setError(null)
      } catch (e) {
        if (activo) setError(mensajeError(e))
      }
    }
    consultar()
    if (!viva) return () => { activo = false }
    const t = setInterval(consultar, SONDEO_MS)
    return () => { activo = false; clearInterval(t) }
  }, [id, viva, aplicar])

  useEffect(() => {
    if (id == null) return
    let activo = true
    const consultar = () => pedidosAbiertos(id).then(p => { if (activo) setPedidos(p) }).catch(() => { /* siguiente ciclo */ })
    consultar()
    if (!viva) return () => { activo = false }
    const t = setInterval(consultar, SONDEO_PEDIDOS_MS)
    return () => { activo = false; clearInterval(t) }
  }, [id, viva])

  // Reloj visual: avanza entre consultas para que las unidades se desplacen de forma continua.
  useEffect(() => {
    if (id == null) return
    setRelojH(reloj.current.hora(performance.now()))
    if (!viva) return
    const t = setInterval(() => setRelojH(reloj.current.hora(performance.now())), CUADRO_MS)
    return () => clearInterval(t)
  }, [id, viva, vista])

  const capas = useMemo(() => relojH == null ? null : capasEn(relojH, estado, plan, pedidos, umbrales),
    [relojH, estado, plan, pedidos, umbrales])

  const reiniciar = () => {
    reloj.current = new RelojVisual()
    planCargado.current = null
    setEstado(null); setPlan(null); setPedidos([]); setRelojH(null); setError(null)
  }

  const iniciar = useCallback(async (inicio: string, archivos: File[]) => {
    setOcupado(true)
    try {
      // Los archivos elegidos reemplazan a los del mismo mes en la carpeta del back-end.
      for (const archivo of archivos) await subirVentas(archivo)
      const v = await iniciarCincoDias(inicio)
      reiniciar()
      aplicar(v)
    } finally {
      setOcupado(false)
    }
  }, [aplicar])

  const controlar = useCallback(async (accion: (id: number) => Promise<VistaSimulacion>) => {
    if (id == null) return
    setOcupado(true)
    try { aplicar(await accion(id)); setError(null) } catch (e) { setError(mensajeError(e)) } finally { setOcupado(false) }
  }, [id, aplicar])

  const cerrar = useCallback(async () => {
    if (id != null && viva) {
      setOcupado(true)
      try { await detenerSimulacion(id) } catch (e) { setError(mensajeError(e)); setOcupado(false); return false }
      setOcupado(false)
    }
    reiniciar()
    setVista(null)
    return true
  }, [id, viva])

  return {
    vista,
    relojH,
    fecha: vista && relojH != null ? fechaDeHora(vista.simulacion.fechaBase, relojH) : null,
    progreso: vista && relojH != null ? Math.max(0, Math.min(1, (relojH - vista.simulacion.inicioH) / (vista.simulacion.finH - vista.simulacion.inicioH))) : 0,
    capas,
    error,
    ocupado,
    viva,
    iniciar,
    pausar: () => controlar(pausarSimulacion),
    reanudar: () => controlar(reanudarSimulacion),
    cerrar,
  }
}
