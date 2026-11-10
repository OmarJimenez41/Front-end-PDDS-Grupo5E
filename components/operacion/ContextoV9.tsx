'use client'
import { createContext, useState, useContext, useEffect, useRef, type ReactNode } from 'react'
import { confirmarMapa, confirmarMovimiento } from '../../lib/operacion/latencia'
import { filtrosIniciales, limitesFlota, type FiltrosV9 } from '../../lib/operacion/mejorasV9'
import type { InstantaneaOperacion, UnidadesOperacion, RutaPlan } from '../../lib/api/operacion'
export type PanelActivo='flota'|'almacenes'|'envios'|'incidencias'|'datos'|'reportes'|'indicadores'|null
interface Contexto {
 herramientasVisibles:boolean;setHerramientasVisibles:(v:boolean|((prev:boolean)=>boolean))=>void
 conexion:string;recibidoEn:number|null
 consultaEnvios:{vehiculoId:number}|null;setConsultaEnvios:(v:{vehiculoId:number}|null)=>void
 panelActivo:PanelActivo;setPanelActivo:(p:PanelActivo)=>void
 filtros:FiltrosV9; setFiltros:(v:FiltrosV9)=>void
 limites:typeof limitesFlota; setLimites:(v:typeof limitesFlota)=>void
 mapa:InstantaneaOperacion|null; unidades:UnidadesOperacion|null
 rutaProducto:number|null; setRutaProducto:(v:number|null)=>void
 rutasConsulta:RutaPlan[];setRutasConsulta:(r:RutaPlan[])=>void
 almacenSeleccionado:string|null
 enfoque:{x:number;y:number;clave:number}|null;setEnfoque:(p:{x:number;y:number;clave:number}|null)=>void
}
const Ctx=createContext<Contexto>({herramientasVisibles:true,setHerramientasVisibles:()=>{},conexion:'cargando',recibidoEn:null,consultaEnvios:null,setConsultaEnvios:()=>{},panelActivo:'flota',setPanelActivo:()=>{},filtros:filtrosIniciales,setFiltros:()=>{},limites:limitesFlota,setLimites:()=>{},mapa:null,unidades:null,rutaProducto:null,setRutaProducto:()=>{},rutasConsulta:[],setRutasConsulta:()=>{},almacenSeleccionado:null,enfoque:null,setEnfoque:()=>{}})
export const useV9=()=>useContext(Ctx)
export function ContextoV9({children,mapa,unidades,conexion='cargando',recibidoEn=null,almacenSeleccionado=null}:{children:ReactNode;conexion?:string;recibidoEn?:number|null;mapa:InstantaneaOperacion|null;unidades:UnidadesOperacion|null;almacenSeleccionado?:string|null}) {
 const [herramientasVisibles,setHerramientasVisibles]=useState(true)
 const [consultaEnvios,setConsultaEnvios]=useState<{vehiculoId:number}|null>(null)
 const [panelActivo,setPanelActivo]=useState<PanelActivo>(null)
 useEffect(()=>{const cerrar=(e:KeyboardEvent)=>{if(e.key==='Escape')setPanelActivo(null)};document.addEventListener('keydown',cerrar);return()=>document.removeEventListener('keydown',cerrar)},[])
 const [filtros,setFiltros]=useState(filtrosIniciales),[limites,setLimites]=useState(limitesFlota)
 const [rutaProducto,setRutaProducto]=useState<number|null>(null)
 const [rutasConsulta,setRutasConsulta]=useState<RutaPlan[]>([])
 const [enfoque,setEnfoque]=useState<{x:number;y:number;clave:number}|null>(null)
 useEffect(()=>{setRutaProducto(null);setRutasConsulta([]);setEnfoque(null)},[mapa?.escenarioId])
 const inicial=useRef<{id:number;posiciones:Map<number,string>}|null>(null)
 useEffect(()=>{
  if(!mapa?.fisico)return
  if(inicial.current?.id!==mapa.escenarioId)inicial.current={id:mapa.escenarioId,posiciones:new Map(mapa.fisico.vehiculos.map(v=>[v.id,JSON.stringify(v.residual?[v.residual.x,v.residual.y]:[v.x,v.y])]))}
  let siguiente=0
  const cuadro=requestAnimationFrame(()=>{siguiente=requestAnimationFrame(()=>confirmarMapa(mapa.escenarioId,performance.now()))})
  if(mapa.fisico.vehiculos.some(v=>inicial.current?.posiciones.get(v.id)!==JSON.stringify(v.residual?[v.residual.x,v.residual.y]:[v.x,v.y])))confirmarMovimiento(mapa.escenarioId,performance.now())
  return()=>{cancelAnimationFrame(cuadro);cancelAnimationFrame(siguiente)}
 },[mapa])
 return <Ctx.Provider value={{herramientasVisibles,setHerramientasVisibles,conexion,recibidoEn,consultaEnvios,setConsultaEnvios,panelActivo,setPanelActivo,filtros,setFiltros,limites,setLimites,mapa,unidades,rutaProducto,setRutaProducto,rutasConsulta,setRutasConsulta,almacenSeleccionado,enfoque,setEnfoque}}>{children}</Ctx.Provider>
}

/** Reserva espacio para la consulta sin cubrir el objetivo del mapa. */
export function SuperficieOperacion({children}:{children:ReactNode}){
 const ctx=useV9()
 return <div className="superficie-operacion relative min-h-0 flex-1" data-panel={ctx.panelActivo??'ninguno'}>{children}</div>
}

export function BotonHerramientasMapa(){
 const ctx=useV9()
 if(ctx.herramientasVisibles)return null
 return <button className="boton-herramientas-mapa" aria-label="Mostrar tiempos y herramientas" title="Mostrar tiempos y herramientas" aria-expanded={false} onClick={()=>ctx.setHerramientasVisibles(true)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg><span>Tiempos y herramientas</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
}
