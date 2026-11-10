import type {MapaDatos,PlanInstantanea} from '../api/operacion'
/** Solo reduce vértices colineales del dibujo. No altera tiempos ni trayectoria física. */
export function prepararRutas(plan:PlanInstantanea|null){
 return (plan?.rutas??[]).filter(r=>r.trazado.length>1).map(ruta=>{
  const vertices:{p:[number,number];indice:number}[]=[]
  ruta.trazado.forEach((p,indice)=>{
   const ultimo=vertices.at(-1)
   if(ultimo&&ultimo.p[0]===p.x&&ultimo.p[1]===p.y)return
   while(vertices.length>1){
    const a=vertices[vertices.length-2].p,b=vertices[vertices.length-1].p
    const dx=b[0]-a[0],dy=b[1]-a[1],ex=p.x-b[0],ey=p.y-b[1]
    if(dx*ey-dy*ex!==0||dx*ex+dy*ey<=0)break
    vertices.pop()
   }
   vertices.push({p:[p.x,p.y],indice})
  })
  return {ruta,puntos:vertices.map(v=>v.p),indices:vertices.map(v=>v.indice)}
 })
}
export function rutasEnHora(preparadas:ReturnType<typeof prepararRutas>,hora:number,aplicable:boolean):MapaDatos['rutas']{
 return preparadas.filter(({ruta})=>ruta.horaFinH>=hora).map(({ruta,puntos,indices})=>{
  const t=ruta.trazado;let i=0,fin=t.length-1
  while(i<fin){const medio=(i+fin)>>1;if(t[medio].instanteH<hora)i=medio+1;else fin=medio}
  const a=t[Math.max(0,i-1)],b=t[i],f=b.instanteH>a.instanteH?Math.max(0,Math.min(1,(hora-a.instanteH)/(b.instanteH-a.instanteH))):1
  const p:[number,number]=[a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f]
  let corte=0,ultimo=indices.length
  while(corte<ultimo){const medio=(corte+ultimo)>>1;if(indices[medio]<i)corte=medio+1;else ultimo=medio}
  return {id:ruta.id,vehiculoId:ruta.vehiculoId,tipo:ruta.tipoVehiculo,puntos,
   recorrido:hora<ruta.horaInicioH?[]:[...puntos.slice(0,corte),p],
   porRecorrer:hora<ruta.horaInicioH?puntos:[p,...puntos.slice(corte)],pendientePlan:!aplicable}
 })
}
