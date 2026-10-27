'use client'

import { useContext, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Bike, Motorbike, Car, MapPin, Warehouse, Wrench, X } from 'lucide-react'
import { type EstadoPedido, type MapaDatos, type PedidoRastreo, type TipoVehiculo, type Umbrales, agruparPosiciones, semaforo } from '@/lib/api/operacion'
import { ocupacion } from '@/components/operacion/PanelFlota'
import { UmbralesCtx } from '@/components/operacion/umbrales'
import { ampliarCamara, centrarCamara, limitarCamara } from '@/lib/operacion/camara'

type ExecState = 'idle' | 'running' | 'incident' | 'complete' | 'collapse' | 'disconnected'
const COLOR_TIPO: Record<TipoVehiculo, string> = { AUTO: '#2563eb', MOTO: '#7c3aed', BICICLETA: '#0f9f8d' }
const CLASE_TIPO: Record<TipoVehiculo, string> = { AUTO: 'bg-blue-600', MOTO: 'bg-violet-600', BICICLETA: 'bg-teal-600' }
const ETIQUETA_TIPO: Record<TipoVehiculo, string> = { AUTO: 'Auto', MOTO: 'Moto', BICICLETA: 'Bicicleta' }
const CLASE_SEMAFORO = { verde: 'bg-emerald-600', ambar: 'bg-amber-500', rojo: 'bg-red-600' } as const
const NOMBRE_ALMACEN: Record<string, string> = { 'ALM-CENTRAL': 'Almacén central', 'ALM-NOROESTE': 'Nor-Oeste', 'ALM-ESTE': 'Intermedio Este' }
const tonoStock = (pct: number, u: Umbrales) => pct >= u.verde ? 'verde' : pct < u.rojo ? 'rojo' : 'ambar'
const TEXTO_SEMAFORO = { verde: 'text-emerald-700', ambar: 'text-amber-700', rojo: 'text-red-700' } as const
const ETIQUETA_ESTADO: Record<EstadoPedido, string> = { PENDIENTE: 'Pendiente de asignar', ASIGNADO: 'Asignado a una ruta', EN_RUTA: 'En ruta', ENTREGADO: 'Entregado', NO_ENTREGADO: 'No entregado' }

