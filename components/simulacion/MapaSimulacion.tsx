'use client'

// Mapa de la simulación con datos del back-end: almacenes con su stock, unidades sobre su
// trayectoria certificada, ruta pendiente de cada unidad y pedidos abiertos con semáforo de plazo.

import { Bike, Car, MapPin, Warehouse } from 'lucide-react'
import type { CapasMapa } from '@/lib/simulacion/mapa'
import type { TipoVehiculo } from '@/lib/api/simulacion'

const W = 1000
const H = 520
const px = (x: number) => x / 70 * W
const py = (y: number) => H - y / 50 * H
const izquierda = (x: number) => `${x / 70 * 100}%`
const arriba = (y: number) => `${100 - y / 50 * 100}%`

const COLOR: Record<TipoVehiculo, { trazo: string; fondo: string; nombre: string }> = {
  AUTO: { trazo: '#2563eb', fondo: 'bg-blue-600', nombre: 'Auto' },
  MOTO: { trazo: '#7c3aed', fondo: 'bg-violet-600', nombre: 'Moto' },
  BICICLETA: { trazo: '#0f9f8d', fondo: 'bg-teal-600', nombre: 'Bicicleta' },
}
const SEMAFORO = { verde: 'bg-emerald-600', ambar: 'bg-amber-500', rojo: 'bg-red-600' }
const STOCK = (pct: number) => pct >= 50 ? 'text-emerald-700' : pct >= 20 ? 'text-amber-700' : 'text-red-700'

export function MapaSimulacion({ capas, fecha }: { capas: CapasMapa; fecha: string | null }) {
  return <div className="absolute inset-0 overflow-hidden bg-[#e9eef0]">
    <svg className="absolute inset-0 size-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <rect width={W} height={H} fill="#e9eef0" />
      {Array.from({ length: 71 }, (_, x) => <path key={`x${x}`} d={`M${px(x)} 0V${H}`} stroke={x % 10 === 0 ? '#9fb0b8' : '#d5dde0'} strokeWidth={x % 10 === 0 ? 1.1 : .5} />)}
      {Array.from({ length: 51 }, (_, y) => <path key={`y${y}`} d={`M0 ${py(y)}H${W}`} stroke={y % 10 === 0 ? '#9fb0b8' : '#d5dde0'} strokeWidth={y % 10 === 0 ? 1.1 : .5} />)}
      {[0, 10, 20, 30, 40, 50, 60, 70].map(x => <text key={x} x={px(x) + 4} y={H - 8} fill="#475569" fontSize="12" fontWeight="700" style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 3 }}>{x}</text>)}
      {[0, 10, 20, 30, 40, 50].map(y => <text key={y} x="8" y={py(y) - 6} fill="#475569" fontSize="12" fontWeight="700" style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 3 }}>{y}</text>)}
      {capas.rutas.map(r => <polyline key={r.vehiculoId} points={r.puntos.map(p => `${px(p.x)},${py(p.y)}`).join(' ')} fill="none" stroke={COLOR[r.tipo].trazo} strokeWidth="2.5" opacity="0.75" />)}
    </svg>

    {capas.almacenes.map(a => {
      const pct = a.central || !a.capacidad ? null : Math.round((a.stock ?? 0) / a.capacidad * 100)
      return <div key={a.id} title={`${a.codigo} (${a.posicion.x},${a.posicion.y}) · ${pct == null ? 'stock ilimitado' : `${a.stock} de ${a.capacidad} unidades`}`} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: izquierda(a.posicion.x), top: arriba(a.posicion.y) }}>
        <div className={`flex size-8 items-center justify-center border-2 border-white shadow-md ring-1 ring-slate-300 ${a.central ? 'bg-blue-700' : 'bg-slate-700'} text-white`}><Warehouse className="size-4" /></div>
        <span className="mt-1 block whitespace-nowrap bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 shadow-sm">{a.codigo}{pct != null && <span className={`ml-1 ${STOCK(pct)}`}>· {pct}%</span>}</span>
      </div>
    })}

    {capas.pedidos.map(p => <div key={p.id} title={`${p.codigo} · ${p.cantidad} u. · destino (${p.posicion.x},${p.posicion.y}) · margen ${p.margenH.toFixed(1)} h${p.priorizado ? ' · priorizado' : ''}`} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: izquierda(p.posicion.x), top: arriba(p.posicion.y) }}>
      <div className={`size-3 rounded-full border-2 border-white shadow ${SEMAFORO[p.semaforo]}`} />
    </div>)}

    {capas.vehiculos.map(v => {
      const Icono = v.tipo === 'AUTO' ? Car : Bike
      return <div key={v.id} title={`${COLOR[v.tipo].nombre} ${v.codigo} · carga ${v.carga}/${v.capacidad}${v.disponible ? '' : ' · no disponible'} · (${v.posicion.x.toFixed(1)},${v.posicion.y.toFixed(1)})`} className={`absolute -translate-x-1/2 -translate-y-1/2 ${v.enRuta ? '' : 'opacity-60'}`} style={{ left: izquierda(v.posicion.x), top: arriba(v.posicion.y) }}>
        <div className={`flex size-6 items-center justify-center rounded-full ${v.disponible ? COLOR[v.tipo].fondo : 'bg-slate-500'} text-white shadow-md ring-2 ring-white`}><Icono className="size-3.5" /></div>
      </div>
    })}

    <div className="absolute bottom-9 right-4 flex max-w-[560px] flex-wrap items-center gap-x-4 gap-y-1 bg-white/95 px-3 py-2 text-[10px] font-semibold text-slate-700 shadow">
      <span className="w-full text-slate-500"><MapPin className="mr-1 inline size-3 text-blue-600" />Simulación en el servidor{fecha ? ` · ${fecha}` : ''} · {capas.vehiculos.filter(v => v.enRuta).length} unidades en ruta · {capas.pedidos.length} pedidos abiertos</span>
      <span className="flex items-center gap-1"><span className="inline-block size-3 border-2 border-white bg-blue-700 shadow" />Almacén</span>
      {(Object.keys(COLOR) as TipoVehiculo[]).map(t => <span key={t} className="flex items-center gap-1"><span className={`inline-block size-3 rounded-full ${COLOR[t].fondo}`} />{COLOR[t].nombre}</span>)}
      <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-5 bg-blue-600" />Ruta pendiente</span>
      <span className="flex items-center gap-1"><span className="inline-block size-3 rounded-full bg-emerald-600" /><span className="inline-block size-3 rounded-full bg-amber-500" /><span className="inline-block size-3 rounded-full bg-red-600" />Pedido según margen de plazo</span>
    </div>
  </div>
}
