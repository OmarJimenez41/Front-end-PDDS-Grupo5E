/** Invalida sin esperar a la limpieza de React las respuestas de una intención anterior. */
export function crearGeneraciones() {
  let version = 0
  return { actual: () => version, vigente: (v: number) => v === version, invalidar: () => ++version }
}

/** Consulta una sola vez por intervalo después de que termina la consulta anterior. */
export function sondearSerial<T>(consultar: () => Promise<T>, publicar: (valor: T) => void, vigente: () => boolean, intervalo = 2000) {
  let activo = true
  let timer: ReturnType<typeof setTimeout> | undefined
  const ciclo = async () => {
    try { const valor = await consultar(); if (activo && vigente()) publicar(valor) } catch { /* Reintentar en el próximo ciclo. */ }
    if (activo && vigente()) timer = setTimeout(() => void ciclo(), intervalo)
  }
  timer = setTimeout(() => void ciclo(), intervalo)
  return () => { activo = false; if (timer) clearTimeout(timer) }
}

/** La detención es una confirmación previa al regreso; evita solicitudes duplicadas. */
export async function regresarDeSimulacion<T>(
  simulacion: T | null,
  viva: (s: T) => boolean,
  id: (s: T) => number,
  ocupado: { current: boolean },
  generaciones: ReturnType<typeof crearGeneraciones>,
  acciones: { invalidar: () => void; detener: (id: number) => Promise<unknown>; volver: () => void; error: (error: unknown) => void; ocupado: (valor: boolean) => void },
) {
  if (ocupado.current) return
  ocupado.current = true
  acciones.ocupado(true)
  acciones.invalidar()
  const version = generaciones.actual()
  try {
    if (simulacion && viva(simulacion)) await acciones.detener(id(simulacion))
    if (!generaciones.vigente(version)) return
    acciones.invalidar()
    acciones.volver()
  } catch (error) {
    if (generaciones.vigente(version)) acciones.error(error)
  } finally {
    ocupado.current = false
    acciones.ocupado(false)
  }
}
/** Publica una respuesta solo si aún pertenece a la intención seleccionada. */
export async function respuestaVigente<T>(promesa: Promise<T>, generaciones: ReturnType<typeof crearGeneraciones>, version: number, publicar: (valor: T) => void) {
  const valor = await promesa
  if (generaciones.vigente(version)) publicar(valor)
}
