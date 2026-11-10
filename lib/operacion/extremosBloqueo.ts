import type {Tramo} from '../api/operacion'
/** Ends of connected blocked polylines, excluding their intermediate corners. */
export function extremosBloqueo(tramos:Tramo[]):{x:number;y:number}[]{
 const nodos=new Map<string,{x:number;y:number;grado:number}>(),aristas=new Set<string>()
 for(const t of tramos){
  const a=`${t.x1},${t.y1}`,b=`${t.x2},${t.y2}`
  if(a===b)continue
  const clave=[a,b].sort().join('|');if(aristas.has(clave))continue;aristas.add(clave)
  for(const [k,x,y] of [[a,t.x1,t.y1],[b,t.x2,t.y2]] as const){const previo=nodos.get(k);nodos.set(k,{x,y,grado:(previo?.grado??0)+1})}
 }
 return [...nodos.values()].filter(p=>p.grado===1).map(({x,y})=>({x,y}))
}
