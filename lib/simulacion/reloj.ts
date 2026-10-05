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

const dosDigitos = (n: number) => String(n).padStart(2, '0')

/** Fecha de calendario de una hora del escenario: 00:00 de fechaBase ('aaaa-mm-dd') es la hora 0. */
export function fechaDeHora(fechaBase: string, horas: number, segundos = true): string {
  const [a, m, d] = fechaBase.split('-').map(Number)
  const f = new Date(Date.UTC(a, m - 1, d) + Math.floor(horas * 3600) * 1000)
  const hora = `${dosDigitos(f.getUTCHours())}:${dosDigitos(f.getUTCMinutes())}${segundos ? `:${dosDigitos(f.getUTCSeconds())}` : ''}`
  return `${dosDigitos(f.getUTCDate())}/${dosDigitos(f.getUTCMonth() + 1)}/${f.getUTCFullYear()} · ${hora}`
}
