import type { Arista, InstantaneaOperacion } from '../api/operacion'

type Punto = { x: number; y: number }

/** Evalúa solo una trayectoria continua y ordenada; los huecos representan esperas. */
export function puntoCertificado(aristas: Arista[], hora: number): Punto | null {
  if (!aristas.length) return null
  for (let i = 0; i < aristas.length; i++) {
    const a = aristas[i], anterior = aristas[i - 1]
    if (a.llegadaH <= a.salidaH || Math.abs(a.x2 - a.x1) + Math.abs(a.y2 - a.y1) !== 1 ||
        (anterior && (a.salidaH < anterior.llegadaH || anterior.x2 !== a.x1 || anterior.y2 !== a.y1))) return null
  }
  if (hora < aristas[0].salidaH || hora > aristas[aristas.length - 1].llegadaH) return null
  for (let i = 0; i < aristas.length; i++) {
    const a = aristas[i]
    if (hora < a.salidaH) return { x: a.x1, y: a.y1 }
    if (hora <= a.llegadaH) {
      const f = (hora - a.salidaH) / (a.llegadaH - a.salidaH)
      return { x: a.x1 + (a.x2 - a.x1) * f, y: a.y1 + (a.y2 - a.y1) * f }
    }
  }
  return null
}

/** Solo anima cuando ambos extremos coinciden con hechos físicos confirmados. */
export function tramoConfirmado(aristas: Arista[], desdeH: number, hastaH: number, desde: Punto, hasta: Punto) {
  const a = puntoCertificado(aristas, desdeH), b = puntoCertificado(aristas, hastaH)
  const cerca = (x: Punto, y: Punto) => Math.hypot(x.x - y.x, x.y - y.y) < 0.01
  return hastaH > desdeH && a !== null && b !== null && cerca(a, desde) && cerca(b, hasta)
}

export function movimientoPermitido(anterior: InstantaneaOperacion | null, actual: InstantaneaOperacion | null, activo: boolean, reducido: boolean): boolean {
  return !!(anterior && actual && activo && !reducido && anterior.aplicable && actual.aplicable &&
    anterior.escenarioId === actual.escenarioId && anterior.plan?.id != null && anterior.plan.id === actual.plan?.id &&
    anterior.fisico && actual.fisico && actual.relojH > anterior.relojH)
}

/** Bucle cancelable; los cuadros tardíos no publican después de detenerlo. */
export function animarIntervalo(pintar: (fraccion: number) => void, solicitar: (f: FrameRequestCallback) => number, cancelar: (id: number) => void) {
  let activo = true, cuadro = 0, inicio: number | null = null
  const paso = (ahora: number) => {
    if (!activo) return
    if (inicio === null) inicio = ahora
    const fraccion = Math.min(1, (ahora - inicio) / 1000)
    pintar(fraccion)
    if (activo && fraccion < 1) cuadro = solicitar(paso)
  }
  cuadro = solicitar(paso)
  return () => { activo = false; cancelar(cuadro) }
}
