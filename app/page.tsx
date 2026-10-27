'use client'

import { Fragment, type ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Bike, Motorbike, CalendarDays, Car, Check, ChevronDown, Clock, Gauge, Play, Upload, ChevronLeft, FileText, MapPin, Navigation, Package, PanelLeftOpen, Search, Settings2, Truck, Warehouse, Wrench, X } from 'lucide-react'
import { type EstadoPedido, type MapaDatos, type PedidoRastreo, type TipoVehiculo, type Pedido, type Tramo, type Umbrales, UMBRALES_PEDIDO, datosMapa, agruparPosiciones, direccionEn, consultarPedidos, semaforo, levantarIncidencia, listarSimulaciones, registrarAveria, registrarBloqueo, registrarPedido, tramosEntre } from '@/lib/api/operacion'
import { useOperacion } from '@/lib/operacion/useOperacion'
import { useMovimiento } from '@/lib/operacion/useMovimiento'
import { PanelFlota, ocupacion } from '@/components/operacion/PanelFlota'
import { PanelEnvios } from '@/components/operacion/PanelEnvios'
import { MapaOperativo } from '@/components/operacion/MapaOperativo'
import { UmbralesCtx } from '@/components/operacion/umbrales'
import { type Cobertura, type OperacionActual, type VistaSimulacion, consultarSimulacion, detenerSimulacion, iniciarCincoDias, iniciarColapso, mensajeError, operacionActual, operacionDesdeVista, pausarSimulacion, reanudarSimulacion, subirDatos, subirVentas, validarCobertura } from '@/lib/api/simulacion'

type Role = 'registrador' | 'operador' | 'visualizador'
type Scenario = 'day' | 'five' | 'collapse'
type OpMode = 'operacion' | 'simulacion'
type SimType = 'five' | 'collapse'
type ExecState = 'idle' | 'running' | 'incident' | 'complete' | 'collapse' | 'disconnected'
type Vehicle = 'Auto' | 'Moto' | 'Bicicleta'

const scenarioLabels: Record<Scenario, string> = { day: 'Operación día a día · tiempo real', five: 'Simulación de cinco días', collapse: 'Simulación hasta el colapso logístico' }
const simLabels: Record<SimType, string> = { five: 'Simulación de cinco días', collapse: 'Simulación hasta el colapso logístico' }
// Fechas del back-end: 'aaaa-mm-ddThh:mm[:ss]' sin zona; se muestran tal cual, sin convertir de huso
const fechaHora = (iso: string, segundos = false) => { const [f, h = ''] = iso.split('T'); const [a, m, d] = f.split('-'); return `${d}/${m}/${a} · ${h.slice(0, segundos ? 8 : 5)}` }
const cincoDiasDespues = (inicio: string) => { const [f, h] = inicio.split('T'); const [a, m, d] = f.split('-').map(Number); const fin = new Date(Date.UTC(a, m - 1, d + 5)); const p = (n: number) => String(n).padStart(2, '0'); return `${p(fin.getUTCDate())}/${p(fin.getUTCMonth() + 1)}/${fin.getUTCFullYear()} · ${(h ?? '').slice(0, 5)}` }
/** Horas decimales del reloj del back-end como «día N · hh:mm» (hora 0 = 00:00 del día 1). */
const horaSimulada = (h: number) => { const m = Math.round(h * 60); return `día ${Math.floor(m / 1440) + 1} · ${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }
/** Horas del escenario como fecha de calendario, a partir de la fecha base de la simulación. */
const fechaDesdeBase = (base: string, h: number) => { const [a, m, d] = base.split('-').map(Number); const t = new Date(Date.UTC(a, m - 1, d) + Math.round(h * 60) * 60000); const p = (n: number) => String(n).padStart(2, '0'); return `${p(t.getUTCDate())}/${p(t.getUTCMonth() + 1)}/${t.getUTCFullYear()} · ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}` }
const duracion = (seg: number) => { const s = Math.max(0, Math.floor(seg)); const p = (n: number) => String(n).padStart(2, '0'); return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}` }
/** Estimación del tiempo real ejecutado según el reloj del back-end (horas simuladas ÷ ritmo); solo sirve de punto de partida. */
const tiempoReal = (sim: VistaSimulacion) => sim.simulacion.factor > 0 ? (sim.simulacion.relojH - sim.simulacion.inicioH) * 3600 / sim.simulacion.factor : 0
const porcentaje = (parte: number, total: number) => total > 0 ? `${Math.round(parte / total * 100)}%` : '—'
const simViva = (sim: VistaSimulacion | null) => sim?.simulacion.estado === 'EJECUTANDO' || sim?.simulacion.estado === 'PAUSADA'

const stateLabels: Record<ExecState, string> = { idle: 'Lista · sin iniciar', running: 'En ejecución', incident: 'Incidencia activa', complete: 'Periodo completado', collapse: 'Colapso logístico', disconnected: 'Solo consulta · desconectado' }

function Header({ scenario, state, replanned, sim, segReal, escenario, dia }: { scenario: Scenario; state: ExecState; replanned: boolean; sim: VistaSimulacion | null; segReal: number; escenario?: { id: number; relojH: number; dia: boolean; fecha: string } | null; dia?: OperacionActual | null }) {
  const day = state === 'idle' && scenario !== 'day' ? (scenario === 'five' ? 'Sin iniciar · dura 5 días desde el inicio' : 'Sin iniciar · sin límite de periodo') : scenario === 'five' ? (state === 'complete' ? 'Día 5 de 5' : state === 'incident' ? 'Día 3 de 5' : 'Día 2 de 5') : scenario === 'day' ? (replanned && state === 'running' ? '08/09/2026 · 10:45 · plan actualizado' : '08/09/2026 · 08:35') : state === 'collapse' ? '11/09/2026 · 16:42' : 'Sin límite de periodo'
  const incidentView = state === 'incident'
  // La simulación en pausa se ve como tal en todos los dispositivos (el estado viene del back-end)
  const pausa = sim?.simulacion.estado === 'PAUSADA' || (!sim && escenario?.dia && dia?.estadoMotor === 'PAUSADA')
  const collapseView = scenario === 'collapse' && state === 'collapse'
  const fiveDayRunning = scenario === 'five' && state === 'running'
  const headerScenario = !sim && escenario ? (escenario.dia ? scenarioLabels.day : `Escenario ${escenario.id} del back-end`) : sim?.simulacion.tipo === 'COLAPSO' ? scenarioLabels.collapse : collapseView ? 'Simulación hasta el colapso logístico' : incidentView ? (scenario === 'day' ? 'Operación día a día · tiempo real' : 'Simulación de cinco días') : scenarioLabels[scenario]
  // Con una simulación del back-end, la fecha es la que está simulando el servidor (día, hora, minuto y segundo)
  const colapsoReal = sim?.simulacion.tipo === 'COLAPSO'
  const real = sim && scenario !== 'day' ? (colapsoReal ? `Día ${Math.floor((sim.simulacion.relojH - sim.simulacion.inicioH) / 24) + 1} · ${fechaHora(sim.fechaSimulada, true)}` : `Día ${Math.min(5, Math.floor(sim.progreso * 5) + 1)} de 5 · ${fechaHora(sim.fechaSimulada, true)}`) : null
  const headerDate = real ?? (!sim && escenario ? (escenario.dia ? escenario.fecha : `Hora simulada ${horaSimulada(escenario.relojH)}`) : null) ?? (scenario === 'day' ? 'Esperando datos de la operación' : day)
  return <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-2"><div className="flex items-center gap-4"><div className="flex size-9 items-center justify-center bg-blue-700 text-white"><Navigation className="size-5" /></div><div><p className="text-lg font-bold">PaqRap</p><p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Centro de control</p></div><div className="hidden h-8 w-px bg-slate-200 md:block" /><div className="hidden md:block"><p className="text-sm font-bold">{headerScenario}</p><p className="text-xs text-slate-500">{headerDate}</p>{collapseView && !sim && <p className="text-xs font-semibold text-slate-500">Duración total 00:37:26</p>}{incidentView && <p className="text-xs font-semibold text-slate-500">Tiempo transcurrido 00:32:10</p>}{fiveDayRunning && !real && <p className="text-xs font-semibold text-slate-500">Tiempo transcurrido {replanned ? '00:34:50' : '00:18:42'}</p>}{real && sim && <p className="text-xs font-semibold text-slate-700">Tiempo real transcurrido {duracion(segReal)}</p>}{real && sim && <p className="text-xs font-semibold text-slate-500">{colapsoReal ? `Sin fecha de fin · ${sim.simulacion.pedidosIncorporados} pedidos ingresados` : `Avance ${Math.round(sim.progreso * 100)}% · ${sim.simulacion.pedidosIncorporados} de ${sim.simulacion.pedidosProgramados} pedidos ingresados`}</p>}</div></div><p className="flex items-center gap-2 text-[11px] text-slate-500"><span className="font-semibold uppercase tracking-wider">Estado</span><span role="status" className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-bold ${pausa ? 'bg-amber-100 text-amber-800' : state === 'incident' || state === 'collapse' ? 'bg-red-100 text-red-700' : state === 'disconnected' ? 'bg-amber-100 text-amber-800' : state === 'complete' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'}`}><span className={`size-1.5 rounded-full bg-current ${state === 'running' && !pausa ? 'animate-pulse' : ''}`} />{pausa ? 'En pausa' : !sim && escenario?.dia && dia?.estadoMotor && dia.estadoMotor !== 'EJECUTANDO' ? `Motor: ${dia.estadoMotor}` : stateLabels[state]}</span></p></header>
}

// Un solo estilo de pestaña para toda la aplicación: las principales (Nav) y las de escenario del operador
const TAB_BAR = 'flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 pt-1'
const TAB = 'flex items-center gap-1.5 border-b-2 px-2.5 py-2 text-xs font-bold sm:gap-2 sm:px-4'
const TAB_ON = 'border-blue-600 bg-white text-blue-700'
const TAB_OFF = 'border-transparent text-slate-500 hover:text-slate-800'

function Nav({ role, setRole }: { role: Role; setRole: (r: Role) => void }) { return <nav className={`${TAB_BAR} px-2 sm:px-5`}>{[['registrador', 'Registrar pedidos', FileText], ['operador', 'Operar sistema', Settings2], ['visualizador', 'Solo consulta', MapPin]].map(([id, label, Icon]) => <button key={id as string} onClick={() => setRole(id as Role)} className={`${TAB} ${role === id ? TAB_ON : TAB_OFF}`}><Icon className="hidden size-4 sm:block" />{label as string}</button>)}</nav> }

