'use client'

import { useMemo, useState } from 'react'
import type { Incidencia, UnidadOperativa } from '../../lib/api/operacion'
import type { EstadoDetalle } from '../../lib/operacion/lectura'

type Orden = 'ocupacionPct' | 'salidaH' | 'llegadaH'
export function ordenarUnidades(unidades: UnidadOperativa[], campo: Orden, ascendente: boolean) {
  return [...unidades].sort((a, b) => {
    const x = a[campo], y = b[campo]
    if (x == null || y == null) return x == null && y == null ? a.codigo.localeCompare(b.codigo) : x == null ? 1 : -1
    return (x - y) * (ascendente ? 1 : -1) || a.codigo.localeCompare(b.codigo)
  })
}
export const ocupacion = (pct: number | null, capacidad: number) => pct == null || !Number.isFinite(pct) || capacidad <= 0
  ? 'no disponible' : pct < 50 ? 'verde' : pct < 80 ? 'ámbar' : 'rojo'
export function flotaOficial(unidades: UnidadOperativa[]) {
  const cantidad = (tipo: string) => unidades.filter(u => u.tipo === tipo).length
  return unidades.length === 37 && cantidad('AUTO') === 10 && cantidad('MOTO') === 15 && cantidad('BICICLETA') === 12
}
const colores = { verde: 'text-emerald-700', ámbar: 'text-amber-700', rojo: 'text-red-700', 'no disponible': 'text-slate-500' }

