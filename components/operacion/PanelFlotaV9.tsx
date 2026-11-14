'use client'
import {PanelTrabajoV9} from './PanelTrabajoV9'
import {useMemo,useState} from 'react'
import type {Incidencia,UnidadOperativa} from '../../lib/api/operacion'
import type {EstadoDetalle} from '../../lib/operacion/lectura'
import {luzOcupacion,claseLuz,estadoEnEspanol,metricasUnidad,unidadCumple,type MetricasUnidad} from '../../lib/operacion/mejorasV9'
import {useV9} from './ContextoV9'
type Extendida=UnidadOperativa&Partial<MetricasUnidad>
type Orden='ocupacionPct'|'salidaH'|'llegadaH'|'llegadaDestinoH'|'destinoKm'|'origenKm'|'recorridoKm'|'destinoMin'|'origenMin'
export function ordenarUnidades<T extends Extendida>(unidades:T[],campo:Orden,ascendente:boolean):T[] {
 return [...unidades].sort((a,b)=>{const x=a[campo],y=b[campo];return x==null||y==null?x==null&&y==null?a.codigo.localeCompare(b.codigo):x==null?1:-1:(x-y)*(ascendente?1:-1)||a.codigo.localeCompare(b.codigo)})
}
export const ocupacion=luzOcupacion
export function flotaOficial(unidades:UnidadOperativa[]){return unidades.length===37&&(['AUTO','MOTO','BICICLETA'] as const).every((tipo,i)=>unidades.filter(u=>u.tipo===tipo).length===[10,15,12][i])}
export function PanelFlota({unidades,detalle,hora,seleccion,onSeleccion,incidencias,onPedido}:{unidades:UnidadOperativa[]|null;detalle:EstadoDetalle;hora:(h:number)=>string;seleccion:number|null;onSeleccion:(id:number|null)=>void;incidencias:Incidencia[];onPedido:(codigo:string)=>void}){
 const ctx=useV9(),[campo,setCampo]=useState<Orden>('ocupacionPct'),[ascendente,setAscendente]=useState(true)
 const busqueda=ctx.filtros.codigo??'',medida=ctx.filtros.medida??'destinoKm',minimo=ctx.filtros.minimo??'',maximo=ctx.filtros.maximo??''
 const setBusqueda=(codigo:string)=>ctx.setFiltros({...ctx.filtros,codigo})
 const setMedida=(medida:'destinoKm'|'origenKm'|'destinoMin'|'origenMin')=>ctx.setFiltros({...ctx.filtros,medida})
 const setMinimo=(minimo:string)=>ctx.setFiltros({...ctx.filtros,minimo})
 const setMaximo=(maximo:string)=>ctx.setFiltros({...ctx.filtros,maximo})
 const lista=useMemo(()=>ordenarUnidades((unidades??[]).filter(u=>u.codigo.toLowerCase().includes(busqueda.trim().toLowerCase())&&unidadCumple(u,ctx.filtros,ctx.mapa,ctx.limites)).map(u=>({...u,...metricasUnidad(u,ctx.mapa)})).filter(u=>{
  if(minimo===''&&maximo==='')return true;const valor=u[medida];return valor!=null&&(minimo===''||valor>=Number(minimo))&&(maximo===''||valor<=Number(maximo))
 }),campo,ascendente),[unidades,busqueda,ctx,medida,minimo,maximo,campo,ascendente])
 const ficha=unidades?.find(u=>u.id===seleccion),metricas=ficha?metricasUnidad(ficha,ctx.mapa):null
 const n=(v:number|null|undefined)=>v==null?'No disponible':v.toFixed(1)
 const valorOrden=(u:Extendida)=>{const v=u[campo];return v==null?'No disponible':campo.endsWith('H')?hora(v):n(v)+(campo==='ocupacionPct'?' %':campo.endsWith('Min')?' min':' km')}
 const opciones:[Orden,string][]=[['ocupacionPct','Ocupación'],['salidaH','Salida del origen'],['llegadaDestinoH','Llegada al próximo destino'],['llegadaH','Retorno de ruta'],['destinoKm','Km hasta destino'],['origenKm','Km desde origen'],['recorridoKm','Km recorridos acumulados'],['destinoMin','Min hasta destino'],['origenMin','Min desde salida']]
 if(ctx.panelActivo!=='flota')return null
 return <PanelTrabajoV9 titulo={`Flota operativa (${unidades?.length??0})`} descripcion="Ocupación, trayectos y productos de cada unidad." onCerrar={()=>onSeleccion(null)}>
 {detalle!=='actual'&&<p role="status" className="mt-2 bg-amber-50 p-2 text-amber-900">Detalle {detalle==='pendiente'?'pendiente de sincronización':'desactualizado'}. Los filtros conservan el último dato recibido.</p>}
 {unidades&&!flotaOficial(unidades)&&<p className="text-amber-900">Composición distinta de la flota oficial 37 (10 autos, 15 motos, 12 bicicletas).</p>}
 {ctx.mapa&&!ctx.mapa.aplicable&&<p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-900">Ruta en actualización. Posición y carga confirmadas.</p>}
 <details className="ayuda-filtro-flota"><summary>Colores de ocupación</summary><p>Sin carga: 0 %. Baja: menos de {ctx.limites.verde} %. Media: menos de {ctx.limites.rojo} %. Alta: desde {ctx.limites.rojo} %.</p></details>
 <input className="mt-2 w-full border p-2" aria-label="Buscar unidad por código" placeholder="Buscar código" value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
 <label className="mt-2 block">Destino inmediato<select aria-label="Filtrar UT por destino" className="w-full border p-1" value={ctx.filtros.destino??'todos'} onChange={e=>ctx.setFiltros({...ctx.filtros,destino:e.target.value})}><option value="todos">Todos</option>{[...new Set((unidades??[]).flatMap(u=>u.destino?[u.destino.codigo]:[]))].sort().map(c=><option key={c}>{c}</option>)}</select></label>
 <details className="filtros-avanzados"><summary>Filtrar por distancia o tiempo</summary> <div className="mt-2 grid grid-cols-2 gap-2"><label>Magnitud<select className="w-full border p-1" value={medida} onChange={e=>setMedida(e.target.value as typeof medida)}>{opciones.filter(x=>['destinoKm','origenKm','destinoMin','origenMin'].includes(x[0])).map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></label><div className="flex gap-1"><label>Mínimo<input className="w-full border p-1" type="number" min="0" value={minimo} onChange={e=>setMinimo(e.target.value)}/></label><label>Máximo<input className="w-full border p-1" type="number" min="0" value={maximo} onChange={e=>setMaximo(e.target.value)}/></label></div></div>

 {(Number(minimo)<0||Number(maximo)<0||(minimo!==''&&maximo!==''&&Number(minimo)>Number(maximo)))&&<p role="alert" className="text-red-700">Rango inválido: usa valores positivos y mínimo ≤ máximo.</p>}
</details>
 <label className="mt-2 block">Ordenar por <select className="border p-1" value={campo} onChange={e=>setCampo(e.target.value as Orden)}>{opciones.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label><button className="mt-1 border p-1" onClick={()=>setAscendente(!ascendente)}>{ascendente?'Ascendente':'Descendente'}</button>
 <button className="ml-2 border p-1" onClick={()=>ctx.setFiltros({...ctx.filtros,codigo:'',minimo:'',maximo:'',destino:'todos'})}>Limpiar búsqueda</button><p className="my-2">{lista.length} coincidencias · filtros globales activos</p>
 <p className="text-slate-500">{opciones.find(o=>o[0]===medida)?.[1]} · {unidades?.filter(u=>metricasUnidad(u,ctx.mapa)[medida]==null).length??0} UT sin métrica disponible. No se consideran dentro de un rango.</p>
 <ul className="max-h-44 overflow-y-auto">{lista.map(u=><li key={u.id}><button aria-pressed={u.id===seleccion} className={`flex w-full justify-between border-b p-2 text-left ${u.id===seleccion?'bg-blue-100':''}`} onClick={()=>onSeleccion(u.id)}><span><b>{u.codigo}</b> · {estadoEnEspanol(u.tipo)} · {estadoEnEspanol(u.estado)}<span className="block text-slate-500">{opciones.find(o=>o[0]===medida)?.[1]}: {n(u[medida])} {medida.endsWith('Min')?'min':'km'}</span><span className="block font-semibold text-blue-700">{opciones.find(o=>o[0]===campo)?.[1]}: {valorOrden(u)}</span></span><span className={claseLuz[luzOcupacion(u.ocupacionPct,u.capacidad,ctx.limites)]}>{u.ocupacionPct}%</span></button></li>)}</ul>
 {ficha&&<div className="mt-3 border bg-blue-50 p-3"><b>{ficha.codigo} · {estadoEnEspanol(ficha.tipo)}</b><p>{estadoEnEspanol(ficha.estado)} · {ficha.carga}/{ficha.capacidad} · <span className={claseLuz[luzOcupacion(ficha.ocupacionPct,ficha.capacidad,ctx.limites)]}>{ficha.ocupacionPct}% {luzOcupacion(ficha.ocupacionPct,ficha.capacidad,ctx.limites)}</span></p>
 <p>Origen: {ficha.origen?.codigo??'Sin asignación'} · Destino: {ficha.destino?.codigo??'Sin asignación'}</p><p>Salida: {ficha.salidaH==null?'No disponible':hora(ficha.salidaH)} · Próxima llegada: {metricas?.llegadaDestinoH==null?'No disponible':hora(metricas.llegadaDestinoH)} · Retorno: {ficha.llegadaH==null?'No disponible':hora(ficha.llegadaH)}</p>
 <p>Destino: {n(metricas?.destinoKm)} km / {n(metricas?.destinoMin)} min · Desde salida: {n(metricas?.origenKm)} km / {n(metricas?.origenMin)} min</p><p>Recorrido acumulado: {ficha.recorridoKm.toFixed(1)} km</p>
<button className="mt-3 w-full rounded-xl bg-blue-700 px-3 py-2 font-semibold text-white" onClick={()=>{ctx.setConsultaEnvios({vehiculoId:ficha.id});ctx.setPanelActivo('envios')}}>Ver envíos e identificadores de productos de esta UT</button>
 <h3 className="mt-2 font-bold">{ficha.estado==='PROGRAMADA'?'Pedidos programados':'Pedidos y parciales asociados'}</h3>{ficha.pedidos.map((p,i)=><p key={`${p.id}-${i}`}><button className="text-blue-700 underline" onClick={()=>onPedido(p.codigo)}>{p.codigo}</button> · {p.cantidad} unidades · ETA {p.etaH==null?'Sin asignación':hora(p.etaH)}</p>)}
 {ficha.averia&&<p>Avería tipo {ficha.averia.tipo} desde {hora(ficha.averia.desdeH)} hasta {ficha.averia.hastaH==null?'Sin fin':hora(ficha.averia.hastaH)}</p>}{incidencias.filter(i=>i.tipo==='MANTENIMIENTO'&&i.vehiculoId===ficha.id).map(i=><p key={i.id}>Mantenimiento desde {hora(i.instanteH)} hasta {i.finH==null?'Sin fin':hora(i.finH)}</p>)}
 </div>}{seleccion!=null&&unidades&&!ficha&&<p>La unidad seleccionada ya no está disponible.</p>}
 </PanelTrabajoV9>
}
