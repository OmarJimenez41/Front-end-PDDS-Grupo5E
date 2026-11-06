// Reloj visual de la simulación. El back-end es quien avanza el estado físico; este reloj solo
// interpola entre dos lecturas del servidor para que el mapa se mueva de forma continua.

export class RelojVisual {
  private servidorH = 0
  private recibidoMs = 0
  private factor = 0
  private finH = Number.POSITIVE_INFINITY
  private adelantoMaxH = 0
  private mostradoH = Number.NEGATIVE_INFINITY

  /**
   * @param relojH       hora del escenario que informó el servidor
   * @param factor       segundos simulados por segundo real; 0 si está en pausa o terminada
   * @param sondeoMs     cada cuánto se consulta al servidor: acota cuánto puede adelantarse la vista
   */
  sincronizar(relojH: number, factor: number, finH: number, ahoraMs: number, sondeoMs: number) {
    this.servidorH = relojH
    this.recibidoMs = ahoraMs
    this.factor = factor
    this.finH = finH
    this.adelantoMaxH = factor * (2 * sondeoMs / 1000) / 3600
    if (this.mostradoH === Number.NEGATIVE_INFINITY) this.mostradoH = relojH
  }

  /**
   * Hora a mostrar: la del servidor más lo transcurrido según el ritmo, sin adelantarse más de dos
   * sondeos (si el servidor va lento por una replanificación, la vista lo espera) y sin retroceder.
   */
  hora(ahoraMs: number): number {
    if (this.mostradoH === Number.NEGATIVE_INFINITY) return this.servidorH
    const estimada = this.servidorH + (ahoraMs - this.recibidoMs) / 1000 * this.factor / 3600
    this.mostradoH = Math.max(this.mostradoH, Math.min(estimada, this.servidorH + this.adelantoMaxH, this.finH))
    return this.mostradoH
  }
}

/**
 * Reloj visual sin saltos. El servidor avanza a escalones (hasta una hora simulada por paso) y cada lectura llega
 * con un retraso desconocido; si la vista se igualara a cada lectura, las unidades darían un tirón en cada consulta.
 * Aquí la hora mostrada avanza al ritmo de la simulación y, en vez de saltar, acelera o frena (entre 0 y 3 veces el
 * ritmo) para alcanzar la estimación del servidor en ~1,5 s. Nunca retrocede; solo salta si la diferencia es grande
 * (al engancharse, tras una pausa larga o con la pestaña oculta).
 */
export class RelojSuave {
  private servidorH = Number.NaN
  private recibidoMs = 0
  private horasPorSeg = 0
  private finH = Number.POSITIVE_INFINITY
  private mostradoH = Number.NaN
  private ultimoMs = 0
  private static readonly AJUSTE_S = 1.5

  /** @param factor segundos simulados por segundo real; 0 en pausa o terminada */
  sincronizar(relojH: number, factor: number, finH: number, ahoraMs: number) {
    const ritmo = Math.max(0, factor) / 3600
    if (relojH !== this.servidorH || ritmo !== this.horasPorSeg) { this.servidorH = relojH; this.recibidoMs = ahoraMs }
    this.horasPorSeg = ritmo
    this.finH = finH
    if (Number.isNaN(this.mostradoH)) { this.mostradoH = relojH; this.ultimoMs = ahoraMs }
  }

  hora(ahoraMs: number): number {
    if (Number.isNaN(this.mostradoH)) return this.servidorH
    const dt = Math.max(0, (ahoraMs - this.ultimoMs) / 1000)
    this.ultimoMs = ahoraMs
    const v = this.horasPorSeg
    const objetivo = Math.min(this.finH, this.servidorH + (ahoraMs - this.recibidoMs) / 1000 * v)
    const error = objetivo - this.mostradoH
    // Detenida, o demasiado lejos para alcanzarla suavemente: se iguala (sin retroceder)
    if (v === 0 || Math.abs(error) > Math.max(v * 6, 0.05)) {
      this.mostradoH = Math.max(this.mostradoH, objetivo)
      return this.mostradoH
    }
    const velocidad = v * Math.min(3, Math.max(0, 1 + error / (v * RelojSuave.AJUSTE_S)))
    this.mostradoH = Math.min(this.finH, this.mostradoH + velocidad * Math.min(dt, 0.25))
    return this.mostradoH
  }
}

const dosDigitos = (n: number) => String(n).padStart(2, '0')

/** Fecha de calendario de una hora del escenario: 00:00 de fechaBase ('aaaa-mm-dd') es la hora 0. */
export function fechaDeHora(fechaBase: string, horas: number, segundos = true): string {
  const [a, m, d] = fechaBase.split('-').map(Number)
  const f = new Date(Date.UTC(a, m - 1, d) + Math.floor(horas * 3600) * 1000)
  const hora = `${dosDigitos(f.getUTCHours())}:${dosDigitos(f.getUTCMinutes())}${segundos ? `:${dosDigitos(f.getUTCSeconds())}` : ''}`
  return `${dosDigitos(f.getUTCDate())}/${dosDigitos(f.getUTCMonth() + 1)}/${f.getUTCFullYear()} · ${hora}`
}
