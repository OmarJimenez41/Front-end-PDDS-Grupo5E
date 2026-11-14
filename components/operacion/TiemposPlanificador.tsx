'use client'
import {useEffect,useState} from 'react'
import {Activity,ChevronDown,Download,RefreshCw} from 'lucide-react'
import {API_URL,consultarTiempos,mensajeError,type LecturaTiempos} from '@/lib/api/simulacion'
import {DiagramasV9} from './DiagramasV9'
import {ResumenTiempos} from './ResumenTiempos'
export function TiemposPlanificador({escenarioId}:{escenarioId:number|null}){
 const [lectura,setLectura]=useState<LecturaTiempos|null>(null),[error,setError]=useState(''),[revision,setRevision]=useState(0)
 useEffect(()=>{
  setLectura(null);setError('');if(escenarioId==null)return
  let vivo=true,timer:ReturnType<typeof setTimeout>|undefined,peticion:AbortController|null=null,ocupado=false
  const cargar=async()=>{
   if(!vivo||ocupado||document.hidden)return
   ocupado=true;peticion=new AbortController()
   try{const v=await consultarTiempos(escenarioId,peticion.signal);if(vivo){if(v.escenarioId!==escenarioId)throw new Error('La medición pertenece a otro escenario.');setLectura(v);setError('')}}
   catch(e){if(vivo)setError(mensajeError(e))}
   finally{ocupado=false;if(vivo)timer=setTimeout(cargar,5000)}
  }
  const alVolver=()=>{if(!document.hidden){clearTimeout(timer);void cargar()}}
  document.addEventListener('visibilitychange',alVolver);void cargar()
  return()=>{vivo=false;clearTimeout(timer);peticion?.abort();document.removeEventListener('visibilitychange',alVolver)}
 },[escenarioId,revision])
 const actual=lectura?.escenarioId===escenarioId?lectura:null
 return <section className="tiempos-planificador"><div className="cabecera-mediciones"><div><div className="flex items-center gap-2"><Activity className="size-4 text-cyan-700"/><h3 className="font-bold">Mediciones del motor</h3></div><p>Escenario {escenarioId??'sin seleccionar'}</p></div><button type="button" onClick={()=>setRevision(r=>r+1)} disabled={escenarioId==null} aria-label="Actualizar mediciones" title="Actualizar mediciones"><RefreshCw className="size-4"/></button></div>
 {error&&<p role="status" className="aviso-medicion">{actual?'Lectura anterior; no se pudo actualizar. ':''}{error}</p>}
 {actual&&<div className="procedencia-medicion"><span>{actual.origen==='MOTOR'?'Motor del servidor':'Registro persistido'}</span><time dateTime={actual.consultadoEn}>Leído {new Date(actual.consultadoEn).toLocaleTimeString('es-PE',{timeZone:'America/Lima'})}</time></div>}
 <ResumenTiempos tiempos={actual?.tiempos}/>
 {actual?.tiempos?.programada&&<button className="descarga-mediciones" type="button" onClick={()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(actual,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=`paqrap-tiempos-${escenarioId}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}}><Download className="size-4"/>Descargar medición actual · JSON</button>}
 {escenarioId!=null&&<a className="descarga-mediciones" href={`${API_URL}/api/simulaciones/${escenarioId}/muestras.csv`}><Download className="size-4"/>Descargar detalle técnico · CSV</a>}
 <details className="mt-4 rounded-xl border border-slate-200"><summary className="flex cursor-pointer items-center justify-between p-3 font-semibold">Cómo avanza la simulación<ChevronDown className="size-4"/></summary><div className="border-t border-slate-100 p-3"><DiagramasV9/></div></details></section>
}