// La cola y la confirmación proceden del servidor.
function Registrar({ escenarioId, disponible, rastreo, hora, onRegistrado, historialDesactualizado }: { escenarioId: number | null; disponible: boolean; rastreo: PedidoRastreo[] | null; hora: (h: number) => string; onRegistrado: () => void; historialDesactualizado: boolean }) {
  const vacio = { customer: '', x: '', y: '', units: '', delivery: 'Regular' as 'Regular' | 'Priorizada', hours: '36' }
  const [form, setForm] = useState(vacio)
  const [message, setMessage] = useState<{ ok: boolean; texto: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const real = escenarioId != null && disponible
  const [propios, setPropios] = useState<Pedido[] | null>(null)
  const [errorPropios, setErrorPropios] = useState('')
  const [recarga, setRecarga] = useState(0)
  useEffect(() => {
    setPropios(null); setErrorPropios('')
    if (escenarioId == null || rastreo) return
    let activo = true
    const abort = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    const cargar = async () => {
      try { const ps = await consultarPedidos(escenarioId, abort.signal); if (activo) { setPropios(ps); setErrorPropios('') } }
      catch (e) { if (activo) setErrorPropios(mensajeError(e)) }
      if (activo) timer = setTimeout(cargar, 10000)
    }
    void cargar()
    return () => { activo = false; abort.abort(); clearTimeout(timer) }
  }, [escenarioId, rastreo == null, recarga])
  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value, ...(key === 'delivery' ? { hours: value === 'Regular' ? '36' : f.hours === '36' ? '4' : f.hours } : {}) }))
  const error = (texto: string) => setMessage({ ok: false, texto })
  const submit = async () => {
    if (!form.customer.trim() || !form.x || !form.y || !form.units) return error('Completa cliente, coordenadas y unidades.')
    const x = Number(form.x), y = Number(form.y), u = Number(form.units)
    if (!Number.isInteger(x) || x < 0 || x > 70) return error('X debe ser un número entero entre 0 y 70 km.')
    if (!Number.isInteger(y) || y < 0 || y > 50) return error('Y debe ser un número entero entre 0 y 50 km.')
    if (!Number.isInteger(u) || u <= 0) return error('Las unidades deben ser un número entero mayor que 0.')
    if (form.delivery === 'Priorizada' && !['4', '8', '12', '18'].includes(form.hours)) return error('Un pedido priorizado tiene plazo de 4, 8, 12 o 18 h.')
    if (!real) return error('No hay una operación disponible. Reintenta la conexión antes de registrar.')
    setEnviando(true); setMessage(null)
    try {
      const p = await registrarPedido(escenarioId!, { cliente: form.customer, x, y, cantidad: u, tipo: form.delivery === 'Regular' ? 'REGULAR' : 'PRIORIZADO', plazoHoras: Number(form.hours) })
      setForm(vacio); setMessage({ ok: true, texto: `Pedido ${p.codigo} registrado · ingreso ${hora(p.horaIngresoH)} · fecha límite ${hora(p.fechaLimiteH)}. Entra en el siguiente plan.` })
      onRegistrado(); setRecarga(n => n + 1)
    } catch (e) { error(mensajeError(e)) } finally { setEnviando(false) }
  }
  const label = 'flex flex-col gap-2 text-xs font-semibold text-slate-600'
  const input = 'border border-slate-200 px-3 py-2.5 text-sm font-normal'
  // Cola: pedidos reales del escenario (los más recientes primero) o los de ejemplo del prototipo
  const fuente = rastreo ?? propios?.map(q => ({ id: q.id, codigo: q.codigo, x: q.posX, y: q.posY, cantidad: q.cantidad, tipo: q.tipo, horaIngresoH: q.horaIngresoH, fechaLimiteH: q.fechaLimiteH, estado: q.estado })) ?? null
  const cola = fuente ? [...fuente].sort((a, b) => b.horaIngresoH - a.horaIngresoH) : null
  return <div className="flex flex-col gap-5">
    <section className="border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Registrador de pedidos</p>
      <h2 className="mt-1 text-lg font-bold">Registro de operación día a día</h2>
      <p className="mt-1 text-xs text-slate-500">La fecha y hora de ingreso se asignan automáticamente al confirmar.</p>
      {!real && <p className="mt-3 border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Operación no disponible. No se pueden registrar pedidos hasta recuperar la conexión.</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className={label}>Cliente<input value={form.customer} onChange={e => update('customer', e.target.value)} className={input} placeholder="Nombre completo" /></label>
        <label className={label}>Coordenada X<input type="number" value={form.x} onChange={e => update('x', e.target.value)} className={input} placeholder="0–70 km" /></label>
        <label className={label}>Coordenada Y<input type="number" value={form.y} onChange={e => update('y', e.target.value)} className={input} placeholder="0–50 km" /></label>
        <label className={label}>Unidades de producto P<input type="number" value={form.units} onChange={e => update('units', e.target.value)} className={input} /></label>
        <label className={label}>Tipo de entrega<select value={form.delivery} onChange={e => update('delivery', e.target.value)} className="border border-slate-200 px-3 py-2.5 text-sm"><option>Regular</option><option>Priorizada</option></select></label>
        {form.delivery === 'Priorizada'
          ? <label className={label}>Plazo<select value={form.hours} onChange={e => update('hours', e.target.value)} className="border border-slate-200 px-3 py-2.5 text-sm"><option value="4">4 horas</option><option value="8">8 horas</option><option value="12">12 horas</option><option value="18">18 horas</option></select></label>
          : <div className="flex flex-col justify-end gap-2 text-xs font-semibold text-slate-600"><span>Plazo automático</span><div className="border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm">36 horas</div></div>}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button onClick={submit} disabled={enviando || !real} className={`px-5 py-2.5 text-sm font-bold text-white ${enviando || !real ? 'cursor-not-allowed bg-slate-400' : 'bg-blue-700'}`}>{enviando ? 'Registrando…' : 'Registrar pedido'}</button>
        {message && <span role={message.ok ? 'status' : 'alert'} className={`text-xs font-semibold ${message.ok ? 'text-emerald-700' : 'text-red-700'}`}>{message.texto}</span>}
      </div>
    </section>
    <section className="border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pedidos registrados</p><h2 className="mt-1 text-lg font-bold">Cola de pedidos {cola ? `(${cola.length})` : ''}</h2></div><Package className="size-5 text-slate-400" /></div>
      <div className="mt-4 max-h-[480px] overflow-auto">
        {historialDesactualizado && rastreo && <p role="status" className="mb-2 text-xs text-amber-800">Último historial conocido; no se pudo actualizar.</p>}
        {errorPropios && !rastreo && <p role="status" className="mb-2 text-xs text-amber-800">{propios ? 'Últimos pedidos conocidos; actualización fallida.' : 'Historial no disponible.'} {errorPropios}</p>}
        {cola
          ? <table className="w-full min-w-[900px] text-left text-xs"><thead className="sticky top-0 border-y border-slate-200 bg-white text-[10px] uppercase tracking-wider text-slate-400"><tr>{['Código', 'Destino', 'Unidades', 'Entrega', 'Ingreso', 'Fecha/hora límite', 'Estado'].map(h => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead>
              <tbody>{cola.map(o => <tr key={o.id} className="border-b border-slate-100"><td className="px-3 py-3 font-bold">{o.codigo}</td><td className="px-3 py-3">({o.x}, {o.y}) km</td><td className="px-3 py-3">{o.cantidad}</td><td className="px-3 py-3">{o.tipo === 'PRIORIZADO' ? 'Priorizada' : 'Regular'} · {Math.round(o.fechaLimiteH - o.horaIngresoH)} h</td><td className="px-3 py-3 text-slate-500">{hora(o.horaIngresoH)}</td><td className="px-3 py-3 text-slate-500">{hora(o.fechaLimiteH)}</td><td className="px-3 py-3">{ETIQUETA_ESTADO[o.estado]}</td></tr>)}</tbody></table>
          : <p className="text-xs text-slate-500">{real ? 'Cargando pedidos…' : 'Pedidos no disponibles.'}</p>}
      </div>
    </section>
  </div>
}

const COLOR_TIPO: Record<TipoVehiculo, string> = { AUTO: '#2563eb', MOTO: '#7c3aed', BICICLETA: '#0f9f8d' }
const CLASE_TIPO: Record<TipoVehiculo, string> = { AUTO: 'bg-blue-600', MOTO: 'bg-violet-600', BICICLETA: 'bg-teal-600' }
const ETIQUETA_TIPO: Record<TipoVehiculo, string> = { AUTO: 'Auto', MOTO: 'Moto', BICICLETA: 'Bicicleta' }
const CLASE_SEMAFORO = { verde: 'bg-emerald-600', ambar: 'bg-amber-500', rojo: 'bg-red-600' } as const
// Nombres que usa el panel del operador para cada almacén del back-end
const NOMBRE_ALMACEN: Record<string, string> = { 'ALM-CENTRAL': 'Almacén central', 'ALM-NOROESTE': 'Nor-Oeste', 'ALM-ESTE': 'Intermedio Este' }

// Semáforo de stock de los almacenes intermedios (% disponible); los mismos valores por defecto del panel de parámetros
const UMBRAL_STOCK = { verde: 50, rojo: 20 }
const tonoStock = (pct: number, u: Umbrales) => pct >= u.verde ? 'verde' : pct < u.rojo ? 'rojo' : 'ambar'
// Umbrales vigentes de los dos semáforos: los fija el operador en «Parámetros operativos» y los usan mapa, leyenda y fichas

const TEXTO_SEMAFORO = { verde: 'text-emerald-700', ambar: 'text-amber-700', rojo: 'text-red-700' } as const
const ETIQUETA_ESTADO: Record<EstadoPedido, string> = { PENDIENTE: 'Pendiente de asignar', ASIGNADO: 'Asignado a una ruta', EN_RUTA: 'En ruta', ENTREGADO: 'Entregado', NO_ENTREGADO: 'No entregado' }

// Buscador de pedidos por código (CU de consulta): resalta el pedido en el mapa y muestra su ficha
function BuscarPedido({ rastreo, buscado, setBuscado, hora, onUnidad }: { rastreo: PedidoRastreo[]; buscado: string | null; setBuscado: (c: string | null) => void; hora: (h: number) => string; onUnidad: (id: number) => void }) {
  const [texto, setTexto] = useState('')
  const [lista, setLista] = useState(false)
  const q = texto.trim().toLowerCase()
  const coincidencias = q ? rastreo.filter(x => x.codigo.toLowerCase().includes(q)).slice(0, 8) : []
  const ficha = buscado ? rastreo.find(x => x.codigo === buscado) ?? null : null
  const elegir = (codigo: string) => { setBuscado(codigo); setTexto(codigo); setLista(false) }
  const limpiar = () => { setTexto(''); setBuscado(null); setLista(false) }
  return <div className="relative w-80 max-w-full text-xs">
    <form role="search" onSubmit={e => { e.preventDefault(); const c = rastreo.find(x => x.codigo.toLowerCase() === q) ?? coincidencias[0]; if (c) elegir(c.codigo) }} className="flex items-center border border-slate-300 bg-white shadow focus-within:border-blue-600">
      <Search className="ml-2.5 size-4 shrink-0 text-slate-400" />
      <input value={texto} onChange={e => { setTexto(e.target.value); setLista(true) }} onFocus={() => setLista(true)} onKeyDown={e => { if (e.key === 'Escape') setLista(false) }} placeholder="Buscar pedido por código" aria-label="Buscar pedido por código" className="min-w-0 flex-1 px-2 py-2 outline-none" />
      {(texto || buscado) && <button type="button" onClick={limpiar} aria-label="Limpiar búsqueda" title="Limpiar búsqueda" className="px-2 text-slate-400 hover:text-slate-700"><X className="size-4" /></button>}
    </form>
    {lista && q && ficha?.codigo !== texto && <ul role="listbox" className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto border border-slate-200 bg-white shadow-lg">
      {coincidencias.length === 0 ? <li className="px-3 py-2 text-slate-500">No hay pedidos con «{texto.trim()}».</li> : coincidencias.map(c => <li key={c.id}><button type="button" onClick={() => elegir(c.codigo)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-blue-50"><b>{c.codigo}</b><span className="text-slate-500">{ETIQUETA_ESTADO[c.estado]}</span></button></li>)}
    </ul>}
    {ficha && <FichaPedido p={ficha} hora={hora} onCerrar={limpiar} onUnidad={onUnidad} />}
    {buscado && !ficha && <p className="mt-1 border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">El pedido {buscado} ya no está en el escenario.</p>}
  </div>
}

function FichaPedido({ p, hora, onCerrar, onUnidad }: { p: PedidoRastreo; hora: (h: number) => string; onCerrar: () => void; onUnidad: (id: number) => void }) {
  const u = useContext(UmbralesCtx)
  const cerrado = p.estado === 'ENTREGADO' || p.estado === 'NO_ENTREGADO'
  const plazo = Math.round(p.fechaLimiteH - p.horaIngresoH)
  const tono = p.estado === 'NO_ENTREGADO' ? 'border-red-200 bg-red-50 text-red-700' : p.estado === 'ENTREGADO' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-200 bg-blue-50 text-blue-700'
  const filas: [string, ReactNode][] = [
    ['Destino', `(${p.x}, ${p.y}) km · ${p.cantidad} u`],
    ['Tipo', `${p.tipo === 'PRIORIZADO' ? 'Priorizado' : 'Regular'} · plazo ${plazo} h`],
    ['Ingreso', hora(p.horaIngresoH)],
    ['Fecha límite', hora(p.fechaLimiteH)],
    ['Rutas y unidades', p.asociaciones.length ? <span key="asociaciones" className="flex flex-col gap-1">{p.asociaciones.map((a, i) => <button key={`${a.rutaId}-${i}`} onClick={() => onUnidad(a.vehiculoId)} className="text-left text-blue-700 underline">{a.rutaId == null ? 'Servicio en curso' : `Ruta ${a.rutaId}`} · {a.vehiculoCodigo ?? 'Unidad no disponible'} · {a.cantidad == null ? 'cantidad no disponible' : `${a.cantidad} u`} · ETA {hora(a.etaH)}{a.entregado ? ' · entregado' : a.enServicio ? ' · en servicio' : ''}</button>)}</span> : cerrado ? 'Sin ruta vigente' : 'Sin asignación'],
    cerrado
      ? ['Entrega', p.entregadoEnH != null ? `${hora(p.entregadoEnH)} · ${p.entregadoEnH <= p.fechaLimiteH ? 'a tiempo' : 'fuera de plazo'}` : 'Sin entregar']
      : ['Llegada estimada', p.etaH != null ? hora(p.etaH) : 'Sin ruta asignada'],
  ]
  const luz = cerrado ? null : semaforo(p.margenH, u.pedido)
  if (!cerrado && p.margenH != null) filas.push(['Margen', <span key="m" className={luz ? TEXTO_SEMAFORO[luz] : ''}>{p.margenH.toFixed(1)} h{luz ? ` · ${luz === 'verde' ? 'holgado' : luz === 'ambar' ? 'justo' : 'crítico'}` : ''}</span>])
  return <div className="mt-1 border border-slate-200 bg-white p-3 shadow-lg">
    <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ficha del pedido</p><p className="text-sm font-bold">{p.codigo}</p></div><span className={`border px-2 py-0.5 font-bold ${tono}`}>{ETIQUETA_ESTADO[p.estado]}</span></div>
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">{filas.map(([a, b]) => <Fragment key={a}><dt className="text-slate-500">{a}</dt><dd className="font-semibold">{b}</dd></Fragment>)}</dl>
    <button onClick={onCerrar} className="mt-2 border border-slate-300 bg-white px-2.5 py-1 font-bold text-slate-600">Quitar búsqueda</button>
  </div>
}

// Incidencias (averías y bloqueos) en un solo lugar, el mismo en la operación día a día y en las simulaciones.
// Con un escenario del back-end se registran en él al reloj actual y el planificador replanifica; sin back-end,
// la avería recorre la escena de demostración del prototipo.
function Incidencias({ mapa, escenarioId, hora, instanteDemo, onDemo, onCambio, onCerrar }: { mapa: MapaDatos | null; escenarioId: number | null; hora: (h: number) => string; instanteDemo: string; onDemo: () => void; onCambio: () => void; onCerrar: () => void }) {
  const [tab, setTab] = useState<'averia' | 'bloqueo'>('averia')
  const [unidad, setUnidad] = useState('')
  const [tipo, setTipo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [bloqueo, setBloqueo] = useState({ x1: '', y1: '', x2: '', y2: '', horas: '2', motivo: '' })
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const real = escenarioId != null && mapa != null
  const vigentes = mapa?.incidencias ?? []
  const codigoDe = (id: number | null) => mapa?.flota.find(v => v.id === id)?.codigo ?? `V-${id}`
  // Primero las unidades en ruta, que son las que suelen averiarse en plena operación
  const enMantenimiento = new Set(vigentes.filter(i => i.tipo === 'MANTENIMIENTO').map(i => i.vehiculoId))
  const unidades = real ? mapa.flota.filter(v => !v.averiada && !enMantenimiento.has(v.id)).sort((a, b) => Number(b.enRuta) - Number(a.enRuta) || a.codigo.localeCompare(b.codigo)) : []
  const TIPOS = ['1', '2', '3']
  const ejecutar = async (accion: () => Promise<unknown>, ok: string) => {
    setBusy(true); setMsg(null)
    try { await accion(); setMsg({ ok: true, texto: ok }); onCambio(); return true } catch (e) { setMsg({ ok: false, texto: mensajeError(e) }); return false } finally { setBusy(false) }
  }
  const confirmarAveria = () => {
    if (!unidad) return setMsg({ ok: false, texto: 'Selecciona la unidad averiada.' })
    if (!tipo) return setMsg({ ok: false, texto: 'Selecciona el tipo de avería 1, 2 o 3.' })
    if (!real) return setMsg({ ok: false, texto: 'La operación no está disponible.' })
    const v = Number(unidad)
    if (!unidades.some(u => u.id === v)) return setMsg({ ok: false, texto: 'La unidad ya no está disponible para registrar una avería. Selecciona otra.' })
    ejecutar(() => registrarAveria(escenarioId, v, Number(tipo) as 1 | 2 | 3, descripcion.trim()), `Avería de ${codigoDe(v)} registrada.`).then(ok => { if (ok) { setUnidad(''); setTipo(''); setDescripcion('') } })
  }
  const confirmarBloqueo = () => {
    const [x1, y1, x2, y2, horas] = [bloqueo.x1, bloqueo.y1, bloqueo.x2, bloqueo.y2, bloqueo.horas].map(Number)
    if ([bloqueo.x1, bloqueo.y1, bloqueo.x2, bloqueo.y2].some(v => v === '')) return setMsg({ ok: false, texto: 'Indica los dos extremos del tramo bloqueado.' })
    if (![x1, x2].every(v => Number.isInteger(v) && v >= 0 && v <= 70) || ![y1, y2].every(v => Number.isInteger(v) && v >= 0 && v <= 50)) return setMsg({ ok: false, texto: 'Los extremos son nodos enteros: X entre 0 y 70, Y entre 0 y 50.' })
    if (!Number.isFinite(horas) || horas <= 0 || horas > 120) return setMsg({ ok: false, texto: 'La duración debe estar entre 1 y 120 horas.' })
    let tramos: Tramo[]
    try { tramos = tramosEntre(x1, y1, x2, y2) } catch (e) { return setMsg({ ok: false, texto: mensajeError(e) }) }
    ejecutar(() => registrarBloqueo(escenarioId!, tramos, horas, bloqueo.motivo.trim() || `Bloqueo (${x1},${y1})–(${x2},${y2})`), `Bloqueo de ${tramos.length} km registrado por ${horas} h.`).then(ok => { if (ok) setBloqueo({ x1: '', y1: '', x2: '', y2: '', horas: '2', motivo: '' }) })
  }
  const field = 'mt-1 w-full border border-slate-200 px-2.5 py-2 font-normal'
  const pestaña = (id: 'averia' | 'bloqueo', texto: string) => <button onClick={() => { setTab(id); setMsg(null) }} className={`border-b-2 px-3 py-2 font-bold ${tab === id ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500'}`}>{texto}</button>
  return <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/30 p-4" onClick={onCerrar}>
    <div className="max-h-full w-full max-w-lg overflow-y-auto border border-slate-200 bg-white p-5 text-xs shadow-xl" onClick={e => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-2"><div><h3 className="text-lg font-bold">Incidencias</h3><p className="mt-0.5 text-slate-500">Instante registrado por el sistema (no editable): <b>{real ? `${hora(mapa.relojH)} · reloj actual` : 'No disponible'}</b></p></div><button onClick={onCerrar} aria-label="Cerrar"><X className="size-4" /></button></div>
      <div className="mt-3 flex border-b border-slate-200">{pestaña('averia', 'Registrar avería')}{pestaña('bloqueo', 'Registrar bloqueo')}</div>

      {tab === 'averia' && <div className="mt-3">
        <label className="flex flex-col font-semibold">Unidad averiada<select value={unidad} onChange={e => setUnidad(e.target.value)} className={field}><option value="">Seleccionar unidad…</option>
          {real && unidades.map(v => <option key={v.id} value={v.id}>{v.codigo} · {ETIQUETA_TIPO[v.tipo]} · {v.enRuta ? 'en ruta' : 'en base'}</option>)}
        </select></label>
        <label className="mt-3 flex flex-col font-semibold">Tipo de avería<select value={tipo} onChange={e => setTipo(e.target.value)} className={field}><option value="">Seleccionar tipo…</option>{TIPOS.map(t => <option value={t} key={t}>Tipo {t}</option>)}</select></label>
        <label className="mt-3 flex flex-col font-semibold">Descripción (opcional)<input maxLength={200} value={descripcion} onChange={e => setDescripcion(e.target.value)} className={field} /></label>
        {real && <p className="mt-2 text-slate-500">El servidor determina la duración y el tratamiento de la avería.</p>}
        <button disabled={busy || !real} onClick={confirmarAveria} className="mt-4 bg-red-700 px-4 py-2 font-bold text-white disabled:bg-slate-400">{busy ? 'Registrando…' : 'Confirmar avería'}</button>
      </div>}

      {tab === 'bloqueo' && <div className="mt-3">
        {!real ? <p className="border border-amber-200 bg-amber-50 px-3 py-2 font-semibold text-amber-800">Para registrar un bloqueo hace falta una operación o simulación en curso en el servidor.</p> : <>
          <p className="text-slate-500">El bloqueo corta una calle entre dos nodos de la cuadrícula: ambos extremos deben tener la misma X (calle vertical) o la misma Y (calle horizontal).</p>
          <div className="mt-2 grid grid-cols-4 gap-2">{([['x1', 'Desde X'], ['y1', 'Desde Y'], ['x2', 'Hasta X'], ['y2', 'Hasta Y']] as const).map(([k, t]) => <label key={k} className="font-semibold">{t}<input type="number" value={bloqueo[k]} onChange={e => setBloqueo({ ...bloqueo, [k]: e.target.value })} className={field} /></label>)}</div>
          <div className="mt-2 grid grid-cols-[1fr_2fr] gap-2"><label className="font-semibold">Duración (h)<input type="number" value={bloqueo.horas} onChange={e => setBloqueo({ ...bloqueo, horas: e.target.value })} className={field} /></label><label className="font-semibold">Motivo (opcional)<input value={bloqueo.motivo} onChange={e => setBloqueo({ ...bloqueo, motivo: e.target.value })} className={field} placeholder="Obras, accidente…" /></label></div>
          <button disabled={busy} onClick={confirmarBloqueo} className="mt-4 bg-red-700 px-4 py-2 font-bold text-white disabled:bg-slate-400">{busy ? 'Registrando…' : 'Confirmar bloqueo'}</button>
        </>}
      </div>}

      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`mt-3 font-semibold ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{msg.texto}</p>}

      {real && <div className="mt-5 border-t border-slate-200 pt-3">
        <p className="font-bold text-slate-700">Incidencias vigentes ({vigentes.length})</p>
        {vigentes.length === 0 ? <p className="mt-1 text-slate-500">No hay incidencias activas en este momento.</p> : <ul className="mt-2 flex flex-col gap-1.5">{vigentes.map(i => <li key={i.id} className="flex items-center justify-between gap-2 border border-slate-200 px-2.5 py-1.5">
          <span>{i.tipo === 'AVERIA' ? <><Wrench className="mr-1 inline size-3.5 text-red-700" /><b>Avería</b> · {codigoDe(i.vehiculoId)}</> : i.tipo === 'MANTENIMIENTO' ? <><Wrench className="mr-1 inline size-3.5" /><b>Mantenimiento</b> · {codigoDe(i.vehiculoId)}</> : <><AlertTriangle className="mr-1 inline size-3.5 text-red-700" /><b>Bloqueo</b> · {i.tramos.length} km</>} · desde {hora(i.instanteH)}{i.finH != null ? ` hasta ${hora(i.finH)}` : ''}{i.descripcion ? <span className="block text-slate-500">{i.descripcion}</span> : null}</span>
          {i.tipo !== 'MANTENIMIENTO' && <button disabled={busy} onClick={() => ejecutar(() => levantarIncidencia(escenarioId, i.id), 'Incidencia levantada.')} className="shrink-0 border border-slate-300 px-2 py-1 font-bold text-slate-700">{i.tipo === 'AVERIA' ? 'Unidad reparada' : 'Levantar'}</button>}
        </li>)}</ul>}
      </div>}
    </div>
  </div>
}

// Pestañas de escenario del operador: mismo aspecto que las pestañas principales (Nav). Mientras corre o se revisa
// una simulación, las otras pestañas quedan bloqueadas: para salir está «Detener y volver» o «Cerrar simulación».
function EscenarioTabs({ scenario, bloqueadas, onCambiar }: { scenario: Scenario; bloqueadas: boolean; onCambiar: (s: Scenario) => void }) {
  const tabs: [Scenario, string, typeof Clock][] = [['day', 'Día a día', Clock], ['five', 'Cinco días', CalendarDays], ['collapse', 'Hasta el colapso', Gauge]]
  return <div role="tablist" aria-label="Escenario" className={`${TAB_BAR} px-1 sm:px-2`}>
    {tabs.map(([id, label, Icon]) => {
      const activa = scenario === id, off = bloqueadas && !activa
      return <button key={id} role="tab" aria-selected={activa} disabled={off} title={off ? 'Detén o cierra la simulación para cambiar de escenario' : undefined} onClick={() => !activa && onCambiar(id)} className={`${TAB} ${activa ? TAB_ON : TAB_OFF} ${off ? 'cursor-not-allowed opacity-40' : ''}`}><Icon className="size-4" />{label}</button>
    })}
  </div>
}

// Contenido de la pestaña elegida: el día a día no se inicia (siempre está activo); cada simulación se configura e inicia
function ScenarioSelect({ scenario, onStart }: { scenario: Scenario; onStart: (tipo: SimType, start: string) => Promise<void> }) {
  const [start, setStart] = useState('2026-09-08T08:00')
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')
  const [coverage, setCoverage] = useState<Cobertura | null>(null)
  const [coverageError, setCoverageError] = useState('')
  const [subida, setSubida] = useState<{ ok: boolean; texto: string } | null>(null)
  const [subidas, setSubidas] = useState(0)
  // LE072: cargar un archivo mensual de ventas al servidor; luego se vuelve a validar la cobertura
  const subir = async (archivo: File | undefined) => {
    if (!archivo) return
    setSubida({ ok: true, texto: `Subiendo ${archivo.name}…` })
    try { const r = await subirVentas(archivo); setSubida({ ok: true, texto: `${archivo.name} guardado como ${r.guardadoComo}: ${r.pedidos} pedidos${r.lineasInvalidas > 0 ? ` · ${r.lineasInvalidas} líneas inválidas ignoradas` : ''}.` }); setSubidas(n => n + 1) }
    catch (e) { setSubida({ ok: false, texto: mensajeError(e) }) }
  }
  // Bloqueos planificados del curso: el .zip completo (bloqueo.AAMM.txt por mes) o un archivo suelto.
  // Son opcionales; sin ellos la simulación corre sin bloqueos planificados
  const subirB = async (archivo: File | undefined) => {
    if (!archivo) return
    setSubida({ ok: true, texto: `Subiendo ${archivo.name}…` })
    try {
      const r = await subirDatos(archivo)
      const b = r.archivos.filter(a => a.tipo === 'BLOQUEOS')
      const bloqueos = b.reduce((n, a) => n + a.leidos, 0), invalidos = b.reduce((n, a) => n + a.invalidos, 0)
      const otros = r.archivos.length - b.length
      setSubida({ ok: b.length > 0, texto: b.length === 0 ? `${archivo.name} no trae archivos de bloqueos (bloqueo.AAMM.txt).`
        : `${archivo.name}: ${b.length === 1 ? b[0].nombre : `${b.length} archivos`} · ${bloqueos.toLocaleString('es-PE')} bloqueos cargados${invalidos > 0 ? ` · ${invalidos} líneas inválidas ignoradas` : ''}${otros > 0 ? ` · ${otros} archivos de otros datos` : ''}${r.omitidos.length > 0 ? ` · omitidos: ${r.omitidos.join(', ')}` : ''}.` })
      setSubidas(n => n + 1)
    }
    catch (e) { setSubida({ ok: false, texto: mensajeError(e) }) }
  }
  // CU-02: al elegir la fecha se consulta si los archivos de ventas cubren los cinco días
  useEffect(() => {
    if (scenario === 'day' || !start) return
    let vigente = true
    const t = setTimeout(() => {
      validarCobertura(start)
        .then(c => { if (vigente) { setCoverage(c); setCoverageError('') } })
        .catch(e => { if (vigente) { setCoverage(null); setCoverageError(mensajeError(e)) } })
    }, 400)
    return () => { vigente = false; clearTimeout(t) }
  }, [scenario, start, subidas])
  const start5 = async () => {
    setStarting(true); setStartError('')
    try { await onStart(scenario as SimType, start) } catch (e) { setStartError(mensajeError(e)) } finally { setStarting(false) }
  }
  // Cinco días exige datos para todo el periodo; el colapso arranca con lo que haya y termina cuando se acaban
  const fiveBlocked = !start || starting || (scenario === 'five' && coverage !== null && coverage.faltantes.length > 0)

  if (scenario === 'day') return <section className="text-xs text-slate-600">
    <p className="text-sm font-bold text-slate-900">Operación en tiempo real</p>
    <p className="mt-1">Es el uso normal del sistema con los pedidos que se registran. El servidor recupera la operación; su estado se indica en el encabezado.</p>
    <p className="mt-2">Desde aquí puedes registrar <b>incidencias</b>, revisar el <b>rendimiento</b> y el stock de cada almacén.</p>
    <p className="mt-2 text-slate-500">Para probar el sistema con un periodo simulado, usa las pestañas <b>Cinco días</b> o <b>Hasta el colapso</b>.</p>
  </section>

  return <section className="flex flex-col gap-3 text-xs">
    <div>
      <p className="text-sm font-bold">{scenario === 'five' ? 'Simulación de cinco días' : 'Simulación hasta el colapso logístico'}</p>
      <p className="mt-1 text-slate-600">{scenario === 'five' ? 'Simula exactamente 5 días desde la fecha que elijas y muestra el resumen al terminar. No afecta la operación real.' : 'Simula sin fecha de fin hasta que la flota ya no pueda entregar a tiempo; muestra cuándo y qué pedido lo causó. No afecta la operación real.'}</p>
    </div>
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 font-semibold text-slate-600">Fecha y hora de inicio<input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className="border border-slate-200 px-3 py-2 font-normal" /></label>
      {scenario === 'five'
        ? <p className="text-slate-500">Termina sola el <b>{start ? cincoDiasDespues(start) : '—'}</b> (5 días después).</p>
        : <p className="text-slate-500">No tiene fecha de fin: sigue hasta el primer pedido que ya no pueda cumplir su plazo.</p>}
      {coverage && (coverage.faltantes.length > 0 && scenario === 'five'
        ? <p className="border border-red-200 bg-red-50 px-2 py-1.5 font-semibold text-red-700">Faltan datos de ventas para ese periodo: {coverage.faltantes.join(', ')}.</p>
        : <p className="text-emerald-700">Datos de ventas: {coverage.archivos.join(' + ') || '—'} · {coverage.pedidos} pedidos en los primeros 5 días{coverage.lineasInvalidas > 0 ? ` · ${coverage.lineasInvalidas} líneas inválidas ignoradas` : ''}. {coverage.bloqueos ? `Bloqueos: ${coverage.bloqueos} (${(coverage.archivosBloqueos ?? []).join(' + ')}).` : 'Sin archivo de bloqueos: corre sin bloqueos planificados.'}</p>)}
      {coverageError && <p className="font-semibold text-amber-700">{coverageError}</p>}
      <label className="flex cursor-pointer items-center gap-2 self-start border border-slate-300 bg-white px-3 py-1.5 font-bold text-slate-700 hover:border-slate-400"><Upload className="size-3.5" />Subir archivo de ventas<input type="file" className="sr-only" onChange={e => { subir(e.target.files?.[0]); e.target.value = '' }} /></label>
      <label className="flex cursor-pointer items-center gap-2 self-start border border-slate-300 bg-white px-3 py-1.5 font-bold text-slate-700 hover:border-slate-400"><Upload className="size-3.5" />Subir bloqueos (.zip o archivo)<input type="file" accept=".zip,.txt,.bloqueadas" className="sr-only" onChange={e => { subirB(e.target.files?.[0]); e.target.value = '' }} /></label>
      {subida && <p role={subida.ok ? 'status' : 'alert'} className={subida.ok ? 'text-slate-600' : 'font-semibold text-red-700'}>{subida.texto}</p>}
    </div>
    {/* Acción principal de la pestaña: es el único botón lleno y grande del panel */}
    <button onClick={start5} disabled={fiveBlocked} className={`flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white shadow ${fiveBlocked ? 'cursor-not-allowed bg-slate-300' : 'bg-blue-700 hover:bg-blue-800'}`}><Play className="size-4 fill-current" />{starting ? 'Iniciando en el servidor…' : scenario === 'five' ? 'Iniciar simulación de cinco días' : 'Iniciar simulación hasta el colapso'}</button>
    {startError && <p role="alert" className="border border-red-200 bg-red-50 px-2 py-1.5 font-semibold text-red-700">{startError}</p>}
  </section>
}

// Resumen final de una simulación. Con la simulación del back-end muestra sus conteos, lo realmente recorrido y,
// en el colapso, el instante y el pedido causante; sin ella, los valores de ejemplo del prototipo.
function CollapseResults({ variant = 'collapse', onLocate, sim, segReal = 0, hora = horaSimulada }: { variant?: 'five' | 'collapse' | 'day'; onLocate?: (codigo: string) => void; sim?: VistaSimulacion | null; segReal?: number; hora?: (h: number) => string }) {
  const c = sim?.pedidos
  const ac = sim?.acumulado ?? null
  const col = sim?.colapso ?? null
  const soles = (n: number) => `S/ ${Math.round(n).toLocaleString('es-PE')}`
  const km = (n: number) => `${Math.round(n).toLocaleString('es-PE')} km`
  const causante = col?.pedido?.codigo ?? (sim ? null : 'PED-137')
  // Colapso: el instante y el pedido que ya no pudo cumplir su plazo (LE071)
  const cabecera: [string, string][] = variant === 'collapse'
    ? sim
      ? col
        ? [['Instante del colapso', fechaHora(col.fecha)], ['Pedido causante', col.pedido ? `${col.pedido.codigo} · (${col.pedido.posX},${col.pedido.posY})` : '—'], ['Plazo comprometido', col.pedido ? hora(col.pedido.fechaLimiteH) : '—'], ['Duración real de la simulación', duracion(segReal)]]
        : [['Inicio', fechaHora(sim.fechaInicio)], ['Fin de los datos', sim.fechaFin ? fechaHora(sim.fechaFin) : '—'], ['Resultado', 'Sin colapso: se acabaron los datos de ventas'], ['Duración real de la simulación', duracion(segReal)]]
      : [['Instante del colapso', '11/09/2026 · 16:42'], ['Pedido causante', 'PED-137 · (48,34)'], ['Plazo comprometido', '11/09/2026 · 19:10'], ['Estado del pedido', 'No entregable dentro del plazo']]
    : sim && c
      ? [['Inicio del periodo', fechaHora(sim.fechaInicio)], ['Fin del periodo', sim.fechaFin ? fechaHora(sim.fechaFin) : '—'], ['Duración real de la simulación', duracion(segReal)], ['Pedidos del periodo', String(c.incorporados)]]
      : [['Inicio del periodo', '08/09/2026 · 08:00'], ['Fin del periodo', '13/09/2026 · 08:00'], ['Pedidos del periodo', '211'], ['Duración real de la simulación', '00:42:18']]
  const indicadores: [string, string][] = sim && c
    ? [['Entregados dentro del plazo', `${c.entregadosATiempo} · ${porcentaje(c.entregadosATiempo, c.incorporados)}`], ['Entregados fuera del plazo', `${c.entregados - c.entregadosATiempo} · ${porcentaje(c.entregados - c.entregadosATiempo, c.incorporados)}`], ['No entregados', `${c.noEntregados} · ${porcentaje(c.noEntregados, c.incorporados)}`], ['Pendientes o en ruta al cierre', `${c.abiertos} · ${porcentaje(c.abiertos, c.incorporados)}`],
       ...(ac ? [['Distancia total recorrida', km(ac.distanciaKm)], ['Costo operativo total', soles(ac.costo)]] as [string, string][] : [])]
    : [['Entregados dentro del plazo', '184 · 87%'], ['Entregados fuera del plazo', '16 · 8%'], ['Pendientes', '8 · 4%'], ['En ruta', '3 · 1%'], ['Distancia total recorrida', '4 680 km'], ['Costo operativo total', 'S/ 18 930']]
  const desglose: [string, string][] = sim
    ? ac ? (Object.keys(ETIQUETA_TIPO) as TipoVehiculo[]).map(t => { const d = ac.porTipo[t]; return [`${ETIQUETA_TIPO[t]}s`, d ? `${km(d.distanciaKm)} · ${soles(d.costo)} · ${d.entregas} entregas` : '—'] }) : []
    : [['Autos', '2 410 km · S/ 9 840'], ['Motos', '1 520 km · S/ 5 920'], ['Bicicletas', '750 km · S/ 3 170']]
  const title = variant === 'five' ? 'Resumen final · Simulación 5 días' : variant === 'day' ? 'Corte del día · Operación día a día (sin estado final)' : sim && !col ? 'Resumen final · Hasta el colapso (sin colapso)' : 'Resumen final · Colapso logístico'
  const rojo = variant === 'collapse' && (!sim || !!col)
  return <section className={`border bg-white p-4 shadow-sm ${rojo ? 'border-red-200' : 'border-slate-200'}`}>
    <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-3 ${rojo ? 'border-red-100' : 'border-slate-100'}`}>
      <div><p className={`text-[10px] font-bold uppercase tracking-widest ${rojo ? 'text-red-700' : 'text-blue-700'}`}>Resultados finales · cantidad y % de cumplimiento</p><h3 className="mt-1 text-base font-bold">{title}</h3></div>
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${rojo ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>{variant === 'day' ? 'Corte operativo' : 'Estado final'}</span>
    </div>
    <div className="mt-4 grid gap-4">
      <div className="grid grid-cols-2 gap-2">{cabecera.map(([label, value]) => <div key={label} className="border border-slate-100 bg-slate-50 px-3 py-2"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-0.5 text-sm font-bold">{value}</p>{label === 'Pedido causante' && onLocate && causante && <button onClick={() => onLocate(causante)} className="mt-2 border border-red-300 bg-white px-2.5 py-1.5 text-xs font-bold text-red-700">Localizar en mapa</button>}</div>)}</div>
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Indicadores acumulados</p>
        <div className="grid grid-cols-2 gap-2">{indicadores.map(([label, value]) => <div key={label} className="border border-slate-100 px-3 py-2"><p className="text-[10px] leading-tight text-slate-500">{label}</p><p className="mt-1 text-base font-bold">{value}</p></div>)}</div>
        {desglose.length > 0 ? <>
          <p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Desglose por tipo de vehículo</p>
          <div className="grid gap-2">{desglose.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-2 border border-slate-100 px-3 py-2"><p className="text-[11px] text-slate-500">{label}</p><p className="text-sm font-bold">{value}</p></div>)}</div>
        </> : <p className="mt-4 text-[11px] text-slate-500">El back-end no informó la distancia ni el costo recorridos.</p>}
      </div>
    </div>
  </section>
}

function Operator({ scenario, setScenario, state, setState, replanned, setReplanned, sim, setSim, mapa, escenarioId, onCambio, onUmbrales, hora, segReal, unidadSeleccionada, onUnidad, buscado, setBuscado, warehouse, setWarehouse, historialCompleto }: { mapa: MapaDatos | null; escenarioId: number | null; onCambio: () => void; onUmbrales: (u: { pedido: Umbrales; stock: Umbrales }) => void; hora: (h: number) => string; segReal: number; scenario: Scenario; setScenario: (s: Scenario) => void; state: ExecState; setState: (s: ExecState) => void; replanned: boolean; setReplanned: (r: boolean) => void; sim: VistaSimulacion | null; setSim: (s: VistaSimulacion | null) => void; unidadSeleccionada: number | null; onUnidad: (id: number) => void; buscado: string | null; setBuscado: (codigo: string | null) => void; warehouse: string | null; setWarehouse: (nombre: string | null) => void; historialCompleto: boolean }) {
  const u = useContext(UmbralesCtx)
  const [performance, setPerformance] = useState(false)
  const [params, setParams] = useState(false)
  const [breakdown, setBreakdown] = useState(false)
  const [orderLight, setOrderLight] = useState({ verde: String(u.pedido.verde), rojo: String(u.pedido.rojo) })
  const [stockLight, setStockLight] = useState({ verde: String(u.stock.verde), rojo: String(u.stock.rojo) })
  const [paramsMsg, setParamsMsg] = useState('')
  const [highlightOrderId, setHighlightOrderId] = useState<string | null>(null)
  // En pantallas pequeñas el panel empieza recogido para no tapar el mapa
  const [panel, setPanel] = useState(() => typeof window === 'undefined' || window.innerWidth >= 768)
  const simActive = scenario !== 'day' && (state === 'running' || state === 'incident')
  const simFinished = scenario !== 'day' && (state === 'complete' || state === 'collapse')
  // Momento de la simulación de cinco días que se está viendo (T0–T3), derivado del estado
  const simStep = state === 'complete' ? 3 : state === 'incident' ? 1 : state === 'running' ? (replanned ? 2 : 0) : -1
  // Instante vigente que el sistema asigna a una avería, coherente con el reloj del encabezado
  // Con una simulación elegida pero sin iniciar, la avería corresponde a la operación en tiempo real
  const onDay = scenario === 'day' || state === 'idle'
  const faultTime = onDay ? (state === 'incident' || replanned ? '08/09/2026 · 10:20:15' : '08/09/2026 · 08:35:20') : scenario === 'five' ? (state === 'incident' || replanned ? '11/09/2026 · 10:20:15' : '10/09/2026 · 14:35:20') : '10/09/2026 · 09:12:40'
  const [simMsg, setSimMsg] = useState('')
  const [simBusy, setSimBusy] = useState(false)
  // Volver a la operación detiene en el servidor la simulación que siga viva
  const backToOperation = async () => {
    if (sim && simViva(sim)) { try { await detenerSimulacion(sim.simulacion.escenarioId) } catch (e) { setSimMsg(mensajeError(e)); return } }
    setSim(null); setSimMsg(''); setReplanned(false); setHighlightOrderId(null); setBuscado(null); setScenario('day'); setState('running')
  }
  const cambiarEscenario = (s: Scenario) => { setReplanned(false); setHighlightOrderId(null); setScenario(s); setState(s === 'day' ? 'running' : 'idle') }
  const startSim = async (tipo: SimType, start: string) => { const v = await (tipo === 'five' ? iniciarCincoDias(start) : iniciarColapso(start)); setSim(v); setReplanned(false); setState('running') }
  // Al colapsar se resalta el pedido causante en el mapa
  const causante = sim?.colapso?.pedido?.codigo
  useEffect(() => { if (causante) setBuscado(causante) }, [causante])
  const controlSim = async (accion: (id: number) => Promise<VistaSimulacion>) => {
    if (!sim) return
    setSimBusy(true); setSimMsg('')
    try { setSim(await accion(sim.simulacion.escenarioId)) } catch (e) { setSimMsg(mensajeError(e)) } finally { setSimBusy(false) }
  }
  const openWarehouse = (w: string) => { setWarehouse(w); setPanel(true); setTimeout(() => document.getElementById('panel-almacen')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50) }
  const applyParams = () => {
    const nums = [orderLight.verde, orderLight.rojo, stockLight.verde, stockLight.rojo].map(Number)
    if (nums.some(n => !Number.isFinite(n) || n < 0)) return setParamsMsg('Revisa los valores: deben ser números positivos.')
    if (Number(orderLight.verde) <= Number(orderLight.rojo)) return setParamsMsg('En pedidos, el límite de verde debe ser mayor que el de rojo.')
    if (Number(stockLight.verde) <= Number(stockLight.rojo) || Number(stockLight.verde) > 100) return setParamsMsg('En stock, verde debe ser mayor que rojo y como máximo 100 %.')
    onUmbrales({ pedido: { verde: Number(orderLight.verde), rojo: Number(orderLight.rojo) }, stock: { verde: Number(stockLight.verde), rojo: Number(stockLight.rojo) } })
    setParamsMsg('Cambios aplicados: el mapa ya usa los nuevos semáforos. No alteran el reloj de la ejecución.')
  }
  const toolButton = 'border bg-white/95 px-3 py-2 text-xs font-bold shadow'
  // Rendimiento con datos reales: cumplimiento contado sobre los pedidos del escenario
  const rend = mapa && historialCompleto ? (() => {
    const r = mapa.rastreo, entregados = r.filter(q => q.estado === 'ENTREGADO')
    const aTiempo = entregados.filter(q => q.entregadoEnH != null && q.entregadoEnH <= q.fechaLimiteH).length
    const noEntregados = r.filter(q => q.estado === 'NO_ENTREGADO').length
    return { total: r.length, aTiempo, tarde: entregados.length - aTiempo, noEntregados, abiertos: r.length - entregados.length - noEntregados }
  })() : null
  const field = 'mt-1 w-full border border-slate-200 bg-white px-2 py-1.5'
  return <div className="relative h-full">
    {/* El mapa ocupa todo el espacio libre; con el panel abierto se corre a su derecha (en pantallas medianas o más) */}
    <div className={`absolute inset-y-0 right-0 ${panel ? 'left-0 md:left-[412px]' : 'left-0'}`}><MapaOperativo full state={state} replanned={replanned} highlightOrderId={highlightOrderId} onWarehouse={openWarehouse} onPedido={setBuscado} datos={mapa} buscado={buscado} almacenMarcado={warehouse} unidadSeleccionada={unidadSeleccionada} onUnidad={onUnidad} /></div>

    {/* Acciones sobre el mapa */}
    <div className="absolute right-3 top-14 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-start justify-end gap-2 md:top-3">
      <BuscarPedido rastreo={mapa?.rastreo ?? []} buscado={buscado} setBuscado={setBuscado} hora={hora} onUnidad={onUnidad} />
      <button onClick={() => { setParams(!params); setPanel(true) }} className={`${toolButton} ${params ? 'border-blue-600 text-blue-700' : 'border-slate-200'}`}><Settings2 className="mr-1 inline size-4" />Parámetros operativos</button>
      {!simFinished && <button onClick={() => setBreakdown(true)} className={`${toolButton} border-red-200 text-red-700`}><Wrench className="mr-1 inline size-4" />Incidencias{(mapa?.incidencias.length ?? 0) > 0 && <span className="ml-1.5 bg-red-600 px-1.5 text-white">{mapa?.incidencias.length}</span>}</button>}
    </div>

    {/* Panel de control recogible: el mapa sigue ocupando toda la pantalla */}
    {panel ? <aside className="absolute bottom-0 left-0 top-0 z-10 flex w-[412px] max-w-[calc(100%-1.5rem)] flex-col border-r border-slate-200 bg-white shadow-lg">
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Operador · Vista operativa</p><h2 className="mt-0.5 text-base font-bold">Mapa y control de ejecución</h2></div>
        <button onClick={() => setPanel(false)} title="Recoger panel y ver el mapa completo" aria-label="Recoger panel" className="border border-slate-200 p-1.5"><ChevronLeft className="size-4" /></button>
      </div>
      <EscenarioTabs scenario={scenario} bloqueadas={simActive || simFinished || simViva(sim)} onCambiar={cambiarEscenario} />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {params && <div className="border border-blue-200 bg-slate-50 p-4 text-xs">
          <div className="flex items-center justify-between"><p className="text-sm font-bold">Parámetros operativos</p><button onClick={() => setParams(false)} aria-label="Cerrar parámetros"><X className="size-4" /></button></div>
          <p className="mt-4 font-bold text-slate-700">Semáforo de pedidos · margen = fecha/hora límite − ETA (horas)</p>
          <div className="mt-1 grid grid-cols-2 gap-2"><label className="font-semibold text-emerald-700">Verde si margen ≥<input type="number" value={orderLight.verde} onChange={e => setOrderLight({ ...orderLight, verde: e.target.value })} className={field} /></label><label className="font-semibold text-red-700">Rojo si margen &lt;<input type="number" value={orderLight.rojo} onChange={e => setOrderLight({ ...orderLight, rojo: e.target.value })} className={field} /></label></div>
          <p className="mt-1 text-slate-500"><b className="text-amber-700">Ámbar</b> entre {orderLight.rojo || '?'} h y {orderLight.verde || '?'} h. Más margen es más seguro.</p>
          <p className="mt-4 font-bold text-slate-700">Semáforo de stock · almacenes intermedios (% disponible)</p>
          <div className="mt-1 grid grid-cols-2 gap-2"><label className="font-semibold text-emerald-700">Verde si stock ≥<input type="number" value={stockLight.verde} onChange={e => setStockLight({ ...stockLight, verde: e.target.value })} className={field} /></label><label className="font-semibold text-red-700">Rojo si stock &lt;<input type="number" value={stockLight.rojo} onChange={e => setStockLight({ ...stockLight, rojo: e.target.value })} className={field} /></label></div>
          <p className="mt-1 text-slate-500"><b className="text-amber-700">Ámbar</b> entre {stockLight.rojo || '?'} % y {stockLight.verde || '?'} %. El almacén central es ilimitado y no usa semáforo.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3"><button onClick={applyParams} className="bg-blue-700 px-4 py-2 font-bold text-white">Aplicar cambios</button>{paramsMsg && <span className={paramsMsg.startsWith('Cambios') ? 'text-emerald-700' : 'font-semibold text-red-700'}>{paramsMsg}</span>}</div>
        </div>}

        {/* Qué muestra el panel según la ejecución: elegir/iniciar, simulación en curso o resultados */}
        {simActive && <div className="border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center justify-between gap-2"><p className="text-sm font-bold">Simulación en curso</p><span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700"><span className="size-2 animate-pulse rounded-full bg-blue-600" />{stateLabels[state]}</span></div>
          <p className="mt-0.5 text-xs text-slate-600">{simLabels[scenario as SimType]} · la operación real sigue en paralelo.</p>
          {sim && <div className="mt-2 flex flex-col gap-1.5 text-xs">
            <p>Ejecutándose en el servidor · <b>{fechaHora(sim.fechaSimulada, true)}</b>{sim.simulacion.estado === 'PAUSADA' && <span className="ml-1 font-bold text-amber-700">· en pausa</span>}</p>
            {sim.simulacion.tipo !== 'COLAPSO' && <div className="h-2 w-full bg-white" role="progressbar" aria-valuenow={Math.round(sim.progreso * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de los cinco días"><div className="h-2 bg-blue-600" style={{ width: `${Math.round(sim.progreso * 100)}%` }} /></div>}
            <p className="text-slate-600">{sim.simulacion.tipo === 'COLAPSO' ? `Sin fecha de fin · ${sim.simulacion.pedidosIncorporados} pedidos ingresados` : `${Math.round(sim.progreso * 100)}% · ${sim.simulacion.pedidosIncorporados} de ${sim.simulacion.pedidosProgramados} pedidos ingresados`} · {sim.pedidos.entregados} entregados · {sim.simulacion.planificaciones} planificaciones</p>
            {sim.simulacion.pedidosDescartados > 0 && <p className="font-semibold text-red-700">{sim.simulacion.pedidosDescartados} pedidos sin ruta factible (no entregados)</p>}
            {(sim.simulacion.estado === 'ERROR' || sim.simulacion.estado === 'INTERRUMPIDA') && <p className="font-semibold text-red-700">La simulación se detuvo: {sim.simulacion.ultimoError ?? sim.simulacion.estado}</p>}
            {simMsg && <p role="alert" className="font-semibold text-red-700">{simMsg}</p>}
          </div>}
          <div className="mt-3 flex gap-2 text-xs">
            {sim && sim.simulacion.estado === 'EJECUTANDO' && <button disabled={simBusy} onClick={() => controlSim(pausarSimulacion)} className="border border-slate-300 bg-white px-3 py-1.5 font-bold text-slate-700">Pausar</button>}
            {sim && simViva(sim) && sim.simulacion.estado !== 'EJECUTANDO' && <button disabled={simBusy} onClick={() => controlSim(reanudarSimulacion)} className="border border-blue-300 bg-white px-3 py-1.5 font-bold text-blue-700">Reanudar</button>}
            <button onClick={backToOperation} className="flex-1 border border-red-200 bg-white px-3 py-1.5 font-bold text-red-700">Detener y volver al día a día</button>
          </div>
        </div>}
        {simFinished && <>
          <CollapseResults variant={scenario === 'collapse' ? 'collapse' : 'five'} sim={sim} segReal={segReal} hora={hora} onLocate={codigo => sim ? setBuscado(codigo) : setHighlightOrderId(codigo)} />
          <button onClick={backToOperation} className="border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">Cerrar simulación y volver al día a día</button>
        </>}
        {!simActive && !simFinished && (scenario === 'day' || state !== 'incident') && <ScenarioSelect scenario={scenario} onStart={startSim} />}

        {/* Atajo del prototipo: solo tiene sentido con una simulación de cinco días ya iniciada */}
        {scenario === 'five' && state !== 'idle' && !sim && <div className="flex flex-wrap items-center gap-2 border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs"><p className="w-full"><b>Atajo del prototipo:</b> saltar a un momento de la simulación</p>{([['T0 · Día 2 14:35', 'running', false], ['T1 · Día 3 10:20 incidencia', 'incident', false], ['T2 · Día 3 replanificado', 'running', true], ['T3 · Día 5 completado', 'complete', true]] as [string, ExecState, boolean][]).map(([label, next, rep], i) => <button key={label} onClick={() => { setReplanned(rep); setState(next) }} className={`border px-2.5 py-1.5 font-bold ${simStep === i ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white text-slate-600'}`}>{label}</button>)}</div>}

        {/* Al terminar, el resumen final reemplaza al panel de rendimiento */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {!simFinished && <button onClick={() => setPerformance(!performance)} aria-expanded={performance} className={`flex items-center gap-1 border px-2.5 py-1.5 font-bold ${performance ? 'border-blue-700 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white'}`}>Rendimiento <ChevronDown className={`size-3.5 ${performance ? 'rotate-180' : ''}`} /></button>}
        </div>
        <section aria-label="Almacenes" className="border border-slate-200 p-3 text-xs"><h3 className="font-bold">Almacenes</h3>{!mapa ? <p className="mt-1 text-slate-500">Datos no disponibles.</p> : mapa.almacenes.length === 0 ? <p className="mt-1 text-slate-500">Sin almacenes informados.</p> : <ul>{mapa.almacenes.map(a => { const nombre = NOMBRE_ALMACEN[a.codigo] ?? a.codigo; return <li key={a.id} className="border-t py-2"><button onClick={() => openWarehouse(nombre)} className="font-bold text-blue-700 underline">{nombre}</button><span className="ml-2">{a.central ? 'Stock ilimitado' : a.pct == null ? 'Stock no disponible' : <span className={TEXTO_SEMAFORO[tonoStock(a.pct, u.stock)]}>{a.stock} / {a.capacidad} · {a.pct}% · {tonoStock(a.pct, u.stock)}</span>}</span></li> })}</ul>}</section>
        {performance && !simFinished && (rend
          ? <div className="border border-slate-200 bg-white p-3 text-xs">
              <p className="text-slate-500">Cumplimiento · {rend.total} pedidos del escenario</p>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">{([['A tiempo', rend.aTiempo, 'text-emerald-700'], ['Fuera de plazo', rend.tarde, 'text-amber-700'], ['No entregados', rend.noEntregados, 'text-red-700'], ['Pendientes o en ruta', rend.abiertos, 'text-slate-700']] as [string, number, string][]).map(([t, n, c]) => <div key={t} className="border border-slate-100 bg-slate-50 px-2 py-1.5"><p className="text-[10px] text-slate-500">{t}</p><b className={`text-sm ${c}`}>{n} · {porcentaje(n, rend.total)}</b></div>)}</div>
              <p className="mt-2 text-slate-600">Plan vigente: <b>{mapa?.resumen.distanciaPlanKm != null ? `${Math.round(mapa.resumen.distanciaPlanKm).toLocaleString('es-PE')} km` : '—'}</b> · <b>{mapa?.resumen.costoPlan != null ? `S/ ${Math.round(mapa.resumen.costoPlan).toLocaleString('es-PE')}` : '—'}</b></p>
              {mapa?.acumulado ? <p className="mt-1 text-slate-600">Recorrido hasta ahora: <b>{Math.round(mapa.acumulado.distanciaKm).toLocaleString('es-PE')} km</b> · <b>S/ {Math.round(mapa.acumulado.costo).toLocaleString('es-PE')}</b> · {mapa.acumulado.entregas} entregas</p> : <p className="mt-1 text-[10px] text-slate-400">El back-end no informó la distancia ni el costo recorridos.</p>}
            </div>
          : <p className="border border-slate-200 bg-white p-4 text-xs text-slate-500">Indicadores no disponibles.</p>)}
        {warehouse && <div id="panel-almacen" className="border border-blue-200 bg-blue-50 p-3 text-xs">
          <div className="flex items-center justify-between gap-2"><b className="text-sm">{warehouse}</b><button onClick={() => setWarehouse(null)} aria-label="Cerrar panel de almacén"><X className="size-4" /></button></div>
          {(() => {
            // Con datos del back-end: stock y unidades reales; sin ellos, los valores de ejemplo del prototipo
            const a = mapa?.almacenes.find(x => (NOMBRE_ALMACEN[x.codigo] ?? x.codigo) === warehouse)
            const stock = (pct: number, texto: string) => <>{texto} · <span className={`font-bold ${TEXTO_SEMAFORO[tonoStock(pct, u.stock)]}`}>● {{ verde: 'verde', ambar: 'ámbar', rojo: 'rojo' }[tonoStock(pct, u.stock)]}</span></>
            const filas: [string, ReactNode][] = a
              ? [['Stock', a.central ? 'Ilimitado (no usa semáforo)' : a.pct == null ? 'No disponible' : stock(a.pct, `${a.stock?.toLocaleString('es-PE')} de ${a.capacidad?.toLocaleString('es-PE')} u · ${a.pct} %`)],
                 ['Unidades en base', String(a.vehiculosEnBase)], ['Unidades en ruta', String(a.unidadesFuera)], ['Pedidos por entregar', String(a.pedidosPorEntregar)], ['Ubicación', `(${a.x}, ${a.y})`]]
              : [['Datos', 'No disponibles']]
            return <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">{filas.map(([k, v]) => <Fragment key={k}><dt className="text-slate-500">{k}</dt><dd className="font-semibold">{v}</dd></Fragment>)}</dl>
          })()}
        </div>}
      </div>
    </aside> : <button onClick={() => setPanel(true)} className="absolute left-3 top-3 z-10 flex items-center gap-2 border border-slate-200 bg-white/95 px-3 py-2 text-xs font-bold shadow"><PanelLeftOpen className="size-4" />Panel de control</button>}

    {breakdown && <Incidencias mapa={mapa} escenarioId={escenarioId} hora={hora} instanteDemo={faultTime} onCambio={onCambio} onCerrar={() => setBreakdown(false)} onDemo={() => { setReplanned(false); if (onDay) setScenario('day'); setState('incident') }} />}
  </div>
}

function Viewer({ state, setState, scenario, replanned, sim, mapa, hora, segReal, esDia = false, unidadSeleccionada, onUnidad, buscado, setBuscado, warehouse, setWarehouse }: { esDia?: boolean; state: ExecState; setState: (s: ExecState) => void; scenario: Scenario; replanned: boolean; sim: VistaSimulacion | null; mapa: MapaDatos | null; hora: (h: number) => string; segReal: number; unidadSeleccionada: number | null; onUnidad: (id: number) => void; buscado: string | null; setBuscado: (codigo: string | null) => void; warehouse: string | null; setWarehouse: (nombre: string | null) => void }) {
  const [kpisAbiertos, setKpisAbiertos] = useState(false)
  const [estadoAbierto, setEstadoAbierto] = useState(true)
  useEffect(() => { if (window.innerWidth < 768) setEstadoAbierto(false) }, [])
  const causante = sim?.colapso?.pedido?.codigo
  useEffect(() => { if (causante) setBuscado(causante) }, [causante])
  const disconnected = state === 'disconnected'
  // Si hay una simulación elegida pero sin iniciar, lo que está en ejecución es la operación en tiempo real
  const viewingDay = scenario === 'day' || state === 'idle'
  const shown: ExecState = state
  const final = shown === 'complete' || shown === 'collapse'
  const title = disconnected ? 'Solo consulta · desconectado' : shown === 'collapse' ? 'Colapso logístico' : shown === 'complete' ? 'Periodo completado' : shown === 'incident' ? 'Incidencia activa · replanificación en proceso' : 'Estado actual de la operación'
  const c = sim?.pedidos
  // Con una simulación real, los indicadores salen del back-end; sin ella, de la escena de demostración
  const colapsoReal = sim?.simulacion.tipo === 'COLAPSO'
  const kpis = sim && c ? [['Fecha simulada', fechaHora(sim.fechaSimulada, true)], ['Tiempo real transcurrido', duracion(segReal)],
    colapsoReal ? ['Días simulados', String(Math.floor((sim.simulacion.relojH - sim.simulacion.inicioH) / 24) + 1)] : ['Avance del periodo', `${Math.round(sim.progreso * 100)}%`],
    ['Pedidos ingresados', colapsoReal ? String(sim.simulacion.pedidosIncorporados) : `${sim.simulacion.pedidosIncorporados} de ${sim.simulacion.pedidosProgramados}`],
    ['Entregados a tiempo', `${c.entregadosATiempo} · ${porcentaje(c.entregadosATiempo, c.incorporados)}`], ['Pedidos abiertos', String(c.abiertos)], ['Vehículos en ruta', String(mapa?.resumen.vehiculosEnRuta ?? '—')],
    sim.acumulado ? ['Recorrido · costo', `${Math.round(sim.acumulado.distanciaKm).toLocaleString('es-PE')} km · S/ ${Math.round(sim.acumulado.costo).toLocaleString('es-PE')}`] : ['Costo del plan vigente', mapa?.resumen.costoPlan != null ? `S/ ${Math.round(mapa.resumen.costoPlan).toLocaleString('es-PE')}` : '—']] : mapa ? [[esDia ? 'Fecha y hora' : 'Hora simulada', esDia ? hora(mapa.relojH) : horaSimulada(mapa.relojH)], ['Pedidos abiertos', String(mapa.resumen.pedidosAbiertos)], ['Vehículos en ruta', String(mapa.resumen.vehiculosEnRuta)], ['Algoritmo del plan', mapa.resumen.algoritmo ?? 'sin plan'], ['Costo del plan vigente', mapa.resumen.costoPlan != null ? `S/ ${Math.round(mapa.resumen.costoPlan).toLocaleString('es-PE')}` : '—'], ['Distancia del plan', mapa.resumen.distanciaPlanKm != null ? `${Math.round(mapa.resumen.distanciaPlanKm)} km` : '—']] : final ? [['Entregados dentro de plazo', '184 · 87%'], ['Fuera de plazo', '16 · 8%'], ['Pendientes / en ruta', '11 · 5%'], ['Distancia total', '4 680 km'], ['Costo total', 'S/ 18 930'], ['Duración real', '42:18']] : [['Pedidos entregados', '94%'], ['Pendientes', '8'], ['En ruta', '18'], ['Distancia', '2 940 km']]
  return <div className="relative h-full">
    <MapaOperativo full replanned={replanned} state={shown} highlightOrderId={shown === 'collapse' && !mapa ? 'PED-137' : null} datos={mapa} buscado={buscado} onPedido={setBuscado} unidadSeleccionada={unidadSeleccionada} onUnidad={onUnidad} onWarehouse={setWarehouse} almacenMarcado={warehouse} />
    {warehouse && <div className="absolute bottom-16 left-3 z-10 border border-blue-200 bg-white p-3 text-xs shadow"><div className="flex gap-4"><b>{warehouse}</b><button onClick={() => setWarehouse(null)} aria-label="Cerrar panel de almacén">Cerrar</button></div>{(() => { const a = mapa?.almacenes.find(x => (NOMBRE_ALMACEN[x.codigo] ?? x.codigo) === warehouse); return a ? <p className="mt-1">{a.central ? 'Stock ilimitado' : a.pct == null ? 'Stock no disponible' : `${a.stock} / ${a.capacidad} · ${a.pct}%`} · ({a.x}, {a.y})</p> : <p>Almacén no disponible.</p> })()}</div>}

    {/* Rastrear un pedido: el usuario de consulta busca por código y lo ve en el mapa */}
    <div className="absolute right-3 top-16 z-10 max-w-[calc(100%-1.5rem)] md:top-3"><BuscarPedido rastreo={mapa?.rastreo ?? []} buscado={buscado} setBuscado={setBuscado} hora={hora} onUnidad={onUnidad} /></div>

    {/* Estado de la ejecución en curso, sobre el mapa */}
    {estadoAbierto ? <section className="absolute left-3 top-3 z-10 max-h-[65%] w-[380px] max-w-[calc(100%-1.5rem)] overflow-y-auto border border-slate-200 bg-white/95 p-4 shadow-lg">
      <button onClick={() => setEstadoAbierto(false)} className="float-right border px-2 py-1 text-xs font-bold" aria-label="Cerrar estado de operación">Cerrar</button>
      {disconnected && <div className="mb-3 flex items-center justify-between gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"><b>Desconectada · último estado conocido</b><button onClick={() => setState('running')} className="border border-amber-300 bg-white px-3 py-1.5 font-bold">Reconectar</button></div>}
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Visualizador · Solo consulta</p>
      <h2 className="mt-0.5 text-base font-bold">{title}</h2>
      <p className="mt-1 hidden text-xs text-slate-500 sm:block">Operación consultada: {!sim && mapa ? (esDia ? scenarioLabels.day : 'escenario del back-end') : sim ? `${colapsoReal ? scenarioLabels.collapse : scenarioLabels.five} · ${sim.simulacion.estado.toLowerCase()}` : scenarioLabels[viewingDay ? 'day' : scenario]}. <span className="font-bold text-slate-600">Solo lectura de lo que está en ejecución (día a día o simulación activa); sin acceso a históricas ni acciones de edición.</span></p>
      {mapa && mapa.incidencias.length > 0 && <div className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
        <b>Incidencias vigentes ({mapa.incidencias.length})</b>
        <ul className="mt-1 flex flex-col gap-0.5">{mapa.incidencias.map(i => <li key={i.id}>{i.tipo === 'AVERIA' || i.tipo === 'MANTENIMIENTO' ? <><Wrench className="mr-1 inline size-3.5" />{i.tipo === 'AVERIA' ? 'Avería' : 'Mantenimiento'} · {mapa.flota.find(v => v.id === i.vehiculoId)?.codigo ?? `V-${i.vehiculoId}`}</> : <><AlertTriangle className="mr-1 inline size-3.5" />Bloqueo · {i.tramos.length} km</>} · desde {hora(i.instanteH)}{i.finH != null ? ` hasta ${hora(i.finH)}` : ''}</li>)}</ul>
      </div>}
      {shown === 'collapse' && (sim?.colapso
        ? <div className="mt-3 border border-red-200 bg-red-50 p-3 text-xs text-red-800"><b>Instante del colapso: {fechaHora(sim.colapso.fecha)}</b>{sim.colapso.pedido && <p className="mt-1">Pedido causante: {sim.colapso.pedido.codigo} · ({sim.colapso.pedido.posX},{sim.colapso.pedido.posY}) · plazo {hora(sim.colapso.pedido.fechaLimiteH)} · resaltado en el mapa.</p>}</div>
        : !sim && <div className="mt-3 border border-red-200 bg-red-50 p-3 text-xs text-red-800"><b>Instante del colapso: 11/09/2026 · 16:42</b><p className="mt-1">Pedido causante: PED-137 · (48,34) · resaltado en mapa · demanda pendiente sin capacidad disponible.</p></div>)}
    </section> : <button onClick={() => setEstadoAbierto(true)} className="absolute left-3 top-3 z-10 border border-slate-200 bg-white/95 px-3 py-2 text-xs font-bold shadow">Ver estado</button>}

    {/* Indicadores, sobre el mapa */}
    {/* En pantallas pequeñas los indicadores empiezan recogidos para no tapar el mapa */}
    {kpisAbiertos && (mapa || sim) ? <div className="absolute bottom-3 left-3 z-10 w-[380px] max-w-[calc(100%-1.5rem)]">
      <button onClick={() => setKpisAbiertos(false)} className="mb-1 border border-slate-200 bg-white/95 px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow">Ocultar indicadores</button>
<div className="grid grid-cols-2 gap-2">{kpis.map(([a, b]) => <div key={a} className="border border-slate-200 bg-white/95 p-2.5 shadow"><p className="text-[11px] text-slate-500">{a}</p><b className="mt-0.5 block text-base">{b}</b></div>)}</div>
    </div> : <button onClick={() => setKpisAbiertos(true)} className="absolute bottom-3 left-3 z-10 border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow">Ver indicadores</button>}
  </div>
}

export default function Home() {
  const [role, setRole] = useState<Role>('registrador')
  const [scenario, setScenario] = useState<Scenario>('day')
  const [state, setState] = useState<ExecState>('idle')
  const [replanned, setReplanned] = useState(false)
  const [sim, setSim] = useState<VistaSimulacion | null>(null)
  const simId = sim?.simulacion.escenarioId
  const simAlive = simViva(sim)
  // ?escenario=N abre un escenario concreto (útil para revisar uno sin simulación o desde otro equipo)
  const [escenarioUrl, setEscenarioUrl] = useState<number | null>(null)
  // Operación día a día: el back-end la mantiene siempre activa en tiempo real
  const [dia, setDia] = useState<OperacionActual | null>(null)
  const idDia = useRef<number | null>(null)
  const [errorDia, setErrorDia] = useState('')
  const [reintentoDia, setReintentoDia] = useState(0)
  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get('escenario'))
    if (Number.isInteger(n) && n > 0) { setEscenarioUrl(n); return }
    // Un segundo dispositivo se engancha a la simulación que ya está corriendo en el servidor
    listarSimulaciones()
      .then(vs => { const v = vs.find(simViva); if (v) { setSim(v); setScenario(v.simulacion.tipo === 'COLAPSO' ? 'collapse' : 'five'); setState('running') } })
      .catch(() => { /* La recuperación de la operación informa el error. */ })
  }, [])
  useEffect(() => {
    let activo = true
    let timer: ReturnType<typeof setTimeout>
    const cargar = async () => {
      try {
        const actual = idDia.current === null ? await operacionActual() : operacionDesdeVista(await consultarSimulacion(idDia.current))
        if (activo) { idDia.current = actual.escenarioId; setDia(actual); setErrorDia('') }
      }
      catch (e) { if (activo) setErrorDia(mensajeError(e)) }
      if (activo) timer = setTimeout(cargar, 2000)
    }
    void cargar()
    return () => { activo = false; clearTimeout(timer) }
  }, [reintentoDia])
  // Lo que se ve: la simulación (viva o su resultado), el escenario de la URL o, si no, la operación día a día
  const escenarioMapa = simId ?? escenarioUrl ?? dia?.escenarioId ?? null
  const [seleccionUnidad, setSeleccionUnidad] = useState<{ escenarioId: number; id: number } | null>(null)
  const [seleccionAlmacen, setSeleccionAlmacen] = useState<{ escenarioId: number; nombre: string } | null>(null)
  const [buscado, setBuscado] = useState<string | null>(null)
  const unidadSeleccionada = seleccionUnidad?.escenarioId === escenarioMapa ? seleccionUnidad.id : null
  const seleccionarUnidad = (id: number | null) => { if (id !== null) setSeleccionAlmacen(null); setSeleccionUnidad(id === null || escenarioMapa === null ? null : { escenarioId: escenarioMapa, id }) }
  const almacenSeleccionado = seleccionAlmacen?.escenarioId === escenarioMapa ? seleccionAlmacen.nombre : null
  const seleccionarAlmacen = (nombre: string | null) => { if (nombre !== null) setSeleccionUnidad(null); setSeleccionAlmacen(nombre === null || escenarioMapa === null ? null : { escenarioId: escenarioMapa, nombre }) }
  useEffect(() => { setSeleccionUnidad(null); setSeleccionAlmacen(null); setBuscado(null) }, [escenarioMapa])
  const esDia = escenarioMapa != null && escenarioMapa === dia?.escenarioId
  const mapaVivo = escenarioMapa != null && (simAlive || escenarioUrl != null || esDia)
  const operacion = useOperacion(escenarioMapa)
  const motorActivo = operacion.conexion === 'actual' && (esDia ? !errorDia && dia?.estadoMotor === 'EJECUTANDO' : sim?.simulacion.estado === 'EJECUTANDO')
  const posicionesVisuales = useMovimiento(operacion.mapa, motorActivo)
  // Tras registrar un pedido o una incidencia se vuelve a consultar el mapa sin esperar al siguiente ciclo
  const [cambios, setCambios] = useState(0)
  const [umbrales, setUmbrales] = useState({ pedido: UMBRALES_PEDIDO as Umbrales, stock: UMBRAL_STOCK as Umbrales })
  const refrescar = () => { setCambios(n => n + 1); operacion.refrescar() }
  const [historial, setHistorial] = useState<{ escenarioId: number; pedidos: Pedido[] } | null>(null)
  const [historialError, setHistorialError] = useState<{ escenarioId: number; mensaje: string } | null>(null)
  const [historialCargando, setHistorialCargando] = useState(true)
  useEffect(() => {
    if (escenarioMapa == null) { setHistorial(null); return }
    let activo = true
    const abort = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    const cargar = async () => {
      if (activo) setHistorialCargando(true)
      try {
        const pedidos = await consultarPedidos(escenarioMapa, abort.signal)
        if (activo) { setHistorial({ escenarioId: escenarioMapa, pedidos }); setHistorialError(null) }
      } catch (e) { if (activo) setHistorialError({ escenarioId: escenarioMapa, mensaje: mensajeError(e) }) }
      if (activo) setHistorialCargando(false)
      if (activo && mapaVivo) timer = setTimeout(cargar, 10000)
    }
    void cargar()
    return () => { activo = false; abort.abort(); clearTimeout(timer) }
  }, [escenarioMapa, mapaVivo, cambios])
  const mapa = useMemo(() => {
    const m = operacion.mapa
    if (!m || !m.fisico) return null
    const historicos = historial?.escenarioId === m.escenarioId ? historial.pedidos : []
    const abiertos = new globalThis.Map(m.pedidos.map(p => [p.id, p]))
    const pedidos = [...historicos.filter(p => !abiertos.has(p.id)), ...m.pedidos]
    const datos = datosMapa({ escenarioId: m.escenarioId, versionEstado: m.versionEstado, relojH: m.relojH,
      horizonteH: null, ultimoPlanId: m.plan?.id ?? null, fisico: m.fisico, acumulado: m.acumulado },
      m.aplicable ? m.plan : null, pedidos, m.incidencias)
    if (m.aplicable && m.plan) datos.vehiculos = datos.vehiculos.map(v => {
      const ruta = m.plan?.rutas.find(r => r.vehiculoId === v.id && r.horaInicioH <= m.relojH && m.relojH < r.horaFinH)
      return { ...v, direccion: ruta ? direccionEn(ruta.trayectoria, m.relojH) : null }
    })
    if (operacion.detalle === 'actual' && operacion.unidades) {
      const detalles = new globalThis.Map(operacion.unidades.unidades.map(u => [u.id, u]))
      datos.vehiculos = datos.vehiculos.map(v => { const detalle = detalles.get(v.id); return detalle ? { ...v, ocupacionPct: detalle.ocupacionPct, estado: detalle.estado } : v })
      datos.resumen.vehiculosEnRuta = operacion.unidades.unidades.filter(u => u.estado === 'EN_RUTA' || u.estado === 'EN_SERVICIO').length
    }
    if (motorActivo) datos.vehiculos = datos.vehiculos.map(v => posicionesVisuales[v.id] ? { ...v, ...posicionesVisuales[v.id] } : v)
    return datos
  }, [operacion.mapa, operacion.detalle, operacion.unidades, historial, posicionesVisuales, motorActivo])
  const mapaError = operacion.error
  const historialActual = historial?.escenarioId === escenarioMapa ? historial.pedidos : null
  const estadoHistorial = historialError?.escenarioId === escenarioMapa ? (historialActual ? 'desactualizado' : 'error') : historialCargando ? 'cargando' : historialActual ? 'actual' : 'cargando'
  // El servidor conduce la simulación; aquí solo se consulta su progreso cada 2 s
  useEffect(() => {
    if (simId == null || !simAlive) return
    const t = setInterval(() => {
      consultarSimulacion(simId)
        .then(v => { setSim(v); if (v.simulacion.estado === 'FINALIZADA') setState(v.colapso ? 'collapse' : 'complete') })
        .catch(() => { /* se reintenta en el siguiente ciclo */ })
    }, 2000)
    return () => clearInterval(t)
  }, [simId, simAlive])
  // Tiempo real de ejecución: avanza con el reloj del navegador mientras la simulación está EJECUTANDO y se
  // congela en pausa. Al engancharse a una simulación ya iniciada parte de lo que estima el reloj del back-end.
  const [segReal, setSegReal] = useState(0)
  const ancla = useRef<{ id: number; seg: number; t: number; corre: boolean } | null>(null)
  const simEstado = sim?.simulacion.estado
  useEffect(() => {
    if (!sim) { ancla.current = null; setSegReal(0); return }
    const exactos = sim.simulacion.segundosEjecutados
    const a = ancla.current
    if (a?.id === sim.simulacion.escenarioId) {
      if (exactos != null) { a.seg = exactos; a.t = Date.now(); if (!a.corre) setSegReal(exactos) }
      return
    }
    ancla.current = { id: sim.simulacion.escenarioId, seg: exactos ?? tiempoReal(sim), t: Date.now(), corre: sim.simulacion.estado === 'EJECUTANDO' }
    setSegReal(ancla.current.seg)
  }, [sim])
  useEffect(() => {
    const a = ancla.current
    if (!a) return
    const corre = simEstado === 'EJECUTANDO'
    if (a.corre && !corre) { a.seg += (Date.now() - a.t) / 1000; setSegReal(a.seg) }
    if (!a.corre && corre) a.t = Date.now()
    a.corre = corre
    if (!corre) return
    const t = setInterval(() => { const b = ancla.current; if (b) setSegReal(b.seg + (Date.now() - b.t) / 1000) }, 1000)
    return () => clearInterval(t)
  }, [simEstado, simId])
  // Horas del escenario: con simulación, como fecha de calendario; si no, como día y hora del reloj
  const fechaBase = sim?.simulacion.fechaBase ?? (esDia ? dia?.fechaBase : undefined)
  const hora = useMemo(() => fechaBase ? (h: number) => fechaDesdeBase(fechaBase, h) : horaSimulada, [fechaBase])
  // El registrador ingresa pedidos solo para la operación día a día (o el escenario abierto con ?escenario=N)
  const diaRegistro = escenarioUrl ?? dia?.escenarioId ?? null
  const horaRegistro = useMemo(() => dia && diaRegistro === dia.escenarioId ? (h: number) => fechaDesdeBase(dia.fechaBase, h) : hora, [dia, diaRegistro, hora])
  const effectiveState: ExecState = !sim && scenario === 'day' ? (errorDia ? 'disconnected' : dia?.estadoMotor === 'EJECUTANDO' ? 'running' : 'idle') : state === 'idle' && role === 'visualizador' ? 'running' : state
  // Traza de depuración (solo en desarrollo): se ve en la consola del navegador (F12 → Consola).
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    const onClick = (e: MouseEvent) => {
      const b = (e.target as HTMLElement).closest('button')
      if (b) console.info('[PaqRap] clic:', (b.textContent || b.title || '').trim())
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') console.info(`[PaqRap] vista=${role} · escenario=${scenarioLabels[scenario]} · estado=${stateLabels[effectiveState]}${replanned ? ' · plan actualizado' : ''}`)
  }, [role, scenario, effectiveState, replanned])
  // Operador y visualizador trabajan sobre el mapa a pantalla completa; el registrador es un formulario.
  return <UmbralesCtx.Provider value={umbrales}><main className="flex h-dvh flex-col overflow-hidden bg-white font-sans text-slate-900">
    <Header scenario={scenario} state={effectiveState} replanned={replanned} sim={sim} segReal={segReal} dia={dia} escenario={mapa && escenarioMapa != null ? { id: escenarioMapa, relojH: mapa.relojH, dia: esDia, fecha: hora(mapa.relojH) } : null} />
    {!sim && scenario === 'day' && (errorDia || (dia && dia.estadoMotor !== 'EJECUTANDO')) && <div role="status" className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-900">{errorDia ? <>{`Conexión interrumpida: ${errorDia}${dia ? ' · último estado conocido' : ''}`} <button className="ml-2 border border-amber-400 bg-white px-2 py-1 font-bold" onClick={() => setReintentoDia(n => n + 1)}>Reintentar</button></> : `Motor: ${dia?.estadoMotor}${dia?.ultimoError ? ` · ${dia.ultimoError}` : ''}`}</div>}
    <Nav role={role} setRole={setRole} />
    {role === 'registrador'
      ? <div className="min-h-0 flex-1 overflow-y-auto bg-[#f3f5f6] p-5 md:p-7"><div className="mx-auto max-w-[1500px]"><Registrar escenarioId={diaRegistro} disponible={!errorDia} rastreo={diaRegistro != null && diaRegistro === escenarioMapa && historialActual ? mapa?.rastreo ?? null : null} hora={horaRegistro} onRegistrado={refrescar} historialDesactualizado={estadoHistorial === 'desactualizado'} /></div></div>
      : <div className="relative min-h-0 flex-1">
          {mapaError && <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow">Mapa sin actualizar: {mapaError} <button onClick={refrescar} className="ml-2 border border-amber-400 bg-white px-2 py-1">Reintentar</button></div>}
          {motorActivo && Object.keys(posicionesVisuales).length > 0 && <div role="status" className="absolute bottom-16 left-1/2 z-20 -translate-x-1/2 bg-white/95 px-2 py-1 text-xs text-slate-700 shadow">Movimiento visual entre lecturas confirmadas</div>}
          {role === 'operador' && <Operator onUmbrales={setUmbrales} mapa={mapa} escenarioId={mapaVivo ? escenarioMapa : null} onCambio={refrescar} hora={hora} segReal={segReal} scenario={scenario} setScenario={setScenario} state={scenario === 'day' ? effectiveState : state} setState={setState} replanned={replanned} setReplanned={setReplanned} sim={sim} setSim={setSim} unidadSeleccionada={unidadSeleccionada} onUnidad={seleccionarUnidad} buscado={buscado} setBuscado={setBuscado} warehouse={almacenSeleccionado} setWarehouse={seleccionarAlmacen} historialCompleto={historialActual !== null && estadoHistorial === 'actual'} />}
          {role === 'visualizador' && <Viewer esDia={esDia} sim={sim} mapa={mapa} hora={hora} segReal={segReal} scenario={scenario} state={effectiveState} setState={setState} replanned={replanned} unidadSeleccionada={unidadSeleccionada} onUnidad={seleccionarUnidad} buscado={buscado} setBuscado={setBuscado} warehouse={almacenSeleccionado} setWarehouse={seleccionarAlmacen} />}
          <PanelFlota key={`flota-${escenarioMapa ?? 'sin-escenario'}`} unidades={operacion.unidades?.unidades ?? null} detalle={operacion.detalle} hora={hora} seleccion={unidadSeleccionada} onSeleccion={seleccionarUnidad} incidencias={operacion.mapa?.incidencias ?? []} onPedido={setBuscado} />
          <PanelEnvios key={`envios-${escenarioMapa ?? 'sin-escenario'}`} mapa={operacion.mapa} unidades={operacion.detalle === 'actual' ? operacion.unidades : null} historial={historialActual} estadoHistorial={estadoHistorial} estadoMapa={operacion.conexion} hora={hora} onPedido={setBuscado} onUnidad={seleccionarUnidad} />
        </div>}
  </main></UmbralesCtx.Provider>
}
