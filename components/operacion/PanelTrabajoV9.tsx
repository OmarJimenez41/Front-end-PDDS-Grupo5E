'use client'
import type {ReactNode} from 'react'
import {X} from 'lucide-react'
import {useV9} from './ContextoV9'
export function PanelTrabajoV9({titulo,descripcion,children,ancho=460}:{titulo:string;descripcion?:string;children:ReactNode;ancho?:number}){
 const ctx=useV9()
 return <section aria-label={titulo} className="panel-trabajo-v9 absolute inset-y-3 right-3 z-30 flex max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-xs shadow-xl" style={{width:ancho}}><div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/80 p-4"><div><h2 className="text-base font-bold text-slate-900">{titulo}</h2>{descripcion&&<p className="mt-1 leading-relaxed text-slate-500">{descripcion}</p>}</div><button onClick={()=>ctx.setPanelActivo(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-200" aria-label={`Cerrar ${titulo}`}><X className="size-4"/></button></div><div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div></section>
}
