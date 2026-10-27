import type { InstantaneaOperacion, UnidadesOperacion } from '../api/operacion'
import { leerOperacion, type ConsultasOperacion, type LecturaOperacion } from './lectura'

/** Ciclo de un escenario: nunca solapa lecturas y rechaza respuestas tras cerrar. */
export function iniciarControlador(
  escenarioId: number,
  eventos: { mapa: (mapa: InstantaneaOperacion) => void; detalle: (lectura: LecturaOperacion) => void; error: (error: unknown, tieneMapa: boolean) => void },
  api?: ConsultasOperacion,
  intervalo = 2000,
) {
  const abort = new AbortController()
  let activo = true, ejecutando = false, pendiente = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let ultimoMapa: InstantaneaOperacion | null = null
  let unidades: UnidadesOperacion | null = null
  const publicar = (mapa: InstantaneaOperacion) => {
    if (!activo || abort.signal.aborted || mapa.escenarioId !== escenarioId ||
        (ultimoMapa && (mapa.versionEstado < ultimoMapa.versionEstado ||
          (mapa.versionEstado === ultimoMapa.versionEstado && mapa.relojH < ultimoMapa.relojH)))) return false
    ultimoMapa = mapa
    eventos.mapa(mapa)
    return true
  }
  const ejecutar = async () => {
    if (!activo) return
    if (ejecutando) { pendiente = true; return }
    ejecutando = true
    try {
      const lectura = await leerOperacion(escenarioId, abort.signal, publicar, unidades, api)
      if (activo) { unidades = lectura.unidades; eventos.detalle(lectura) }
    } catch (error) {
      if (activo && !abort.signal.aborted) eventos.error(error, ultimoMapa !== null)
    } finally {
      ejecutando = false
      if (activo) {
        if (pendiente) { pendiente = false; void ejecutar() }
        else timer = setTimeout(() => void ejecutar(), intervalo)
      }
    }
  }
  const refrescar = () => { if (timer) clearTimeout(timer); void ejecutar() }
  const cerrar = () => { activo = false; abort.abort(); if (timer) clearTimeout(timer) }
  void ejecutar()
  return { refrescar, cerrar }
}
