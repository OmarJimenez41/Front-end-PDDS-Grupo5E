'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bike, Car, Check, ChevronDown, ChevronLeft, FileText, MapPin, Navigation, Package, PanelLeftOpen, Settings2, Truck, Warehouse, Wrench, X } from 'lucide-react'
import { type MapaDatos, type TipoVehiculo, consultarMapa, listarSimulaciones } from '@/lib/api/operacion'
import { type Cobertura, type VistaSimulacion, consultarSimulacion, detenerSimulacion, iniciarCincoDias, mensajeError, pausarSimulacion, reanudarSimulacion, validarCobertura } from '@/lib/api/simulacion'

type Role = 'registrador' | 'operador' | 'visualizador'
type Scenario = 'day' | 'five' | 'collapse'
type OpMode = 'operacion' | 'simulacion'
type SimType = 'five' | 'collapse'
type ExecState = 'idle' | 'running' | 'incident' | 'complete' | 'collapse' | 'disconnected'
type Vehicle = 'Auto' | 'Moto' | 'Bicicleta'
type Order = { id: string; customer: string; x: string; y: string; units: string; delivery: 'Regular' | 'Priorizada'; hours: string; entered: string; deadline: string }

const initialOrders: Order[] = [
  { id: 'PED-001', customer: 'María López', x: '19', y: '29', units: '4', delivery: 'Regular', hours: '36', entered: '08/09 · 08:12', deadline: '09/09 · 20:12' },
  { id: 'PED-002', customer: 'Carlos Ruiz', x: '35', y: '18', units: '2', delivery: 'Priorizada', hours: '8', entered: '08/09 · 08:20', deadline: '08/09 · 16:20' },
  { id: 'PED-003', customer: 'Ana Torres', x: '43', y: '7', units: '1', delivery: 'Regular', hours: '36', entered: '08/09 · 08:31', deadline: '09/09 · 20:31' },
]

const scenarioLabels: Record<Scenario, string> = { day: 'Operación día a día · tiempo real', five: 'Simulación de cinco días', collapse: 'Simulación hasta el colapso logístico' }
const simLabels: Record<SimType, string> = { five: 'Simulación de cinco días', collapse: 'Simulación hasta el colapso logístico' }
// Fechas del back-end: 'aaaa-mm-ddThh:mm[:ss]' sin zona; se muestran tal cual, sin convertir de huso
const fechaHora = (iso: string, segundos = false) => { const [f, h = ''] = iso.split('T'); const [a, m, d] = f.split('-'); return `${d}/${m}/${a} · ${h.slice(0, segundos ? 8 : 5)}` }
const cincoDiasDespues = (inicio: string) => { const [f, h] = inicio.split('T'); const [a, m, d] = f.split('-').map(Number); const fin = new Date(Date.UTC(a, m - 1, d + 5)); const p = (n: number) => String(n).padStart(2, '0'); return `${p(fin.getUTCDate())}/${p(fin.getUTCMonth() + 1)}/${fin.getUTCFullYear()} · ${(h ?? '').slice(0, 5)}` }
/** Horas decimales del reloj del back-end como «día N · hh:mm» (hora 0 = 00:00 del día 1). */
const horaSimulada = (h: number) => { const m = Math.round(h * 60); return `día ${Math.floor(m / 1440) + 1} · ${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }
const porcentaje = (parte: number, total: number) => total > 0 ? `${Math.round(parte / total * 100)}%` : '—'
const simViva = (sim: VistaSimulacion | null) => sim?.simulacion.estado === 'EJECUTANDO' || sim?.simulacion.estado === 'PAUSADA'

const stateLabels: Record<ExecState, string> = { idle: 'Lista · sin iniciar', running: 'En ejecución', incident: 'Incidencia activa', complete: 'Periodo completado', collapse: 'Colapso logístico', disconnected: 'Solo consulta · desconectado' }

function Header({ scenario, state, replanned, sim, escenario }: { scenario: Scenario; state: ExecState; replanned: boolean; sim: VistaSimulacion | null; escenario?: { id: number; relojH: number } | null }) {
  const day = state === 'idle' && scenario !== 'day' ? (scenario === 'five' ? 'Sin iniciar · dura 5 días desde el inicio' : 'Sin iniciar · sin límite de periodo') : scenario === 'five' ? (state === 'complete' ? 'Día 5 de 5' : state === 'incident' ? 'Día 3 de 5' : 'Día 2 de 5') : scenario === 'day' ? (replanned && state === 'running' ? '08/09/2026 · 10:45 · plan actualizado' : '08/09/2026 · 08:35') : state === 'collapse' ? '11/09/2026 · 16:42' : 'Sin límite de periodo'
  const incidentView = state === 'incident'
  const collapseView = scenario === 'collapse' && state === 'collapse'
  const fiveDayRunning = scenario === 'five' && state === 'running'
  const headerScenario = !sim && escenario ? `Escenario ${escenario.id} del back-end` : collapseView ? 'Simulación hasta el colapso logístico' : incidentView ? (scenario === 'day' ? 'Operación día a día · tiempo real' : 'Simulación de cinco días') : scenarioLabels[scenario]
  // Con una simulación del back-end, la fecha es la que está simulando el servidor (día, hora, minuto y segundo)
  const real = scenario === 'five' && sim ? `Día ${Math.min(5, Math.floor(sim.progreso * 5) + 1)} de 5 · ${fechaHora(sim.fechaSimulada, true)}` : null
  const headerDate = real ?? (!sim && escenario ? `Hora simulada ${horaSimulada(escenario.relojH)}` : null) ?? (collapseView ? '11/09/2026 · 16:42' : incidentView ? (scenario === 'day' ? '08/09/2026 · 10:20 · incidencia activa' : 'Día 3 de 5 · 11/09/2026 · 10:20') : fiveDayRunning ? (replanned ? 'Día 3 de 5 · 11/09/2026 · 11:05 · plan actualizado' : 'Día 2 de 5 · 10/09/2026 · 14:35') : day)
  return <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-2"><div className="flex items-center gap-4"><div className="flex size-9 items-center justify-center bg-blue-700 text-white"><Navigation className="size-5" /></div><div><p className="text-lg font-bold">PaqRap</p><p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Centro de control</p></div><div className="hidden h-8 w-px bg-slate-200 md:block" /><div className="hidden md:block"><p className="text-sm font-bold">{headerScenario}</p><p className="text-xs text-slate-500">{headerDate}</p>{collapseView && <p className="text-xs font-semibold text-slate-500">Duración total 00:37:26</p>}{incidentView && <p className="text-xs font-semibold text-slate-500">Tiempo transcurrido 00:32:10</p>}{fiveDayRunning && !real && <p className="text-xs font-semibold text-slate-500">Tiempo transcurrido {replanned ? '00:34:50' : '00:18:42'}</p>}{real && sim && <p className="text-xs font-semibold text-slate-500">Avance {Math.round(sim.progreso * 100)}% · {sim.simulacion.pedidosIncorporados} de {sim.simulacion.pedidosProgramados} pedidos ingresados</p>}</div></div><div className="flex items-center gap-3"><div className={`flex items-center gap-2 border px-3 py-2 text-xs font-semibold ${state === 'incident' || state === 'collapse' ? 'border-red-200 bg-red-50 text-red-700' : state === 'disconnected' ? 'border-amber-200 bg-amber-50 text-amber-700' : state === 'complete' ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}><span className="size-2 rounded-full bg-current" />{stateLabels[state]}</div></div></header>
}

