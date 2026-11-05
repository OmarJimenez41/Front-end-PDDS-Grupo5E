export interface LatenciaInicio {inicioMs:number;mapaMs:number|null;movimientoMs:number|null}
const mediciones=new Map<number,LatenciaInicio>()
export function inicioMedido(id:number,inicioMs:number){mediciones.set(id,{inicioMs,mapaMs:null,movimientoMs:null})}
export function medicion(id:number){return mediciones.get(id)??null}
export function confirmarMapa(id:number,ahora:number){const m=mediciones.get(id);if(m&&m.mapaMs==null)m.mapaMs=Math.max(0,ahora-m.inicioMs)}
export function confirmarMovimiento(id:number,ahora:number){const m=mediciones.get(id);if(m&&m.movimientoMs==null)m.movimientoMs=Math.max(0,ahora-m.inicioMs)}
