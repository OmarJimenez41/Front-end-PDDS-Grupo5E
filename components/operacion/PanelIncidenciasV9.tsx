'use client'
import {PanelTrabajoV9} from './PanelTrabajoV9'
import {useEffect,useState} from 'react'
import {Wrench,AlertTriangle} from 'lucide-react'
import {useV9} from './ContextoV9'
import {pedir} from '../../lib/api/simulacion'
import type {Incidencia} from '../../lib/api/operacion'
import {rutasExpuestas} from '../../lib/operacion/incidenciasMapa'
export function PanelIncidenciasV9({hora,onUnidad}:{hora:(h:number)=>string;onUnidad:(id:number)=>void}){
 const ctx=useV9(),[horas,setHoras]=useState(4),[datos,setDatos]=useState<Incidencia[]>([]),[error,setError]=useState('')
 const abierto=ctx.panelActivo==='incidencias',setAbierto=(v:boolean)=>ctx.setPanelActivo(v?'incidencias':null)
 const id=ctx.mapa?.escenarioId,reloj=ctx.mapa?.relojH??0
 useEffect(()=>{if(!abierto||id==null)return;let vivo=true;const abort=new AbortController();let timer:ReturnType<typeof setTimeout>;const cargar=async()=>{try{const lista=await pedir<Incidencia[]>(`/api/escenarios/${id}/incidencias/ventana?desdeH=${reloj-horas}&hastaH=${reloj+horas}`,{signal:abort.signal});if(vivo){setDatos(lista);setError('')}}catch(e){if(vivo)setError(String(e))}if(vivo)timer=setTimeout(cargar,4000)};void cargar();return()=>{vivo=false;abort.abort();clearTimeout(timer)}},[abierto,id,horas,reloj])
 const enfocar=(i:Incidencia)=>{
  ctx.setRutasConsulta(rutasExpuestas(i,ctx.mapa));ctx.setRutaProducto(null)
  if(i.vehiculoId!=null){ctx.setFiltros({...ctx.filtros,codigo:'',minimo:'',maximo:'',tipo:'todos',luzUnidad:'todos',distancia:'todos',destino:'todos'});const v=ctx.mapa?.fisico?.vehiculos.find(v=>v.id===i.vehiculoId);if(v)ctx.setEnfoque({x:v.residual?.x??v.x,y:v.residual?.y??v.y,clave:Date.now()});onUnidad(i.vehiculoId)}
  else if(i.tramos[0]){const t=i.tramos[0];ctx.setEnfoque({x:(t.x1+t.x2)/2,y:(t.y1+t.y2)/2,clave:Date.now()})}
 }
 if(!abierto)return null
 return <PanelTrabajoV9 className="panel-incidencias" titulo={'Incidencias por horario'} descripcion="Bloqueos, averías y mantenimiento del escenario."><label className="mt-2 block">Horas antes y después del corte<input type="number" min="0.25" max="360" step="0.25" className="ml-2 w-20 rounded border p-1" value={horas} onChange={e=>{const n=Number(e.target.value);if(n>0&&n<=360)setHoras(n)}}/></label><p className="my-2">Desde {hora(reloj-horas)} hasta {hora(reloj+horas)}</p><p role="status" className="text-amber-800">{error}</p>{datos.map(i=>{const unidad=ctx.mapa?.fisico?.vehiculos.find(v=>v.id===i.vehiculoId);return <article key={i.id} className="mb-2 rounded-lg border p-2"><b>{i.tipo==='AVERIA'?<><Wrench className="mr-1 inline size-3"/>Avería A{i.tipoAveria??'?'} · {unidad?.codigo??i.vehiculoId}</>:i.tipo==='BLOQUEO'?<><AlertTriangle className="mr-1 inline size-3"/>Bloqueo</>:'Mantenimiento'}</b><p>Inicio: {hora(i.instanteH)}</p><p>{!i.activa?'Levantada':i.instanteH>reloj?'Programada':i.finH!=null&&i.finH<=reloj?'Terminada':'Vigente'}</p><Progreso i={i} reloj={reloj}/>{i.tipo!=='BLOQUEO'&&i.descripcion&&<p>{i.descripcion}</p>}{i.vehiculoId!=null&&<button className="mt-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700" onClick={()=>enfocar(i)}>Ver unidad en el mapa</button>}</article>})}{!datos.length&&!error&&<p>Sin incidencias en esta ventana.</p>}</PanelTrabajoV9>
}

/** Duración en horas simuladas como "2 h 05 min". */
function duracion(h:number){const m=Math.max(0,Math.round(h*60));return m<60?`${m} min`:`${Math.floor(m/60)} h ${String(m%60).padStart(2,'0')} min`}
/** Contador de la incidencia: lo transcurrido sobre el total, con una barra de avance. */
function Progreso({i,reloj}:{i:Incidencia;reloj:number}){
 if(i.finH==null)return reloj>=i.instanteH?<p>Transcurrido: {duracion(reloj-i.instanteH)} · sin fin previsto</p>:null
 const total=i.finH-i.instanteH
 if(reloj<i.instanteH)return <p>Empieza en {duracion(i.instanteH-reloj)} · dura {duracion(total)}</p>
 const pasado=Math.min(total,reloj-i.instanteH),pct=total>0?pasado/total*100:100
 return <div className="contador-incidencia"><p>{pasado>=total?`Duró ${duracion(total)}`:<>Transcurrido <b>{duracion(pasado)}</b> / {duracion(total)} · faltan {duracion(total-pasado)}</>}</p><div className="barra" aria-hidden="true"><i style={{width:`${pct}%`}}/></div></div>
}
