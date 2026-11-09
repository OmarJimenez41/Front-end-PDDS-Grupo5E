import type { Arista, InstantaneaOperacion } from '../api/operacion'

type Punto = { x: number; y: number }

/** Un refresco del plan en el mismo instante no descarta el intervalo físico en animación. */
export function origenParaAnimacion(anterior: InstantaneaOperacion|null, actual: InstantaneaOperacion|null, origen: InstantaneaOperacion|null) {
  return anterior && actual && origen && anterior.escenarioId === actual.escenarioId &&
    origen.escenarioId === actual.escenarioId && anterior.relojH === actual.relojH &&
    origen.relojH < actual.relojH ? origen : anterior
}

/** Evalúa solo una trayectoria continua y ordenada; los huecos representan esperas. */
export function puntoCertificado(aristas: Arista[], hora: number): Punto | null {
  if (!aristas.length) return null
  for (let i = 0; i < aristas.length; i++) {
    const a = aristas[i], anterior = aristas[i - 1]
    const distancia=Math.abs(a.x2-a.x1)+Math.abs(a.y2-a.y1)
    if (a.llegadaH <= a.salidaH || (distancia !== 1 && distancia !== 0) ||
        (anterior && (a.salidaH < anterior.llegadaH || anterior.x2 !== a.x1 || anterior.y2 !== a.y1))) return null
  }
  if (hora < aristas[0].salidaH || hora > aristas[aristas.length - 1].llegadaH) return null
  for (let i = 0; i < aristas.length; i++) {
    const a = aristas[i]
    if (hora < a.salidaH) return { x: a.x1, y: a.y1 }
    if (hora <= a.llegadaH) {
      const f = (hora - a.salidaH) / (a.llegadaH - a.salidaH)
      return { x: a.x1 + (a.x2 - a.x1) * f, y: a.y1 + (a.y2 - a.y1) * f }
    }
  }
  return null
}

/** Solo anima cuando ambos extremos coinciden con hechos físicos confirmados. */
export function tramoConfirmado(aristas: Arista[], desdeH: number, hastaH: number, desde: Punto, hasta: Punto) {
  const a = puntoCertificado(aristas, desdeH), b = puntoCertificado(aristas, hastaH)
  const cerca = (x: Punto, y: Punto) => Math.hypot(x.x - y.x, x.y - y.y) < 0.01
  return hastaH > desdeH && a !== null && b !== null && cerca(a, desde) && cerca(b, hasta)
}

export function movimientoPermitido(anterior: InstantaneaOperacion | null, actual: InstantaneaOperacion | null, activo: boolean, reducido: boolean): boolean {
  return !!(anterior && actual && activo && !reducido &&
    anterior.escenarioId === actual.escenarioId &&
    anterior.fisico && actual.fisico && actual.relojH > anterior.relojH)
}

/** Camino comprobado entre lecturas. En un cambio de plan solo permite la misma arista residual física. */
export function trayectoriaConfirmada(anterior:InstantaneaOperacion,actual:InstantaneaOperacion,id:number):Arista[]|null{
 const a=anterior.fisico?.vehiculos.find(v=>v.id===id),b=actual.fisico?.vehiculos.find(v=>v.id===id)
 if(!a||!b)return null
 const pa=a.residual?{x:a.residual.x,y:a.residual.y}:{x:a.x,y:a.y},pb=b.residual?{x:b.residual.x,y:b.residual.y}:{x:b.x,y:b.y}
 const comprobar=(camino:Arista[])=>{
  if(!camino.length)return null
  const aristas=[...camino],inicio=aristas[0],fin=aristas[aristas.length-1]
  if(anterior.relojH<inicio.salidaH&&Math.hypot(pa.x-inicio.x1,pa.y-inicio.y1)<.01)aristas.unshift({x1:inicio.x1,y1:inicio.y1,x2:inicio.x1,y2:inicio.y1,salidaH:anterior.relojH,llegadaH:inicio.salidaH})
  if(actual.relojH>fin.llegadaH&&Math.hypot(pb.x-fin.x2,pb.y-fin.y2)<.01)aristas.push({x1:fin.x2,y1:fin.y2,x2:fin.x2,y2:fin.y2,salidaH:fin.llegadaH,llegadaH:actual.relojH})
  return tramoConfirmado(aristas,anterior.relojH,actual.relojH,pa,pb)?aristas:null
 }
 if(actual.plan?.id!=null&&actual.plan.id===anterior.plan?.id){
  const ruta=actual.plan.rutas.find(r=>r.vehiculoId===id&&r.horaInicioH<=anterior.relojH&&r.horaFinH>=actual.relojH)
  if(ruta){const validado=comprobar(ruta.trayectoria);if(validado)return validado}
 }
 const corte=actual.plan?.instanteH
 if(actual.plan&&anterior.plan&&actual.plan.id!==anterior.plan.id&&corte!=null&&Number.isFinite(corte)&&corte>=anterior.relojH&&corte<=actual.relojH){
  const viejas=anterior.plan.rutas.filter(r=>r.vehiculoId===id).flatMap(r=>r.trayectoria).filter(a=>a.salidaH<corte&&a.llegadaH>=anterior.relojH)
  const nuevas=actual.plan.rutas.filter(r=>r.vehiculoId===id).flatMap(r=>r.trayectoria).filter(a=>a.llegadaH>corte&&a.salidaH<=actual.relojH)
  const unicas=[...new Map([...viejas,...nuevas].map(a=>[[a.x1,a.y1,a.x2,a.y2,a.salidaH,a.llegadaH].join(':'),a])).values()].sort((a,b)=>a.salidaH-b.salidaH)
  const validado=comprobar(unicas);if(validado)return validado
 }
 const residual=a.residual
 if(!residual||residual.finH<=anterior.relojH||actual.relojH>residual.finH)return null
 const dx=residual.destinoX-pa.x,dy=residual.destinoY-pa.y
 if((dx!==0&&dy!==0)||Math.abs(dx)+Math.abs(dy)<=0||Math.abs(dx)+Math.abs(dy)>1)return null
 const x1=residual.destinoX-Math.sign(dx),y1=residual.destinoY-Math.sign(dy)
 const restante=Math.abs(dx)+Math.abs(dy),duracion=(residual.finH-anterior.relojH)/restante
 const aristas=[{x1,y1,x2:residual.destinoX,y2:residual.destinoY,salidaH:residual.finH-duracion,llegadaH:residual.finH}]
 return tramoConfirmado(aristas,anterior.relojH,actual.relojH,pa,pb)?aristas:null
}

/** Bucle cancelable; los cuadros tardíos no publican después de detenerlo. */
export function animarIntervalo(pintar: (fraccion: number) => void, solicitar: (f: FrameRequestCallback) => number, cancelar: (id: number) => void,duracionMs=1000) {
  let activo = true, cuadro = 0, inicio: number | null = null
  const paso = (ahora: number) => {
    if (!activo) return
    if (inicio === null) inicio = ahora
    const fraccion = Math.min(1, (ahora - inicio) / Math.max(1,duracionMs))
    pintar(fraccion)
    if (activo && fraccion < 1) cuadro = solicitar(paso)
  }
  cuadro = solicitar(paso)
  return () => { activo = false; cancelar(cuadro) }
}
