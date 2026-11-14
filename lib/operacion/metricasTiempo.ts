import type {EstadisticaTiempo,VistaSimulacion} from '../api/simulacion'
export type TiemposMotor=NonNullable<VistaSimulacion['tiempos']>
/** Zero is a valid measurement only when a real sample exists. Never infer it from configuration. */
export function serieMedida(s:EstadisticaTiempo|null|undefined):s is EstadisticaTiempo {
 if(!s||!Number.isInteger(s.muestras)||s.muestras<=0||![s.ultimo,s.promedio,s.minimo,s.maximo].every(v=>Number.isFinite(v)&&v>=0)||s.minimo>s.maximo)return false
 const margen=Number.EPSILON*Math.max(1,s.maximo)*16
 return s.ultimo>=s.minimo-margen&&s.ultimo<=s.maximo+margen&&s.promedio>=s.minimo-margen&&s.promedio<=s.maximo+margen
}
export const definicionesTiempo=[
 {sigla:'Búsq.',campo:'taMs',nombre:'Búsqueda del algoritmo',unidad:'ms reales',descripcion:'Duración medida de la búsqueda; no es su presupuesto ni la duración de la simulación.'},
 {sigla:'Intervalo',campo:'saH',nombre:'Entre planificaciones',unidad:'min simulados',descripcion:'Diferencia de reloj entre dos planificaciones. La primera no tiene intervalo anterior.'},
 {sigla:'Paso',campo:'scH',nombre:'Avance del estado',unidad:'min simulados',descripcion:'Diferencia de reloj de cada paso completado. Un avance rechazado no genera muestra.'},
 {sigla:'Total',campo:'planificacionMs',nombre:'Planificación completa',unidad:'ms reales',descripcion:'Duración total de la solicitud de planificación; se informa separada de Ta.'},
] as const
export function formatoTiempo(n:number,simulado:boolean){
 return (simulado?n*60:n).toLocaleString('es-PE',{maximumFractionDigits:3})
}

export function estadisticaProgramada(s:import('../api/simulacion').SerieProgramada|undefined):EstadisticaTiempo|null {
 if(!s||s.muestras<=0)return null
 const v={...s,promedio:s.suma/s.muestras};return serieMedida(v)?v:null
}
