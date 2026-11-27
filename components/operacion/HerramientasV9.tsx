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
 const [destinoPreparacion,setDestinoPreparacion]=useState<HTMLElement|null>(null)
 useEffect(()=>{setDestino(document.getElementById('herramientas-laterales'));setDestinoPreparacion(document.getElementById('preparacion-lateral'));setHerramientasVisibles(true)},[operador])
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
  {nombre:'Transcurrido real',valor:duracionReal,icono:Timer,simulado:false},
 ].filter(tiempo => !esDia || !tiempo.simulado)
 const contenido=<section className={`herramientas-v9 relative shrink-0 text-xs $herramientas-verticales`} aria-label="Tiempos y herramientas">
 <div id="contenido-barra-v9" hidden={!herramientasVisibles}>
 {mensaje&&<p role="status" className="mb-2 rounded bg-blue-50 px-3 py-2 text-blue-800">{mensaje}</p>}

 <div className="toolbar-operativa">
  <DockPanelesV9/>

  <div id="acciones-herramientas-v9" className="utilidades-operativas utilidades-simples" role="group" aria-label="Herramientas de la operación">
<button type="button" aria-label="Filtrar mapa" title="Filtrar mapa" className="utilidad-boton" aria-expanded={abierto} aria-controls="filtros-v9" onClick={()=>setAbierto(!abierto)}><SlidersHorizontal className="size-4"/><span>Filtros</span><ChevronDown className="size-3"/></button>
 <details className="tiempos-compactos"><summary title="Tiempos del escenario"><Clock3 className="size-4"/><span>Tiempos</span></summary><div className="contexto-temporal tiempos-restaurados" aria-label="Tiempos del escenario"><div className={`rejilla-tiempos ${esDia?'tiempos-dia':''} grid grid-cols-2 gap-2 ${esDia?'lg:grid-cols-2':'lg:grid-cols-4'}`}>
 {tiempos.map(({nombre,valor,icono:Icono,simulado})=><div key={nombre} className={`flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 ${simulado?'border-blue-100 bg-blue-50/60':'border-slate-200/80 bg-slate-50/80'}`}><span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${simulado?'bg-blue-100 text-blue-600':'bg-white text-slate-500'}`}><Icono className="size-4" aria-hidden="true"/></span><div className="min-w-0"><p className={`text-[10px] font-medium ${simulado?'text-blue-600':'text-slate-500'}`}>{nombre}</p><p className="mt-1 break-words text-xs font-semibold tabular-nums text-slate-900">{valor}</p></div></div>)}
 </div></div></details>



  </div>
 </div>



 {enlace&&<label className="enlace-compartido">Enlace de consulta del escenario<input aria-label="Enlace de visualización compartida" readOnly value={enlace} onFocus={e=>e.target.select()}/><small>Desde otro dispositivo, utiliza la dirección accesible de tu servidor.</small></label>}
 {abierto&&<FiltrosMapa onCerrar={()=>setAbierto(false)} editable={operador}/>}</div>{catalogo&&<CatalogoV9 onCerrar={()=>setCatalogo(false)}/>}
 </section>
 const preparacion=<div className="preparacion-menu" role="group" aria-label="Preparación del sistema"><button type="button" title="Cargar ventas, bloqueos y mantenimiento" aria-pressed={ctx.panelActivo==='datos'} onClick={()=>{setAbierto(false);ctx.setPanelActivo(ctx.panelActivo==='datos'?null:'datos')}}><FolderUp className="size-4"/><span>Archivos</span></button><div id="preparacion-parametros" className="preparacion-parametros"/><button type="button" title="Catálogo de recursos" onClick={()=>{ctx.setPanelActivo(null);setCatalogo(true)}}><Database className="size-4"/><span>Catálogo</span></button></div>
 return <>{destino?createPortal(contenido,destino):null}{destinoPreparacion?createPortal(preparacion,destinoPreparacion):null}</>
}
