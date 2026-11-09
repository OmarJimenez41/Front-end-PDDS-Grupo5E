'use client'
import {useState} from 'react'
import {API_URL,mensajeError} from '../../lib/api/simulacion'

type Resultado={original:string;archivoServidor:string|null;sha256:string;bytes:number;identico:boolean;vigente:boolean;lecturaCompleta:boolean;registros:number|null;invalidos:number|null}
type Comparacion={generadoEn:string;huellaServidor:string;resultados:Resultado[];vigentesSinComparar:string[]}
export function VerificarOriginales(){
 const [archivos,setArchivos]=useState<File[]>([]),[resultado,setResultado]=useState<Comparacion|null>(null),[ocupado,setOcupado]=useState(false),[error,setError]=useState('')
 const comparar=async()=>{
  setOcupado(true);setResultado(null);setError('')
  try{
   const form=new FormData();archivos.forEach(a=>form.append('archivos',a))
   const r=await fetch(`${API_URL}/api/datos/verificar-originales`,{method:'POST',body:form})
   if(!r.ok)throw new Error(`No se pudo comparar los originales (HTTP ${r.status})`)
   setResultado(await r.json() as Comparacion)
  }catch(e){setError(mensajeError(e))}finally{setOcupado(false)}
 }
 const descargar=()=>{
  if(!resultado)return
  const url=URL.createObjectURL(new Blob([JSON.stringify(resultado,null,2)],{type:'application/json'})),a=document.createElement('a')
  a.href=url;a.download='comparacion-originales.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
 }
 return <details className="mt-4 rounded-xl border p-3"><summary className="cursor-pointer font-bold">Comparar con los archivos originales del curso</summary>
 <p className="my-2 leading-relaxed text-slate-600">Selecciona los originales descomprimidos. Se comparan sus bytes mediante SHA-256; esta acción no reemplaza los datos del sistema. Un resultado parcial no acredita el conjunto completo del curso.</p>
 <input type="file" multiple aria-label="Originales para comparación de integridad" disabled={ocupado} onChange={e=>{setArchivos(Array.from(e.target.files??[]));setResultado(null);setError('')}} className="block w-full"/>
 <button disabled={ocupado||!archivos.length} onClick={()=>void comparar()} className="my-2 rounded border px-3 py-2 font-semibold disabled:opacity-40">{ocupado?'Comparando…':`Comparar ${archivos.length} originales`}</button>
 <a className="ml-2 text-blue-700 underline" download href={`${API_URL}/api/datos/manifiesto.csv`}>Descargar inventario del servidor</a>
 <p role="alert" className="text-red-700">{error}</p>
 {resultado&&<div role="status"><p>Comparación realizada: {new Date(resultado.generadoEn).toLocaleString('es-PE')}</p><ul className="mt-2 space-y-2">{resultado.resultados.map((r,i)=><li key={i} className="break-all rounded bg-slate-50 p-2"><b>{r.original}</b><p>{r.identico?'Contenido idéntico':'No coincide o no se encontró'} · {r.vigente?'archivo en uso':'no acredita archivo vigente'}</p><p>{r.registros??'—'} registros · {r.invalidos??'—'} inválidos · lectura {r.lecturaCompleta?'completa':'sin acreditar'}</p><code className="text-[10px]">SHA-256: {r.sha256}</code></li>)}</ul>
 <p className="mt-2 font-semibold">{resultado.vigentesSinComparar.length} archivos vigentes del servidor sin acreditar con originales idénticos.</p>{resultado.vigentesSinComparar.length>0&&<p className="break-words">{resultado.vigentesSinComparar.join(', ')}</p>}
 <p className="mt-2 text-slate-600">También debes comprobar que la selección incluya todos los archivos entregados por el curso, incluso los que todavía no se hayan cargado al servidor.</p>
 <button onClick={descargar} className="mt-2 rounded border px-3 py-2">Descargar evidencia de comparación</button></div>}
 </details>
}