export function MapaOperativo({ state, highlightOrderId, full = false, replanned = false, onWarehouse, onPedido, datos, buscado, almacenMarcado, unidadSeleccionada, onUnidad }: { state: ExecState; highlightOrderId?: string | null; almacenMarcado?: string | null; full?: boolean; replanned?: boolean; onWarehouse?: (name: string) => void; onPedido?: (codigo: string) => void; datos?: MapaDatos | null; buscado?: string | null; unidadSeleccionada?: number | null; onUnidad?: (id: number) => void }) {
  const u = useContext(UmbralesCtx)
  const [grupo, setGrupo] = useState<string | null>(null)
  const [camara, setCamara] = useState({ escala: 1, x: 0, y: 0 })
  const area = useRef<HTMLDivElement>(null)
  const ultimoObjetivo = useRef<{ x: number; y: number } | null>(null)
  const arrastre = useRef<{ x: number; y: number; origenX: number; origenY: number } | null>(null)
  const zoom = (factor: number, punto?: { x: number; y: number }) => {
    const rect = area.current?.getBoundingClientRect(); if (!rect) return
    setCamara(c => ampliarCamara(c, factor, punto ?? { x: rect.width / 2, y: rect.height / 2 }, rect.width, rect.height))
  }
  useEffect(() => {
    const v = datos?.vehiculos.find(v => v.id === unidadSeleccionada), rect = area.current?.getBoundingClientRect()
    if (!v || !rect) return
    ultimoObjetivo.current = { x: v.x, y: v.y }
    setCamara(c => centrarCamara(c, v, rect.width, rect.height))
  }, [unidadSeleccionada])
  useEffect(() => {
    const a = datos?.almacenes.find(a => (NOMBRE_ALMACEN[a.codigo] ?? a.codigo) === almacenMarcado), rect = area.current?.getBoundingClientRect()
    if (!a || !rect) return
    ultimoObjetivo.current = { x: a.x, y: a.y }
    setCamara(c => centrarCamara(c, a, rect.width, rect.height))
  }, [almacenMarcado])
  useEffect(() => { if (unidadSeleccionada == null && almacenMarcado == null) ultimoObjetivo.current = null }, [unidadSeleccionada, almacenMarcado])
  useEffect(() => {
    const nodo = area.current
    if (!nodo) return
    let ancho = nodo.clientWidth, alto = nodo.clientHeight
    const observador = new ResizeObserver(() => {
      const nuevoAncho = nodo.clientWidth, nuevoAlto = nodo.clientHeight
      if (ancho === nuevoAncho && alto === nuevoAlto) return
      ancho = nuevoAncho; alto = nuevoAlto
      const objetivo = ultimoObjetivo.current
      setCamara(c => objetivo ? centrarCamara(c, objetivo, ancho, alto) : limitarCamara(c.x, c.y, c.escala, ancho, alto))
    })
    observador.observe(nodo)
    return () => observador.disconnect()
  }, [!!datos])
  if (!datos) return <div className={`${full ? 'absolute inset-0' : 'relative min-h-[480px]'} flex items-center justify-center bg-slate-100 text-sm text-slate-600`}>Mapa operativo no disponible</div>
  const incident = state === 'incident'
  const isCollapse = state === 'collapse'
  const W = 1000, H = 520
  const p = (x: number, y: number) => `${x / 70 * W},${H - y / 50 * H}`
  const r = (a: [number, number][]) => a.map(([x, y]) => p(x, y)).join(' ')
  // La coordenada ancla el centro del icono, no el centro del bloque que incluye su etiqueta.
  const pos = (x: number, y: number, radio = 16) => ({ left: `${x / 70 * 100}%`, top: `${100 - y / 50 * 100}%`, transform: `translate(-50%, -${radio}px) scale(${1 / camara.escala})`, transformOrigin: `50% ${radio}px` })
  const objetivo = buscado ? datos.rastreo.find(q => q.codigo === buscado) ?? null : null
  const almacenes = datos.almacenes.map(a => ({ nombre: NOMBRE_ALMACEN[a.codigo] ?? a.codigo, x: a.x, y: a.y, central: a.central, pct: a.pct, enBase: a.vehiculosEnBase as number | null }))
  const averiadas = new Set(datos?.flota.filter(v => v.averiada).map(v => v.id))
  const hayBloqueo = !!datos?.incidencias.some(i => i.tipo === 'BLOQUEO')
  const grupos = agruparPosiciones(datos.vehiculos)
  return <div ref={area} className={`${full ? 'absolute inset-0' : 'relative min-h-[480px]'} overflow-hidden bg-[#e9eef0]`} onWheel={e => { e.preventDefault(); const rect = e.currentTarget.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, { x: e.clientX - rect.left, y: e.clientY - rect.top }) }}
    onPointerDown={e => { if (e.button !== 0 || (e.target as HTMLElement).closest('button, [data-map-marker]')) return; arrastre.current = { x: e.clientX, y: e.clientY, origenX: camara.x, origenY: camara.y }; e.currentTarget.setPointerCapture(e.pointerId) }}
    onPointerMove={e => { const a = arrastre.current; if (!a) return; const rect = e.currentTarget.getBoundingClientRect(); setCamara(c => limitarCamara(a.origenX + e.clientX - a.x, a.origenY + e.clientY - a.y, c.escala, rect.width, rect.height)) }}
    onPointerUp={() => { arrastre.current = null }} onPointerCancel={() => { arrastre.current = null }}>
    <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${camara.x}px, ${camara.y}px) scale(${camara.escala})` }}>
    <svg className="absolute inset-0 size-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <rect width={W} height={H} fill="#e9eef0" />
      {Array.from({ length: 71 }, (_, x) => <path key={`x${x}`} d={`M${x / 70 * W} 0V${H}`} stroke={x % 10 === 0 ? '#9fb0b8' : '#d5dde0'} strokeWidth={x % 10 === 0 ? 1.1 : .5} />)}
      {Array.from({ length: 51 }, (_, y) => <path key={`y${y}`} d={`M0 ${H - y / 50 * H}H${W}`} stroke={y % 10 === 0 ? '#9fb0b8' : '#d5dde0'} strokeWidth={y % 10 === 0 ? 1.1 : .5} />)}
      {[0, 10, 20, 30, 40, 50, 60, 70].map(x => <text key={x} x={x / 70 * W + 4} y={H - 8} fill="#475569" fontSize="12" fontWeight="700" style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 3 }}>{x}</text>)}
      {[0, 10, 20, 30, 40, 50].map(y => <text key={y} x="8" y={H - y / 50 * H - 6} fill="#475569" fontSize="12" fontWeight="700" style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 3 }}>{y}</text>)}
      {/* Tramos bloqueados vigentes (incidencias del back-end) */}
      {datos?.incidencias.filter(i => i.tipo === 'BLOQUEO').flatMap(i => i.tramos.map((t, k) => { const [a, b] = [p(t.x1, t.y1).split(','), p(t.x2, t.y2).split(',')]; return <line key={`${i.id}-${k}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#dc2626" strokeWidth="6" strokeLinecap="round"><title>{i.descripcion ?? 'Tramo bloqueado'}</title></line> }))}
      {datos?.rutas.map(ru => { const marcada = objetivo?.asociaciones.some(a => a.rutaId === ru.id) ?? false; return <g key={ru.id}>
        <polyline points={r(ru.puntos)} fill="none" stroke={COLOR_TIPO[ru.tipo]} strokeWidth={marcada ? 6 : 3} opacity={objetivo && !marcada ? 0.35 : 0.85} />
        {ru.recorrido.length > 1 && <polyline points={r(ru.recorrido)} fill="none" stroke="#94a3b8" strokeWidth={marcada ? 6.5 : 3.5} strokeDasharray="6 5" />}
      </g> })}
    </svg>
    {!full && <div className="absolute left-4 top-4 bg-white/90 px-3 py-2 text-xs font-bold text-slate-700 shadow"><MapPin className="mr-2 inline size-4 text-blue-600" />Origen (0,0) abajo-izquierda · Cuadrícula 1 km · 70 × 50 km</div>}

    {/* Almacenes: barra y % de stock disponible (el central es ilimitado) y unidades estacionadas en su base */}
    {almacenes.map(a => <button type="button" data-map-marker key={a.nombre} title={`${a.nombre} (${a.x},${a.y}) · ${a.central ? 'stock ilimitado' : a.pct == null ? 'stock no disponible' : `stock ${a.pct}%`}${onWarehouse ? ' · clic para ver detalle' : ''}`} onClick={() => onWarehouse?.(a.nombre)} className={`absolute flex flex-col items-center ${onWarehouse ? 'cursor-pointer' : ''}`} style={pos(a.x, a.y)}>
      <div className={`flex size-8 items-center justify-center border-2 border-white shadow-md ${a.nombre === almacenMarcado ? 'animate-pulse ring-4 ring-blue-500' : 'ring-1 ring-slate-300'} ${a.central ? 'bg-blue-700' : 'bg-slate-700'} text-white`}><Warehouse className="size-4" /></div>
      {a.pct != null && <div className="mt-1 h-1.5 w-12 bg-white ring-1 ring-slate-300"><div className={`h-full ${CLASE_SEMAFORO[tonoStock(a.pct, u.stock)]}`} style={{ width: `${a.pct}%` }} /></div>}
      <span className="mt-1 block whitespace-nowrap bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 shadow-sm">{a.nombre} · {a.central ? <span className="text-blue-700">stock ilimitado</span> : a.pct == null ? 'stock no disponible' : <span className={TEXTO_SEMAFORO[tonoStock(a.pct, u.stock)]}>stock {a.pct}%</span>}</span>
      {a.enBase != null && <span className="block whitespace-nowrap bg-white/90 px-1.5 text-[10px] font-semibold text-slate-500 shadow-sm">{a.enBase} vehículos en base</span>}
    </button>)}

    {[...grupos.entries()].map(([clave, unidades]) => { const v = unidades[0]; const Icono = v.tipo === 'AUTO' ? Car : v.tipo === 'MOTO' ? Motorbike : Bike; const categoria = ocupacion(v.ocupacionPct ?? null, v.capacidad)
      return <div key={clave} className="absolute z-[2]" style={pos(v.x, v.y)}>
        <button type="button" onClick={() => unidades.length === 1 ? onUnidad?.(v.id) : setGrupo(grupo === clave ? null : clave)} title={unidades.map(q => `${q.codigo} · carga ${q.carga}/${q.capacidad} · ${q.estado ?? 'estado no disponible'} · ${q.ocupacionPct == null ? 'ocupación no disponible' : `${q.ocupacionPct}% · ${ocupacion(q.ocupacionPct, q.capacidad)}`}`).join('\n')} aria-label={unidades.length > 1 ? `${unidades.length} unidades en (${v.x}, ${v.y})` : `${v.codigo} · carga ${v.carga}/${v.capacidad} · ${v.estado ?? 'estado no disponible'} · ${categoria}`} className={`mx-auto flex min-h-8 min-w-8 items-center justify-center rounded-full border-2 border-white px-1 font-bold text-white shadow ${unidades.some(q => q.id === unidadSeleccionada) ? 'ring-4 ring-blue-400' : ''} ${unidades.length > 1 ? 'bg-slate-700' : averiadas.has(v.id) ? 'bg-red-600' : CLASE_TIPO[v.tipo]}`}>
          {unidades.length > 1 ? unidades.length : <Icono className="size-4" />}
        </button>
        {unidades.length === 1 && v.direccion != null && <span aria-label="Dirección del tramo" className="absolute -right-2 top-0 text-blue-900" style={{ transform: `rotate(${v.direccion}deg)` }}>➜</span>}
        <span className={`block whitespace-nowrap bg-white/90 px-1 text-[10px] font-bold shadow ${unidades.length > 1 ? 'text-slate-700' : categoria === 'verde' ? 'text-emerald-700' : categoria === 'ámbar' ? 'text-amber-700' : categoria === 'rojo' ? 'text-red-700' : 'text-slate-600'}`}>{unidades.length > 1 ? 'Unidades' : `${v.codigo} · ${v.ocupacionPct == null ? 'ocupación no disponible' : `${v.ocupacionPct}% · ${categoria}`} · ${v.estado ?? 'estado no disponible'}`}</span>
        {grupo === clave && <div className={`absolute ${v.x > 50 ? 'right-0' : 'left-0'} ${v.y < 25 ? 'bottom-full' : 'top-full'} z-20 max-h-48 w-48 overflow-y-auto border bg-white p-2 text-xs shadow-lg`}><p className="font-bold">Unidades en ({v.x}, {v.y})</p>{unidades.map(q => <button key={q.id} onClick={() => { onUnidad?.(q.id); setGrupo(null) }} className="block w-full border-b py-1 text-left">{q.codigo} · {ETIQUETA_TIPO[q.tipo]} · {q.carga}/{q.capacidad} · {q.ocupacionPct == null ? 'ocupación no disponible' : `${q.ocupacionPct}% ${ocupacion(q.ocupacionPct, q.capacidad)}`} · {q.estado ?? 'estado no disponible'}</button>)}<button onClick={() => setGrupo(null)} className="mt-1 border px-2 py-1">Cerrar</button></div>}
      </div>
    })}

    {datos.pedidos.map(pe => { const esBuscado = pe.codigo === buscado; return <div data-map-marker key={pe.id} onClick={() => onPedido?.(pe.codigo)} title={`${pe.codigo} · destino (${pe.x},${pe.y}) · ${pe.cantidad} u · ${ETIQUETA_ESTADO[pe.estado]}${pe.margenH != null ? ` · margen ${pe.margenH.toFixed(1)} h` : ''}${onPedido ? ' · clic para ver la ficha' : ''}`} style={pos(pe.x, pe.y, 7)} className={`absolute ${onPedido ? 'cursor-pointer' : ''} ${esBuscado ? 'z-[5]' : ''}`}>
      <div className="relative mx-auto size-3.5">{esBuscado && <div className="absolute -inset-1.5 animate-ping rounded-full bg-blue-500/60" />}<div className={`relative size-3.5 rounded-full border-2 shadow-md ${esBuscado ? 'border-blue-700 ring-2 ring-blue-500' : 'border-white'} ${CLASE_SEMAFORO[semaforo(pe.margenH, u.pedido)]}`} /></div>
      {(esBuscado || datos.pedidos.length <= 40) && <span className={`mt-1 block whitespace-nowrap px-1 text-[10px] font-bold shadow-sm ${esBuscado ? 'bg-blue-700 text-white' : 'bg-white/90 text-slate-700'}`}>{pe.codigo}</span>}
    </div> })}

    {/* Un pedido ya cerrado no se dibuja entre los abiertos; si es el buscado, se marca igual en su destino */}
    {datos && objetivo && !datos.pedidos.some(pe => pe.codigo === objetivo.codigo) && <div title={`${objetivo.codigo} · ${ETIQUETA_ESTADO[objetivo.estado]}`} style={pos(objetivo.x, objetivo.y, 7)} className="absolute z-[5]">
      <div className="relative mx-auto size-3.5"><div className="absolute -inset-1.5 animate-ping rounded-full bg-blue-500/60" /><div className="relative size-3.5 rounded-full border-2 border-blue-700 bg-slate-400 shadow-md ring-2 ring-blue-500" /></div>
      <span className="mt-1 block whitespace-nowrap bg-blue-700 px-1 text-[10px] font-bold text-white shadow-sm">{objetivo.codigo} · {ETIQUETA_ESTADO[objetivo.estado].toLowerCase()}</span>
    </div>}

    {incident && <div className="absolute left-[45%] top-[32%] bg-red-50 px-3 py-2 text-xs font-bold text-red-700 shadow"><AlertTriangle className="mr-1 inline size-4" />Incidencia detectada · Replanificación en proceso</div>}
    </div>
    <div className="absolute bottom-16 left-1/2 z-[8] flex -translate-x-1/2 gap-1 md:bottom-3" aria-label="Controles del mapa"><button onClick={() => zoom(1.25)} aria-label="Ampliar mapa" className="border bg-white px-3 py-2 font-bold shadow">+</button><button onClick={() => zoom(1 / 1.25)} aria-label="Reducir mapa" className="border bg-white px-3 py-2 font-bold shadow">−</button><button onClick={() => setCamara({ escala: 1, x: 0, y: 0 })} className="border bg-white px-2 py-2 text-xs font-bold shadow">Ajustar mapa</button></div>
    <Leyenda full={full} real={!!datos} incident={datos ? hayBloqueo : incident || replanned || isCollapse} averia={averiadas.size > 0} collapse={isCollapse} buscado={!!buscado} />
  </div>
}

