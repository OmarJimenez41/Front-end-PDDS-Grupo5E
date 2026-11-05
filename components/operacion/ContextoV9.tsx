'use client'
import { createContext, useState, useContext, useEffect, useRef, type ReactNode } from 'react'
import { confirmarMapa, confirmarMovimiento } from '../../lib/operacion/latencia'
import { filtrosIniciales, limitesFlota, type FiltrosV9 } from '../../lib/operacion/mejorasV9'
import type { InstantaneaOperacion, UnidadesOperacion, RutaPlan } from '../../lib/api/operacion'
export type PanelActivo='flota'|'almacenes'|'envios'|'incidencias'|'datos'|'reportes'|'indicadores'|null
interface Contexto {
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
const Ctx=createContext<Contexto>({consultaEnvios:null,setConsultaEnvios:()=>{},panelActivo:'flota',setPanelActivo:()=>{},filtros:filtrosIniciales,setFiltros:()=>{},limites:limitesFlota,setLimites:()=>{},mapa:null,unidades:null,rutaProducto:null,setRutaProducto:()=>{},rutasConsulta:[],setRutasConsulta:()=>{},almacenSeleccionado:null,enfoque:null,setEnfoque:()=>{}})
export const useV9=()=>useContext(Ctx)
export function ContextoV9({children,mapa,unidades,almacenSeleccionado=null}:{children:ReactNode;mapa:InstantaneaOperacion|null;unidades:UnidadesOperacion|null;almacenSeleccionado?:string|null}) {
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
 return <Ctx.Provider value={{consultaEnvios,setConsultaEnvios,panelActivo,setPanelActivo,filtros,setFiltros,limites,setLimites,mapa,unidades,rutaProducto,setRutaProducto,rutasConsulta,setRutasConsulta,almacenSeleccionado,enfoque,setEnfoque}}>{children}</Ctx.Provider>
}