function Nav({ role, setRole }: { role: Role; setRole: (r: Role) => void }) { return <nav className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-5 pt-1">{[['registrador', 'Registrar pedidos', FileText], ['operador', 'Operar sistema', Settings2], ['visualizador', 'Solo consulta', MapPin]].map(([id, label, Icon]) => <button key={id as string} onClick={() => setRole(id as Role)} className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-bold ${role === id ? 'border-blue-600 bg-white text-blue-700' : 'border-transparent text-slate-500'}`}><Icon className="size-4" />{label as string}</button>)}</nav> }

// Reloj del prototipo: los pedidos se registran el 08/09/2026 a las 08:35; la fecha límite es ingreso + plazo
const deadlineFrom = (hours: number) => { const d = new Date(2026, 8, 8, 8 + hours, 35); const p = (n: number) => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)} · ${p(d.getHours())}:${p(d.getMinutes())}` }

function Registrar({ orders, setOrders }: { orders: Order[]; setOrders: (o: Order[]) => void }) { const [form, setForm] = useState({ customer: '', x: '', y: '', units: '', delivery: 'Regular' as 'Regular' | 'Priorizada', hours: '36' }); const [message, setMessage] = useState(''); const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value, ...(key === 'delivery' ? { hours: value === 'Regular' ? '36' : f.hours === '36' ? '4' : f.hours } : {}) })); const submit = () => { if (!form.customer || !form.x || !form.y || !form.units) return setMessage('Completa cliente, coordenadas y unidades.'); const x = Number(form.x); const y = Number(form.y); const u = Number(form.units); if (!Number.isFinite(x) || x < 0 || x > 70) return setMessage('X debe estar entre 0 y 70 km (necesario para planificación).'); if (!Number.isFinite(y) || y < 0 || y > 50) return setMessage('Y debe estar entre 0 y 50 km (necesario para planificación).'); if (!Number.isInteger(u) || u <= 0) return setMessage('Unidades debe ser entero mayor a 0 (necesario para planificación).'); if (form.delivery === 'Priorizada' && !['4','8','12','18'].includes(form.hours)) return setMessage('Priorizada requiere plazo 4/8/12/18 h.'); const id = `PED-${String(orders.length + 1).padStart(3, '0')}`; setOrders([...orders, { ...form, id, entered: '08/09 · 08:35', deadline: deadlineFrom(Number(form.hours)) }]); setForm({ customer: '', x: '', y: '', units: '', delivery: 'Regular', hours: '36' }); setMessage('Pedido registrado correctamente.'); }; return <div className="flex flex-col gap-5"><section className="border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Registrador de pedidos</p><h2 className="mt-1 text-lg font-bold">Registro de operación día a día</h2><p className="mt-1 text-xs text-slate-500">La fecha y hora de ingreso se asignan automáticamente al confirmar.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><label className="flex flex-col gap-2 text-xs font-semibold text-slate-600">Cliente<input value={form.customer} onChange={e => update('customer', e.target.value)} className="border border-slate-200 px-3 py-2.5 text-sm font-normal" placeholder="Nombre completo" /></label><label className="flex flex-col gap-2 text-xs font-semibold text-slate-600">Coordenada X<input type="number" value={form.x} onChange={e => update('x', e.target.value)} className="border border-slate-200 px-3 py-2.5 text-sm font-normal" placeholder="0–70 km" /></label><label className="flex flex-col gap-2 text-xs font-semibold text-slate-600">Coordenada Y<input type="number" value={form.y} onChange={e => update('y', e.target.value)} className="border border-slate-200 px-3 py-2.5 text-sm font-normal" placeholder="0–50 km" /></label><label className="flex flex-col gap-2 text-xs font-semibold text-slate-600">Unidades de producto P<input type="number" value={form.units} onChange={e => update('units', e.target.value)} className="border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label><label className="flex flex-col gap-2 text-xs font-semibold text-slate-600">Tipo de entrega<select value={form.delivery} onChange={e => update('delivery', e.target.value)} className="border border-slate-200 px-3 py-2.5 text-sm"><option>Regular</option><option>Priorizada</option></select></label>{form.delivery === 'Priorizada' ? <label className="flex flex-col gap-2 text-xs font-semibold text-slate-600">Plazo<select value={form.hours} onChange={e => update('hours', e.target.value)} className="border border-slate-200 px-3 py-2.5 text-sm"><option value="4">4 horas</option><option value="8">8 horas</option><option value="12">12 horas</option><option value="18">18 horas</option></select></label> : <div className="flex flex-col justify-end gap-2 text-xs font-semibold text-slate-600"><span>Plazo automático</span><div className="border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm">36 horas</div></div>}</div><div className="mt-5 flex items-center gap-3"><button onClick={submit} className="bg-blue-700 px-5 py-2.5 text-sm font-bold text-white">Registrar pedido</button>{message && <span className="text-xs font-semibold text-slate-500">{message}</span>}</div></section><section className="border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pedidos registrados</p><h2 className="mt-1 text-lg font-bold">Cola de pedidos ({orders.length})</h2></div><Package className="size-5 text-slate-400" /></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="border-y border-slate-200 text-[10px] uppercase tracking-wider text-slate-400"><tr>{['ID', 'Cliente', 'Coordenadas', 'Unidades', 'Entrega', 'Ingreso', 'Fecha/hora límite'].map(h => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody>{orders.map(o => <tr key={o.id} className="border-b border-slate-100"><td className="px-3 py-3 font-bold">{o.id}</td><td className="px-3 py-3">{o.customer}</td><td className="px-3 py-3">({o.x}, {o.y}) km</td><td className="px-3 py-3">{o.units}</td><td className="px-3 py-3">{o.delivery} · {o.hours} h</td><td className="px-3 py-3 text-slate-500">{o.entered}</td><td className="px-3 py-3 text-slate-500">{o.deadline}</td></tr>)}</tbody></table></div></section></div> }

const COLOR_TIPO: Record<TipoVehiculo, string> = { AUTO: '#2563eb', MOTO: '#7c3aed', BICICLETA: '#0f9f8d' }
const CLASE_TIPO: Record<TipoVehiculo, string> = { AUTO: 'bg-blue-600', MOTO: 'bg-violet-600', BICICLETA: 'bg-teal-600' }
const ETIQUETA_TIPO: Record<TipoVehiculo, string> = { AUTO: 'Auto', MOTO: 'Moto', BICICLETA: 'Bicicleta' }
const CLASE_SEMAFORO = { verde: 'bg-emerald-600', ambar: 'bg-amber-500', rojo: 'bg-red-600' } as const
// Nombres que usa el panel del operador para cada almacén del back-end
const NOMBRE_ALMACEN: Record<string, string> = { 'ALM-CENTRAL': 'Almacén central', 'ALM-NOROESTE': 'Nor-Oeste', 'ALM-ESTE': 'Intermedio Este' }

// Con `datos` (escenario real del back-end) el mapa dibuja almacenes, vehículos, rutas y pedidos reales;
// sin `datos` muestra la escena de demostración del prototipo.
function Map({ state, highlightOrderId, full = false, replanned = false, onWarehouse, datos }: { state: ExecState; highlightOrderId?: string | null; full?: boolean; replanned?: boolean; onWarehouse?: (name: string) => void; datos?: MapaDatos | null }) { const incident = state === 'incident'; const isCollapse = state === 'collapse'; const W = 1000, H = 520; const p = (x: number, y: number) => `${x / 70 * W},${H - y / 50 * H}`; const r = (a: [number, number][]) => a.map(([x, y]) => p(x, y)).join(' '); return <div className={`${full ? 'absolute inset-0' : 'relative min-h-[480px]'} overflow-hidden bg-[#e9eef0]`}><svg className="absolute inset-0 size-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"><rect width={W} height={H} fill="#e9eef0" />{Array.from({ length: 71 }, (_, x) => <path key={`x${x}`} d={`M${x / 70 * W} 0V${H}`} stroke={x % 10 === 0 ? '#9fb0b8' : '#d5dde0'} strokeWidth={x % 10 === 0 ? 1.1 : .5} />)}{Array.from({ length: 51 }, (_, y) => <path key={`y${y}`} d={`M0 ${H - y / 50 * H}H${W}`} stroke={y % 10 === 0 ? '#9fb0b8' : '#d5dde0'} strokeWidth={y % 10 === 0 ? 1.1 : .5} />)}{[0, 10, 20, 30, 40, 50, 60, 70].map(x => <text key={x} x={x / 70 * W + 4} y={H - 8} fill="#475569" fontSize="12" fontWeight="700" style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 3 }}>{x}</text>)}{[0, 10, 20, 30, 40, 50].map(y => <text key={y} x="8" y={H - y / 50 * H - 6} fill="#475569" fontSize="12" fontWeight="700" style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 3 }}>{y}</text>)}{!datos && <><polyline points={r([[25, 15], [25, 21], [35, 21], [35, 34], [48, 34], [48, 42], [66, 42]])} fill="none" stroke="#2563eb" strokeWidth="3" opacity="0.85" /><polyline points={r([[12, 38], [12, 29], [19, 29], [19, 18], [35, 18], [35, 7], [43, 7]])} fill="none" stroke="#7c3aed" strokeWidth="3" opacity="0.85" /><polyline points={r([[55, 27], [55, 20], [48, 20], [48, 12], [43, 12], [43, 7]])} fill="none" stroke="#0f9f8d" strokeWidth="3" opacity="0.85" />{(incident || replanned) && <><polyline points={r([[25, 15], [25, 21], [35, 21], [35, 34], [48, 34]])} fill="none" stroke="#94a3b8" strokeWidth="4.5" strokeDasharray="12 8" /><polyline points={r([[25, 15], [25, 21], [29, 21], [29, 27], [48, 27], [48, 34]])} fill="none" stroke="#2563eb" strokeWidth="4.5" /><polyline points={r([[31, 21], [34, 21], [34, 25]])} fill="none" stroke="#dc2626" strokeWidth="5" /></>}</>}{datos?.rutas.map(ru => <g key={ru.id}><polyline points={r(ru.puntos)} fill="none" stroke={COLOR_TIPO[ru.tipo]} strokeWidth="3" opacity="0.85" />{ru.recorrido.length > 1 && <polyline points={r(ru.recorrido)} fill="none" stroke="#94a3b8" strokeWidth="3.5" strokeDasharray="6 5" />}</g>)}</svg>{!full && <div className="absolute left-4 top-4 bg-white/90 px-3 py-2 text-xs font-bold text-slate-700 shadow"><MapPin className="mr-2 inline size-4 text-blue-600" />Origen (0,0) abajo-izquierda · Cuadrícula 1 km · 70 × 50 km</div>}{(datos ? datos.almacenes.map(a => [NOMBRE_ALMACEN[a.codigo] ?? a.codigo, a.x, a.y, a.central ? 'blue' : 'slate', a.vehiculosEnBase]) : [['Almacén central', 25, 15, 'blue'], ['Nor-Oeste', 12, 38, 'slate'], ['Intermedio Este', 55, 27, 'slate']]).map(([name, x, y, tone, enBase]) => <div key={name as string} title={`${name} (${x},${y})${onWarehouse ? ' · clic para ver stock' : ''}`} onClick={() => onWarehouse?.(name as string)} className={`absolute -translate-x-1/2 -translate-y-1/2 ${onWarehouse ? 'cursor-pointer transition hover:scale-110' : ''}`} style={{ left: `${(x as number) / 70 * 100}%`, top: `${100 - (y as number) / 50 * 100}%` }}><div className={`flex size-8 items-center justify-center border-2 border-white shadow-md ring-1 ring-slate-300 ${tone === 'blue' ? 'bg-blue-700' : 'bg-slate-700'} text-white`}><Warehouse className="size-4" /></div><span className="mt-1 block whitespace-nowrap bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 shadow-sm">{name as string} · ({x},{y}){datos && ` · ${enBase} en base`}</span></div>)}{(datos ? datos.vehiculos.map(v => [ETIQUETA_TIPO[v.tipo], Math.round(v.x * 10) / 10, Math.round(v.y * 10) / 10, v.tipo === 'AUTO' ? Car : Bike, CLASE_TIPO[v.tipo], `${v.codigo} · carga ${v.carga}/${v.capacidad}`]) : [['Auto', 35, 34, Car, 'bg-blue-600', 'V-014 · 40 km/h'], ['Moto', 19, 29, Bike, 'bg-violet-600', 'M-022 · 25 km/h'], ['Bicicleta', 48, 12, Bike, 'bg-teal-600', 'B-031 · 12 km/h']]).map(([name, x, y, Icon, color, detail]) => <div key={detail as string} title={`${name} ${detail} · (${x},${y})`} className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition hover:scale-110" style={{ left: `${(x as number) / 70 * 100}%`, top: `${100 - (y as number) / 50 * 100}%` }}><div className={`flex size-8 items-center justify-center rounded-full ${color as string} text-white shadow-md ring-2 ring-white`}><Icon className="size-4" /></div><span className="mt-1 block whitespace-nowrap bg-white/90 px-1 text-[10px] font-bold text-slate-700 shadow-sm">{name as string}</span></div>)}{datos ? datos.pedidos.map(pe => <div key={pe.id} title={`${pe.codigo} · destino (${pe.x},${pe.y}) · ${pe.cantidad} u · ${pe.estado}${pe.margenH != null ? ` · margen ${pe.margenH.toFixed(1)} h` : ''}`} style={{ left: `${pe.x / 70 * 100}%`, top: `${100 - pe.y / 50 * 100}%` }} className="absolute -translate-x-1/2 -translate-y-1/2 transition hover:scale-125"><div className={`size-3.5 rounded-full border-2 border-white shadow-md ${CLASE_SEMAFORO[pe.semaforo]}`} />{datos.pedidos.length <= 40 && <span className="mt-1 block whitespace-nowrap bg-white/90 px-1 text-[10px] font-bold text-slate-700 shadow-sm">{pe.codigo}</span>}</div>) : [['PED-002', 19, 29], ['PED-001', 35, 18], ['PED-003', 43, 7], ['PED-137', 48, 34], ['PED-140', 66, 42]].map(([id, x, y]) => { const isCause = (highlightOrderId === id) || ((isCollapse) && id === 'PED-137'); const isIncidentClient = (i => i === 3)([['PED-002', 19, 29], ['PED-001', 35, 18], ['PED-003', 43, 7], ['PED-137', 48, 34], ['PED-140', 66, 42]].findIndex(([cid]) => cid === id)); return <div key={id as string} title={`${id} · destino (${x},${y})`} style={{ left: `${(x as number) / 70 * 100}%`, top: `${100 - (y as number) / 50 * 100}%` }} className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition hover:scale-125"><div className={`size-3.5 rounded-full border-2 border-white shadow-md ${isCause ? 'animate-ping bg-red-600' : ''}`} /><div className={`size-3.5 rounded-full border-2 border-white shadow-md absolute inset-0 ${isCause ? 'bg-red-600' : (incident && isIncidentClient) ? 'bg-amber-500' : 'bg-emerald-600'}`} /><span className={`mt-1 block whitespace-nowrap px-1 text-[10px] font-bold shadow-sm ${isCause ? 'bg-red-700 text-white' : 'bg-white/90 text-slate-700'}`}>{id as string}</span>{isCause && <span className="mt-0.5 block whitespace-nowrap bg-red-50 px-1 text-[10px] font-bold text-red-700 shadow">Pedido causante del colapso</span>}</div> })}{incident && <div className="absolute left-[45%] top-[32%] bg-red-50 px-3 py-2 text-xs font-bold text-red-700 shadow"><AlertTriangle className="mr-1 inline size-4" />Incidencia detectada · Replanificación en proceso</div>}{isCollapse && highlightOrderId && <div className={`absolute right-4 ${full ? 'top-16' : 'top-4'} bg-red-700 px-3 py-2 text-xs font-bold text-white shadow`}>Localizando {highlightOrderId} · (48,34) · fuera de plazo</div>}<div className={`absolute ${full ? 'bottom-9 right-4 max-w-[560px]' : 'bottom-4 left-4'} flex flex-wrap items-center gap-x-4 gap-y-1 bg-white/95 px-3 py-2 text-[10px] font-semibold text-slate-700 shadow`}>{full && <span className="w-full text-slate-500"><MapPin className="mr-1 inline size-3 text-blue-600" />Origen (0,0) abajo-izquierda · Cuadrícula 1 km · 70 × 50 km</span>}<span className="flex items-center gap-1"><span className="inline-block size-3 border-2 border-white bg-blue-700 shadow" />Almacén</span><span className="flex items-center gap-1"><span className="inline-block size-3 rounded-full bg-blue-600" />Auto</span><span className="flex items-center gap-1"><span className="inline-block size-3 rounded-full bg-violet-600" />Moto</span><span className="flex items-center gap-1"><span className="inline-block size-3 rounded-full bg-teal-600" />Bicicleta</span><span className="flex items-center gap-1"><span className="inline-block size-3 rounded-full bg-emerald-600" />{datos ? 'Pedido · margen holgado' : 'Cliente destino'}</span>{datos && <><span className="flex items-center gap-1"><span className="inline-block size-3 rounded-full bg-amber-500" />Margen justo</span><span className="flex items-center gap-1"><span className="inline-block size-3 rounded-full bg-red-600" />Margen crítico</span></>}<span className="flex items-center gap-1"><span className="inline-block h-0.5 w-5 bg-blue-600" />Ruta vigente</span><span className="flex items-center gap-1"><span className="inline-block h-0 w-5 border-t-2 border-dashed border-slate-400" />{datos ? 'Tramo ya recorrido' : 'Ruta anterior'}</span>{(incident || replanned || isCollapse) && <span className="flex items-center gap-1 text-red-700"><AlertTriangle className="size-3" />Bloqueo</span>}{isCollapse && <span className="flex items-center gap-1 text-red-700"><span className="inline-block size-3 rounded-full bg-red-600" />Pedido causante</span>}</div></div> }

function ScenarioSelect({ scenario, setScenario, setState, onStartFive }: { scenario: Scenario; setScenario: (s: Scenario) => void; setState: (s: ExecState) => void; onStartFive: (start: string) => Promise<void> }) {
  const [start, setStart] = useState('2026-09-08T08:00')
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')
  const [coverage, setCoverage] = useState<Cobertura | null>(null)
  const [coverageError, setCoverageError] = useState('')
  const simSelected = scenario !== 'day'
  // CU-02: al elegir la fecha se consulta si los archivos de ventas cubren los cinco días
  useEffect(() => {
    if (scenario !== 'five' || !start) return
    let vigente = true
    const t = setTimeout(() => {
      validarCobertura(start)
        .then(c => { if (vigente) { setCoverage(c); setCoverageError('') } })
        .catch(e => { if (vigente) { setCoverage(null); setCoverageError(mensajeError(e)) } })
    }, 400)
    return () => { vigente = false; clearTimeout(t) }
  }, [scenario, start])
  const start5 = async () => {
    setStarting(true); setStartError('')
    try { await onStartFive(start) } catch (e) { setStartError(mensajeError(e)) } finally { setStarting(false) }
  }
  const fiveBlocked = scenario === 'five' && (!start || starting || (coverage !== null && coverage.faltantes.length > 0))
  const step = 'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold'
  return <section className="flex flex-col gap-4">
    {/* Operación en tiempo real: siempre activa, no se inicia */}
    <div className={`border p-3 ${simSelected ? 'border-slate-200 bg-white' : 'border-emerald-200 bg-emerald-50'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold">Operación en tiempo real</p>
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700"><span className="size-2 rounded-full bg-emerald-600" />Siempre activa</span>
      </div>
      <p className="mt-1 text-xs text-slate-600">Es el uso normal del sistema con los pedidos del día (08/09/2026). No hay que iniciarla ni configurarla.</p>
      {simSelected
        ? <button onClick={() => { setScenario('day'); setState('running') }} className="mt-2 border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700">Volver a la operación en tiempo real</button>
        : <p className="mt-2 text-xs font-semibold text-emerald-700">El mapa muestra ahora la operación en tiempo real.</p>}
    </div>

    {/* Simulaciones: elegir tipo → configurar → iniciar */}
    <div className="border border-slate-200 p-3">
      <p className="text-sm font-bold">Simulaciones</p>
      <p className="mt-1 text-xs text-slate-600">Sirven para probar el sistema con un periodo simulado, sin afectar la operación real.</p>

      <p className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-700"><span className={`${step} bg-blue-700 text-white`}>1</span>Elige el tipo de simulación</p>
      <div className="mt-2 grid gap-2" role="radiogroup" aria-label="Tipo de simulación">
        {(Object.keys(simLabels) as SimType[]).map(key => {
          const selected = scenario === key
          return <button key={key} role="radio" aria-checked={selected} onClick={() => { setScenario(key); setState('idle') }} className={`flex items-start gap-3 border p-3 text-left ${selected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-blue-600' : 'border-slate-300'}`}>{selected && <span className="size-2 rounded-full bg-blue-600" />}</span>
            <span><span className="block text-sm font-bold">{key === 'five' ? 'Cinco días' : 'Hasta el colapso logístico'}</span><span className="mt-0.5 block text-xs text-slate-500">{key === 'five' ? 'Simula exactamente 5 días desde la fecha que elijas y muestra el resumen al terminar.' : 'Simula sin fecha de fin hasta que la flota ya no pueda entregar a tiempo; muestra cuándo y qué pedido lo causó.'}</span></span>
          </button>
        })}
      </div>

      <p className={`mt-4 flex items-center gap-2 text-xs font-bold ${simSelected ? 'text-slate-700' : 'text-slate-400'}`}><span className={`${step} ${simSelected ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-500'}`}>2</span>Configura</p>
      {scenario === 'five' && <div className="mt-2 flex flex-col gap-2"><label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">Fecha y hora de inicio<input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className="border border-slate-200 px-3 py-2" /></label><p className="text-xs text-slate-500">Termina sola el <b>{start ? cincoDiasDespues(start) : '—'}</b> (5 días después).</p>{coverage && (coverage.faltantes.length > 0
        ? <p className="border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700">Faltan datos de ventas para ese periodo: {coverage.faltantes.join(', ')}.</p>
        : <p className="text-xs text-emerald-700">Datos de ventas: {coverage.archivos.join(' + ')} · {coverage.pedidos} pedidos en el periodo{coverage.lineasInvalidas > 0 ? ` · ${coverage.lineasInvalidas} líneas inválidas ignoradas` : ''}.</p>)}{coverageError && <p className="text-xs font-semibold text-amber-700">{coverageError}</p>}</div>}
      {scenario === 'collapse' && <p className="mt-2 text-xs text-slate-500">No requiere configuración: empieza con la situación actual y sigue hasta el colapso.</p>}
      {!simSelected && <p className="mt-2 text-xs text-slate-400">Primero elige un tipo de simulación.</p>}

      <p className={`mt-4 flex items-center gap-2 text-xs font-bold ${simSelected ? 'text-slate-700' : 'text-slate-400'}`}><span className={`${step} ${simSelected ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-500'}`}>3</span>Inicia</p>
      {/* Cinco días: la ejecuta el back-end. Colapso: todavía es el recorrido del prototipo. */}
      <button onClick={() => scenario === 'five' ? start5() : setState('running')} disabled={!simSelected || fiveBlocked} className={`mt-2 w-full px-4 py-2.5 text-sm font-bold text-white ${simSelected && !fiveBlocked ? 'bg-blue-700' : 'cursor-not-allowed bg-slate-300'}`}>{scenario === 'five' ? (starting ? 'Iniciando en el servidor…' : 'Iniciar simulación de cinco días') : scenario === 'collapse' ? 'Iniciar simulación hasta el colapso' : 'Iniciar simulación'}</button>
      {startError && <p role="alert" className="mt-2 border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700">{startError}</p>}
    </div>
  </section>
}