// Leyenda del mapa: explica cada símbolo que se dibuja; se puede recoger para ver el mapa completo
function Leyenda({ full, real, incident, averia = false, collapse, buscado }: { full: boolean; real: boolean; incident: boolean; averia?: boolean; collapse: boolean; buscado: boolean }) {
  const u = useContext(UmbralesCtx)
  // En pantallas bajas (laptops) empieza recogida para no tapar el mapa
  const [abierta, setAbierta] = useState(() => typeof window === 'undefined' || window.innerHeight >= 900)
  const item = 'flex items-center gap-1.5'
  const titulo = 'w-full text-[9px] font-bold uppercase tracking-wider text-slate-400'
  const caja = `absolute z-[6] ${full ? 'bottom-9 right-4' : 'bottom-4 left-4'}`
  if (!abierta) return <button onClick={() => setAbierta(true)} className={`${caja} border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow`}>Ver leyenda</button>
  return <div className={`${caja} w-[560px] max-w-[calc(100%-2rem)] bg-white/95 px-3 py-2 text-[10px] font-semibold text-slate-700 shadow`}>
    <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-bold text-slate-800">Leyenda</span><button onClick={() => setAbierta(false)} aria-label="Ocultar leyenda" title="Ocultar leyenda" className="text-slate-400 hover:text-slate-700"><X className="size-3.5" /></button></div>
    {full && <p className="mt-0.5 text-slate-500"><MapPin className="mr-1 inline size-3 text-blue-600" />Origen (0,0) abajo-izquierda · Cuadrícula 1 km · 70 × 50 km</p>}
    <div className="mt-1.5 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <span className={titulo}>Almacenes</span>
        <span className={item}><span className="inline-block size-3 border-2 border-white bg-blue-700 shadow" />Central · stock ilimitado</span>
        <span className={item}><span className="inline-block size-3 border-2 border-white bg-slate-700 shadow" />Intermedio</span>
        <span className={item}><span className="flex h-1.5 w-8 bg-white ring-1 ring-slate-300"><span className="h-full w-1/3 bg-emerald-600" /><span className="h-full w-1/3 bg-amber-500" /><span className="h-full w-1/3 bg-red-600" /></span>Stock disponible: verde ≥ {u.stock.verde} % · ámbar · rojo &lt; {u.stock.rojo} %</span>
        {real && <span className={item}><b>N vehículos en base</b> = unidades estacionadas, sin ruta</span>}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <span className={titulo}>Vehículos en ruta y su ruta (mismo color)</span>
        {(Object.keys(ETIQUETA_TIPO) as TipoVehiculo[]).map(t => <span key={t} className={item}><span className={`inline-block size-3 rounded-full ${CLASE_TIPO[t]}`} /><span className="inline-block h-0.5 w-4" style={{ background: COLOR_TIPO[t] }} />{ETIQUETA_TIPO[t]}</span>)}
        <span className={item}><span className="inline-block h-0 w-5 border-t-2 border-dashed border-slate-400" />{real ? 'Tramo ya recorrido' : 'Ruta anterior'}</span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <span className={titulo}>{real ? 'Pedidos abiertos · margen = fecha límite − llegada estimada' : 'Pedidos (destino del cliente)'}</span>
        {real ? <>
          <span className={item}><span className="inline-block size-3 rounded-full bg-emerald-600" />Holgado ≥ {u.pedido.verde} h</span>
          <span className={item}><span className="inline-block size-3 rounded-full bg-amber-500" />Justo</span>
          <span className={item}><span className="inline-block size-3 rounded-full bg-red-600" />Crítico &lt; {u.pedido.rojo} h</span>
        </> : <>
          <span className={item}><span className="inline-block size-3 rounded-full bg-emerald-600" />En plazo</span>
          {incident && <span className={item}><span className="inline-block size-3 rounded-full bg-amber-500" />Afectado por la incidencia</span>}
        </>}
        {buscado && <span className={item}><span className="inline-block size-3 rounded-full border-2 border-blue-700 bg-white ring-2 ring-blue-500" />Pedido buscado</span>}
      </div>
      {(incident || averia || collapse) && <div className="flex flex-wrap gap-x-3 gap-y-1">
        <span className={titulo}>Incidencias</span>
        {incident && <span className={`${item} text-red-700`}><span className="inline-block h-1 w-5 bg-red-600" />Tramo bloqueado</span>}
        {averia && <span className={`${item} text-red-700`}><span className="flex size-3.5 items-center justify-center rounded-full bg-red-600 text-white"><Wrench className="size-2.5" /></span>Unidad averiada</span>}
        {collapse && <span className={`${item} text-red-700`}><span className="inline-block size-3 rounded-full bg-red-600" />Pedido causante del colapso</span>}
      </div>}
    </div>
  </div>
}
