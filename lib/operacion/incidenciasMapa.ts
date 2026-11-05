import type {Arista,Incidencia,Tramo,InstantaneaOperacion} from '../api/operacion'
export function cruzaTramo(a:Tramo,b:Tramo){
 return Math.max(Math.min(a.x1,a.x2),Math.min(b.x1,b.x2))<=Math.min(Math.max(a.x1,a.x2),Math.max(b.x1,b.x2))&&
 Math.max(Math.min(a.y1,a.y2),Math.min(b.y1,b.y2))<=Math.min(Math.max(a.y1,a.y2),Math.max(b.y1,b.y2))
}
export function rutasExpuestas(i:Incidencia,mapa:InstantaneaOperacion|null){
 if(i.tipo!=='BLOQUEO'||!i.activa||!mapa?.aplicable)return []
 return (mapa.plan?.rutas??[]).filter(r=>r.trayectoria.some(a=>a.llegadaH>i.instanteH&&(i.finH==null||a.salidaH<i.finH)&&i.tramos.some(t=>cruzaTramo(a,t))))
}