function CollapseResults({ variant = 'collapse', onLocate, sim }: { variant?: 'five' | 'collapse' | 'day'; onLocate?: (id: string) => void; sim?: VistaSimulacion | null }) {
  // Con una simulación del back-end se muestran sus conteos reales; sin ella, los valores de ejemplo del prototipo
  const c = sim?.pedidos
  const periodo = sim && c ? [['Inicio del periodo', fechaHora(sim.fechaInicio)], ['Fin del periodo', fechaHora(sim.fechaFin)], ['Pedidos del periodo', String(c.incorporados)], ['Pedidos sin ruta factible', String(c.noEntregados)]] : [['Inicio del periodo','08/09/2026 · 08:00'],['Fin del periodo','13/09/2026 · 08:00'],['Pedidos del periodo','211'],['Duración real de la simulación','00:42:18']]
  const indicadores = sim && c ? [['Entregados dentro del plazo', `${c.entregadosATiempo} · ${porcentaje(c.entregadosATiempo, c.incorporados)}`], ['Entregados fuera del plazo', `${c.entregados - c.entregadosATiempo} · ${porcentaje(c.entregados - c.entregadosATiempo, c.incorporados)}`], ['No entregados', `${c.noEntregados} · ${porcentaje(c.noEntregados, c.incorporados)}`], ['Pendientes o en ruta al cierre', `${c.abiertos} · ${porcentaje(c.abiertos, c.incorporados)}`]] : [['Entregados dentro del plazo','184 · 87%'],['Entregados fuera del plazo','16 · 8%'],['Pendientes','8 · 4%'],['En ruta','3 · 1%'],['Distancia total recorrida','4 680 km'],['Costo operativo total','S/ 18 930']]
  const title = variant === 'five' ? 'Resumen final · Simulación 5 días' : variant === 'day' ? 'Corte del día · Operación día a día (sin estado final)' : 'Resumen final · Colapso logístico'; const tone = variant === 'collapse' ? 'red' : 'slate'; return <section className={`border bg-white p-4 shadow-sm ${tone === 'red' ? 'border-red-200' : 'border-slate-200'}`}><div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-3 ${tone === 'red' ? 'border-red-100' : 'border-slate-100'}`}><div><p className={`text-[10px] font-bold uppercase tracking-widest ${tone === 'red' ? 'text-red-700' : 'text-blue-700'}`}>Resultados finales · cantidad y % de cumplimiento</p><h3 className="mt-1 text-base font-bold">{title}</h3></div><span className={`border px-2.5 py-1 text-xs font-bold ${tone === 'red' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>{variant === 'day' ? 'Corte operativo' : 'Estado final'}</span></div><div className="mt-4 grid gap-4"><div className="grid grid-cols-2 gap-2">{(variant === 'collapse' ? [['Instante del colapso','11/09/2026 · 16:42'],['Pedido causante','PED-137 · (48,34)'],['Plazo comprometido','11/09/2026 · 19:10'],['Estado del pedido','No entregable dentro del plazo']] : periodo).map(([label,value]) => <div key={label} className="border border-slate-100 bg-slate-50 px-3 py-2"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-0.5 text-sm font-bold">{value}</p>{label === 'Pedido causante' && onLocate && <button onClick={() => onLocate('PED-137')} className="mt-2 border border-red-300 bg-white px-2.5 py-1.5 text-xs font-bold text-red-700">Localizar en mapa</button>}</div>)}</div><div><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Indicadores acumulados</p><div className="grid grid-cols-2 gap-2">{indicadores.map(([label,value]) => <div key={label} className="border border-slate-100 px-3 py-2"><p className="text-[10px] leading-tight text-slate-500">{label}</p><p className="mt-1 text-base font-bold">{value}</p></div>)}</div>{sim ? <p className="mt-4 text-[11px] text-slate-500">Distancia, costo y desglose por vehículo todavía no los expone el back-end.</p> : <><p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Desglose por tipo de vehículo</p><div className="grid grid-cols-3 gap-2">{[['Autos','2 410 km · S/ 9 840'],['Motos','1 520 km · S/ 5 920'],['Bicicletas','750 km · S/ 3 170']].map(([label,value]) => <div key={label} className="border border-slate-100 px-3 py-2"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div>)}</div></>}</div></div></section> }

function Operator({ scenario, setScenario, state, setState, replanned, setReplanned, sim, setSim, mapa }: { mapa: MapaDatos | null;  scenario: Scenario; setScenario: (s: Scenario) => void; state: ExecState; setState: (s: ExecState) => void; replanned: boolean; setReplanned: (r: boolean) => void; sim: VistaSimulacion | null; setSim: (s: VistaSimulacion | null) => void }) {
  const [performance, setPerformance] = useState(false)
  const [warehouse, setWarehouse] = useState<string | null>(null)
  const [params, setParams] = useState(false)
  const [breakdown, setBreakdown] = useState(false)
  const [speeds, setSpeeds] = useState({ Auto: '40', Moto: '25', Bicicleta: '12' })
  const [orderLight, setOrderLight] = useState({ verde: '8', rojo: '2' })
  const [stockLight, setStockLight] = useState({ verde: '50', rojo: '20' })
  const [paramsMsg, setParamsMsg] = useState('')
  const [faultType, setFaultType] = useState('')
  const [faultUnit, setFaultUnit] = useState('')
  const [faultError, setFaultError] = useState('')
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
    setSim(null); setSimMsg(''); setReplanned(false); setHighlightOrderId(null); setScenario('day'); setState('running')
  }
  const startFive = async (start: string) => { const v = await iniciarCincoDias(start); setSim(v); setReplanned(false); setState('running') }
  const controlSim = async (accion: (id: number) => Promise<VistaSimulacion>) => {
    if (!sim) return
    setSimBusy(true); setSimMsg('')
    try { setSim(await accion(sim.simulacion.escenarioId)) } catch (e) { setSimMsg(mensajeError(e)) } finally { setSimBusy(false) }
  }
  const openWarehouse = (w: string) => { setWarehouse(w); setPanel(true); setTimeout(() => document.getElementById('panel-almacen')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50) }
  const applyParams = () => {
    const nums = [speeds.Auto, speeds.Moto, speeds.Bicicleta, orderLight.verde, orderLight.rojo, stockLight.verde, stockLight.rojo].map(Number)
    if (nums.some(n => !Number.isFinite(n) || n < 0) || nums.slice(0, 3).some(n => n <= 0)) return setParamsMsg('Revisa los valores: deben ser números positivos.')
    if (Number(orderLight.verde) <= Number(orderLight.rojo)) return setParamsMsg('En pedidos, el límite de verde debe ser mayor que el de rojo.')
    if (Number(stockLight.verde) <= Number(stockLight.rojo) || Number(stockLight.verde) > 100) return setParamsMsg('En stock, verde debe ser mayor que rojo y como máximo 100 %.')
    setParamsMsg('Cambios aplicados. No alteran el reloj de la ejecución.')
  }
  const toolButton = 'border bg-white/95 px-3 py-2 text-xs font-bold shadow'
  const field = 'mt-1 w-full border border-slate-200 bg-white px-2 py-1.5'
  return <div className="relative h-full">
    {/* El mapa ocupa todo el espacio libre; con el panel abierto se corre a su derecha (en pantallas medianas o más) */}
    <div className={`absolute inset-y-0 right-0 ${panel ? 'left-0 md:left-[412px]' : 'left-0'}`}><Map full state={state} replanned={replanned} highlightOrderId={highlightOrderId} onWarehouse={openWarehouse} datos={mapa} /></div>

    {/* Acciones sobre el mapa */}
    <div className="absolute right-3 top-14 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap justify-end gap-2 md:top-3">
      <button onClick={() => { setParams(!params); setPanel(true) }} className={`${toolButton} ${params ? 'border-blue-600 text-blue-700' : 'border-slate-200'}`}><Settings2 className="mr-1 inline size-4" />Parámetros operativos</button>
      {!simFinished && <button onClick={() => setBreakdown(true)} className={`${toolButton} border-red-200 text-red-700`}><Wrench className="mr-1 inline size-4" />Registrar avería</button>}
      {state === 'running' && !replanned && <button onClick={() => { setReplanned(false); setState('incident') }} className={`${toolButton} border-red-200 text-red-700`}>Ver incidencia planificada</button>}
      {state === 'incident' && <button onClick={() => { setReplanned(true); setState('running') }} title="Replanificar no termina la ejecución: la operación continúa" className="bg-blue-700 px-3 py-2 text-xs font-bold text-white shadow">Plan actualizado</button>}
      {state === 'running' && scenario === 'collapse' && <button onClick={() => setState('collapse')} className="bg-red-700 px-3 py-2 text-xs font-bold text-white shadow">Simular colapso</button>}
    </div>

    {/* Panel de control recogible: el mapa sigue ocupando toda la pantalla */}
    {panel ? <aside className="absolute bottom-0 left-0 top-0 z-10 flex w-[412px] max-w-[calc(100%-1.5rem)] flex-col border-r border-slate-200 bg-white shadow-lg">
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Operador · Vista operativa</p><h2 className="mt-0.5 text-base font-bold">Mapa y control de ejecución</h2></div>
        <button onClick={() => setPanel(false)} title="Recoger panel y ver el mapa completo" aria-label="Recoger panel" className="border border-slate-200 p-1.5"><ChevronLeft className="size-4" /></button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {params && <div className="border border-blue-200 bg-slate-50 p-4 text-xs">
          <div className="flex items-center justify-between"><p className="text-sm font-bold">Parámetros operativos</p><button onClick={() => setParams(false)} aria-label="Cerrar parámetros"><X className="size-4" /></button></div>
          <p className="mt-3 font-bold text-slate-700">Velocidad promedio (km/h)</p>
          <div className="mt-1 grid grid-cols-3 gap-2">{(['Auto', 'Moto', 'Bicicleta'] as Vehicle[]).map(v => <label key={v} className="font-semibold">{v}<input type="number" value={speeds[v]} onChange={e => setSpeeds({ ...speeds, [v]: e.target.value })} className={field} /></label>)}</div>
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
          <p className="mt-1 text-xs text-slate-600">{simLabels[scenario as SimType]}. La operación en tiempo real sigue activa en paralelo.</p>
          {scenario === 'five' && sim && <div className="mt-3 flex flex-col gap-2 text-xs">
            <p>Ejecutándose en el servidor · <b>{fechaHora(sim.fechaSimulada, true)}</b>{sim.simulacion.estado === 'PAUSADA' && <span className="ml-1 font-bold text-amber-700">· en pausa</span>}</p>
            <div className="h-2 w-full bg-white" role="progressbar" aria-valuenow={Math.round(sim.progreso * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de los cinco días"><div className="h-2 bg-blue-600" style={{ width: `${Math.round(sim.progreso * 100)}%` }} /></div>
            <p className="text-slate-600">{Math.round(sim.progreso * 100)}% · {sim.simulacion.pedidosIncorporados} de {sim.simulacion.pedidosProgramados} pedidos ingresados · {sim.pedidos.entregados} entregados · {sim.simulacion.planificaciones} planificaciones</p>
            {sim.simulacion.pedidosDescartados > 0 && <p className="font-semibold text-red-700">{sim.simulacion.pedidosDescartados} pedidos sin ruta factible (no entregados)</p>}
            {(sim.simulacion.estado === 'ERROR' || sim.simulacion.estado === 'INTERRUMPIDA') && <p className="font-semibold text-red-700">La simulación se detuvo: {sim.simulacion.ultimoError ?? sim.simulacion.estado}</p>}
            <div className="flex flex-wrap gap-2">
              {sim.simulacion.estado === 'EJECUTANDO' && <button disabled={simBusy} onClick={() => controlSim(pausarSimulacion)} className="border border-slate-300 bg-white px-3 py-1.5 font-bold text-slate-700">Pausar</button>}
              {sim.simulacion.estado !== 'EJECUTANDO' && <button disabled={simBusy} onClick={() => controlSim(reanudarSimulacion)} className="border border-blue-300 bg-white px-3 py-1.5 font-bold text-blue-700">Reanudar</button>}
            </div>
            {simMsg && <p role="alert" className="font-semibold text-red-700">{simMsg}</p>}
          </div>}
          <button onClick={backToOperation} className="mt-2 border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">Detener y volver a la operación en tiempo real</button>
        </div>}
        {simFinished && <>
          <CollapseResults variant={scenario === 'collapse' ? 'collapse' : 'five'} sim={scenario === 'five' ? sim : null} onLocate={(id) => setHighlightOrderId(id)} />
          <button onClick={backToOperation} className="border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">Cerrar simulación y volver a la operación en tiempo real</button>
        </>}
        {!simActive && !simFinished && state !== 'incident' && <ScenarioSelect scenario={scenario} setScenario={setScenario} setState={s => { setReplanned(false); setState(s) }} onStartFive={startFive} />}

        {/* Atajo del prototipo: solo tiene sentido con una simulación de cinco días ya iniciada */}
        {scenario === 'five' && state !== 'idle' && !sim && <div className="flex flex-wrap items-center gap-2 border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs"><p className="w-full"><b>Atajo del prototipo:</b> saltar a un momento de la simulación</p>{([['T0 · Día 2 14:35', 'running', false], ['T1 · Día 3 10:20 incidencia', 'incident', false], ['T2 · Día 3 replanificado', 'running', true], ['T3 · Día 5 completado', 'complete', true]] as [string, ExecState, boolean][]).map(([label, next, rep], i) => <button key={label} onClick={() => { setReplanned(rep); setState(next) }} className={`border px-2.5 py-1.5 font-bold ${simStep === i ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white text-slate-600'}`}>{label}</button>)}</div>}

        {/* Al terminar, el resumen final reemplaza al panel de rendimiento */}
        <div className="flex flex-wrap gap-2">{!simFinished && <button onClick={() => setPerformance(!performance)} aria-expanded={performance} className="flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-xs font-bold">Rendimiento <ChevronDown className={`size-4 ${performance ? 'rotate-180' : ''}`} /></button>}{['Almacén central', 'Nor-Oeste', 'Intermedio Este'].map(w => <button key={w} title={`Ver stock de ${w}`} onClick={() => warehouse === w ? setWarehouse(null) : openWarehouse(w)} className={`border px-3 py-2 text-xs font-bold ${warehouse === w ? 'border-blue-700 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white'}`}>{w}</button>)}</div>
        {performance && !simFinished && <div className="grid gap-3 border border-slate-200 bg-white p-4 text-xs"><div><span className="text-slate-500">Cumplimiento</span><b className="block text-lg">184 · 87% dentro de plazo</b><span className="text-slate-600">16 · 8% fuera de plazo · 11 · 5% pendientes o en ruta</span></div><div className="grid grid-cols-2 gap-3"><div><span className="text-slate-500">Distancia recorrida</span><b className="block text-lg">4 680 km</b></div><div><span className="text-slate-500">Costo operativo</span><b className="block text-lg">S/ 18 930</b></div></div></div>}
        {warehouse && <div id="panel-almacen" className="border border-blue-200 bg-blue-50 p-4 text-xs"><button onClick={() => setWarehouse(null)} className="float-right" aria-label="Cerrar panel de almacén"><X className="size-4" /></button><b className="text-sm">{warehouse}</b>{warehouse === 'Almacén central'
          ? <p className="mt-2">Stock <b>ilimitado</b> (no usa semáforo) · 200 pedidos planificados · 24 unidades por salir.</p>
          : <p className="mt-2">Stock: <b>680 de 1 000 unidades · 68 %</b> · <span className="font-bold text-emerald-700">● Verde</span> · 36 pedidos por arribar.</p>}</div>}
      </div>
    </aside> : <button onClick={() => setPanel(true)} className="absolute left-3 top-3 z-10 flex items-center gap-2 border border-slate-200 bg-white/95 px-3 py-2 text-xs font-bold shadow"><PanelLeftOpen className="size-4" />Panel de control</button>}

    {breakdown && <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/30 p-4"><div className="w-full max-w-md border border-slate-200 bg-white p-5 shadow-xl"><button onClick={() => setBreakdown(false)} className="float-right" aria-label="Cerrar"><X className="size-4" /></button><h3 className="text-lg font-bold">Registrar avería</h3><p className="mt-1 text-xs text-slate-500">Instante vigente registrado por el sistema (no editable): <b>{faultTime}</b></p><label className="mt-4 flex flex-col gap-2 text-xs font-semibold">Unidad (vehículo inequívoco)<select value={faultUnit} onChange={e => setFaultUnit(e.target.value)} className="border border-slate-200 px-3 py-2"><option value="">Seleccionar unidad…</option><option>Auto V-014 · Ruta azul</option><option>Moto M-022 · Ruta violeta</option><option>Bicicleta B-031 · Ruta verde</option></select></label><label className="mt-3 flex flex-col gap-2 text-xs font-semibold">Tipo de avería<select value={faultType} onChange={e => setFaultType(e.target.value)} className="border border-slate-200 px-3 py-2"><option value="">Seleccionar tipo…</option><option>1 · Leve (sigue asignado con penalidad)</option><option>2 · Media (requiere replanificación)</option><option>3 · Grave (fuera de asignación inmediata)</option></select></label>{faultError && <p className="mt-3 text-xs font-bold text-red-700">{faultError}</p>}<div className="mt-5 flex gap-2"><button onClick={() => { if (!faultUnit) return setFaultError('Selecciona la unidad (vehículo + ruta).'); if (!faultType) return setFaultError('Selecciona el tipo de avería 1/2/3.'); setFaultError(''); setBreakdown(false); setReplanned(false); if (onDay) setScenario('day'); setState('incident') }} className="bg-red-700 px-4 py-2 text-xs font-bold text-white">Confirmar · marcar fuera de asignación</button><button onClick={() => { setFaultError(''); setBreakdown(false) }} className="border border-slate-300 px-4 py-2 text-xs font-bold">Cancelar</button></div></div></div>}
  </div>
}

function Viewer({ state, setState, scenario, replanned, sim, mapa }: { state: ExecState; setState: (s: ExecState) => void; scenario: Scenario; replanned: boolean; sim: VistaSimulacion | null; mapa: MapaDatos | null }) {
  const disconnected = state === 'disconnected'
  // Si hay una simulación elegida pero sin iniciar, lo que está en ejecución es la operación en tiempo real
  const viewingDay = scenario === 'day' || state === 'idle'
  const shown: ExecState = disconnected ? 'complete' : state === 'idle' ? 'running' : state
  const final = shown === 'complete' || shown === 'collapse'
  const title = disconnected ? 'Solo consulta · desconectado' : shown === 'collapse' ? 'Colapso logístico' : shown === 'complete' ? 'Periodo completado' : shown === 'incident' ? 'Incidencia activa · replanificación en proceso' : 'Estado actual de la operación'
  const c = sim?.pedidos
  // Con una simulación real, los indicadores salen del back-end; sin ella, de la escena de demostración
  const kpis = sim && c ? [['Fecha simulada', fechaHora(sim.fechaSimulada, true)], ['Avance del periodo', `${Math.round(sim.progreso * 100)}%`], ['Entregados a tiempo', `${c.entregadosATiempo} · ${porcentaje(c.entregadosATiempo, c.incorporados)}`], ['Pedidos abiertos', String(c.abiertos)], ['Vehículos en ruta', String(mapa?.resumen.vehiculosEnRuta ?? '—')], ['Costo del plan vigente', mapa?.resumen.costoPlan != null ? `S/ ${Math.round(mapa.resumen.costoPlan).toLocaleString('es-PE')}` : '—']] : mapa ? [['Hora simulada', horaSimulada(mapa.relojH)], ['Pedidos abiertos', String(mapa.resumen.pedidosAbiertos)], ['Vehículos en ruta', String(mapa.resumen.vehiculosEnRuta)], ['Algoritmo del plan', mapa.resumen.algoritmo ?? 'sin plan'], ['Costo del plan vigente', mapa.resumen.costoPlan != null ? `S/ ${Math.round(mapa.resumen.costoPlan).toLocaleString('es-PE')}` : '—'], ['Distancia del plan', mapa.resumen.distanciaPlanKm != null ? `${Math.round(mapa.resumen.distanciaPlanKm)} km` : '—']] : final ? [['Entregados dentro de plazo', '184 · 87%'], ['Fuera de plazo', '16 · 8%'], ['Pendientes / en ruta', '11 · 5%'], ['Distancia total', '4 680 km'], ['Costo total', 'S/ 18 930'], ['Duración real', '42:18']] : [['Pedidos entregados', '94%'], ['Pendientes', '8'], ['En ruta', '18'], ['Distancia', '2 940 km']]
  return <div className="relative h-full">
    <Map full replanned={replanned} state={shown} highlightOrderId={shown === 'collapse' && !mapa ? 'PED-137' : null} datos={mapa} />

    {/* Estado de la ejecución en curso, sobre el mapa */}
    <section className="absolute left-3 top-3 z-10 w-[380px] max-w-[calc(100%-1.5rem)] border border-slate-200 bg-white/95 p-4 shadow-lg">
      {disconnected && <div className="mb-3 flex items-center justify-between gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"><b>Desconectada · último estado conocido</b><button onClick={() => setState('running')} className="border border-amber-300 bg-white px-3 py-1.5 font-bold">Reconectar</button></div>}
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Visualizador · Solo consulta</p>
      <h2 className="mt-0.5 text-base font-bold">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">Ejecución en curso: {!sim && mapa ? 'escenario del back-end' : sim ? `${scenarioLabels.five} · ${sim.simulacion.estado.toLowerCase()}` : scenarioLabels[viewingDay ? 'day' : scenario]}. <span className="font-bold text-slate-600">Solo lectura de lo que está en ejecución (día a día o simulación activa); sin acceso a históricas ni acciones de edición.</span></p>
      {shown === 'collapse' && <div className="mt-3 border border-red-200 bg-red-50 p-3 text-xs text-red-800"><b>Instante del colapso: 11/09/2026 · 16:42</b><p className="mt-1">Pedido causante: PED-137 · (48,34) · resaltado en mapa · demanda pendiente sin capacidad disponible.</p></div>}
    </section>

    {/* Indicadores, sobre el mapa */}
    <div className="absolute bottom-3 left-3 z-10 grid w-[380px] max-w-[calc(100%-1.5rem)] grid-cols-2 gap-2">{kpis.map(([a, b]) => <div key={a} className="border border-slate-200 bg-white/95 p-2.5 shadow"><p className="text-[11px] text-slate-500">{a}</p><b className="mt-0.5 block text-base">{b}</b></div>)}</div>
  </div>
}

export default function Home() {
  const [role, setRole] = useState<Role>('registrador')
  const [scenario, setScenario] = useState<Scenario>('day')
  const [state, setState] = useState<ExecState>('idle')
  const [replanned, setReplanned] = useState(false)
  const [orders, setOrders] = useState(initialOrders)
  const [sim, setSim] = useState<VistaSimulacion | null>(null)
  const simId = sim?.simulacion.escenarioId
  const simAlive = simViva(sim)
  const [mapa, setMapa] = useState<MapaDatos | null>(null)
  const [mapaError, setMapaError] = useState('')
  // ?escenario=N abre un escenario concreto (útil para revisar uno sin simulación o desde otro equipo)
  const [escenarioUrl, setEscenarioUrl] = useState<number | null>(null)
  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get('escenario'))
    if (Number.isInteger(n) && n > 0) { setEscenarioUrl(n); return }
    // Un segundo dispositivo se engancha a la simulación que ya está corriendo en el servidor
    listarSimulaciones()
      .then(vs => { const v = vs.find(simViva); if (v) { setSim(v); setScenario('five'); setState('running') } })
      .catch(() => { /* sin back-end: queda la escena de demostración */ })
  }, [])
  const escenarioMapa = simId ?? escenarioUrl
  const mapaVivo = escenarioMapa != null && (simAlive || escenarioUrl != null)
  useEffect(() => {
    if (escenarioMapa == null) { setMapa(null); return }
    let activo = true
    const cargar = () => consultarMapa(escenarioMapa)
      .then(m => { if (activo) { setMapa(m); setMapaError('') } })
      .catch(e => { if (activo) setMapaError(mensajeError(e)) })
    cargar()
    if (!mapaVivo) return () => { activo = false }
    const t = setInterval(cargar, 2000)
    return () => { activo = false; clearInterval(t) }
  }, [escenarioMapa, mapaVivo])
  // El servidor conduce la simulación; aquí solo se consulta su progreso cada 2 s
  useEffect(() => {
    if (simId == null || !simAlive) return
    const t = setInterval(() => {
      consultarSimulacion(simId)
        .then(v => { setSim(v); if (v.simulacion.estado === 'FINALIZADA') setState('complete') })
        .catch(() => { /* se reintenta en el siguiente ciclo */ })
    }, 2000)
    return () => clearInterval(t)
  }, [simId, simAlive])
  const effectiveState: ExecState = state === 'idle' && (scenario === 'day' || role === 'visualizador') ? 'running' : state
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
  return <main className="flex h-dvh flex-col overflow-hidden bg-white font-sans text-slate-900">
    <Header scenario={scenario} state={effectiveState} replanned={replanned} sim={sim} escenario={mapa && escenarioMapa != null ? { id: escenarioMapa, relojH: mapa.relojH } : null} />
    <Nav role={role} setRole={setRole} />
    {role === 'registrador'
      ? <div className="min-h-0 flex-1 overflow-y-auto bg-[#f3f5f6] p-5 md:p-7"><div className="mx-auto max-w-[1500px]"><Registrar orders={orders} setOrders={setOrders} /></div></div>
      : <div className="relative min-h-0 flex-1">
          {mapaError && <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow">Mapa sin actualizar: {mapaError}</div>}
          {role === 'operador' && <Operator mapa={mapa} scenario={scenario} setScenario={setScenario} state={scenario === 'day' ? effectiveState : state} setState={setState} replanned={replanned} setReplanned={setReplanned} sim={sim} setSim={setSim} />}
          {role === 'visualizador' && <Viewer sim={sim} mapa={mapa} scenario={scenario} state={effectiveState} setState={setState} replanned={replanned} />}
        </div>}
  </main>
}
