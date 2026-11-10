'use client'

import { memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Bike, Motorbike, Car, MapPin, Warehouse, Wrench, X } from 'lucide-react'
import { type EstadoPedido, type MapaDatos, type PedidoRastreo, type TipoVehiculo, type Umbrales, type UnidadOperativa, datosMapa, agruparPosiciones, semaforo } from '@/lib/api/operacion'
import { luzOcupacion, estadoEnEspanol, unidadCumple, almacenCumple } from '../../lib/operacion/mejorasV9'
import { useV9 } from './ContextoV9'
import { UmbralesCtx } from '@/components/operacion/umbrales'
import { useCuadroMovimiento } from '@/lib/operacion/useMovimiento'
import { unidadesEnPunto, estacionadaEnAlmacen } from '@/lib/operacion/agrupacionMapa'
import { prepararRutas, rutasEnHora } from '@/lib/operacion/escenaMapa'
import { LeyendaMapa as Leyenda } from './LeyendaMapa'
import { extremosBloqueo } from '@/lib/operacion/extremosBloqueo'
import { ampliarCamara, centrarCamara, limitarCamara } from '@/lib/operacion/camara'

// Orienta el ícono según el tramo sin dejarlo de cabeza: hacia la izquierda se voltea en espejo
// en lugar de girar 180°, así el vehículo siempre queda con las ruedas abajo.
function giroIcono(direccion?: number | null) {
  const a = (((direccion ?? 0) % 360) + 360) % 360
  return a > 90 && a < 270 ? `rotate(${a - 180}deg) scaleX(-1)` : `rotate(${a}deg)`
}
type ExecState = 'idle' | 'running' | 'incident' | 'complete' | 'collapse' | 'disconnected'
const COLOR_TIPO: Record<TipoVehiculo, string> = { AUTO: '#2563eb', MOTO: '#7c3aed', BICICLETA: '#0f9f8d' }
const CLASE_TIPO: Record<TipoVehiculo, string> = { AUTO: 'bg-blue-600', MOTO: 'bg-violet-600', BICICLETA: 'bg-teal-600' }
const ETIQUETA_TIPO: Record<TipoVehiculo, string> = { AUTO: 'Auto', MOTO: 'Moto', BICICLETA: 'Bicicleta' }
const CLASE_SEMAFORO = { 'vacío': 'bg-slate-500', 'no disponible': 'bg-slate-400', verde: 'bg-emerald-600', ambar: 'bg-amber-500', rojo: 'bg-red-600' } as const
const NOMBRE_ALMACEN: Record<string, string> = { 'ALM-CENTRAL': 'Almacén central', 'ALM-NOROESTE': 'Nor-Oeste', 'ALM-ESTE': 'Intermedio Este' }
const tonoStock = (pct: number, u: Umbrales) => pct === 0 ? 'vacío' : pct >= u.verde ? 'verde' : pct < u.rojo ? 'rojo' : 'ambar'
const TEXTO_SEMAFORO = { 'vacío': 'text-slate-700', verde: 'text-emerald-700', ambar: 'text-amber-700', rojo: 'text-red-700' } as const
const ETIQUETA_ESTADO: Record<EstadoPedido, string> = { PENDIENTE: 'Pendiente de asignar', ASIGNADO: 'Asignado a una ruta', EN_RUTA: 'En ruta', ENTREGADO: 'Entregado', NO_ENTREGADO: 'No entregado' }

