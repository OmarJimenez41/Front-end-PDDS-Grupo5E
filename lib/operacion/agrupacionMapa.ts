export interface PuntoUnidad {id:number;x:number;y:number}
/** Agrupa símbolos que se solapan en pantalla, sin promediar ni modificar posiciones físicas.
 * La selección siempre queda individual. El orden por ID evita depender del orden de la API.
 */
export function agruparCercanas<T extends PuntoUnidad>(unidades:T[],ancho:number,alto:number,escala:number,seleccion:number|null|undefined,radio=32):Map<string,T[]>{
 const grupos:T[][]=[]
 const sx=Math.max(1,ancho)*Math.max(1,escala)/70,sy=Math.max(1,alto)*Math.max(1,escala)/50
 for(const v of [...unidades].sort((a,b)=>a.id-b.id)){
  const grupo=v.id===seleccion?undefined:grupos.find(g=>g[0].id!==seleccion&&Math.hypot((g[0].x-v.x)*sx,(g[0].y-v.y)*sy)<radio)
  if(grupo)grupo.push(v);else grupos.push([v])
 }
 return new Map(grupos.map(g=>[g.map(v=>v.id).join('-'),g]))
}

/** Consulta de símbolos superpuestos. No agrupa ni reemplaza íconos en el mapa. */
export function unidadesEnPunto<T extends PuntoUnidad>(unidades:T[],id:number,ancho:number,alto:number,escala:number,radio=30):T[]{
 const origen=unidades.find(v=>v.id===id);if(!origen)return []
 const sx=Math.max(1,ancho)*Math.max(1,escala)/70,sy=Math.max(1,alto)*Math.max(1,escala)/50
 return unidades.filter(v=>Math.hypot((v.x-origen.x)*sx,(v.y-origen.y)*sy)<radio).sort((a,b)=>a.id-b.id)
}

/** Parked units belong to the warehouse detail, rather than covering its marker. */
export function estacionadaEnAlmacen(v:PuntoUnidad & {estado?:string},almacenes:{x:number;y:number}[]){
 return (v.estado==='EN_BASE'||v.estado==='PROGRAMADA')&&almacenes.some(a=>Math.abs(a.x-v.x)<1e-6&&Math.abs(a.y-v.y)<1e-6)
}
