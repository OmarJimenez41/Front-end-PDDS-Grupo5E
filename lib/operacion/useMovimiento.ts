'use client'
import {useLayoutEffect,useEffect,useRef,useState} from 'react'
import type {InstantaneaOperacion} from '../api/operacion'
import type {CuadroMovimiento} from './transicionMovimiento'
import {ReproductorMovimiento} from './reproductorMovimiento'

/** The playback queue survives new snapshots; only confirmed routes can move a marker. */
export function useCuadroMovimiento(mapa:InstantaneaOperacion|null,activo:boolean):CuadroMovimiento|null{
 const reproductor=useRef<ReproductorMovimiento|null>(null)
 if(!reproductor.current)reproductor.current=new ReproductorMovimiento()
 const cuadroRaf=useRef<number|null>(null),preferencia=useRef<MediaQueryList|null>(null)
 const [cuadro,setCuadro]=useState<CuadroMovimiento|null>(null)
 const detener=()=>{if(cuadroRaf.current!=null){cancelAnimationFrame(cuadroRaf.current);cuadroRaf.current=null}}
 const iniciar=()=>{
  if(cuadroRaf.current!=null||!reproductor.current?.pendiente)return
  const pintar=(ahora:number)=>{
   cuadroRaf.current=null
   const r=reproductor.current!;setCuadro(r.leer(ahora))
   if(r.pendiente)cuadroRaf.current=requestAnimationFrame(pintar)
  }
  cuadroRaf.current=requestAnimationFrame(pintar)
 }
 useLayoutEffect(()=>{
  const reducida=preferencia.current??window.matchMedia('(prefers-reduced-motion: reduce)')
  preferencia.current=reducida
  const r=reproductor.current!,puedeAnimar=activo&&!reducida.matches&&document.visibilityState!=='hidden'
  const visible=r.recibir(mapa,performance.now(),puedeAnimar)
  setCuadro(visible)
  if(r.pendiente)iniciar();else detener()
 },[mapa,activo])
 useEffect(()=>{
  const reducida=preferencia.current??window.matchMedia('(prefers-reduced-motion: reduce)')
  const sincronizar=()=>{detener();setCuadro(reproductor.current!.sincronizar(performance.now()))}
  const cambio=(e:MediaQueryListEvent)=>{if(e.matches)sincronizar()}
  // A return from a background tab starts from current facts instead of playing minutes of backlog.
  document.addEventListener('visibilitychange',sincronizar)
  reducida.addEventListener('change',cambio)
  return()=>{detener();reproductor.current?.limpiar();document.removeEventListener('visibilitychange',sincronizar);reducida.removeEventListener('change',cambio)}
 },[])
 return cuadro?.escenarioId===mapa?.escenarioId?cuadro:null
}
export function useMovimiento(mapa:InstantaneaOperacion|null,activo:boolean){return useCuadroMovimiento(mapa,activo)?.posiciones??{}}
