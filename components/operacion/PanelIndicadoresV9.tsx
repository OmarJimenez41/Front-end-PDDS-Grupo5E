'use client'
import {useContext} from 'react'
import {useV9} from './ContextoV9'
import {UmbralesCtx} from './umbrales'
import {PanelTrabajoV9} from './PanelTrabajoV9'
import {resumenGlobal,luzOcupacion,luzStock,type Luz} from '../../lib/operacion/mejorasV9'
const colores:Record<Luz,string>={vacío:'border-slate-200 bg-slate-50 text-slate-700',verde:'border-emerald-200 bg-emerald-50 text-emerald-800',ámbar:'border-amber-200 bg-amber-50 text-amber-900',rojo:'border-red-200 bg-red-50 text-red-800','no disponible':'border-slate-200 bg-slate-50 text-slate-500'}
// Los tiempos del motor (Ta, Sa, Sc) siguen en Reportes → sección del motor; aquí solo va la operación (JP 26/11).
export function PanelIndicadoresV9({hora}:{hora:(h:number)=>string;escenarioId?:number|null}){
 const ctx=useV9(),u=useContext(UmbralesCtx)
 if(ctx.panelActivo!=='indicadores')return null
 const r=resumenGlobal(ctx.mapa,ctx.unidades)
 const tarjetas=[{titulo:'Ocupación de flota',pct:r.ocupacion,luz:luzOcupacion(r.ocupacion,r.capacidad,ctx.limites),detalle:`${r.carga??'—'} de ${r.capacidad} productos a bordo`,nota:`Baja: menos de ${ctx.limites.verde} %. Media: menos de ${ctx.limites.rojo} %. Alta: desde ${ctx.limites.rojo} %. Sin carga: 0 %.`},{titulo:'Stock de almacenes',pct:r.porcentajeStock,luz:luzStock(r.porcentajeStock,u.stock),detalle:`${r.stock} de ${r.capacidadStock} productos disponibles`,nota:`Nivel bajo: menos de ${u.stock.rojo} %. Intermedio: menos de ${u.stock.verde} %. Disponible: desde ${u.stock.verde} %. El almacén central ilimitado no se incluye.`}]
 return <PanelTrabajoV9 className="panel-indicadores" titulo="Indicadores" ancho={340}>

<><p className="mb-3 text-[11px] text-slate-500">{ctx.mapa?`Corte: ${hora(ctx.mapa.relojH)}`:'Esperando la lectura del servidor'}</p>{tarjetas.map(c=><article key={c.titulo} className={`indicador-resumen ${colores[c.luz]}`}><h3>{c.titulo}</h3><strong>{c.pct==null?'—':c.pct.toFixed(1)+' %'}</strong><p>{c.pct==null?'Sin medición disponible':c.detalle}</p><div className="barra-indicador"><span style={{width:`${Math.min(100,Math.max(0,c.pct??0))}%`}}/></div><details><summary>Ver umbrales</summary><p>{c.nota}</p></details></article>)}<p className="text-[10px] text-slate-400">Los totales incluyen todo el escenario, aunque filtres el mapa.</p></>
 </PanelTrabajoV9>
}

const punto:Record<Luz,string>={vacío:'#64748b',verde:'#059669',ámbar:'#d97706',rojo:'#dc2626','no disponible':'#94a3b8'}
/** Indicadores de la operación siempre a la vista sobre el mapa (JP 26/11); clic abre el panel completo. */
export function IndicadoresMini(){
 const ctx=useV9(),u=useContext(UmbralesCtx)
 if(!ctx.mapa)return null
 const r=resumenGlobal(ctx.mapa,ctx.unidades)
 const items=[{nombre:'Flota',pct:r.ocupacion,luz:luzOcupacion(r.ocupacion,r.capacidad,ctx.limites),detalle:'Ocupación de la flota'},{nombre:'Stock',pct:r.porcentajeStock,luz:luzStock(r.porcentajeStock,u.stock),detalle:'Stock de almacenes intermedios'}]
 return <button type="button" className="indicadores-mini" title="Ver indicadores" onClick={()=>ctx.setPanelActivo('indicadores')}>{items.map(i=><span key={i.nombre} title={i.detalle}><i style={{background:punto[i.luz]}} aria-hidden="true"/>{i.nombre} <b>{i.pct==null?'—':`${i.pct.toFixed(1)} %`}</b></span>)}</button>
}