export function MapaOperativo({ state, highlightOrderId, full = false, replanned = false, onWarehouse, onPedido, datos: datosServidor, buscado, almacenMarcado, unidadSeleccionada, onUnidad }: { state: ExecState; highlightOrderId?: string | null; almacenMarcado?: string | null; full?: boolean; replanned?: boolean; onWarehouse?: (name: string | null) => void; onPedido?: (codigo: string | null) => void; datos?: MapaDatos | null; buscado?: string | null; unidadSeleccionada?: number | null; onUnidad?: (id: number | null) => void }) {
  const u = useContext(UmbralesCtx)
  const ctx = useV9()
  const cuadro=useCuadroMovimiento(ctx.mapa,state==='running'||state==='incident')
  const mapaVisual=cuadro?.instantanea??ctx.mapa
  const baseVisual=useMemo(()=>{
    const m=cuadro?.instantanea
    if(!datosServidor||!m?.fisico)return datosServidor
    // Keep pending orders, incidents and warehouse data at the same confirmed playback cut.
    const base=datosMapa({escenarioId:m.escenarioId,versionEstado:m.versionEstado,relojH:m.relojH,horizonteH:null,ultimoPlanId:m.plan?.id??null,fisico:m.fisico,acumulado:m.acumulado},cuadro?.plan??m.plan,m.pedidos,m.incidencias,m.aplicable)
    return {...base,vehiculos:base.vehiculos.map(v=>datosServidor.relojH===m.relojH?{...v,estado:datosServidor.vehiculos.find(q=>q.id===v.id)?.estado}:v),rastreo:datosServidor.rastreo}
  },[datosServidor,cuadro?.instantanea,cuadro?.plan])
  const rutasPreparadas=useMemo(()=>prepararRutas(cuadro?.plan??null),[cuadro?.plan])
  const datos=useMemo(()=>{
    if(!baseVisual||!cuadro)return baseVisual
    const rutas=rutasEnHora(rutasPreparadas,cuadro.relojH,baseVisual.planAplicable!==false)
    return {...baseVisual,relojH:cuadro.relojH,vehiculos:baseVisual.vehiculos.map(v=>{
      const posicion=cuadro.posiciones[v.id]
      return posicion?{...v,...posicion,...(posicion.enMovimiento?{estado:'EN_RUTA' as const}:{})}:v
    }),rutas:rutas.length?rutas:baseVisual.rutas.filter(r=>r.tramoFisico)}
  },[baseVisual,cuadro,rutasPreparadas])
  const seleccionarPedido=useCallback((codigo:string)=>{ctx.setRutasConsulta([]);ctx.setRutaProducto(null);onPedido?.(codigo===buscado?null:codigo)},[ctx.setRutasConsulta,ctx.setRutaProducto,onPedido,buscado])
  const [grupo, setGrupo] = useState<string | null>(null)
  useEffect(()=>{setGrupo(null)},[ctx.mapa?.escenarioId,unidadSeleccionada,ctx.filtros])
  useEffect(()=>{if(!grupo)return;const cerrar=(e:KeyboardEvent)=>{if(e.key==='Escape')setGrupo(null)};document.addEventListener('keydown',cerrar);return()=>document.removeEventListener('keydown',cerrar)},[grupo])
  const [camara, setCamara] = useState({ escala: 1, x: 0, y: 0 })
  const area = useRef<HTMLDivElement>(null)
  const [dimensiones,setDimensiones]=useState({ancho:1000,alto:520})
  useEffect(()=>{
    const p=ctx.enfoque,rect=area.current?.getBoundingClientRect();if(!p||!rect)return
    setCamara(c=>centrarCamara(c,p,Math.max(1,rect.width-48),Math.max(1,rect.height-48)))
  },[ctx.enfoque])
  const ultimoObjetivo = useRef<{ x: number; y: number } | null>(null)
  const arrastre = useRef<{ x: number; y: number; origenX: number; origenY: number } | null>(null)
  const zoom = (factor: number, punto?: { x: number; y: number }) => {
    const rect = area.current?.getBoundingClientRect(); if (!rect) return
    setCamara(c => ampliarCamara(c, factor, punto ? {x:punto.x-24,y:punto.y-24} : { x: (rect.width-48) / 2, y: (rect.height-48) / 2 }, Math.max(1,rect.width-48), Math.max(1,rect.height-48)))
  }
  useEffect(() => {
    const v = datos?.vehiculos.find(v => v.id === unidadSeleccionada), rect = area.current?.getBoundingClientRect()
    if (!v || !rect) return
    ultimoObjetivo.current = { x: v.x, y: v.y }
    setCamara(c => centrarCamara(c, v, Math.max(1,rect.width-48), Math.max(1,rect.height-48)))
  }, [unidadSeleccionada])
  useEffect(() => {
    const a = datos?.almacenes.find(a => (NOMBRE_ALMACEN[a.codigo] ?? a.codigo) === almacenMarcado), rect = area.current?.getBoundingClientRect()
    if (!a || !rect) return
    ultimoObjetivo.current = { x: a.x, y: a.y }
    setCamara(c => centrarCamara(c, a, Math.max(1,rect.width-48), Math.max(1,rect.height-48)))
  }, [almacenMarcado])
  useEffect(() => { if (unidadSeleccionada == null && almacenMarcado == null) ultimoObjetivo.current = null }, [unidadSeleccionada, almacenMarcado])
  // Seguimiento: mientras la unidad esté seleccionada (resaltada en celeste), la cámara la acompaña
  // a medida que avanza. Arrastrar el mapa a mano suelta el seguimiento hasta volver a seleccionarla;
  // deseleccionarla deja el mapa quieto donde está.
  const seguir = useRef(true)
  useEffect(() => { seguir.current = true }, [unidadSeleccionada])
  const seguida = unidadSeleccionada == null ? undefined : datos?.vehiculos.find(v => v.id === unidadSeleccionada)
  useEffect(() => {
    const rect = area.current?.getBoundingClientRect()
    if (!seguida || !seguir.current || !rect || arrastre.current) return
    ultimoObjetivo.current = { x: seguida.x, y: seguida.y }
    setCamara(c => centrarCamara(c, seguida, Math.max(1,rect.width-48), Math.max(1,rect.height-48)))
  }, [seguida?.x, seguida?.y])
  useEffect(() => {
    const nodo = area.current
    if (!nodo) return
    let ancho = Math.max(1,nodo.clientWidth-48), alto = Math.max(1,nodo.clientHeight-48)
    setDimensiones({ancho,alto})
    const observador = new ResizeObserver(() => {
      const nuevoAncho = Math.max(1,nodo.clientWidth-48), nuevoAlto = Math.max(1,nodo.clientHeight-48)
      if (ancho === nuevoAncho && alto === nuevoAlto) return
      ancho = nuevoAncho; alto = nuevoAlto
      setDimensiones({ancho,alto})
      const objetivo = ultimoObjetivo.current
      setCamara(c => objetivo ? centrarCamara(c, objetivo, ancho, alto) : limitarCamara(c.x, c.y, c.escala, ancho, alto))
    })
    observador.observe(nodo)
    return () => observador.disconnect()
  }, [!!datos])
  if (!datos) return <div className={`${full ? 'absolute inset-0' : 'relative min-h-[480px]'} flex items-center justify-center bg-slate-100 text-sm text-slate-600`}><div className="estado-inicial-mapa"><MapPin className="size-7 text-cyan-700"/><strong>{ctx.conexion==='sin-iniciar'?'Simulación sin iniciar':ctx.conexion==='preparando'?'Preparando simulación':ctx.conexion==='cargando'?'Preparando el mapa':'Mapa no disponible'}</strong><span>{ctx.conexion==='sin-iniciar'?'Configura la fecha y pulsa Iniciar simulación. Aquí aparecerá únicamente el nuevo escenario.':ctx.conexion==='preparando'?'Creando el escenario independiente. Espera a que termine la preparación.':ctx.conexion==='cargando'?'Consultando almacenes, flota y rutas del escenario.':'Comprueba la conexión con el servidor para recuperar la vista.'}</span></div></div>
  const incident = state === 'incident'
  const isCollapse = state === 'collapse'
  const W = 1000, H = 520
  const p = (x: number, y: number) => `${x / 70 * W},${H - y / 50 * H}`
  const r = (a: [number, number][]) => a.map(([x, y]) => p(x, y)).join(' ')
  // La coordenada ancla el centro del icono, no el centro del bloque que incluye su etiqueta.
  const pos = (x: number, y: number, radio = 16) => ({ left: `${x / 70 * 100}%`, top: `${100 - y / 50 * 100}%`, transform: `translate(-50%, -${radio}px) scale(${1 / camara.escala})`, transformOrigin: `50% ${radio}px` })
  const objetivo = buscado ? datos.rastreo.find(q => q.codigo === buscado) ?? null : null
  const averiadas = new Set(datos?.flota.filter(v => v.averiada).map(v => v.id))
  const flotaPorId = new globalThis.Map(datos.flota.map(f => [f.id, f]))
  // Unidad libre, sin ruta ni servicio: no se dibuja. Si está en un almacén se cuenta en su etiqueta;
  // si quedó fuera de uno, se consulta en el panel de flota. Sin estado del servidor se deduce de la flota.
  const libre = (v: MapaDatos['vehiculos'][number]) => {
    if (v.estado) return v.estado === 'EN_BASE'
    const f = flotaPorId.get(v.id)
    return !!f && f.disponible && !f.enRuta && !f.averiada && v.carga === 0
  }
  const almacenesFiltrados = datos.almacenes.filter(a=>almacenCumple(a,ctx.filtros,u.stock))
  const almacenes=almacenesFiltrados.map(a=>({nombre:NOMBRE_ALMACEN[a.codigo]??a.codigo,x:a.x,y:a.y,central:a.central,pct:a.pct,
    enBase:datos.vehiculos.filter(v=>libre(v)&&Math.round(v.x)===a.x&&Math.round(v.y)===a.y).length}))
  const hayBloqueo = !!datos?.incidencias.some(i => i.tipo === 'BLOQUEO')
  const filtradas = datos.vehiculos.filter(v => {
    if(libre(v))return false
    const unidad=ctx.unidades?.relojH===mapaVisual?.relojH?ctx.unidades?.unidades.find(u=>u.id===v.id):undefined
    if(unidad)return unidadCumple(unidad,ctx.filtros,ctx.mapa,ctx.limites)
    const ruta=(cuadro?.plan??mapaVisual?.plan)?.rutas.find(r=>r.vehiculoId===v.id&&r.horaFinH>datos.relojH)
    const siguiente=ruta?.paradas.find(p=>!p.entregado&&p.etaH>=datos.relojH)
    const pedido=siguiente?mapaVisual?.pedidos.find(p=>p.id===siguiente.pedidoId):null
    const retorno=datos.almacenes.find(a=>a.id===ruta?.almacenRetornoId)
    const provisional:UnidadOperativa={...v,ocupacionPct:v.ocupacionPct??0,estado:v.estado??'NO_DISPONIBLE',almacenBase:null,origen:null,
      destino:siguiente?{tipo:'PEDIDO',codigo:siguiente.codigoPedido,x:pedido?.posX??0,y:pedido?.posY??0}:retorno?{tipo:'ALMACEN',codigo:retorno.codigo,x:retorno.x,y:retorno.y}:null,
      salidaH:ruta?.horaInicioH??null,llegadaH:ruta?.horaFinH??null,etaDestinoH:siguiente?.etaH??ruta?.horaFinH??null,
      pedidos:[],averia:null,recorridoKm:0}
    return unidadCumple(provisional,ctx.filtros,mapaVisual,ctx.limites)
  })
  const visibles = new Set(filtradas.map(v=>v.id))
  // La selección explícita permite consultar la ruta aunque un filtro oculte su unidad.
  const rutaElegida = objetivo && !objetivo.asociaciones.some(a=>a.rutaId===ctx.rutaProducto) ? null : ctx.rutaProducto
  const rutaMarcada = (id:number,vehiculoId:number) => rutaElegida != null ? rutaElegida===id : objetivo ? objetivo.asociaciones.some(a=>a.rutaId===id) : unidadSeleccionada===vehiculoId
  const rutasConsulta:MapaDatos['rutas']=ctx.rutasConsulta.filter(r=>!datos.rutas.some(v=>v.id===r.id)).map(r=>({id:r.id,vehiculoId:r.vehiculoId,tipo:r.tipoVehiculo,puntos:r.trazado.map(p=>[p.x,p.y] as [number,number]),recorrido:[] as [number,number][]}))
  const rutasDibujadas:MapaDatos['rutas'] = [...datos.rutas.filter(ru=>visibles.has(ru.vehiculoId)||rutaMarcada(ru.id,ru.vehiculoId)),...rutasConsulta].sort((a,b)=>Number(rutaMarcada(a.id,a.vehiculoId)||ctx.rutasConsulta.some(r=>r.id===a.id))-Number(rutaMarcada(b.id,b.vehiculoId)||ctx.rutasConsulta.some(r=>r.id===b.id)))
  const enReposo=new Set((mapaVisual?.fisico?.vehiculos??[]).filter(v=>v.disponible&&!v.residual&&!mapaVisual?.fisico?.servicios.some(q=>q.vehiculoId===v.id&&!q.confirmada)&&!datos.incidencias.some(i=>i.vehiculoId===v.id)).map(v=>v.id))
  const dibujables=filtradas.filter(v=>{
    const sobreBase=datos.almacenes.some(a=>Math.abs(a.x-v.x)<1e-6&&Math.abs(a.y-v.y)<1e-6)
    const estado=v.estado??(enReposo.has(v.id)&&sobreBase?'EN_BASE':undefined)
    if(estado==='EN_BASE')return false
    return v.id===unidadSeleccionada||!estacionadaEnAlmacen({...v,estado},datos.almacenes)
  })
  const grupos = new Map(dibujables.map(v=>[String(v.id),[v]]))
  const unidadesDelGrupo=grupo?dibujables.filter(v=>grupo.split('-').includes(String(v.id))):[]
  const tipoAveria=(id:number)=>datos.incidencias.find(i=>i.tipo==='AVERIA'&&i.vehiculoId===id)?.tipoAveria
  const colorAveria=(id:number)=>tipoAveria(id)===1?'bg-orange-700':tipoAveria(id)===2?'bg-red-800':tipoAveria(id)===3?'bg-purple-900':'bg-slate-600'
  const fondoLuz=(luz:string)=>luz==='vacío'?'bg-slate-500':luz==='verde'?'bg-emerald-600':luz==='ámbar'?'bg-amber-600':luz==='rojo'?'bg-red-700':'bg-slate-400'
  return <div ref={area} className={`mapa-operativo ${full ? 'absolute inset-0' : 'relative min-h-[480px]'} overflow-hidden bg-[#eef2f1]`} onWheel={e => { e.preventDefault(); const rect = e.currentTarget.getBoundingClientRect(); zoom(Math.exp(-Math.max(-100,Math.min(100,e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?300:1)))*.002), { x: e.clientX - rect.left, y: e.clientY - rect.top }) }}
    onPointerDown={e => { if (e.button !== 0 || (e.target as HTMLElement).closest('button, [data-map-marker]')) return; arrastre.current = { x: e.clientX, y: e.clientY, origenX: camara.x, origenY: camara.y }; e.currentTarget.setPointerCapture(e.pointerId) }}
    onPointerMove={e => { const a = arrastre.current; if (!a) return; if (Math.abs(e.clientX - a.x) + Math.abs(e.clientY - a.y) > 4) seguir.current = false; const rect = e.currentTarget.getBoundingClientRect(); setCamara(c => limitarCamara(a.origenX + e.clientX - a.x, a.origenY + e.clientY - a.y, c.escala, Math.max(1,rect.width-48), Math.max(1,rect.height-48))) }}
    onPointerUp={() => { arrastre.current = null }} onPointerCancel={() => { arrastre.current = null }}>
    <div className="plano-operativo absolute origin-top-left" style={{ inset:24, transform: `translate(${camara.x}px, ${camara.y}px) scale(${camara.escala})`, transition: arrastre.current ? 'none' : 'transform 90ms linear' }}>
    <svg className="absolute inset-0 size-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <Cuadricula />
      {/* Tramos bloqueados vigentes (incidencias del back-end) */}
      {datos?.incidencias.filter(i => i.tipo === 'BLOQUEO').flatMap(i => i.tramos.map((t, k) => { const [a, b] = [p(t.x1, t.y1).split(','), p(t.x2, t.y2).split(',')]; return <line key={`${i.id}-${k}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#dc2626" strokeWidth="6" vectorEffect="non-scaling-stroke" strokeLinecap="round"><title>{i.descripcion ?? 'Tramo bloqueado'}</title></line> }))}
      {rutasDibujadas.map(ru => { const marcada = ctx.rutasConsulta.some(r=>r.id===ru.id) || rutaMarcada(ru.id,ru.vehiculoId); return <g key={ru.id}>
        <title>{ru.tramoFisico?'Arista física confirmada':`Ruta ${ru.id}${ru.pendientePlan?' · pendiente de replanificación':''}${objetivo?.asociaciones.some(a=>a.rutaId===ru.id)?` · pedido ${objetivo.codigo}`:''}`}</title>
        {marcada&&<polyline vectorEffect="non-scaling-stroke" points={r(ru.porRecorrer??ru.puntos)} fill="none" stroke="white" strokeWidth="9" strokeLinecap="round"/>}
        <polyline vectorEffect="non-scaling-stroke" aria-label={ru.tramoFisico?'Tramo físico confirmado':`Ruta ${ru.id}`} points={r(ru.porRecorrer??ru.puntos)} fill="none" stroke={ru.pendientePlan?'#b45309':COLOR_TIPO[ru.tipo]} strokeWidth={marcada?4.5:ru.tramoFisico?2.8:1.6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={ru.pendientePlan?'10 6':undefined} opacity={(objetivo || rutaElegida != null || unidadSeleccionada != null) && !marcada ? 0.045 : marcada ? 1 : 0.2} />
        {ru.recorrido.length > 1 && <polyline vectorEffect="non-scaling-stroke" aria-label={`Recorrido de ruta ${ru.id}`} points={r(ru.recorrido)} fill="none" stroke="#64748b" strokeWidth={marcada ? 4 : 2.5} strokeDasharray="4 7" opacity={marcada?0.4:0.07}/>}
      </g> })}
    </svg>
    {datos.incidencias.filter(i=>i.tipo==='BLOQUEO').flatMap(i=>extremosBloqueo(i.tramos).map(({x,y})=><span key={`aviso-bloqueo-${i.id}-${x}-${y}`} role="img" aria-label={`Extremo de bloqueo en (${x}, ${y})`} title={`${i.descripcion??'Tramo bloqueado'} · extremo (${x}, ${y})`} className="aviso-extremo-bloqueo absolute z-[2] flex size-6 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 shadow-sm" style={pos(x,y,12)}><AlertTriangle className="size-4" aria-hidden="true"/></span>))}
    {!full && <div className="absolute left-4 top-4 bg-white/90 px-3 py-2 text-xs font-bold text-slate-700 shadow"><MapPin className="mr-2 inline size-4 text-blue-600" />Origen (0,0) abajo-izquierda · Cuadrícula 1 km · 70 × 50 km</div>}

    {/* Almacenes: barra y % de existencias disponibles (el central es ilimitado) y unidades estacionadas en su base */}
    {almacenes.filter(a => ctx.filtros.luzAlmacen==='todos' || (a.central?'no disponible':a.pct==null?'no disponible':tonoStock(a.pct,u.stock).replace('ambar','ámbar'))===ctx.filtros.luzAlmacen).map(a => <button type="button" data-map-marker key={a.nombre} title={`${a.nombre} (${a.x},${a.y}) · ${a.central ? 'existencias ilimitadas' : a.pct == null ? 'existencias no disponibles' : `existencias ${a.pct}%`}${onWarehouse ? ' · clic para ver detalle' : ''}`} onClick={() => {if(a.nombre===almacenMarcado){if(ctx.panelActivo==='almacenes')ctx.setPanelActivo(null);onWarehouse?.(null);return}ctx.setEnfoque({x:a.x,y:a.y,clave:Date.now()});ctx.setPanelActivo('almacenes');onWarehouse?.(a.nombre)}} className={`marcador-almacen absolute flex flex-col items-center ${onWarehouse ? 'cursor-pointer' : ''}`} style={pos(a.x, a.y)}>
      <div className={`flex size-8 items-center justify-center border-2 border-white shadow-md ${a.nombre === almacenMarcado ? 'ring-4 ring-blue-500' : 'ring-1 ring-slate-300'} ${a.central ? 'bg-blue-700' : a.pct == null ? 'bg-slate-400' : CLASE_SEMAFORO[tonoStock(a.pct,u.stock)]} text-white`}><Warehouse className="size-4" /></div>
      {a.pct != null && <div className="mt-1 h-1.5 w-12 bg-white ring-1 ring-slate-300"><div className={`h-full ${CLASE_SEMAFORO[tonoStock(a.pct, u.stock)]}`} style={{ width: `${a.pct}%` }} /></div>}
      <span className="mt-1 block whitespace-nowrap bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 shadow-sm">{a.nombre} · {a.central ? <span className="text-blue-700">∞</span> : a.pct == null ? 'existencias no disponibles' : <span className={TEXTO_SEMAFORO[tonoStock(a.pct, u.stock)]}>existencias {a.pct}%</span>}</span>
      {a.enBase > 0 && <span className="block whitespace-nowrap bg-white/90 px-1.5 text-[10px] font-semibold text-slate-500 shadow-sm">{a.enBase} UT en base</span>}
    </button>)}

    {[...grupos.entries()].map(([clave, unidades]) => { const v = unidades[0]; const Icono = v.tipo === 'AUTO' ? Car : v.tipo === 'MOTO' ? Motorbike : Bike; const categoria = luzOcupacion(v.ocupacionPct ?? null, v.capacidad, ctx.limites)
      const averiasGrupo=unidades.filter(q=>averiadas.has(q.id))
      const identificadorGrupo=unidades.map(u=>u.id).sort((a,b)=>a-b).join('-')
      const sobreAlmacen=datos.almacenes.some(a=>a.x===v.x&&a.y===v.y)
      return <div key={identificadorGrupo} data-borde={v.x>65?'derecha':undefined} data-borde-superior={v.y>47?'true':undefined} data-seleccionado={unidades.some(q=>q.id===unidadSeleccionada)?'true':undefined} className={`marcador-unidad group pointer-events-none absolute z-[3] [&_button]:pointer-events-auto ${unidades.length>1?'grupo-cercano':''}`}  style={{...pos(v.x,v.y),...(sobreAlmacen?{marginLeft:44/camara.escala}: {})}}>
        {sobreAlmacen&&<span aria-hidden="true" className="absolute right-full top-4 w-11 border-t border-dashed border-slate-400"/>}<div className="relative mx-auto w-fit">
        <button type="button" onClick={() => {if(unidadSeleccionada===v.id){ctx.setPanelActivo(null);onUnidad?.(null);return}const cercanas=unidadesEnPunto(dibujables,v.id,dimensiones.ancho,dimensiones.alto,camara.escala);if(cercanas.length>1){setGrupo(cercanas.map(q=>q.id).join('-'));return}ctx.setRutasConsulta([]);ctx.setRutaProducto(null);ctx.setPanelActivo('flota');onUnidad?.(v.id)}} title={unidades.map(q => `${q.codigo} · carga ${q.carga}/${q.capacidad} · ${estadoEnEspanol(q.estado)} · ${q.ocupacionPct == null ? 'ocupación no disponible' : `${q.ocupacionPct.toLocaleString('es-PE',{maximumFractionDigits:1})}% · ${luzOcupacion(q.ocupacionPct, q.capacidad, ctx.limites)}`}`).join('\n')} aria-label={unidades.length > 1 ? `${unidades.length} unidades cercanas. Abrir detalle de vehículos` : `${v.codigo} · carga ${v.carga}/${v.capacidad} · ${estadoEnEspanol(v.estado)} · ${categoria}`} className={`mx-auto flex min-h-9 min-w-9 items-center justify-center rounded-full border-2 border-white px-1 font-bold text-white shadow ${unidades.some(q => q.id === unidadSeleccionada) ? 'ring-4 ring-blue-400' : ''} ${unidades.length > 1 ? 'bg-slate-700' : averiadas.has(v.id) ? colorAveria(v.id) : fondoLuz(categoria)}`}>
          {unidades.length > 1 ? unidades.length : <Icono className="size-4" style={{transform:giroIcono(v.direccion)}} />}
        </button>
        {unidades.length === 1 && v.direccion != null && <span aria-label="Dirección del tramo" className="absolute left-full top-1/2 ml-0.5 leading-none text-blue-900" style={{ transform: `translateY(-50%) rotate(${v.direccion}deg)` }}>➜</span>}
        </div>
        {averiasGrupo.length>0&&<div className="mt-1 flex flex-wrap justify-center gap-1" aria-label="Averías visibles">{averiasGrupo.map(q=><button key={q.id} onClick={()=>{if(unidadSeleccionada===q.id){ctx.setPanelActivo(null);onUnidad?.(null);return}ctx.setPanelActivo('flota');onUnidad?.(q.id)}} title={`${q.codigo} · avería tipo ${tipoAveria(q.id)??'desconocido'}`} aria-label={`Enfocar avería tipo ${tipoAveria(q.id)??'desconocido'} de ${q.codigo}`} className={`flex min-h-6 items-center gap-1 rounded border-2 border-white px-1 text-[10px] font-bold text-white shadow ring-1 ring-slate-900 ${colorAveria(q.id)}`}><Wrench className="size-3"/>A{tipoAveria(q.id)??'?'}{unidades.length>1?` ${q.codigo}`:''}</button>)}</div>}
        <span className={`etiqueta-unidad block whitespace-nowrap bg-white/95 px-2 py-1 text-[11px] font-bold shadow-sm ${unidades.length > 1 ? 'text-slate-700' : categoria === 'verde' ? 'text-emerald-700' : categoria === 'ámbar' ? 'text-amber-700' : categoria === 'rojo' ? 'text-red-700' : 'text-slate-600'}`}>{unidades.length > 1 ? 'Unidades' : `${v.codigo} · ${v.ocupacionPct == null ? '—' : `${v.ocupacionPct.toLocaleString('es-PE',{maximumFractionDigits:1})}%`}`}</span>
        {unidades.length===1&&<span className={`detalle-unidad ${unidadSeleccionada===v.id?'seleccionada':''}`}>{estadoEnEspanol(v.estado)} · {v.carga}/{v.capacidad} productos</span>}
      </div>
    })}

    <PedidosEnMapa pedidos={datos.pedidos} buscado={buscado} escala={camara.escala} umbrales={u.pedido} onSeleccion={seleccionarPedido} interactivo={!!onPedido}/>


    {/* Un pedido ya cerrado no se dibuja entre los abiertos; si es el buscado, se marca igual en su destino */}
    {datos && objetivo && !datos.pedidos.some(pe => pe.codigo === objetivo.codigo) && <div title={`${objetivo.codigo} · ${ETIQUETA_ESTADO[objetivo.estado]}`} style={pos(objetivo.x, objetivo.y, 7)} className="absolute z-[5]">
      <div className="relative mx-auto size-3.5"><div className="absolute -inset-1.5 rounded-full bg-blue-500/60" /><div className="relative size-3.5 rounded-full border-2 border-blue-700 bg-slate-400 shadow-md ring-2 ring-blue-500" /></div>
      <span className="mt-1 block whitespace-nowrap bg-blue-700 px-1 text-[10px] font-bold text-white shadow-sm">{objetivo.codigo} · {ETIQUETA_ESTADO[objetivo.estado].toLowerCase()}</span>
    </div>}

    {incident && <div className="absolute left-[45%] top-[32%] bg-red-50 px-3 py-2 text-xs font-bold text-red-700 shadow"><AlertTriangle className="mr-1 inline size-4" />Incidencia detectada · Replanificación en proceso</div>}
    </div>
    {grupo&&unidadesDelGrupo.length>0&&<section role="dialog" aria-label="Unidades cercanas" className="selector-grupo">
      <div className="cabecera-selector"><div><h3>Unidades cercanas <span>{unidadesDelGrupo.length}</span></h3><p>Elige un vehículo para ver su ubicación y ruta.</p></div><button aria-label="Cerrar unidades cercanas" onClick={()=>setGrupo(null)}><X className="size-4"/></button></div>
      <div className="lista-selector">{unidadesDelGrupo.map(q=><button key={q.id} onClick={()=>{ctx.setRutasConsulta([]);ctx.setRutaProducto(null);ctx.setPanelActivo('flota');onUnidad?.(q.id);setGrupo(null)}}><span><b>{q.codigo}</b><small>{ETIQUETA_TIPO[q.tipo]} · {estadoEnEspanol(q.estado)}</small></span><span className="dato-selector"><b>{q.carga}/{q.capacidad}</b><small>({q.x.toFixed(2)}, {q.y.toFixed(2)}) km</small></span></button>)}</div>
      <div className="pie-selector"><button onClick={()=>{const v=unidadesDelGrupo[0];setCamara(c=>centrarCamara({...c,escala:Math.min(8,c.escala*1.7)},v,dimensiones.ancho,dimensiones.alto));setGrupo(null)}}>Ampliar zona</button><span>Coordenadas físicas conservadas</span></div>
    </section>}
    <div className="controles-mapa absolute bottom-5 left-5 z-[8] flex items-center gap-1" aria-label="Controles del mapa"><button onClick={() => zoom(1.25)} aria-label="Ampliar mapa" className="border bg-white px-3 py-2 font-bold shadow">+</button><button onClick={() => zoom(1 / 1.25)} aria-label="Reducir mapa" className="border bg-white px-3 py-2 font-bold shadow">−</button><button onClick={() => setCamara({ escala: 1, x: 0, y: 0 })} className="border bg-white px-2 py-2 text-xs font-bold shadow">Ajustar mapa</button></div>
    <div className="estado-mapa" aria-label="Estado de la vista"><span className={`indicador-conexion ${ctx.conexion!=='actual'?'desconectado':''}`}/><span>{ctx.conexion==='cargando'?'Conectando':ctx.conexion!=='actual'?'Última lectura disponible':state==='idle'?'Vista en espera':'Conectado'}</span>{cuadro&&ctx.mapa&&ctx.mapa.relojH-cuadro.relojH>1/3600&&<span className="reproduccion-suavizada" title={`Se reproducen recorridos confirmados. Diferencia con el reloj actual: ${((ctx.mapa.relojH-cuadro.relojH)*60).toFixed(1)} min simulados.`}>Vista suavizada</span>}<span className="escala-mapa">{camara.escala.toFixed(1)}×</span></div>
    <Leyenda full={full} real={!!datos} incident={datos ? hayBloqueo : incident || replanned || isCollapse} averia={averiadas.size > 0} collapse={isCollapse} buscado={!!buscado} />
    {almacenesFiltrados.length<datos.almacenes.length&&<p className="absolute right-3 top-3 z-[7] flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/95 px-3 py-1.5 text-[11px] font-semibold text-blue-900 shadow">
      <Warehouse className="size-3.5"/>Mostrando {almacenesFiltrados.length} de {datos.almacenes.length} almacenes por un filtro activo
      <button type="button" onClick={()=>ctx.setFiltros({...ctx.filtros,almacen:'todos',patronAlmacen:'',zonaAlmacen:'todos',luzAlmacen:'todos'})} className="font-bold text-blue-700 underline">Mostrar todos</button>
    </p>}
    {datos.planAplicable===false&&datos.rutas.some(r=>r.pendientePlan)&&<p className="aviso-plan" title="Las líneas ámbar discontinuas pertenecen al último plan publicado y están pendientes de actualización. Las posiciones son físicas." role="status">{state==='complete'||state==='collapse'?'Último plan publicado':'Plan en actualización'}</p>}
  </div>
}

const Cuadricula=memo(function Cuadricula(){
 const W=1000,H=520
 return <g aria-hidden="true"><rect width={W} height={H} fill="#eef2f1"/>
      {Array.from({ length: 71 }, (_, x) => <path key={`x${x}`} d={`M${x / 70 * W} 0V${H}`} stroke={x % 10 === 0 ? '#9fb0b8' : '#d5dde0'} strokeWidth={x % 10 === 0 ? 1.1 : .5} />)}
      {Array.from({ length: 51 }, (_, y) => <path key={`y${y}`} d={`M0 ${H - y / 50 * H}H${W}`} stroke={y % 10 === 0 ? '#9fb0b8' : '#d5dde0'} strokeWidth={y % 10 === 0 ? 1.1 : .5} />)}
      {[0, 10, 20, 30, 40, 50, 60, 70].map(x => <text key={x} x={x / 70 * W + 4} y={H - 8} fill="#475569" fontSize="12" fontWeight="700" style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 3 }}>{x}</text>)}
      {[0, 10, 20, 30, 40, 50].map(y => <text key={y} x="8" y={H - y / 50 * H - 6} fill="#475569" fontSize="12" fontWeight="700" style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 3 }}>{y}</text>)}
 </g>
})

/** Hundreds of stationary order markers do not need React reconciliation on every animation frame. */
const PedidosEnMapa=memo(function PedidosEnMapa({pedidos,buscado,escala,umbrales,onSeleccion,interactivo}:{pedidos:MapaDatos['pedidos'];buscado?:string|null;escala:number;umbrales:Umbrales;onSeleccion:(codigo:string)=>void;interactivo:boolean}){
 return <>    {pedidos.map(pe => { const esBuscado = pe.codigo === buscado; return <button type="button" data-map-marker aria-label={`Pedido ${pe.codigo}, ${ETIQUETA_ESTADO[pe.estado]}`} key={pe.id} data-seleccionado={esBuscado?'true':undefined} onClick={()=>onSeleccion(pe.codigo)} title={`${pe.codigo} · destino (${pe.x},${pe.y}) · ${pe.cantidad} u · ${ETIQUETA_ESTADO[pe.estado]}${pe.margenH != null ? ` · margen ${pe.margenH.toFixed(1)} h` : ''}${interactivo ? ' · clic para ver la ficha' : ''}`} style={{left:`${pe.x/70*100}%`,top:`${100-pe.y/50*100}%`,transform:`translate(-50%, -7px) scale(${1/escala})`,transformOrigin:'50% 7px'}} className={`marcador-pedido ${escala>=3.5&&pedidos.length<=30?'detalle-zoom':''} absolute ${interactivo ? 'cursor-pointer' : ''} ${esBuscado ? 'z-[5]' : ''}`}>
      <div className="relative mx-auto size-3.5">{esBuscado && <div className="absolute -inset-1.5 rounded-full bg-blue-500/60" />}<div className={`relative size-3.5 rounded-full border-2 shadow-md ${esBuscado ? 'border-blue-700 ring-2 ring-blue-500' : 'border-white'} ${CLASE_SEMAFORO[semaforo(pe.margenH, umbrales)]}`} /></div>
      {<span className={`etiqueta-pedido block whitespace-nowrap px-2 py-1 text-[11px] font-semibold shadow-sm ${esBuscado ? 'bg-blue-700 text-white' : 'bg-white/90 text-slate-700'}`}>{pe.codigo}</span>}
    </button> })}</>
})
