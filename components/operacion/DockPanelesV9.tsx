'use client'
import {Car,Warehouse,Package,AlertTriangle,FolderUp,FileChartColumn,Gauge,type LucideIcon} from 'lucide-react'
import {useV9,type PanelActivo} from './ContextoV9'
export function DockPanelesV9({operador}:{operador:boolean}){
 const ctx=useV9()
 const todos:[Exclude<PanelActivo,null>,string,string,LucideIcon][]=[['flota','Flota','Ver flota',Car],['almacenes','Almacenes','Ver almacenes',Warehouse],['envios','Envíos y productos','Ver envíos',Package],['incidencias','Incidencias','Ver incidencias',AlertTriangle],['datos','Datos de entrada','Gestionar datos de entrada',FolderUp],['indicadores','Indicadores','Ver indicadores globales',Gauge],['reportes','Reportes','Ver reportes',FileChartColumn]]
 const botones=todos.filter(([id])=>id!=='datos'||operador)
 return <nav aria-label="Paneles de trabajo" className="flex flex-wrap gap-1.5">{botones.map(([id,label,aria,Icono])=><button key={id} aria-label={aria} aria-pressed={ctx.panelActivo===id} onClick={()=>{if(id==='envios')ctx.setConsultaEnvios(null);ctx.setPanelActivo(ctx.panelActivo===id?null:id as PanelActivo)}} className={`flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-blue-600 ${ctx.panelActivo===id?'bg-blue-700 text-white shadow-sm':'border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'}`}><Icono className="size-4" aria-hidden="true"/>{label}</button>)}</nav>
}
