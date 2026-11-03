export function simulacionDescubrible(v: { simulacion: { tipo?: string; estado: string } }): boolean {
  return (v.simulacion.tipo === 'CINCO_DIAS' || v.simulacion.tipo === 'COLAPSO') &&
    (v.simulacion.estado === 'EJECUTANDO' || v.simulacion.estado === 'PAUSADA')
}
