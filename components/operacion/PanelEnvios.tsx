'use client'

import { useState } from 'react'
import type { InstantaneaOperacion, Pedido, UnidadesOperacion } from '../../lib/api/operacion'

export function entregasRecientes(pedidos: Pedido[]) {
  return pedidos.filter(p => p.estado === 'ENTREGADO' && p.entregadoEnH != null)
    .sort((a, b) => b.entregadoEnH! - a.entregadoEnH! || a.codigo.localeCompare(b.codigo) || a.id - b.id).slice(0, 10)
}
export function clasificarEnvios(mapa: InstantaneaOperacion | null) {
  const rutas = mapa?.aplicable ? mapa.plan?.rutas ?? [] : []
  const reloj = mapa?.relojH ?? 0
  const futuras = rutas.filter(r => r.horaInicioH > reloj).sort((a, b) => a.horaInicioH - b.horaInicioH || a.id - b.id)
  const enRuta = rutas.filter(r => r.horaInicioH <= reloj && r.horaFinH > reloj)
  const asignados = new Set(rutas.flatMap(r => r.paradas.map(p => p.pedidoId)))
  for (const servicio of mapa?.fisico?.servicios ?? []) if (!servicio.confirmada) asignados.add(servicio.pedidoId)
  return { futuras, enRuta, sinAsignar: mapa?.pedidos.filter(p => !asignados.has(p.id)) ?? [] }
}

export function PanelEnvios({ mapa, unidades, historial, estadoHistorial, estadoMapa, hora, onPedido, onUnidad }: {
  mapa: InstantaneaOperacion | null; unidades: UnidadesOperacion | null; historial: Pedido[] | null
  estadoHistorial: 'cargando' | 'actual' | 'desactualizado' | 'error'; estadoMapa: 'cargando' | 'actual' | 'desactualizado' | 'error'; hora: (h: number) => string
  onPedido: (codigo: string) => void; onUnidad: (id: number) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const { futuras, enRuta, sinAsignar } = clasificarEnvios(mapa)
  const codigoUnidad = (id: number) => unidades?.unidades.find(u => u.id === id)?.codigo ?? mapa?.fisico?.vehiculos.find(u => u.id === id)?.codigo ?? `Unidad ${id}`
  return <div className="absolute bottom-3 right-28 z-10 text-xs">
    {!abierto ? <button className="border border-slate-300 bg-white px-3 py-2 font-bold shadow" onClick={() => setAbierto(true)}>Ver envíos</button> :
      <section aria-label="Envíos" className="max-h-[65vh] w-80 max-w-[calc(100vw-8rem)] overflow-y-auto border border-slate-300 bg-white p-3 shadow-xl">
        <div className="flex items-center justify-between"><h2 className="text-sm font-bold">Envíos</h2><button className="border px-2 py-1" onClick={() => setAbierto(false)}>Cerrar</button></div>
        {estadoMapa === 'desactualizado' && <p role="status" className="mt-2 text-amber-800">Plan del último estado conocido; puede estar desactualizado.</p>}
        {estadoMapa === 'cargando' && !mapa && <p role="status">Cargando estado operativo…</p>}
        <h3 className="mt-3 font-bold">Próximas salidas</h3>
        {!mapa ? <p>Datos no disponibles.</p> : !mapa.aplicable || !mapa.plan ? <p>No hay un plan aplicable.</p> : futuras.length === 0 ? <p>No hay salidas programadas.</p> : <ul>{futuras.map(r => <li key={r.id} className="border-b py-1"><button className="text-blue-700 underline" onClick={() => onUnidad(r.vehiculoId)}>{codigoUnidad(r.vehiculoId)}</button> · salida {hora(r.horaInicioH)}<div>{r.paradas.map((p, i) => <button key={`${p.pedidoId}-${i}`} className="mr-2 text-blue-700 underline" onClick={() => onPedido(p.codigoPedido)}>{p.codigoPedido}</button>)}</div></li>)}</ul>}
        {mapa && mapa.aplicable && <p className="mt-2 text-slate-600">Viajes en ruta: {enRuta.length} · Servicios en curso: {(mapa.fisico?.servicios ?? []).filter(s => !s.confirmada).length} · Pedidos sin asignación: {sinAsignar.length}</p>}
        {mapa && mapa.aplicable && sinAsignar.length > 0 && <div>{sinAsignar.map(p => <button key={p.id} className="mr-2 text-blue-700 underline" onClick={() => onPedido(p.codigo)}>{p.codigo}</button>)}</div>}
        <h3 className="mt-3 font-bold">Entregas recientes</h3>
        {estadoHistorial === 'cargando' && <p>Consultando historial completo…</p>}
        {estadoHistorial === 'error' && <p role="alert">Historial no disponible.</p>}
        {estadoHistorial === 'desactualizado' && <p role="status" className="text-amber-800">Último historial conocido; la actualización falló.</p>}
        {historial && (entregasRecientes(historial).length ? <ul>{entregasRecientes(historial).map(p => <li key={p.id} className="border-b py-1"><button onClick={() => onPedido(p.codigo)} className="text-blue-700 underline">{p.codigo}</button> · {hora(p.entregadoEnH!)}</li>)}</ul> : <p>{estadoHistorial === 'actual' ? 'No hay entregas confirmadas.' : 'Sin entregas en el último historial.'}</p>)}
      </section>}
  </div>
}
