import type { OperacionActual, VistaSimulacion } from '../api/simulacion'

/** Cada recuperación resuelve la identidad de nuevo; las consultas posteriores son seriales. */
export function crearRecuperacionDia(
  api: { actual: () => Promise<OperacionActual>; consultar: (id: number) => Promise<VistaSimulacion>; convertir: (vista: VistaSimulacion) => OperacionActual },
  eventos: { actual: (valor: OperacionActual) => void; error: (error: unknown) => void; recuperando: () => void },
  intervalo = 2000,
) {
  let generacion = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const cerrar = () => { generacion++; if (timer) clearTimeout(timer) }
  const recuperar = () => {
    cerrar()
    const vigente = generacion
    let id: number | null = null
    eventos.recuperando()
    const cargar = async () => {
      try {
        const valor = id === null ? await api.actual() : api.convertir(await api.consultar(id))
        if (vigente !== generacion) return
        id = valor.escenarioId
        eventos.actual(valor)
      } catch (error) {
        if (vigente !== generacion) return
        eventos.error(error)
      }
      if (vigente === generacion) timer = setTimeout(() => void cargar(), intervalo)
    }
    void cargar()
  }
  return { recuperar, cerrar }
}
