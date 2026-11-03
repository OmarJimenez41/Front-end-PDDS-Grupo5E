import type { EstadoSimulacion, VistaSimulacion } from '../api/simulacion'

const etiquetas: Record<EstadoSimulacion, string> = {
  EJECUTANDO: 'En ejecución', PAUSADA: 'En pausa', FINALIZADA: 'Finalizada', DETENIDA: 'Detenida', ERROR: 'Error', INTERRUMPIDA: 'Interrumpida',
}

export function etiquetaEstadoEscenario(estado: EstadoSimulacion | null): string {
  return estado ? etiquetas[estado] ?? 'Estado no disponible' : 'Estado no disponible'
}

/** Consulta serial del escenario seleccionado; rechaza respuestas tardías o de otra identidad. */
export function consultarEstadoSeleccionado(id: number, consultar: (id: number) => Promise<VistaSimulacion>, publicar: (vista: VistaSimulacion | null) => void, intervalo = 2000) {
  let activo = true
  let timer: ReturnType<typeof setTimeout> | undefined
  const ciclo = async () => {
    try {
      const vista = await consultar(id)
      if (activo) publicar(vista.simulacion.escenarioId === id ? vista : null)
    } catch { if (activo) publicar(null) }
    if (activo) timer = setTimeout(() => void ciclo(), intervalo)
  }
  void ciclo()
  return () => { activo = false; if (timer) clearTimeout(timer) }
}