export function PanelFlota({ unidades, detalle, hora, seleccion, onSeleccion, incidencias, onPedido }: { unidades: UnidadOperativa[] | null; detalle: EstadoDetalle; hora: (h: number) => string; seleccion: number | null; onSeleccion: (id: number | null) => void; incidencias: Incidencia[]; onPedido: (codigo: string) => void }) {
  const [cerrado, setCerrado] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [campo, setCampo] = useState<Orden>('ocupacionPct')
  const [ascendente, setAscendente] = useState(true)
  const abierto = !cerrado || seleccion !== null
  const lista = useMemo(() => ordenarUnidades((unidades ?? []).filter(u => u.codigo.toLowerCase().includes(busqueda.trim().toLowerCase())), campo, ascendente), [unidades, busqueda, campo, ascendente])
  const ficha = unidades?.find(u => u.id === seleccion)
  const conteo = (tipo: string) => unidades?.filter(u => u.tipo === tipo).length ?? 0
  return <div className="absolute bottom-3 right-3 z-10 max-w-[calc(100%-1.5rem)] text-xs">
    {!abierto ? <button onClick={() => setCerrado(false)} className="border border-slate-300 bg-white px-3 py-2 font-bold shadow">Ver flota</button> :
      <section aria-label="Flota operativa" className="max-h-[70vh] w-96 max-w-full overflow-y-auto border border-slate-300 bg-white p-3 shadow-xl">
        <div className="flex items-center justify-between"><h2 className="text-sm font-bold">Flota operativa {unidades ? `(${unidades.length})` : ''}</h2><button onClick={() => { setCerrado(true); onSeleccion(null) }} aria-label="Cerrar flota" className="border px-2 py-1">Cerrar</button></div>
        {detalle !== 'actual' && <p role="status" className="mt-2 bg-amber-50 p-2 text-amber-800">{detalle === 'pendiente' ? 'Detalle pendiente de sincronización.' : 'Último detalle disponible; puede estar desactualizado.'}</p>}
        {unidades && <><p className="mt-2">Autos {conteo('AUTO')} · Motos {conteo('MOTO')} · Bicicletas {conteo('BICICLETA')}</p>
          <p className="mt-1 text-slate-500">{Object.entries(unidades.reduce<Record<string, number>>((totales, u) => { totales[u.estado] = (totales[u.estado] ?? 0) + 1; return totales }, {})).map(([estado, total]) => `${estado.replaceAll('_', ' ')}: ${total}`).join(' · ')}</p>
          {!flotaOficial(unidades) && <p className="mt-1 text-amber-800">La flota recibida difiere de la composición oficial de 37 unidades (10/15/12).</p>}
          <p className="mt-1 text-slate-500">Ocupación: verde &lt; 50 % · ámbar 50–&lt;80 % · rojo ≥ 80 %</p></>}
        <div className="mt-2 flex gap-1"><input aria-label="Buscar unidad por código" className="min-w-0 flex-1 border px-2 py-1" placeholder="Buscar código" value={busqueda} onChange={e => setBusqueda(e.target.value)} /><button className="border px-2" onClick={() => setBusqueda('')}>Limpiar</button></div>
        <div className="mt-2 flex gap-1"><label className="flex-1">Ordenar por <select className="border p-1" value={campo} onChange={e => setCampo(e.target.value as Orden)}><option value="ocupacionPct">Ocupación</option><option value="salidaH">Salida</option><option value="llegadaH">Llegada</option></select></label><button className="border px-2" onClick={() => setAscendente(!ascendente)}>{ascendente ? 'Ascendente' : 'Descendente'}</button></div>
        <p className="mt-2 text-slate-500">{unidades ? `${lista.length} coincidencias` : 'Flota no disponible'}</p>
        {unidades && lista.length === 0 && <p className="mt-2">No hay unidades que coincidan.</p>}
        <ul className="mt-2 max-h-44 overflow-y-auto">{lista.map(u => <li key={u.id}><button onClick={() => { setCerrado(false); onSeleccion(u.id) }} className={`flex w-full justify-between border-b px-2 py-2 text-left ${seleccion === u.id ? 'bg-blue-50' : ''}`}><span><b>{u.codigo}</b> · {u.tipo} · {u.estado.replaceAll('_', ' ')}</span><span className={colores[ocupacion(u.ocupacionPct, u.capacidad)]}>{u.capacidad > 0 ? `${u.ocupacionPct}%` : 'No disponible'}</span></button></li>)}</ul>
        {ficha && <div className="mt-3 border border-blue-200 bg-blue-50 p-3"><div className="flex justify-between"><b>{ficha.codigo} · {ficha.tipo}</b><button onClick={() => onSeleccion(null)}>Cerrar ficha</button></div>
          <p className="mt-1">Estado: {ficha.estado.replaceAll('_', ' ')}</p><p>Carga: {ficha.carga}/{ficha.capacidad} · <span className={colores[ocupacion(ficha.ocupacionPct, ficha.capacidad)]}>{ficha.capacidad > 0 ? `${ficha.ocupacionPct}%` : 'no disponible'} · {ocupacion(ficha.ocupacionPct, ficha.capacidad)}</span></p>
          <p>Origen: {ficha.origen?.codigo ?? 'Sin asignación'} · Destino: {ficha.destino?.codigo ?? 'Sin asignación'}</p>
          <p>Salida: {ficha.salidaH == null ? 'Sin asignación' : hora(ficha.salidaH)} · Retorno: {ficha.llegadaH == null ? 'Sin asignación' : hora(ficha.llegadaH)}</p>
          <p className="mt-1 font-bold">{ficha.estado === 'PROGRAMADA' ? 'Pedidos programados' : 'Pedidos asociados'}</p>
          {ficha.pedidos.length ? <ul>{ficha.pedidos.map((p, i) => <li key={`${p.id}-${i}`}><button onClick={() => onPedido(p.codigo)} className="text-left text-blue-700 underline">{p.codigo}</button> · {p.cantidad} u · ETA {p.etaH == null ? 'no disponible' : hora(p.etaH)}{p.enServicio ? ' · en servicio' : ''}</li>)}</ul> : <p>Sin pedidos asociados.</p>}
          {ficha.averia && <p>Avería tipo {ficha.averia.tipo ?? 'no informado'} · desde {hora(ficha.averia.desdeH)}{ficha.averia.hastaH == null ? '' : ` hasta ${hora(ficha.averia.hastaH)}`}</p>}
          {ficha.estado === 'EN_MANTENIMIENTO' && incidencias.filter(i => i.tipo === 'MANTENIMIENTO' && i.vehiculoId === ficha.id).map(i => <p key={i.id}>Mantenimiento · desde {hora(i.instanteH)}{i.finH == null ? '' : ` hasta ${hora(i.finH)}`}</p>)}
        </div>}
        {seleccion !== null && unidades && !ficha && <p className="mt-2 text-amber-800">La unidad seleccionada ya no está disponible.</p>}
      </section>}
  </div>
}
