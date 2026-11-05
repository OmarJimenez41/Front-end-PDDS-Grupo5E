'use client'
import {useEffect,useRef,useState} from 'react'
import {Upload,CheckCircle2,AlertCircle,FileText} from 'lucide-react'
import {pedir,subirDatos,mensajeError,type ArchivoDatos} from '../../lib/api/simulacion'
import {useV9} from './ContextoV9'
import {PanelTrabajoV9} from './PanelTrabajoV9'
type Carga={nombre:string;estado:'pendiente'|'subiendo'|'correcto'|'error';detalle:string}
export function PanelDatosV9(){
 const ctx=useV9(),[archivos,setArchivos]=useState<ArchivoDatos[]>([]),[elegidos,setElegidos]=useState<File[]>([]),[cargas,setCargas]=useState<Carga[]>([]),[ocupado,setOcupado]=useState(false),[error,setError]=useState('')
 const input=useRef<HTMLInputElement>(null),activo=ctx.panelActivo==='datos'
 const cargar=async()=>{try{const r=await pedir<{archivos:ArchivoDatos[]}>('/api/datos');setArchivos(r.archivos);setError('')}catch(e){setError(mensajeError(e))}}
 useEffect(()=>{if(activo)void cargar()},[activo])
 const seleccionar=(files:File[])=>{setElegidos(files);setCargas(files.map(f=>({nombre:f.name,estado:'pendiente',detalle:`${(f.size/1024).toFixed(1)} KB`})))}
 const subir=async()=>{
  if(ocupado||!elegidos.length)return;setOcupado(true)
  for(let i=0;i<elegidos.length;i++){
   setCargas(c=>c.map((a,n)=>n===i?{...a,estado:'subiendo',detalle:'Validando y cargando…'}:a))
   try{const r=await subirDatos(elegidos[i]);const validos=r.archivos.reduce((s,a)=>s+a.leidos,0),invalidos=r.archivos.reduce((s,a)=>s+a.invalidos,0)
    setCargas(c=>c.map((a,n)=>n===i?{...a,estado:'correcto',detalle:`${r.archivos.length} archivos · ${validos.toLocaleString('es-PE')} registros válidos · ${invalidos} inválidos${r.omitidos.length?` · omitidos: ${r.omitidos.join(', ')}`:''}`}:a))
   }catch(e){setCargas(c=>c.map((a,n)=>n===i?{...a,estado:'error',detalle:mensajeError(e)}:a))}
  }
  setOcupado(false);await cargar();window.dispatchEvent(new Event('paqrap:datos-actualizados'))
 }
 if(!activo)return null
 return <PanelTrabajoV9 titulo="Datos de entrada" descripcion="Carga independiente del escenario. Ventas, bloqueos y mantenimiento se guardan antes de iniciar un periodo." ancho={520}>
 <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 leading-relaxed text-blue-900">Puedes elegir <b>varios archivos mensuales a la vez</b> o un ZIP. Un periodo que cruza de mes utiliza todos los archivos necesarios. El sistema informa los registros rechazados y no aplica muestreo.</div>
 <div className="mt-4 cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-blue-400" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!ocupado)seleccionar(Array.from(e.dataTransfer.files))}}>
 <Upload className="mx-auto mb-2 size-7 text-blue-600"/><p className="font-semibold">Arrastra tus archivos aquí</p><p className="mt-1 text-slate-500">Ventas mensuales, archivos de bloqueos, mantenimiento o ZIP</p><input ref={input} aria-label="Seleccionar archivos de datos" type="file" multiple disabled={ocupado} className="sr-only" onChange={e=>{seleccionar(Array.from(e.target.files??[]));e.target.value=''}}/><button disabled={ocupado} onClick={()=>input.current?.click()} className="mt-3 rounded-xl border bg-white px-4 py-2 font-semibold text-slate-700">Elegir archivos</button></div>
 {cargas.length>0&&<><h3 className="mt-4 font-bold">Archivos seleccionados ({cargas.length})</h3><ul className="mt-2 space-y-2">{cargas.map((a,i)=><li key={`${a.nombre}-${i}`} className="rounded-xl border border-slate-200 p-3"><div className="flex items-center gap-2">{a.estado==='correcto'?<CheckCircle2 className="size-4 text-emerald-600"/>:a.estado==='error'?<AlertCircle className="size-4 text-red-600"/>:<FileText className="size-4 text-blue-600"/>}<b className="break-all">{a.nombre}</b><span className="ml-auto text-slate-500">{a.estado}</span></div><p className="mt-1 break-words text-slate-500">{a.detalle}</p></li>)}</ul><button disabled={ocupado} onClick={()=>void subir()} className="mt-3 w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white disabled:bg-slate-400">{ocupado?'Cargando archivos…':`Cargar ${elegidos.length} archivos`}</button></>}
 <p role="status" className="mt-2 text-red-700">{error}</p>
 <h3 className="mt-5 font-bold">Disponibles en el servidor ({archivos.length})</h3><p className="mt-1 text-slate-500">Los datos no se pueden cambiar durante una simulación en ejecución o en pausa.</p>
 <ul className="mt-2 divide-y divide-slate-100">{archivos.map(a=><li key={a.nombre} className="py-3"><div className="flex justify-between gap-2"><b className="break-all">{a.nombre}</b><span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-[10px]">{a.tipo}</span></div><p className="mt-1 text-slate-500">Periodo {a.periodo} · {a.leidos.toLocaleString('es-PE')} registros · {a.invalidos} inválidos</p></li>)}</ul>
 </PanelTrabajoV9>
}
