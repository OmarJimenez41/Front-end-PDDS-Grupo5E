import { consultarInstantanea, consultarUnidades, consultarVistaOperativa, type InstantaneaOperacion, type UnidadesOperacion } from '../api/operacion'

export type EstadoDetalle = 'actual' | 'pendiente' | 'desactualizado'
export interface LecturaOperacion {
  mapa: InstantaneaOperacion
  unidades: UnidadesOperacion | null
  estadoDetalle: EstadoDetalle
}

export interface ConsultasOperacion {
  vista?: (id:number,signal:AbortSignal)=>Promise<{mapa:InstantaneaOperacion;unidades:UnidadesOperacion}>
  mapa: (id: number, signal: AbortSignal) => Promise<InstantaneaOperacion>
  unidades: (id: number, signal: AbortSignal) => Promise<UnidadesOperacion>
}

const consultas: ConsultasOperacion = { mapa: consultarInstantanea, unidades: consultarUnidades, vista:consultarVistaOperativa }
const coincide = (a: InstantaneaOperacion, b: InstantaneaOperacion, u: UnidadesOperacion) =>
  a.escenarioId === b.escenarioId && a.escenarioId === u.escenarioId && a.versionEstado === b.versionEstado &&
  a.relojH === b.relojH && a.relojH === u.relojH

/** Devuelve cada mapa válido inmediatamente; las fichas solo son actuales tras la comprobación A/U/B. */
export async function leerOperacion(
  id: number, signal: AbortSignal, publicarMapa: (mapa: InstantaneaOperacion) => boolean,
  anterior: UnidadesOperacion | null, api: ConsultasOperacion = consultas,
): Promise<LecturaOperacion> {
  if(api.vista){
    const {mapa,unidades}=await api.vista(id,signal)
    if(mapa.escenarioId!==unidades.escenarioId||mapa.relojH!==unidades.relojH||!publicarMapa(mapa))throw new Error('Corte operativo incoherente o anterior')
    return {mapa,unidades,estadoDetalle:'actual'}
  }
  let a = await api.mapa(id, signal)
  if (!publicarMapa(a)) throw new Error('Versión anterior o escenario incorrecto')
  for (let intento = 0; intento < 2; intento++) {
    let unidades: UnidadesOperacion
    try {
      unidades = await api.unidades(id, signal)
    } catch (error) {
      if (signal.aborted) throw error
      return { mapa: a, unidades: anterior, estadoDetalle: anterior ? 'desactualizado' : 'pendiente' }
    }
    let b: InstantaneaOperacion
    try {
      b = await api.mapa(id, signal)
    } catch (error) {
      if (signal.aborted) throw error
      return { mapa: a, unidades: anterior, estadoDetalle: anterior ? 'desactualizado' : 'pendiente' }
    }
    if (!publicarMapa(b)) return { mapa: a, unidades: anterior, estadoDetalle: anterior ? 'desactualizado' : 'pendiente' }
    if (coincide(a, b, unidades)) return { mapa: b, unidades, estadoDetalle: 'actual' }
    a = b
  }
  return { mapa: a, unidades: anterior, estadoDetalle: anterior ? 'desactualizado' : 'pendiente' }
}
