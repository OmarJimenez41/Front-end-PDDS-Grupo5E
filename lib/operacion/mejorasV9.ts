import type { UnidadOperativa, UnidadesOperacion, InstantaneaOperacion, Arista, Umbrales } from '../api/operacion'

export type Luz = 'vacío' | 'verde' | 'ámbar' | 'rojo' | 'no disponible'
export const limitesFlota = { verde: 50, rojo: 80 }
export function luzOcupacion(pct: number | null, capacidad: number, limites = limitesFlota): Luz {
  if (pct == null || !Number.isFinite(pct) || capacidad <= 0) return 'no disponible'
  return pct === 0 ? 'vacío' : pct < limites.verde ? 'verde' : pct < limites.rojo ? 'ámbar' : 'rojo'
}
export function luzStock(pct: number | null, limites: Umbrales = { verde: 50, rojo: 20 }): Luz {
  return pct == null || !Number.isFinite(pct) ? 'no disponible' : pct === 0 ? 'vacío' : pct >= limites.verde ? 'verde' : pct < limites.rojo ? 'rojo' : 'ámbar'
}
export const claseLuz: Record<Luz, string> = { vacío: 'text-slate-700', verde: 'text-emerald-700', ámbar: 'text-amber-800', rojo: 'text-red-700', 'no disponible': 'text-slate-500' }
export function estadoEnEspanol(estado: string | null | undefined): string {
  const etiquetas: Record<string,string> = { EN_BASE:'En base', PROGRAMADA:'Programada', EN_RUTA:'En ruta', EN_SERVICIO:'Entregando', AVERIADA:'Averiada', AVERIADO:'Averiado', EN_MANTENIMIENTO:'En mantenimiento', MANTENIMIENTO:'En mantenimiento', NO_DISPONIBLE:'No disponible', EJECUTANDO:'En ejecución', PAUSADA:'En pausa', DETENIDA:'Detenida', FINALIZADA:'Finalizada', ERROR:'Error', INTERRUMPIDA:'Interrumpida', AUTO:'Auto', MOTO:'Moto', BICICLETA:'Bicicleta' }
  return estado ? etiquetas[estado] ?? estado.toLowerCase().replaceAll('_',' ') : 'No disponible'
}
/** Distancia de la trayectoria certificada, nunca la recta al cliente. */
export function distanciaEntre(aristas: Arista[], inicio: number, fin: number): number {
  const total=aristas.reduce((total,a) => {
    const duracion=a.llegadaH-a.salidaH
    if(duracion<=0)return total
    const proporcion=Math.max(0,Math.min(fin,a.llegadaH)-Math.max(inicio,a.salidaH))/duracion
    return total+Math.hypot(a.x2-a.x1,a.y2-a.y1)*proporcion
  },0)
  return Math.round(total*1e9)/1e9
}
export interface MetricasUnidad { destinoKm: number|null; origenKm: number|null; destinoMin: number|null; origenMin: number|null; llegadaDestinoH: number|null; recorridoKm:number }
export function metricasUnidad(u: UnidadOperativa, mapa: InstantaneaOperacion | null): MetricasUnidad {
  const t=mapa?.relojH ?? 0
  const ruta=mapa?.plan?.rutas.find(r=>r.vehiculoId===u.id && r.horaFinH>t)
  const llegada=u.etaDestinoH ?? u.pedidos.find(p=>p.etaH!=null)?.etaH ?? (u.destino?.tipo==='ALMACEN'?u.llegadaH:null)
  return { destinoKm:ruta && llegada!=null?distanciaEntre(ruta.trayectoria,Math.max(t,ruta.horaInicioH),llegada):null,
    origenKm:ruta && t>=ruta.horaInicioH?distanciaEntre(ruta.trayectoria,ruta.horaInicioH,Math.min(t,ruta.horaFinH)):null,
    destinoMin:u.minutosAlDestino ?? (llegada==null?null:Math.max(0,(llegada-t)*60)),
    origenMin:u.minutosDesdeSalida ?? (u.salidaH==null || u.salidaH>t?null:(t-u.salidaH)*60),
    llegadaDestinoH:llegada ?? null,recorridoKm:u.recorridoKm }
}
export type MedidaFiltro='destinoKm'|'origenKm'|'destinoMin'|'origenMin'
export interface FiltrosV9 { tipo:string; luzUnidad:string; luzAlmacen:string; distancia:string; codigo?:string;medida?:MedidaFiltro;minimo?:string;maximo?:string;destino?:string;almacen?:string;patronAlmacen?:string;zonaAlmacen?:string }
export const filtrosIniciales: FiltrosV9 = {tipo:'todos',luzUnidad:'todos',luzAlmacen:'todos',distancia:'todos'}
export function zonaAlmacen(a:{x:number;y:number}){return `${a.y>=25?'Nor':'Sur'}${a.x>=35?'este':'oeste'}`}
export function almacenCumple(a:{codigo:string;x:number;y:number;central:boolean;stock:number|null;capacidad:number|null},f:FiltrosV9,limites:Umbrales={verde:50,rojo:20}){
 const patron=(f.patronAlmacen??'').trim().toLowerCase()
 const coincide=patron.includes('*')||patron.includes('?')?new RegExp('^'+patron.split('').map(c=>c==='*'?'.*':c==='?'?'.':c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('')+'$','i').test(a.codigo):a.codigo.toLowerCase().includes(patron)
 const pct=a.central||!a.capacidad||a.stock==null?null:100*a.stock/a.capacidad
 return coincide&&(!f.almacen||f.almacen==='todos'||f.almacen===a.codigo)&&(!f.zonaAlmacen||f.zonaAlmacen==='todos'||f.zonaAlmacen===zonaAlmacen(a))&&(f.luzAlmacen==='todos'||f.luzAlmacen===luzStock(pct,limites))
}
export function unidadCumple(u: UnidadOperativa, filtros:FiltrosV9, mapa:InstantaneaOperacion|null, limites=limitesFlota) {
  if(filtros.codigo&&!u.codigo.toLowerCase().includes(filtros.codigo.trim().toLowerCase()))return false
  if(filtros.destino&&filtros.destino!=='todos'&&u.destino?.codigo!==filtros.destino)return false
  if(filtros.tipo!=='todos' && u.tipo!==filtros.tipo)return false
  if(filtros.luzUnidad!=='todos' && luzOcupacion(u.ocupacionPct,u.capacidad,limites)!==filtros.luzUnidad)return false
  if(filtros.minimo||filtros.maximo){
    const min=filtros.minimo?Number(filtros.minimo):0,max=filtros.maximo?Number(filtros.maximo):Infinity
    const valor=metricasUnidad(u,mapa)[filtros.medida??'destinoKm']
    if(!Number.isFinite(min)||min<0||Number.isNaN(max)||max<min||valor==null||!Number.isFinite(valor)||valor<min||valor>max)return false
  }
  if(filtros.distancia==='todos')return true
  const km=metricasUnidad(u,mapa).destinoKm;if(km==null)return false
  const [a,b]=filtros.distancia.split(':').map(Number);return km>=a && km<b
}
export function resumenGlobal(mapa:InstantaneaOperacion|null,detalle:UnidadesOperacion|null) {
  const flota=mapa?.fisico?.vehiculos??detalle?.unidades
  const carga=flota?.reduce((t,u)=>t+u.carga,0) ?? null
  const capacidad=flota?.reduce((t,u)=>t+u.capacidad,0) ?? 0
  const finitos=mapa?.fisico?.almacenes.filter(a=>!a.central && a.capacidad!=null && a.stock!=null) ?? []
  const stock=finitos.reduce((t,a)=>t+a.stock!,0),capacidadStock=finitos.reduce((t,a)=>t+a.capacidad!,0)
  return {carga,capacidad,ocupacion:carga==null || capacidad<=0?null:carga*100/capacidad,stock,capacidadStock,
    porcentajeStock:capacidadStock>0?stock*100/capacidadStock:null}
}
export function duracionSimulada(horas:number) {
  const minutos=Math.max(0,Math.floor(horas*60));return `${Math.floor(minutos/1440)} d ${String(Math.floor(minutos/60)%24).padStart(2,'0')}:${String(minutos%60).padStart(2,'0')}`
}
