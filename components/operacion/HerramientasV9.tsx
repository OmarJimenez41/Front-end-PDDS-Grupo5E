'use client'
import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {FiltrosMapa} from './FiltrosMapa'
import {useV9} from './ContextoV9'
import {duracionSimulada} from '../../lib/operacion/mejorasV9'
import type {VistaSimulacion} from '../../lib/api/simulacion'
import {pedir,mensajeError} from '../../lib/api/simulacion'
import {CatalogoV9} from './CatalogoV9'
import {DockPanelesV9} from './DockPanelesV9'
import {CalendarClock, Timer, Clock3, SlidersHorizontal, Settings2, Download, FileDown, FileSpreadsheet, Database, ChevronDown, X, Share2, FolderUp} from 'lucide-react'

export function HerramientasV9({sim,segReal,hora,operador,esDia}:{sim:VistaSimulacion|null;segReal:number;hora:(h:number)=>string;operador:boolean;esDia:boolean}){
 const ctx=useV9(),[abierto,setAbierto]=useState(false),[catalogo,setCatalogo]=useState(false),[actual,setActual]=useState<Date|null>(null),[mensaje,setMensaje]=useState('')
 const [enlace,setEnlace]=useState('')
 const [exportando,setExportando]=useState<string|null>(null)
 const bloqueoExportacion=useRef(false)
 const compartir=()=>{if(!ctx.mapa)return;const url=new URL(window.location.href);url.search='';url.searchParams.set('escenario',String(ctx.mapa.escenarioId));url.searchParams.set('vista','consulta');setEnlace(url.href)}
 const {herramientasVisibles,setHerramientasVisibles}=ctx
 const [destino,setDestino]=useState<HTMLElement|null>(null)
 useEffect(()=>{setDestino(document.getElementById('herramientas-laterales'));setHerramientasVisibles(true)},[operador])
 const descargas=useRef<HTMLDetailsElement>(null),configuracion=useRef<HTMLDetailsElement>(null)
 useEffect(()=>{
  const cerrarFuera=(e:PointerEvent)=>{for(const ref of [descargas,configuracion])if(e.target instanceof Node&&!ref.current?.contains(e.target))ref.current?.removeAttribute('open')}
  const cerrarEscape=(e:KeyboardEvent)=>{if(e.key==='Escape')for(const ref of [descargas,configuracion])if(ref.current?.open){ref.current.removeAttribute('open');ref.current.querySelector('summary')?.focus()}}
  document.addEventListener('pointerdown',cerrarFuera);document.addEventListener('keydown',cerrarEscape)
  return()=>{document.removeEventListener('pointerdown',cerrarFuera);document.removeEventListener('keydown',cerrarEscape)}
 },[])
 useEffect(()=>{setActual(new Date());const id=setInterval(()=>setActual(new Date()),1000);return()=>clearInterval(id)},[])
 const descargarPdf=async(tipo:'cierre'|'corte'|'rutas'|'manifiesto')=>{
  if(bloqueoExportacion.current)return
  const id=ctx.mapa?.escenarioId
  if(tipo!=='manifiesto'&&id==null)return
  bloqueoExportacion.current=true;setExportando(tipo);setMensaje('Preparando PDF…')
  try{
   const pdf=await import('../../lib/operacion/reportePdf')
   if(tipo==='manifiesto'){const datos=await pedir<import('../../lib/operacion/reportePdf').ManifiestoPdf>('/api/datos/manifiesto');pdf.crearManifiestoPdf(datos).save('paqrap-manifiesto-datos.pdf')}
   else {const reporte=await pedir<import('../../lib/operacion/reporteLegible').ReporteOperacion>(`/api/escenarios/${id}/${tipo==='cierre'?'reporte-final':'reporte'}`);pdf.crearReportePdf(reporte,hora,sim,tipo==='rutas').save(`paqrap-${tipo}-${id}-v${reporte.versionEstado}.pdf`)}
   setMensaje('PDF descargado correctamente.');descargas.current?.removeAttribute('open')
  }catch(e){setMensaje(`No se pudo descargar el PDF. ${mensajeError(e)}`)}finally{bloqueoExportacion.current=false;setExportando(null)}
 }

 const segundos=Math.max(0,Math.floor(segReal)),duracionReal=[Math.floor(segundos/3600),Math.floor(segundos/60)%60,segundos%60].map(v=>String(v).padStart(2,'0')).join(':')
 const accion='inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
 const tiempos=[
  {nombre:esDia?'Fecha de operación':'Fecha simulada',valor:sim?.fechaSimulada?.replace('T',' ')??(ctx.mapa?hora(ctx.mapa.relojH):'No disponible'),icono:CalendarClock,simulado:true},
  {nombre:esDia?'Transcurrido':'Transcurrido simulado',valor:ctx.mapa?duracionSimulada(ctx.mapa.relojH-(sim?.simulacion.inicioH??0)):'No disponible',icono:Timer,simulado:true},
  {nombre:'Ahora · Lima',valor:actual?.toLocaleString('es-PE',{timeZone:'America/Lima',hour12:false})??'Sincronizando',icono:Clock3,simulado:false},
  {nombre:'Tiempo real',valor:duracionReal,icono:Timer,simulado:false},
 ].filter((_,indice)=>!esDia||(indice!==1&&indice!==3))
 const contenido=<section className={`herramientas-v9 relative shrink-0 text-xs $herramientas-verticales`} aria-label="Tiempos y herramientas">
 <div id="contenido-barra-v9" hidden={!herramientasVisibles}>
 {mensaje&&<p role="status" className="mb-2 rounded bg-blue-50 px-3 py-2 text-blue-800">{mensaje}</p>}

 <div className="toolbar-operativa">
  <DockPanelesV9/>

  <div id="acciones-herramientas-v9" className="utilidades-operativas utilidades-simples" role="group" aria-label="Herramientas de la operación">
<button type="button" aria-label="Filtrar mapa" title="Filtrar mapa" className="utilidad-boton" aria-expanded={abierto} aria-controls="filtros-v9" onClick={()=>setAbierto(!abierto)}><SlidersHorizontal className="size-4"/><span>Filtros</span><ChevronDown className="size-3"/></button>
<details ref={descargas} className="group sm:relative"><summary className={`${accion} utilidad-descarga cursor-pointer list-none [&::-webkit-details-marker]:hidden`}><Download className="size-4" aria-hidden="true"/><span>Descargar</span><ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true"/></summary>
 <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10"><div className="border-b border-slate-100 px-3 pb-3 pt-2"><p className="text-xs font-bold text-slate-800">Descargar documentos</p><p className="mt-1 text-[11px] text-slate-500">Todos los documentos en formato PDF</p></div><div className="py-1">{([
 ['cierre','Reporte de cierre','Resultados definitivos del escenario',FileDown],
 ['corte','Reporte de corte','Resumen y estado de la operación',FileDown],
 ['rutas','Rutas y productos','Plan certificado y trazabilidad',FileSpreadsheet],
 ['manifiesto','Manifiesto de datos','Archivos, calidad y cobertura',Database],
 ] as const).filter(([tipo])=>tipo==='manifiesto'||!!ctx.mapa).map(([tipo,titulo,detalle,Icono])=><button key={tipo} type="button" disabled={!!exportando} onClick={()=>void descargarPdf(tipo)} className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-700 transition hover:bg-blue-50 focus-visible:bg-blue-50 disabled:cursor-wait disabled:opacity-50"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Icono className="size-4"/></span><span className="min-w-0 flex-1"><span className="block font-semibold">{exportando===tipo?'Generando PDF…':titulo}</span><span className="mt-0.5 block text-[10px] text-slate-500">{detalle}</span></span><span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-slate-500">PDF</span></button>)}</div><div className="border-t border-slate-100 pt-1"><button type="button" onClick={compartir} className="opcion-compartir"><Share2 className="size-4"/><span>Compartir consulta del escenario</span></button></div></div>

 </details>
 <details className="tiempos-compactos"><summary title="Tiempos del escenario"><Clock3 className="size-4"/><span>Tiempos</span></summary><div className="contexto-temporal tiempos-restaurados" aria-label="Tiempos del escenario"><div className={`rejilla-tiempos ${esDia?'tiempos-dia':''} grid grid-cols-2 gap-2 ${esDia?'lg:grid-cols-2':'lg:grid-cols-4'}`}>
 {tiempos.map(({nombre,valor,icono:Icono,simulado})=><div key={nombre} className={`flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 ${simulado?'border-blue-100 bg-blue-50/60':'border-slate-200/80 bg-slate-50/80'}`}><span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${simulado?'bg-blue-100 text-blue-600':'bg-white text-slate-500'}`}><Icono className="size-4" aria-hidden="true"/></span><div className="min-w-0"><p className={`text-[10px] font-medium ${simulado?'text-blue-600':'text-slate-500'}`}>{nombre}</p><p className="mt-1 break-words text-xs font-semibold tabular-nums text-slate-900">{valor}</p></div></div>)}
 </div></div></details>
   {operador&&<><span className="separador-navegacion" aria-hidden="true"/>
   <details ref={configuracion} className="configuracion-menu group relative"><summary className="utilidad-boton cursor-pointer list-none [&::-webkit-details-marker]:hidden"><Settings2 className="size-4"/><span>Configuración</span><ChevronDown className="size-3"/></summary><div className="configuracion-opciones" onClick={e=>{if((e.target as HTMLElement).closest('button'))configuracion.current?.removeAttribute('open')}}><p>Preparación del sistema</p><button type="button" aria-label="Cargar datos de entrada" title="Cargar ventas, bloqueos y mantenimiento" className="utilidad-boton utilidad-carga" aria-pressed={ctx.panelActivo==='datos'} onClick={()=>{setAbierto(false);ctx.setPanelActivo(ctx.panelActivo==='datos'?null:'datos')}}><FolderUp className="size-4"/><span>Datos de entrada</span></button><div id="preparacion-parametros" className="preparacion-parametros"/><button type="button" aria-label="Configuración del catálogo" onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');ctx.setPanelActivo(null);setCatalogo(true)}}><Database className="size-4"/><span>Catálogo de recursos</span></button></div></details></>}


  </div>
 </div>



 {enlace&&<label className="enlace-compartido">Enlace de consulta del escenario<input aria-label="Enlace de visualización compartida" readOnly value={enlace} onFocus={e=>e.target.select()}/><small>Desde otro dispositivo, utiliza la dirección accesible de tu servidor.</small></label>}
 {abierto&&<FiltrosMapa onCerrar={()=>setAbierto(false)} editable={operador}/>}</div>{catalogo&&operador&&<CatalogoV9 onCerrar={()=>setCatalogo(false)}/>}
 </section>
 return destino?createPortal(contenido,destino):null
}
