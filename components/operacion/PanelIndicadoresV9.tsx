'use client'
import {useContext,useState} from 'react'
import {Activity,Gauge} from 'lucide-react'
import {TiemposPlanificador} from './TiemposPlanificador'
import {useV9} from './ContextoV9'
import {UmbralesCtx} from './umbrales'
import {PanelTrabajoV9} from './PanelTrabajoV9'
import {resumenGlobal,luzOcupacion,luzStock,type Luz} from '../../lib/operacion/mejorasV9'
import {medicion} from '../../lib/operacion/latencia'
const colores:Record<Luz,string>={vacío:'border-slate-200 bg-slate-50 text-slate-700',verde:'border-emerald-200 bg-emerald-50 text-emerald-800',ámbar:'border-amber-200 bg-amber-50 text-amber-900',rojo:'border-red-200 bg-red-50 text-red-800','no disponible':'border-slate-200 bg-slate-50 text-slate-500'}
export function PanelIndicadoresV9({hora,escenarioId=null}:{hora:(h:number)=>string;escenarioId?:number|null}){
 const ctx=useV9(),u=useContext(UmbralesCtx),[vista,setVista]=useState<'operacion'|'motor'>('operacion')
 if(ctx.panelActivo!=='indicadores')return null
 const r=resumenGlobal(ctx.mapa,ctx.unidades),m=ctx.mapa?medicion(ctx.mapa.escenarioId):null
 const tarjetas=[{titulo:'Ocupación de flota',pct:r.ocupacion,luz:luzOcupacion(r.ocupacion,r.capacidad,ctx.limites),detalle:`${r.carga??'—'} de ${r.capacidad} productos a bordo`,nota:`Baja: menos de ${ctx.limites.verde} %. Media: menos de ${ctx.limites.rojo} %. Alta: desde ${ctx.limites.rojo} %. Sin carga: 0 %.`},{titulo:'Existencias de almacenes',pct:r.porcentajeStock,luz:luzStock(r.porcentajeStock,u.stock),detalle:`${r.stock} de ${r.capacidadStock} productos disponibles`,nota:`Nivel bajo: menos de ${u.stock.rojo} %. Intermedio: menos de ${u.stock.verde} %. Disponible: desde ${u.stock.verde} %. El almacén central ilimitado no se incluye.`}]
 return <PanelTrabajoV9 titulo="Indicadores" descripcion="Información del escenario seleccionado.">
 <div className="selector-indicadores" role="group" aria-label="Vista de indicadores"><button type="button" aria-pressed={vista==='operacion'} onClick={()=>setVista('operacion')}><Gauge className="size-4"/>Operación</button><button type="button" aria-pressed={vista==='motor'} onClick={()=>setVista('motor')}><Activity className="size-4"/>Motor</button></div>
 {vista==='operacion'?<><p className="mb-3 text-[11px] text-slate-500">{ctx.mapa?`Corte: ${hora(ctx.mapa.relojH)}`:'Esperando la lectura del servidor'}</p>{tarjetas.map(c=><article key={c.titulo} className={`indicador-resumen ${colores[c.luz]}`}><h3>{c.titulo}</h3><strong>{c.pct==null?'—':c.pct.toFixed(1)+' %'}</strong><p>{c.pct==null?'Sin medición disponible':c.detalle}</p><div className="barra-indicador"><span style={{width:`${Math.min(100,Math.max(0,c.pct??0))}%`}}/></div><details><summary>Ver umbrales</summary><p>{c.nota}</p></details></article>)}<p className="text-[10px] text-slate-400">Los totales incluyen todo el escenario, aunque filtres el mapa.</p>
 <details className="mt-4 rounded-lg border border-slate-200 p-3 text-[11px]"><summary className="cursor-pointer text-slate-500">Rendimiento de esta vista</summary><p className="mt-2">Mapa visible: {m?.mapaMs==null?'Sin medición':(m.mapaMs/1000).toFixed(2)+' s'}</p><p>Primer movimiento confirmado: {m?.movimientoMs==null?'Sin medición':(m.movimientoMs/1000).toFixed(2)+' s'}</p><p className="mt-2 text-slate-400">Mediciones de este navegador, separadas de las del motor.</p></details></>:<TiemposPlanificador escenarioId={ctx.mapa?.escenarioId??escenarioId}/>}
 </PanelTrabajoV9>
}
