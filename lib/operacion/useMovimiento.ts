'use client'
import {useLayoutEffect,useRef,useState} from 'react'
import {direccionEn,type InstantaneaOperacion} from '../api/operacion'
import {animarIntervalo,movimientoPermitido,puntoCertificado,trayectoriaConfirmada,origenParaAnimacion} from './movimiento'
type Posiciones=Record<number,{x:number;y:number;direccion:number|null}>
/** Animación de lecturas confirmadas, sin extrapolar y sin volver al nodo en cada sondeo. */
export function useMovimiento(mapa:InstantaneaOperacion|null,activo:boolean):Posiciones{
 const anterior=useRef<InstantaneaOperacion|null>(null),recibido=useRef<number|null>(null)
 const origen=useRef<InstantaneaOperacion|null>(null)
 const visual=useRef<{id:number;horas:Record<number,number>;posiciones:Posiciones}|null>(null)
 const [posiciones,setPosiciones]=useState<Posiciones>({})
 useLayoutEffect(()=>{
  const preferencia=window.matchMedia('(prefers-reduced-motion: reduce)'),previo=origenParaAnimacion(anterior.current,mapa,origen.current),ahora=performance.now()
  origen.current=previo
  const duracion=recibido.current==null?1500:Math.min(2500,Math.max(250,ahora-recibido.current))
  anterior.current=mapa;recibido.current=ahora
  if(!movimientoPermitido(previo,mapa,activo,preferencia.matches)||!mapa?.fisico||!previo?.fisico){visual.current=null;setPosiciones({});return}
  const anteriorVisual=visual.current?.id===mapa.escenarioId?visual.current:null
  const animables=mapa.fisico.vehiculos.flatMap(v=>{
   const aristas=trayectoriaConfirmada(previo,mapa,v.id);if(!aristas)return []
   let desdeH=previo.relojH
   const visto=anteriorVisual?.posiciones[v.id],horaVista=anteriorVisual?.horas[v.id]
   const p=horaVista!=null?puntoCertificado(aristas,horaVista):null
   if(visto&&p&&horaVista!=null&&Math.hypot(visto.x-p.x,visto.y-p.y)<0.01)desdeH=horaVista
   return [{id:v.id,aristas,desdeH}]
  })
  if(!animables.length){visual.current=null;setPosiciones({});return}
  const pintar=(f:number)=>{
   const nuevos:Posiciones={},horas:Record<number,number>={}
   for(const v of animables){const h=v.desdeH+(mapa.relojH-v.desdeH)*f,p=puntoCertificado(v.aristas,h);if(p){nuevos[v.id]={...p,direccion:direccionEn(v.aristas,h)};horas[v.id]=h}}
   visual.current={id:mapa.escenarioId,horas,posiciones:nuevos};setPosiciones(nuevos)
  }
  pintar(0) // useLayoutEffect evita pintar primero el extremo nuevo y saltar de vuelta al anterior.
  const cancelar=animarIntervalo(pintar,requestAnimationFrame,cancelAnimationFrame,duracion)
  const detener=(e:MediaQueryListEvent)=>{if(e.matches){cancelar();visual.current=null;setPosiciones({})}}
  preferencia.addEventListener('change',detener)
  return()=>{cancelar();preferencia.removeEventListener('change',detener)}
 },[mapa?.escenarioId,mapa?.versionEstado,mapa?.relojH,mapa?.plan?.id,mapa?.aplicable,activo])
 return posiciones
}
