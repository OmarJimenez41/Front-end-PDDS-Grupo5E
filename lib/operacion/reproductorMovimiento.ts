import type {InstantaneaOperacion} from '../api/operacion'
import {cuadroFisico,prepararTransicion,type CuadroMovimiento} from './transicionMovimiento'

type Segmento={hasta:InstantaneaOperacion;transicion:ReturnType<typeof prepararTransicion>;duracion:number;avance:number}
/** Plays immutable, confirmed intervals in order. New packets never restart an unfinished interval. */
export class ReproductorMovimiento {
 private ultimo:InstantaneaOperacion|null=null
 private visual:CuadroMovimiento|null=null
 private cola:Segmento[]=[]
 private recibido:number|null=null
 private instante:number|null=null
 private intervalos:number[]=[]
 private velocidad=1
 get pendiente(){return this.cola.length>0}
 get longitud(){return this.cola.length}
 get actual(){return this.visual}
 private reiniciar(m:InstantaneaOperacion|null,ahora:number){
  this.ultimo=m;this.visual=m?cuadroFisico(m):null;this.cola=[];this.recibido=ahora;this.instante=ahora;this.intervalos=[];this.velocidad=1
 }
 recibir(m:InstantaneaOperacion|null,ahora:number,animar=true){
  const anterior=this.ultimo
  if(!m||!anterior||!animar||m.escenarioId!==anterior.escenarioId||m.relojH<anterior.relojH){this.reiniciar(m,ahora);return this.visual}
  this.leer(ahora)
  this.ultimo=m
  if(m.relojH===anterior.relojH){if(!this.pendiente)this.visual=cuadroFisico(m);return this.visual}
  const intervalo=Math.min(60000,Math.max(250,ahora-(this.recibido??ahora)))
  this.recibido=ahora;this.intervalos.push(intervalo);if(this.intervalos.length>8)this.intervalos.shift()
  // A short burst after a long calculation must not compress the next interval and exhaust the buffer.
  const ordenados=[...this.intervalos].sort((a,b)=>a-b)
  const cadencia=ordenados[Math.ceil((ordenados.length-1)*.85)]??2000
  const duracion=Math.max(intervalo,cadencia)
  const transicion=prepararTransicion(anterior,m,cuadroFisico(anterior))
  if(!this.pendiente){this.visual=transicion.cuadro(0);this.instante=ahora}
  this.cola.push({hasta:m,transicion,duracion,avance:0})
  // Hidden/suspended tabs must not accumulate an unbounded replay or keep old scenarios alive.
  if(this.cola.length>24||this.cola.reduce((s,c)=>s+c.duracion*(1-c.avance),0)>120000)this.reiniciar(m,ahora)
  return this.visual
 }
 leer(ahora:number){
  let delta=Math.max(0,ahora-(this.instante??ahora));this.instante=ahora
  if(!this.cola.length)return this.visual
  const pendiente=this.cola.reduce((s,c)=>s+c.duracion*(1-c.avance),0)
  const cadencia=Math.max(2000,...this.intervalos)
  const objetivo=pendiente>cadencia*2?Math.min(1.5,pendiente/(cadencia*2)):1
  this.velocidad+=(objetivo-this.velocidad)*Math.min(1,delta/600)
  delta*=this.velocidad
  while(this.cola.length){
   const c=this.cola[0],resto=c.duracion*(1-c.avance)
   if(delta<resto){c.avance+=delta/c.duracion;this.visual=c.transicion.cuadro(c.avance);break}
   delta-=resto;this.visual=c.transicion.cuadro(1);this.cola.shift()
   if(!delta)break
  }
  return this.visual
 }
 sincronizar(ahora:number){this.reiniciar(this.ultimo,ahora);return this.visual}
 limpiar(){this.reiniciar(null,0)}
}
