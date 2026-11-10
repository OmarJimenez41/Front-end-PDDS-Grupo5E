import { direccionEn, posicionFisica, type Arista, type InstantaneaOperacion, type PlanInstantanea } from '../api/operacion'
import { crearEvaluador, trayectoriaConfirmada, unirTrayectorias } from './movimiento'

export type Posiciones = Record<number, {x:number;y:number;direccion:number|null;enMovimiento?:boolean}>
export interface CuadroMovimiento {
 escenarioId:number; relojH:number; posiciones:Posiciones; caminos:Record<number,Arista[]>; plan:PlanInstantanea|null; instantanea?:InstantaneaOperacion
}
export function cuadroFisico(m:InstantaneaOperacion):CuadroMovimiento {
 return {instantanea:m,escenarioId:m.escenarioId,relojH:m.relojH,plan:m.plan,caminos:{},posiciones:Object.fromEntries((m.fisico?.vehiculos??[]).map(v=>{
  const ruta=m.plan?.rutas.find(r=>r.vehiculoId===v.id&&r.horaInicioH<=m.relojH&&r.horaFinH>=m.relojH)
  const p=posicionFisica(v),residual=v.residual
  const direccion=residual?Math.atan2(-(residual.destinoY-p.y),residual.destinoX-p.x)*180/Math.PI:ruta?direccionEn(ruta.trayectoria,m.relojH):null
  const enMovimiento=residual?Math.hypot(residual.destinoX-p.x,residual.destinoY-p.y)>.001:!!ruta?.trayectoria.some(a=>a.salidaH<=m.relojH&&m.relojH<a.llegadaH&&(a.x1!==a.x2||a.y1!==a.y2))
  return [v.id,{...p,direccion,enMovimiento}]
 }))}
}
/** Conserva el camino aún no mostrado cuando llega otra lectura. Nunca dibuja un atajo. */
export function prepararTransicion(anterior:InstantaneaOperacion,actual:InstantaneaOperacion,visual:CuadroMovimiento|null) {
 const previo=visual?.escenarioId===actual.escenarioId?visual:null
 const desdeH=previo?Math.min(previo.relojH,anterior.relojH):anterior.relojH
 const hastaH=actual.relojH, caminos:Record<number,Arista[]>={}
 const evaluadores=new Map<number,NonNullable<ReturnType<typeof crearEvaluador>>>()
 for(const v of actual.fisico?.vehiculos??[]){
  const confirmado=trayectoriaConfirmada(anterior,actual,v.id)
  if(!confirmado)continue
  const pendientes=(previo?.caminos[v.id]??[]).filter(a=>a.salidaH<anterior.relojH&&a.llegadaH>=desdeH)
  const camino=unirTrayectorias(pendientes,confirmado),evaluar=crearEvaluador(camino)
  const inicio=evaluar?.(desdeH),visto=previo?.posiciones[v.id],fin=evaluar?.(hastaH),fisico=posicionFisica(v)
  if(!evaluar||!inicio||!fin||Math.hypot(fin.x-fisico.x,fin.y-fisico.y)>=.01||
     (visto&&Math.hypot(inicio.x-visto.x,inicio.y-visto.y)>=.01))continue
  caminos[v.id]=camino;evaluadores.set(v.id,evaluar)
 }
 const base=cuadroFisico(actual),origen=previo??cuadroFisico(anterior)
 const ultimasDirecciones=new Map<number,number|null>(Object.entries(previo?.posiciones??{}).map(([id,p])=>[Number(id),p.direccion]))
 return {animable:evaluadores.size>0, cuadro:(fraccion:number):CuadroMovimiento=>{
  const relojH=desdeH+(hastaH-desdeH)*Math.max(0,Math.min(1,fraccion))
  const posiciones={...(fraccion>=1?base.posiciones:origen.posiciones)}
  for(const [id,evaluar] of evaluadores){
   const p=evaluar(relojH)
   if(p){if(p.direccion!=null)ultimasDirecciones.set(id,p.direccion);posiciones[id]={...p,direccion:p.direccion??ultimasDirecciones.get(id)??null,enMovimiento:p.direccion!=null}}
  }
  const corte=actual.plan?.instanteH??actual.relojH
  return {...base,instantanea:fraccion>=1?actual:anterior,relojH,posiciones,caminos,plan:anterior.plan?.id!==actual.plan?.id&&relojH<corte?anterior.plan:actual.plan}
 }}
}
