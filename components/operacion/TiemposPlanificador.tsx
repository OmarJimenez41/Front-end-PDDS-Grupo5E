'use client'
import {useEffect,useState} from 'react'
import {Activity,ChevronDown} from 'lucide-react'
import {consultarSimulacion,mensajeError,type VistaSimulacion} from '@/lib/api/simulacion'
import {DiagramasV9} from './DiagramasV9'
type Tiempos=NonNullable<VistaSimulacion['tiempos']>
/** Muestra medidas del servidor, nunca sustituye Ta con el presupuesto configurado. */
export function TiemposPlanificador({escenarioId}:{escenarioId:number|null}){
 const [lectura,setLectura]=useState<{id:number;tiempos:Tiempos|null}|null>(null)
 const [error,setError]=useState('')
 useEffect(()=>{
  if(escenarioId==null)return
  let vivo=true,timer:ReturnType<typeof setTimeout>
  const cargar=async()=>{
   try{const v=await consultarSimulacion(escenarioId);if(vivo){setLectura({id:escenarioId,tiempos:v.tiempos??null});setError('')}}
   catch(e){if(vivo)setError(mensajeError(e))}
   if(vivo)timer=setTimeout(cargar,5000)
  }
  void cargar();return()=>{vivo=false;clearTimeout(timer)}
 },[escenarioId])
 const t=lectura?.id===escenarioId?lectura.tiempos:null
 const segundos=(n:number)=>`${(n/1000).toLocaleString('es-PE',{maximumFractionDigits:2})} s`
 const minutos=(n:number)=>`${(n*60).toLocaleString('es-PE',{maximumFractionDigits:2})} min`
 const filas=t?[{sigla:'Ta',nombre:'Ejecución del algoritmo',dato:t.taMs,formato:segundos,nota:'Tiempo real de búsqueda. Se distingue del tiempo total de planificación.'},
  {sigla:'Sa',nombre:'Salto del planificador',dato:t.saH,formato:minutos,nota:t.saConfiguradaH===0?'Por cambios o eventos; el salto observado se mide entre planificaciones.':`Mínimo configurado: ${minutos(t.saConfiguradaH)} simulados. Los eventos críticos pueden anticiparlo.`},
  {sigla:'Sc',nombre:'Salto de consumo',dato:t.scH,formato:minutos,nota:`Máximo configurado: ${minutos(t.scConfiguradoH)} simulados por paso.`}]:[]
 return <section className="tiempos-planificador"><div className="flex items-center gap-2"><Activity className="size-4 text-cyan-700"/><h3 className="font-bold">Ritmo y ejecución</h3></div><p className="mt-1 text-xs text-slate-500">Mediciones compartidas del escenario {escenarioId??'—'}.</p>
 {error&&<p role="status" className="mt-2 text-xs text-amber-800">{t?'Última medición disponible. ':''}{error}</p>}
 {!t&&<p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{error?'No se pudo obtener la medición.':'Esperando muestras del planificador.'} Ta es tiempo real; Sa y Sc son tiempo simulado.</p>}
 <div className="mt-3 space-y-2">{filas.map(f=><article key={f.sigla} className="tarjeta-metrica"><span className="sigla-metrica">{f.sigla}</span><div className="min-w-0 flex-1"><h4>{f.nombre}</h4><strong>{f.dato.muestras?f.formato(f.dato.ultimo):'Sin muestras'}</strong><p>{f.nota}</p>{f.dato.muestras>0&&<small>Promedio {f.formato(f.dato.promedio)} · máximo {f.formato(f.dato.maximo)} · {f.dato.muestras} muestras</small>}</div></article>)}</div>
 <details className="mt-4 rounded-xl border border-slate-200"><summary className="flex cursor-pointer items-center justify-between p-3 font-semibold">Cómo avanza la simulación<ChevronDown className="size-4"/></summary><div className="border-t border-slate-100 p-3"><DiagramasV9/></div></details>
 </section>
}
