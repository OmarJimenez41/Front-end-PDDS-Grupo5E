'use client'
import {useContext} from 'react'
import {useV9} from './ContextoV9'
import {UmbralesCtx} from './umbrales'
import {PanelTrabajoV9} from './PanelTrabajoV9'
import {resumenGlobal,luzOcupacion,luzStock,type Luz} from '../../lib/operacion/mejorasV9'
import {medicion} from '../../lib/operacion/latencia'
const colores:Record<Luz,string>={vacío:'border-slate-300 bg-slate-50 text-slate-700',verde:'border-emerald-200 bg-emerald-50 text-emerald-800',ámbar:'border-amber-200 bg-amber-50 text-amber-900',rojo:'border-red-200 bg-red-50 text-red-800','no disponible':'border-slate-200 bg-slate-50 text-slate-500'}
export function PanelIndicadoresV9({hora}:{hora:(h:number)=>string}){
 const ctx=useV9(),u=useContext(UmbralesCtx)
 if(ctx.panelActivo!=='indicadores')return null
 const r=resumenGlobal(ctx.mapa,ctx.unidades),flota=luzOcupacion(r.ocupacion,r.capacidad,ctx.limites),almacenes=luzStock(r.porcentajeStock,u.stock),m=ctx.mapa?medicion(ctx.mapa.escenarioId):null
 return <PanelTrabajoV9 titulo="Indicadores globales" descripcion="Totales de la operación; no cambian al filtrar la vista." ancho={440}>
 <p className="mb-3 text-slate-500">Corte del servidor: {ctx.mapa?hora(ctx.mapa.relojH):'Sin datos'}</p>
 {[{titulo:'Ocupación de toda la flota',luz:flota,pct:r.ocupacion,detalle:`${r.carga??'—'} productos a bordo / ${r.capacidad} de capacidad`,nota:`Vacío = 0 % · verde < ${ctx.limites.verde} % · ámbar < ${ctx.limites.rojo} % · rojo desde ${ctx.limites.rojo} %`},{titulo:'Existencias de almacenes finitos',luz:almacenes,pct:r.porcentajeStock,detalle:`${r.stock} productos disponibles / ${r.capacidadStock} de capacidad`,nota:`Vacío = 0 % · rojo < ${u.stock.rojo} % · ámbar < ${u.stock.verde} % · verde desde ${u.stock.verde} %. El central ilimitado se excluye.`}].map(c=><article key={c.titulo} className={`mb-3 rounded-2xl border p-4 ${colores[c.luz]}`}><div className="flex justify-between gap-2"><h3 className="font-bold">{c.titulo}</h3><span className="rounded-full border border-current px-2 py-1 text-[10px] font-bold uppercase">{c.luz}</span></div><strong className="mt-3 block text-3xl tabular-nums">{c.pct==null?'—':c.pct.toFixed(1)+' %'}</strong><p className="mt-1">{c.detalle}</p><div className="my-3 h-2 overflow-hidden rounded-full bg-white/80"><div className="h-full rounded-full bg-current opacity-70" style={{width:`${Math.min(100,Math.max(0,c.pct??0))}%`}}/></div><p className="text-[11px] leading-relaxed">{c.nota}</p></article>)}
 <div className="rounded-xl border p-3"><h3 className="font-bold">Demora observada en este navegador</h3><p className="mt-2">Inicio → mapa visible: {m?.mapaMs==null?'Sin medición':(m.mapaMs/1000).toFixed(2)+' s'}</p><p>Inicio → primer movimiento confirmado: {m?.movimientoMs==null?'Sin medición':(m.movimientoMs/1000).toFixed(2)+' s'}</p><p className="mt-2 text-[11px] text-slate-500">Son mediciones de esta sesión, no un tiempo garantizado. Un vehículo programado puede permanecer en el almacén hasta su hora de salida.</p></div>
 </PanelTrabajoV9>
}
