'use client'

import { createPortal } from 'react-dom'
import { Fragment, type ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Bike, Motorbike, CalendarDays, Car, Check, ChevronDown, Clock, Gauge, Play, Upload, ChevronLeft, FileText, MapPin, Navigation, Package, PanelLeftOpen, Search, Settings2, Truck, Warehouse, Wrench, X } from 'lucide-react'
import { type EstadoPedido, type MapaDatos, type PedidoRastreo, type TipoVehiculo, type Pedido, type Tramo, type Umbrales, UMBRALES_PEDIDO, datosMapa, agruparPosiciones, direccionEn, consultarPedidos, semaforo, levantarIncidencia, listarSimulaciones, registrarAveria, registrarBloqueo, registrarPedido, tramosEntre } from '@/lib/api/operacion'
import { useOperacion } from '@/lib/operacion/useOperacion'
import { consultarEstadoSeleccionado, etiquetaEstadoEscenario } from '@/lib/operacion/estadoEscenario'
import { unidadesParaAveria } from '@/lib/operacion/unidadesParaAveria'
import { crearGeneraciones, regresarDeSimulacion, respuestaVigente, sondearSerial } from '@/lib/operacion/simulacionControl'
import { escenarioParaMapa } from '@/lib/operacion/seleccionEscenario'
import { simulacionDescubrible } from '@/lib/operacion/descubrimiento'
import { crearRecuperacionDia } from '@/lib/operacion/recuperacionDia'
import { PanelFlota, ocupacion } from '@/components/operacion/PanelFlota'
import { PanelEnvios } from '@/components/operacion/PanelEnvios'
import { MapaOperativo } from '@/components/operacion/MapaOperativo'
import { estadoEnEspanol } from '@/lib/operacion/mejorasV9'
import { PanelIndicadoresV9 } from '@/components/operacion/PanelIndicadoresV9'
import { PanelAlmacenesV9 } from '@/components/operacion/PanelAlmacenesV9'
import { PanelDatosV9 } from '@/components/operacion/PanelDatosV9'
import { PanelReportesV9 } from '@/components/operacion/PanelReportesV9'
import { PanelIncidenciasV9 } from '@/components/operacion/PanelIncidenciasV9'
import { ContextoV9, SuperficieOperacion, BotonHerramientasMapa, useV9 } from '@/components/operacion/ContextoV9'
import { HerramientasV9 } from '@/components/operacion/HerramientasV9'
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

function Header({ scenario, state, replanned, sim, segReal, escenario, dia, estadoUrl, idUrl }: { estadoUrl?: string; idUrl?: number | null; scenario: Scenario; state: ExecState; replanned: boolean; sim: VistaSimulacion | null; segReal: number; escenario?: { id: number; relojH: number; dia: boolean; fecha: string } | null; dia?: OperacionActual | null }) {
  const tipo=sim?.simulacion.tipo??(escenario?.dia?'DIA_A_DIA':scenario==='five'?'CINCO_DIAS':scenario==='collapse'?'COLAPSO':'DIA_A_DIA')
  const titulo=tipo==='DIA_A_DIA'?'Operación día a día':tipo==='CINCO_DIAS'?'Simulación de cinco días':'Simulación hasta el colapso'
  const fecha=estadoUrl==='Sin iniciar'?'Configura la fecha y hora de inicio':estadoUrl==='Preparando simulación'?'Creando un escenario independiente':sim?.fechaSimulada?fechaHora(sim.fechaSimulada,true):escenario?.fecha??(dia?.fechaHora?fechaHora(dia.fechaHora,true):'Esperando datos de la operación')
  const estado=estadoUrl??(sim?estadoEnEspanol(sim.simulacion.estado):dia?.estadoMotor?estadoEnEspanol(dia.estadoMotor):stateLabels[state])
  const ejecutando=sim?sim.simulacion.estado==='EJECUTANDO':dia?.estadoMotor==='EJECUTANDO'
  const pausada=sim?sim.simulacion.estado==='PAUSADA':dia?.estadoMotor==='PAUSADA'
  const error=sim?.simulacion.estado==='ERROR'||state==='disconnected'
  return <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5"><div className="flex min-w-0 items-center gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white"><Navigation className="size-5"/></div><div><p className="text-lg font-bold">PaqRap</p><p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Centro de control</p></div><div className="ml-2 hidden border-l border-slate-200 pl-4 sm:block"><p className="text-sm font-bold">{titulo}{idUrl!=null&&<span className="ml-2 rounded bg-slate-100 px-2 py-1 text-[10px] font-normal text-slate-500">Escenario {idUrl}</span>}</p><p className="mt-1 text-xs text-slate-500">{fecha}</p></div></div><span role="status" className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${error?'bg-red-50 text-red-700':ejecutando?'bg-emerald-50 text-emerald-700':pausada?'bg-amber-50 text-amber-800':'bg-slate-100 text-slate-600'}`}><span className={`size-1.5 rounded-full bg-current ${ejecutando?'animate-pulse':''}`}/>{estado}</span><p className="order-last w-full text-xs font-semibold text-slate-600 sm:hidden">{titulo} · {fecha}</p></header>
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

// Semáforo de existencias de los almacenes intermedios (% disponible); los mismos valores por defecto del panel de parámetros
const UMBRAL_STOCK = { verde: 50, rojo: 20 }
const tonoStock = (pct: number, u: Umbrales) => pct === 0 ? 'vacío' : pct >= u.verde ? 'verde' : pct < u.rojo ? 'rojo' : 'ambar'
// Umbrales vigentes de los dos semáforos: los fija el operador en «Parámetros operativos» y los usan mapa, leyenda y fichas

const TEXTO_SEMAFORO = { 'vacío': 'text-slate-700', verde: 'text-emerald-700', ambar: 'text-amber-700', rojo: 'text-red-700' } as const
const ETIQUETA_ESTADO: Record<EstadoPedido, string> = { PENDIENTE: 'Pendiente de asignar', ASIGNADO: 'Asignado a una ruta', EN_RUTA: 'En ruta', ENTREGADO: 'Entregado', NO_ENTREGADO: 'No entregado' }

// Buscador de pedidos por código (CU de consulta): resalta el pedido en el mapa y muestra su ficha
function BuscarPedido({ rastreo, buscado, setBuscado, hora, onUnidad }: { rastreo: PedidoRastreo[]; buscado: string | null; setBuscado: (c: string | null) => void; hora: (h: number) => string; onUnidad: (id: number) => void }) {
  const v9=useV9()
  const [texto,setTexto]=useState(''),[lista,setLista]=useState(false),[activo,setActivo]=useState(0)
  const contenedor=useRef<HTMLDivElement>(null),entrada=useRef<HTMLInputElement>(null)
  const q=texto.trim().toLowerCase()
  const coincidencias=q?rastreo.filter(x=>x.codigo.toLowerCase().includes(q)).slice(0,8):[]
  const ficha=buscado?rastreo.find(x=>x.codigo===buscado)??null:null
  const abierto=lista&&!!q&&ficha?.codigo!==texto
  useEffect(()=>setActivo(0),[texto])
  useEffect(()=>{const cerrar=(e:PointerEvent)=>{if(e.target instanceof Node&&!contenedor.current?.contains(e.target))setLista(false)};document.addEventListener('pointerdown',cerrar);return()=>document.removeEventListener('pointerdown',cerrar)},[])
  const elegir=(codigo:string)=>{v9.setRutasConsulta([]);v9.setRutaProducto(null);setBuscado(codigo);setTexto(codigo);setLista(false)}
  const limpiar=()=>{v9.setRutasConsulta([]);v9.setRutaProducto(null);setTexto('');setBuscado(null);setLista(false);entrada.current?.focus()}
  return <div ref={contenedor} className="buscador-pedido relative w-80 max-w-full text-xs">
    <form role="search" aria-label="Consultar un pedido" onSubmit={e=>{e.preventDefault();const c=rastreo.find(x=>x.codigo.toLowerCase()===q)??coincidencias[activo];if(c)elegir(c.codigo)}}>
      <Search aria-hidden="true"/>
      <input ref={entrada} role="combobox" aria-autocomplete="list" aria-expanded={abierto} aria-controls={abierto?'resultados-pedido':undefined} aria-activedescendant={abierto&&coincidencias[activo]?`resultado-pedido-${coincidencias[activo].id}`:undefined} value={texto} onChange={e=>{setTexto(e.target.value);setLista(true)}} onFocus={()=>setLista(true)} onKeyDown={e=>{if(e.key==='Escape'){setLista(false);return}if((e.key==='ArrowDown'||e.key==='ArrowUp')&&coincidencias.length){e.preventDefault();setLista(true);setActivo(n=>(n+(e.key==='ArrowDown'?1:-1)+coincidencias.length)%coincidencias.length)}}} placeholder="Buscar pedido por código" aria-label="Buscar pedido por código"/>
      {(texto||buscado)&&(!ficha||abierto)?<button type="button" onClick={limpiar} aria-label="Limpiar búsqueda" title="Limpiar búsqueda"><X className="size-4"/></button>:<kbd aria-hidden="true">↵</kbd>}
    </form>
    {abierto&&<div className="sugerencias-pedidos"><div className="titulo-sugerencias">Pedidos encontrados <span>↑ ↓ para elegir · ↵ para abrir</span></div><ul id="resultados-pedido" role="listbox" aria-label="Resultados de pedidos">{coincidencias.length===0?<li className="sin-resultados">Sin coincidencias para «{texto.trim()}».<small>Prueba con una parte del código.</small></li>:coincidencias.map((c,i)=><li key={c.id} id={`resultado-pedido-${c.id}`} role="option" aria-selected={activo===i} onMouseDown={e=>e.preventDefault()} onClick={()=>elegir(c.codigo)}><span><b>{c.codigo}</b><small>Destino ({c.x}, {c.y}) km</small></span><span className="estado-sugerencia">{ETIQUETA_ESTADO[c.estado]}</span></li>)}</ul></div>}
    {ficha&&!abierto&&<div className="panel-resultado-pedido" role="region" aria-label="Detalle del pedido"><FichaPedido p={ficha} hora={hora} onCerrar={limpiar} onUnidad={onUnidad}/></div>}
    {buscado&&!ficha&&!abierto&&<div className="panel-resultado-pedido" role="status"><p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">El pedido {buscado} ya no está en el escenario.</p></div>}
  </div>
}

function FichaPedido({ p, hora, onCerrar, onUnidad }: { p: PedidoRastreo; hora: (h: number) => string; onCerrar: () => void; onUnidad: (id: number) => void }) {
  const u = useContext(UmbralesCtx)
  const v9 = useV9()
  const cerrado = p.estado === 'ENTREGADO' || p.estado === 'NO_ENTREGADO'
  const plazo = Math.round(p.fechaLimiteH - p.horaIngresoH)
  const tono = p.estado === 'NO_ENTREGADO' ? 'border-red-200 bg-red-50 text-red-700' : p.estado === 'ENTREGADO' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-200 bg-blue-50 text-blue-700'
  const filas: [string, ReactNode][] = [
    ['Destino', `(${p.x}, ${p.y}) km · ${p.cantidad} u`],
    ['Tipo', `${p.tipo === 'PRIORIZADO' ? 'Priorizado' : 'Regular'} · plazo ${plazo} h`],
    ['Ingreso', hora(p.horaIngresoH)],
    ['Fecha límite', hora(p.fechaLimiteH)],
    ['Rutas y unidades', p.asociaciones.length ? <span key="asociaciones" className="flex flex-col gap-1">{p.asociaciones.map((a, i) => <button key={`${a.rutaId}-${i}`} onClick={() => { v9.setRutaProducto(a.rutaId); onUnidad(a.vehiculoId) }} aria-label={a.rutaId == null ? `Ver unidad ${a.vehiculoCodigo ?? a.vehiculoId}` : `Ver ruta ${a.rutaId} del pedido ${p.codigo}`} className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-2 text-left text-blue-700 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-600">{a.rutaId == null ? 'Servicio en curso' : `Ruta ${a.rutaId}`} · {a.vehiculoCodigo ?? 'Unidad no disponible'} · {a.cantidad == null ? 'cantidad no disponible' : `${a.cantidad} u`} · ETA {hora(a.etaH)}{a.entregado ? ' · entregado' : a.enServicio ? ' · en servicio' : ''}</button>)}</span> : cerrado ? 'Sin ruta vigente' : 'Sin asignación'],
    cerrado
      ? ['Entrega', p.entregadoEnH != null ? `${hora(p.entregadoEnH)} · ${p.entregadoEnH <= p.fechaLimiteH ? 'a tiempo' : 'fuera de plazo'}` : 'Sin entregar']
      : ['Llegada estimada', p.etaH != null ? hora(p.etaH) : 'Sin ruta asignada'],
  ]
  const luz = cerrado ? null : semaforo(p.margenH, u.pedido)
  if (!cerrado && p.margenH != null) filas.push(['Margen', <span key="m" className={luz ? TEXTO_SEMAFORO[luz] : ''}>{p.margenH.toFixed(1)} h{luz ? ` · ${luz === 'verde' ? 'holgado' : luz === 'ambar' ? 'justo' : 'crítico'}` : ''}</span>])
  return <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
    <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ficha del pedido</p><p className="text-sm font-bold">{p.codigo}</p></div><div className="flex shrink-0 items-start gap-1.5"><span className={`border px-2 py-0.5 font-bold ${tono}`}>{ETIQUETA_ESTADO[p.estado]}</span><button type="button" onClick={onCerrar} aria-label="Cerrar ficha del pedido" title="Cerrar ficha del pedido" className="flex size-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600"><X className="size-4" aria-hidden="true"/></button></div></div>
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">{filas.map(([a, b]) => <Fragment key={a}><dt className="text-slate-500">{a}</dt><dd className="font-semibold">{b}</dd></Fragment>)}</dl>
    <button onClick={onCerrar} className="mt-2 border border-slate-300 bg-white px-2.5 py-1 font-bold text-slate-600">Quitar búsqueda</button>
  </div>
}

// Incidencias (averías y bloqueos) en un solo lugar, el mismo en la operación día a día y en las simulaciones.
// Con un escenario del back-end se registran en él al reloj actual y el planificador replanifica; sin back-end,
// la avería recorre la escena de demostración del prototipo.
function Incidencias({ mapa, mapaActual, escenarioId, hora, instanteDemo, onDemo, onCambio, onCerrar }: { mapaActual: boolean; mapa: MapaDatos | null; escenarioId: number | null; hora: (h: number) => string; instanteDemo: string; onDemo: () => void; onCambio: () => void; onCerrar: () => void }) {
  const [tab, setTab] = useState<'averia' | 'bloqueo'>('averia')
  const [unidad, setUnidad] = useState('')
  const [tipo, setTipo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [bloqueo, setBloqueo] = useState({ x1: '', y1: '', x2: '', y2: '', horas: '2', motivo: '' })
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const real = escenarioId != null && mapa != null && mapaActual
  const vigentes = mapa?.incidencias ?? []
  const codigoDe = (id: number | null) => mapa?.flota.find(v => v.id === id)?.codigo ?? `V-${id}`
  // Primero las unidades en ruta, que son las que suelen averiarse en plena operación
  const unidades = unidadesParaAveria(mapa, real)
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
function ScenarioSelect({scenario,onStart,inicio,onInicio}:{scenario:Scenario;onStart:(tipo:SimType,start:string)=>Promise<void>;inicio:string;onInicio:(v:string)=>void}){
 const ctx=useV9(),start=inicio,setStart=onInicio,[starting,setStarting]=useState(false),[error,setError]=useState(''),[coverage,setCoverage]=useState<Cobertura|null>(null),[revision,setRevision]=useState(0)
 useEffect(()=>{const actualizar=()=>setRevision(n=>n+1);window.addEventListener('paqrap:datos-actualizados',actualizar);return()=>window.removeEventListener('paqrap:datos-actualizados',actualizar)},[])
 useEffect(()=>{if(scenario==='day'||!start)return;let vivo=true;setCoverage(null);const t=setTimeout(()=>{validarCobertura(start).then(c=>{if(vivo){setCoverage(c);setError('')}}).catch(e=>{if(vivo)setError(mensajeError(e))})},300);return()=>{vivo=false;clearTimeout(t)}},[scenario,start,revision])
 const iniciar=async()=>{setStarting(true);setError('');try{await onStart(scenario as SimType,start)}catch(e){setError(mensajeError(e))}finally{setStarting(false)}}
 if(scenario==='day')return <section className="rounded-xl bg-blue-50 p-3 text-xs leading-relaxed text-slate-600"><h3 className="font-bold text-slate-900">Operación día a día</h3><p className="mt-1">Sigue los pedidos registrados en tiempo real. Usa Flota, Almacenes, Envíos e Incidencias para consultar y operar.</p></section>
 const bloqueado=starting||!start||!coverage||coverage.archivos.length===0||(scenario==='five'&&coverage.faltantes.length>0)
 return <section className="space-y-4 text-xs"><div><h3 className="text-base font-bold">{scenario==='five'?'Simulación de cinco días':'Hasta el colapso'}</h3><p className="mt-1 leading-relaxed text-slate-500">{scenario==='five'?'El servidor consume el periodo elegido y conserva el reporte final.':'Finaliza al producirse un colapso operativo; la falta de datos se informa como un motivo distinto.'}</p></div>
 <button type="button" className="carga-previa-simulacion" onClick={()=>ctx.setPanelActivo('datos')}><span className="icono-carga-previa"><Upload className="size-5"/></span><span><b>1. Cargar archivos de entrada</b><small>Ventas, bloqueos y mantenimiento · archivos o ZIP</small></span><ChevronDown className="size-4 -rotate-90"/></button>
 <label className="block font-semibold">2. Fecha y hora de inicio<input type="datetime-local" step="60" className="mt-1 block w-full rounded-xl border p-2.5 font-normal" value={start} onChange={e=>setStart(e.target.value)}/></label>
 <p className="text-slate-500">{scenario==='five'?`Fin del periodo: ${start?cincoDiasDespues(start):'—'}`:'El colapso no tiene fecha de fin predefinida. El servidor controla el ritmo de ejecución.'}</p>
 <div className={`rounded-xl border p-3 leading-relaxed ${coverage?.faltantes.length?'border-amber-200 bg-amber-50 text-amber-900':'border-slate-200 bg-slate-50 text-slate-600'}`}><h4 className="font-bold">Cobertura de datos</h4>{!coverage?<p>Comprobando archivos del periodo…</p>:<><p>{coverage.archivos.join(' + ')||'Primero carga manualmente los archivos de ventas del periodo.'}</p><p>{coverage.pedidos.toLocaleString('es-PE')} pedidos en los primeros cinco días · {coverage.lineasInvalidas} líneas inválidas</p>{coverage.faltantes.length>0&&<p className="mt-1 font-semibold">Faltan: {coverage.faltantes.join(', ')}</p>}<p>Bloqueos planificados: {coverage.bloqueos??0}</p></>}<p className="mt-1 text-[11px]">La carga se realiza en su propio panel, antes de iniciar. Puedes seleccionar varios archivos mensuales o un ZIP.</p></div>
 <button onClick={()=>void iniciar()} disabled={bloqueado} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"><Play className="size-4"/>{starting?'Iniciando…':scenario==='five'?'Iniciar simulación de cinco días':'Iniciar simulación hasta el colapso'}</button><p role="alert" className="text-red-700">{error}</p></section>
}

/**
 * Al terminar una simulación (cinco días o hasta el colapso) abre el centro de reportes con su reporte de cierre y
 * la última planificación estable. Una sola vez por escenario: si el usuario lo cierra, no se vuelve a abrir.
 */
function AbrirReporteAlTerminar({ escenarioId }: { escenarioId: number | null }) {
  const v9 = useV9(), abierto = useRef<number | null>(null)
  useEffect(() => { if (escenarioId != null && abierto.current !== escenarioId) { abierto.current = escenarioId; v9.setPanelActivo('reportes') } }, [escenarioId])
  return null
}

// Resumen final de una simulación. Con la simulación del back-end muestra sus conteos, lo realmente recorrido y,
// en el colapso, el instante y el pedido causante; sin ella, los valores de ejemplo del prototipo.
function CollapseResults({variant='collapse',onLocate,sim,segReal=0,hora=horaSimulada}:{variant?:'five'|'collapse'|'day';onLocate?:(codigo:string)=>void;sim?:VistaSimulacion|null;segReal?:number;hora?:(h:number)=>string}){
 const ctx=useV9()
 if(!sim)return <section className="rounded-xl border p-4 text-xs text-slate-500">No hay un resultado del servidor para mostrar.</section>
 const c=sim.pedidos,ac=sim.acumulado,col=sim.colapso
 const titulo=variant==='five'?'Resumen del periodo':variant==='day'?'Corte de operación':col?'Colapso operativo':'Finalización sin colapso'
 const indicadores=[['Pedidos incorporados',c.incorporados],['Entregados a tiempo',c.entregadosATiempo],['Entregados fuera de plazo',Math.max(0,c.entregados-c.entregadosATiempo)],['No entregados',c.noEntregados],['Pendientes al corte',c.abiertos],['Recorrido real',ac?ac.distanciaKm.toFixed(1)+' km':'No disponible'],['Costo real',ac?'S/ '+ac.costo.toFixed(2):'No disponible']]
 return <section className="space-y-3 text-xs"><h3 className="text-base font-bold">{titulo}</h3><div className="rounded-xl border bg-slate-50 p-3 leading-relaxed"><p>Inicio: {fechaHora(sim.fechaInicio)}</p><p>Corte final: {fechaHora(sim.fechaSimulada)}</p><p>Tiempo real ejecutado: {duracion(segReal)}</p><p>Estado: {estadoEnEspanol(sim.simulacion.estado)}</p>{sim.cierre&&<p className="mt-2 font-semibold">{estadoEnEspanol(sim.cierre.motivo)}: {sim.cierre.detalle}</p>}{sim.simulacion.ultimoError&&<p className="mt-2 text-red-700">{sim.simulacion.ultimoError}</p>}</div><div className="grid grid-cols-2 gap-2">{indicadores.map(([k,v])=><div className="rounded-xl border p-3" key={String(k)}><p className="text-slate-500">{k}</p><b className="mt-1 block text-base">{v}</b></div>)}</div>{col?.pedido&&<button onClick={()=>onLocate?.(col.pedido!.codigo)} className="rounded-xl border border-red-200 bg-red-50 p-3 text-left text-red-800">Pedido causante: {col.pedido.codigo} · ({col.pedido.posX},{col.pedido.posY}) · plazo {hora(col.pedido.fechaLimiteH)}</button>}<button className="w-full rounded-xl bg-blue-700 px-3 py-3 font-bold text-white" onClick={()=>ctx.setPanelActivo('reportes')}>Abrir reporte legible y última planificación estable</button></section>
}

function Operator({ inicioPendiente, setInicioPendiente, scenario, setScenario, state, setState, replanned, setReplanned, sim, setSim, mapa, escenarioId, onCambio, onUmbrales, hora, segReal, unidadSeleccionada, onUnidad, buscado, setBuscado, warehouse, setWarehouse, historialCompleto, recuperarDia, generaciones, invalidarSim, mapaActual }: { inicioPendiente:boolean;setInicioPendiente:(v:boolean)=>void;mapaActual: boolean; generaciones: ReturnType<typeof crearGeneraciones>; invalidarSim: () => void; recuperarDia: () => void; mapa: MapaDatos | null; escenarioId: number | null; onCambio: () => void; onUmbrales: (u: { pedido: Umbrales; stock: Umbrales }) => void; hora: (h: number) => string; segReal: number; scenario: Scenario; setScenario: (s: Scenario) => void; state: ExecState; setState: (s: ExecState) => void; replanned: boolean; setReplanned: (r: boolean) => void; sim: VistaSimulacion | null; setSim: (s: VistaSimulacion | null) => void; unidadSeleccionada: number | null; onUnidad: (id: number) => void; buscado: string | null; setBuscado: (codigo: string | null) => void; warehouse: string | null; setWarehouse: (nombre: string | null) => void; historialCompleto: boolean }) {
  const u = useContext(UmbralesCtx)
  const [performance, setPerformance] = useState(false)
  const [params, setParams] = useState(false)
  const [breakdown, setBreakdown] = useState(false)
  const [orderLight, setOrderLight] = useState({ verde: String(u.pedido.verde), rojo: String(u.pedido.rojo) })
  const [stockLight, setStockLight] = useState({ verde: String(u.stock.verde), rojo: String(u.stock.rojo) })
  const [paramsMsg, setParamsMsg] = useState('')
  const [highlightOrderId, setHighlightOrderId] = useState<string | null>(null)
  // En pantallas pequeñas el panel empieza recogido para no tapar el mapa
  const v9 = useV9()
  const [panel, setPanel] = useState(false)
  const [inicioBorrador,setInicioBorrador]=useState('2026-09-08T08:00')
  useEffect(()=>{if(v9.panelActivo)setPanel(false)},[v9.panelActivo])
  const simActive = scenario !== 'day' && (state === 'running' || state === 'incident')
  const simFinished = scenario !== 'day' && (state === 'complete' || state === 'collapse')
  // Al iniciar, el panel se recoge para ver el mapa; al terminar se vuelve a abrir con el resumen final
  useEffect(() => { if (simFinished && sim) setPanel(true) }, [simFinished, sim?.simulacion.escenarioId])
  // Momento de la simulación de cinco días que se está viendo (T0–T3), derivado del estado
  const simStep = state === 'complete' ? 3 : state === 'incident' ? 1 : state === 'running' ? (replanned ? 2 : 0) : -1
  // Instante vigente que el sistema asigna a una avería, coherente con el reloj del encabezado
  // Con una simulación elegida pero sin iniciar, la avería corresponde a la operación en tiempo real
  const onDay = scenario === 'day' || state === 'idle'
  const faultTime = mapa ? hora(mapa.relojH) : 'No disponible'
  const [simMsg, setSimMsg] = useState('')
  const [simBusy, setSimBusy] = useState(false)
  const ocupada = useRef(false)
  const backToOperation = () => regresarDeSimulacion(sim, simViva, s => s.simulacion.escenarioId, ocupada, generaciones, {
    invalidar: invalidarSim,
    detener: detenerSimulacion,
    volver: () => { recuperarDia(); setSim(null); setSimMsg(''); setReplanned(false); setHighlightOrderId(null); setBuscado(null); setScenario('day'); setState('running') },
    error: e => setSimMsg(mensajeError(e)),
    ocupado: ocupado => { setSimBusy(ocupado); if (ocupado) setSimMsg('') },
  })
  const cambiarEscenario = (s: Scenario) => { invalidarSim(); setReplanned(false); setHighlightOrderId(null); setScenario(s); setState(s === 'day' ? 'running' : 'idle') }
  const startSim = async (tipo: SimType, start: string) => {
    invalidarSim(); const version = generaciones.actual()
    setInicioPendiente(true)
    try {await respuestaVigente(tipo === 'five' ? iniciarCincoDias(start) : iniciarColapso(start), generaciones, version, v => { setSim(v); setReplanned(false); setState('running');setPanel(false) })}finally{setInicioPendiente(false)}
  }
  // Al colapsar se resalta el pedido causante en el mapa
  const causante = sim?.colapso?.pedido?.codigo
  useEffect(() => { if (causante) setBuscado(causante) }, [causante])
  const controlSim = async (accion: (id: number) => Promise<VistaSimulacion>) => {
    if (!sim || ocupada.current) return
    ocupada.current = true; setSimBusy(true); setSimMsg(''); invalidarSim()
    const version = generaciones.actual()
    try { await respuestaVigente(accion(sim.simulacion.escenarioId), generaciones, version, v => { invalidarSim(); setSim(v) }) }
    catch (e) { if (generaciones.vigente(version)) { invalidarSim(); setSimMsg(mensajeError(e)) } }
    finally { ocupada.current = false; setSimBusy(false) }
  }
  const openWarehouse = (w: string) => { setWarehouse(w);v9.setPanelActivo('almacenes') }
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
  return <div className="escena-operacion relative h-full" data-modo="operador" data-control={panel&&!v9.panelActivo?'abierto':undefined}>
    {/* El mapa ocupa todo el espacio libre; con el panel abierto se corre a su derecha (en pantallas medianas o más) */}
    <div className={`lienzo-operacion absolute bottom-0 right-0 ${panel&&!v9.panelActivo ? 'left-0 md:left-[412px]' : 'left-0'}`}><MapaOperativo full state={state} replanned={replanned} highlightOrderId={highlightOrderId} onWarehouse={openWarehouse} onPedido={setBuscado} datos={mapa} buscado={buscado} almacenMarcado={warehouse} unidadSeleccionada={unidadSeleccionada} onUnidad={onUnidad} /></div>

    <div className="controles-contextuales-mapa" role="group" aria-label="Controles y búsqueda del mapa">
     <div className="acciones-contextuales"><button onClick={() => {v9.setPanelActivo(null);setPanel(!panel||!!v9.panelActivo)}} aria-expanded={panel&&!v9.panelActivo} aria-controls="panel-control-operacion" className="control-contextual"><PanelLeftOpen className="size-4"/>{panel&&!v9.panelActivo?'Ocultar controles':'Mostrar controles'}</button>
     {!simFinished&&escenarioId!=null&&mapaActual&&<><span className="separador-navegacion" aria-hidden="true"/><button onClick={()=>setBreakdown(true)} className="control-contextual control-incidencia"><Wrench className="size-4"/>Registrar incidencia</button></>}</div>
     <div className="consulta-contextual" role="group" aria-label="Localizar un pedido en el mapa"><BuscarPedido rastreo={mapa?.rastreo??[]} buscado={buscado} setBuscado={setBuscado} hora={hora} onUnidad={onUnidad}/><BotonHerramientasMapa/></div>
    </div>
    <BarraAccionesPrincipal destinoId="preparacion-parametros"><button onClick={() => { setParams(!params); v9.setPanelActivo(null); setPanel(true) }} aria-label="Parámetros operativos" title="Configurar los semáforos de pedidos y almacenes" className={`${toolButton} accion-parametros ${params ? 'border-blue-600 text-blue-700' : 'border-slate-200'}`}><Settings2 className="mr-1 inline size-4" />Parámetros</button></BarraAccionesPrincipal>

    {/* Panel de control recogible: el mapa sigue ocupando toda la pantalla */}
    {panel&&!v9.panelActivo && <aside id="panel-control-operacion" className="panel-control-operacion absolute bottom-0 left-0 top-0 z-10 flex w-[412px] max-w-[calc(100%-1.5rem)] flex-col border-r border-slate-200 bg-white shadow-lg">
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Operador · Vista operativa</p><h2 className="mt-0.5 text-base font-bold">Mapa y control de ejecución</h2></div>
        <button onClick={() => setPanel(false)} title="Recoger panel y ver el mapa completo" aria-label="Recoger panel" className="border border-slate-200 p-1.5"><ChevronLeft className="size-4" /></button>
      </div>
      <EscenarioTabs scenario={scenario} bloqueadas={inicioPendiente || simActive || simFinished || simViva(sim)} onCambiar={cambiarEscenario} />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {params && <div className="border border-blue-200 bg-slate-50 p-4 text-xs">
          <div className="flex items-center justify-between"><p className="text-sm font-bold">Parámetros operativos</p><button onClick={() => setParams(false)} aria-label="Cerrar parámetros"><X className="size-4" /></button></div>
          <p className="mt-4 font-bold text-slate-700">Semáforo de pedidos · margen = fecha/hora límite − ETA (horas)</p>
          <div className="mt-1 grid grid-cols-2 gap-2"><label className="font-semibold text-emerald-700">Verde si margen ≥<input type="number" value={orderLight.verde} onChange={e => setOrderLight({ ...orderLight, verde: e.target.value })} className={field} /></label><label className="font-semibold text-red-700">Rojo si margen &lt;<input type="number" value={orderLight.rojo} onChange={e => setOrderLight({ ...orderLight, rojo: e.target.value })} className={field} /></label></div>
          <p className="mt-1 text-slate-500"><b className="text-amber-700">Ámbar</b> entre {orderLight.rojo || '?'} h y {orderLight.verde || '?'} h. Más margen es más seguro.</p>
          <p className="mt-4 font-bold text-slate-700">Semáforo de existencias · almacenes intermedios (% disponible)</p>
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
            {sim.simulacion.pedidosDescartados > 0 && <p className="font-semibold text-red-700">{sim.simulacion.pedidosDescartados} pedidos no entregados (plazo vencido o sin asignación factible)</p>}
            {(sim.simulacion.estado === 'ERROR' || sim.simulacion.estado === 'INTERRUMPIDA') && <p className="font-semibold text-red-700">La simulación se detuvo: {sim.simulacion.ultimoError ?? sim.simulacion.estado}</p>}
            {simMsg && <p role="alert" className="font-semibold text-red-700">{simMsg}</p>}
          </div>}
          <div className="mt-3 flex gap-2 text-xs">
            {sim && sim.simulacion.estado === 'EJECUTANDO' && <button disabled={simBusy} onClick={() => controlSim(pausarSimulacion)} className="border border-slate-300 bg-white px-3 py-1.5 font-bold text-slate-700">Pausar</button>}
            {sim && simViva(sim) && sim.simulacion.estado !== 'EJECUTANDO' && <button disabled={simBusy} onClick={() => controlSim(reanudarSimulacion)} className="border border-blue-300 bg-white px-3 py-1.5 font-bold text-blue-700">Reanudar</button>}
            <button disabled={simBusy} onClick={backToOperation} className="flex-1 border border-red-200 bg-white px-3 py-1.5 font-bold text-red-700">Detener y volver al día a día</button>
          </div>
        </div>}
        {simFinished && <>
          <CollapseResults variant={scenario === 'collapse' ? 'collapse' : 'five'} sim={sim} segReal={segReal} hora={hora} onLocate={codigo => sim ? setBuscado(codigo) : setHighlightOrderId(codigo)} />
          <button onClick={backToOperation} className="border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">Cerrar simulación y volver al día a día</button>
        </>}
        {!simActive && !simFinished && (scenario === 'day' || state !== 'incident') && <ScenarioSelect scenario={scenario} onStart={startSim} inicio={inicioBorrador} onInicio={setInicioBorrador} />}

        {/* Atajo del prototipo: solo tiene sentido con una simulación de cinco días ya iniciada */}
        {scenario === 'five' && state !== 'idle' && !sim && <div className="flex flex-wrap items-center gap-2 border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs"><p className="w-full"><b>Atajo del prototipo:</b> saltar a un momento de la simulación</p>{([['T0 · Día 2 14:35', 'running', false], ['T1 · Día 3 10:20 incidencia', 'incident', false], ['T2 · Día 3 replanificado', 'running', true], ['T3 · Día 5 completado', 'complete', true]] as [string, ExecState, boolean][]).map(([label, next, rep], i) => <button key={label} onClick={() => { setReplanned(rep); setState(next) }} className={`border px-2.5 py-1.5 font-bold ${simStep === i ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white text-slate-600'}`}>{label}</button>)}</div>}

        {/* Al terminar, el resumen final reemplaza al panel de rendimiento */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {!simFinished && <button onClick={() => setPerformance(!performance)} aria-expanded={performance} className={`flex items-center gap-1 border px-2.5 py-1.5 font-bold ${performance ? 'border-blue-700 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white'}`}>Rendimiento <ChevronDown className={`size-3.5 ${performance ? 'rotate-180' : ''}`} /></button>}
        </div>
        <section className="rounded-xl border border-slate-200 p-3 text-xs"><h3 className="font-bold">Almacenes y movimientos</h3><p className="mt-1 text-slate-500">Consulta existencias, ordena llegadas o salidas y filtra la lista junto al mapa.</p><button className="mt-2 rounded-lg border px-3 py-2 font-semibold text-blue-700" onClick={()=>v9.setPanelActivo('almacenes')}>Abrir lista de almacenes</button></section>
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
            const stock = (pct: number, texto: string) => <>{texto} · <span className={`font-bold ${TEXTO_SEMAFORO[tonoStock(pct, u.stock)]}`}>● {{ 'vacío': 'vacío', verde: 'verde', ambar: 'ámbar', rojo: 'rojo' }[tonoStock(pct, u.stock)]}</span></>
            const filas: [string, ReactNode][] = a
              ? [['Stock', a.central ? 'Ilimitado (no usa semáforo)' : a.pct == null ? 'No disponible' : stock(a.pct, `${a.stock?.toLocaleString('es-PE')} de ${a.capacidad?.toLocaleString('es-PE')} u · ${a.pct} %`)],
                 ['Unidades en base', String(a.vehiculosEnBase)], ['Unidades en ruta', String(a.unidadesFuera)], ['Pedidos por entregar', String(a.pedidosPorEntregar)], ['Ubicación', `(${a.x}, ${a.y})`]]
              : [['Datos', 'No disponibles']]
            return <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">{filas.map(([k, v]) => <Fragment key={k}><dt className="text-slate-500">{k}</dt><dd className="font-semibold">{v}</dd></Fragment>)}</dl>
          })()}
        </div>}
      </div>
    </aside>}

    {breakdown && <Incidencias mapaActual={mapaActual} mapa={mapa} escenarioId={escenarioId} hora={hora} instanteDemo={faultTime} onCambio={onCambio} onCerrar={() => setBreakdown(false)} onDemo={() => { setReplanned(false); if (onDay) setScenario('day'); setState('incident') }} />}
  </div>
}

function Viewer({ state, setState, scenario, replanned, sim, mapa, hora, segReal, estadoUrl, esDia = false, unidadSeleccionada, onUnidad, buscado, setBuscado, warehouse, setWarehouse }: { estadoUrl?: string; esDia?: boolean; state: ExecState; setState: (s: ExecState) => void; scenario: Scenario; replanned: boolean; sim: VistaSimulacion | null; mapa: MapaDatos | null; hora: (h: number) => string; segReal: number; unidadSeleccionada: number | null; onUnidad: (id: number) => void; buscado: string | null; setBuscado: (codigo: string | null) => void; warehouse: string | null; setWarehouse: (nombre: string | null) => void }) {
  const [kpisAbiertos, setKpisAbiertos] = useState(false)
  const [estadoAbierto, setEstadoAbierto] = useState(false)
  useEffect(() => { if (window.innerWidth < 768) setEstadoAbierto(false) }, [])
  const causante = sim?.colapso?.pedido?.codigo
  useEffect(() => { if (causante) setBuscado(causante) }, [causante])
  const disconnected = state === 'disconnected'
  // Si hay una simulación elegida pero sin iniciar, lo que está en ejecución es la operación en tiempo real
  const viewingDay = scenario === 'day' || state === 'idle'
  const shown: ExecState = state
  const final = shown === 'complete' || shown === 'collapse'
  const title = estadoUrl ?? (disconnected ? 'Solo consulta · desconectado' : shown === 'collapse' ? 'Colapso logístico' : shown === 'complete' ? 'Periodo completado' : shown === 'incident' ? 'Incidencia activa · replanificación en proceso' : 'Estado actual de la operación')
  const c = sim?.pedidos
  // Con una simulación real, los indicadores salen del back-end; sin ella, de la escena de demostración
  const colapsoReal = sim?.simulacion.tipo === 'COLAPSO'
  const kpis = sim && c ? [['Fecha simulada', fechaHora(sim.fechaSimulada, true)], ['Tiempo real transcurrido', duracion(segReal)],
    colapsoReal ? ['Días simulados', String(Math.floor((sim.simulacion.relojH - sim.simulacion.inicioH) / 24) + 1)] : ['Avance del periodo', `${Math.round(sim.progreso * 100)}%`],
    ['Pedidos ingresados', colapsoReal ? String(sim.simulacion.pedidosIncorporados) : `${sim.simulacion.pedidosIncorporados} de ${sim.simulacion.pedidosProgramados}`],
    ['Entregados a tiempo', `${c.entregadosATiempo} · ${porcentaje(c.entregadosATiempo, c.incorporados)}`], ['Pedidos abiertos', String(c.abiertos)], ['Vehículos en ruta', String(mapa?.resumen.vehiculosEnRuta ?? '—')],
    sim.acumulado ? ['Recorrido · costo', `${Math.round(sim.acumulado.distanciaKm).toLocaleString('es-PE')} km · S/ ${Math.round(sim.acumulado.costo).toLocaleString('es-PE')}`] : ['Costo del plan vigente', mapa?.resumen.costoPlan != null ? `S/ ${Math.round(mapa.resumen.costoPlan).toLocaleString('es-PE')}` : '—']] : mapa ? [[esDia ? 'Fecha y hora' : 'Hora simulada', esDia ? hora(mapa.relojH) : horaSimulada(mapa.relojH)], ['Pedidos abiertos', String(mapa.resumen.pedidosAbiertos)], ['Vehículos en ruta', String(mapa.resumen.vehiculosEnRuta)], ['Algoritmo del plan', mapa.resumen.algoritmo ?? 'sin plan'], ['Costo del plan vigente', mapa.resumen.costoPlan != null ? `S/ ${Math.round(mapa.resumen.costoPlan).toLocaleString('es-PE')}` : '—'], ['Distancia del plan', mapa.resumen.distanciaPlanKm != null ? `${Math.round(mapa.resumen.distanciaPlanKm)} km` : '—']] : []
  return <div className="escena-operacion relative h-full" data-modo="consulta">
    <div className="lienzo-operacion absolute inset-x-0 bottom-0"><MapaOperativo full replanned={replanned} state={shown} highlightOrderId={shown === 'collapse' && !mapa ? 'PED-137' : null} datos={mapa} buscado={buscado} onPedido={setBuscado} unidadSeleccionada={unidadSeleccionada} onUnidad={onUnidad} onWarehouse={setWarehouse} almacenMarcado={warehouse} /></div>
    {warehouse && <div className="absolute bottom-16 left-3 z-10 border border-blue-200 bg-white p-3 text-xs shadow"><div className="flex gap-4"><b>{warehouse}</b><button onClick={() => setWarehouse(null)} aria-label="Cerrar panel de almacén">Cerrar</button></div>{(() => { const a = mapa?.almacenes.find(x => (NOMBRE_ALMACEN[x.codigo] ?? x.codigo) === warehouse); return a ? <p className="mt-1">{a.central ? 'Existencias ilimitadas' : a.pct == null ? 'Existencias no disponibles' : `${a.stock} / ${a.capacidad} · ${a.pct}%`} · ({a.x}, {a.y})</p> : <p>Almacén no disponible.</p> })()}</div>}

    <div className="controles-contextuales-mapa" role="group" aria-label="Controles y búsqueda del mapa"><div className="acciones-contextuales"><button onClick={()=>setEstadoAbierto(v=>!v)} aria-controls="resumen-estado-operacion" aria-expanded={estadoAbierto} className="control-contextual"><Gauge className="size-4"/>{estadoAbierto?'Ocultar estado':'Ver estado'}</button></div><div className="consulta-contextual" role="group" aria-label="Localizar un pedido en el mapa"><BuscarPedido rastreo={mapa?.rastreo??[]} buscado={buscado} setBuscado={setBuscado} hora={hora} onUnidad={onUnidad}/><BotonHerramientasMapa/></div></div>

    {/* Estado de la ejecución en curso, sobre el mapa */}
    {estadoAbierto && <section id="resumen-estado-operacion" className="absolute left-3 top-3 z-10 max-h-[65%] w-[380px] max-w-[calc(100%-1.5rem)] overflow-y-auto border border-slate-200 bg-white/95 p-4 shadow-lg">
      <button onClick={() => setEstadoAbierto(false)} className="float-right border px-2 py-1 text-xs font-bold" aria-label="Cerrar estado de operación">Cerrar</button>
      {disconnected && !estadoUrl && <div className="mb-3 flex items-center justify-between gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"><b>Desconectada · último estado conocido</b><button onClick={() => setState('running')} className="border border-amber-300 bg-white px-3 py-1.5 font-bold">Reconectar</button></div>}
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Visualizador · Solo consulta</p>
      <h2 className="mt-0.5 text-base font-bold">{title}</h2>
      <p className="mt-1 hidden text-xs text-slate-500 sm:block">Operación consultada: {!sim && mapa ? (esDia ? scenarioLabels.day : 'escenario del back-end') : sim ? `${colapsoReal ? scenarioLabels.collapse : scenarioLabels.five} · ${sim.simulacion.estado.toLowerCase()}` : scenarioLabels[viewingDay ? 'day' : scenario]}. <span className="font-bold text-slate-600">{estadoUrl ? 'Consulta del escenario seleccionado.' : 'Solo lectura de lo que está en ejecución; sin acciones de edición.'}</span></p>
      {mapa && mapa.incidencias.length > 0 && <div className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
        <b>Incidencias vigentes ({mapa.incidencias.length})</b>
        <ul className="mt-1 flex flex-col gap-0.5">{mapa.incidencias.map(i => <li key={i.id}>{i.tipo === 'AVERIA' || i.tipo === 'MANTENIMIENTO' ? <><Wrench className="mr-1 inline size-3.5" />{i.tipo === 'AVERIA' ? 'Avería' : 'Mantenimiento'} · {mapa.flota.find(v => v.id === i.vehiculoId)?.codigo ?? `V-${i.vehiculoId}`}</> : <><AlertTriangle className="mr-1 inline size-3.5" />Bloqueo · {i.tramos.length} km</>} · desde {hora(i.instanteH)}{i.finH != null ? ` hasta ${hora(i.finH)}` : ''}</li>)}</ul>
      </div>}
      {shown === 'collapse' && (sim?.colapso
        ? <div className="mt-3 border border-red-200 bg-red-50 p-3 text-xs text-red-800"><b>Instante del colapso: {fechaHora(sim.colapso.fecha)}</b>{sim.colapso.pedido && <p className="mt-1">Pedido causante: {sim.colapso.pedido.codigo} · ({sim.colapso.pedido.posX},{sim.colapso.pedido.posY}) · plazo {hora(sim.colapso.pedido.fechaLimiteH)} · resaltado en el mapa.</p>}</div>
        : !sim && <div className="mt-3 border border-red-200 bg-red-50 p-3 text-xs text-red-800"><b>Instante del colapso: 11/09/2026 · 16:42</b><p className="mt-1">Pedido causante: PED-137 · (48,34) · resaltado en mapa · demanda pendiente sin capacidad disponible.</p></div>)}
    </section>}

    {/* Indicadores, sobre el mapa */}
    {/* En pantallas pequeñas los indicadores empiezan recogidos para no tapar el mapa */}
    {kpisAbiertos && (mapa || sim) ? <div className="absolute bottom-3 left-3 z-10 w-[380px] max-w-[calc(100%-1.5rem)]">
      <button onClick={() => setKpisAbiertos(false)} className="mb-1 border border-slate-200 bg-white/95 px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow">Ocultar indicadores</button>
<div className="grid grid-cols-2 gap-2">{kpis.map(([a, b]) => <div key={a} className="border border-slate-200 bg-white/95 p-2.5 shadow"><p className="text-[11px] text-slate-500">{a}</p><b className="mt-0.5 block text-base">{b}</b></div>)}</div>
    </div> : <button onClick={() => setKpisAbiertos(true)} className="absolute bottom-3 left-3 z-10 border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow">Ver indicadores</button>}
  </div>
}

/** Render map actions in their own row directly below the role navigation. */
function BarraAccionesPrincipal({children,destinoId='barra-acciones-principal'}:{children:ReactNode;destinoId?:string}){
 const [destino,setDestino]=useState<HTMLElement|null>(null)
 useEffect(()=>{setDestino(document.getElementById(destinoId))},[destinoId])
 return destino?createPortal(children,destino):null
}

export default function Home() {
  const [role, setRole] = useState<Role>('operador')
  const [inicioPendiente,setInicioPendiente]=useState(false)
  const [scenario, setScenario] = useState<Scenario>('day')
  const [state, setState] = useState<ExecState>('idle')
  const [replanned, setReplanned] = useState(false)
  const [sim, setSim] = useState<VistaSimulacion | null>(null)
  const generaciones = useRef(crearGeneraciones()).current
  const [revisionSim, setRevisionSim] = useState(0)
  const invalidarSim = () => { generaciones.invalidar(); setRevisionSim(n => n + 1) }
  const simId = sim?.simulacion.escenarioId
  const simAlive = simViva(sim)
  // ?escenario=N abre un escenario concreto (útil para revisar uno sin simulación o desde otro equipo)
  const [escenarioUrl, setEscenarioUrl] = useState<number | null>(null)
  const [vistaUrl, setVistaUrl] = useState<{ id: number; vista: VistaSimulacion | null } | null>(null)
  useEffect(() => {
    if (escenarioUrl == null || simId != null) return
    setVistaUrl({ id: escenarioUrl, vista: null })
    return consultarEstadoSeleccionado(escenarioUrl, consultarSimulacion, vista => setVistaUrl({ id: escenarioUrl, vista }))
  }, [escenarioUrl, simId])
  // Operación día a día: el back-end la mantiene siempre activa en tiempo real
  const [dia, setDia] = useState<OperacionActual | null>(null)
  const [errorDia, setErrorDia] = useState('')
  const recuperacionDia = useRef<ReturnType<typeof crearRecuperacionDia> | null>(null)
  const recuperarDia = () => recuperacionDia.current?.recuperar()
  useEffect(() => {
    const consulta=Number(new URLSearchParams(window.location.search).get('escenario'))
    if(Number.isSafeInteger(consulta)&&consulta>0)return
    const controlador = crearRecuperacionDia(
      { actual: operacionActual, consultar: consultarSimulacion, convertir: operacionDesdeVista },
      { actual: valor => { setDia(valor); setErrorDia('') }, error: e => setErrorDia(mensajeError(e)),
        recuperando: () => setErrorDia('Recuperando operación') },
    )
    recuperacionDia.current = controlador
    controlador.recuperar()
    return () => { controlador.cerrar(); recuperacionDia.current = null }
  }, [])
  useEffect(() => {
    const parametros=new URLSearchParams(window.location.search)
    if(parametros.get('vista')==='consulta')setRole('visualizador')
    const n = Number(parametros.get('escenario'))
    if (Number.isInteger(n) && n > 0) { setEscenarioUrl(n); return }
    const version = generaciones.actual()
    respuestaVigente(listarSimulaciones(), generaciones, version,
      vs => { const v = vs.find(simulacionDescubrible); if (v) { setSim(v); setScenario(v.simulacion.tipo === 'COLAPSO' ? 'collapse' : 'five'); setState('running') } })
      .catch(() => { /* La recuperación de la operación informa el error. */ })
    return () => { generaciones.invalidar() }
  }, [])
  // Lo que se ve: la simulación (viva o su resultado), el escenario de la URL o, si no, la operación día a día
  const borradorSimulacion=role!=='registrador'&&scenario!=='day'&&simId==null&&escenarioUrl==null
  const escenarioMapa = escenarioParaMapa(simId,escenarioUrl,dia?.escenarioId,borradorSimulacion)
  const [seleccionUnidad, setSeleccionUnidad] = useState<{ escenarioId: number; id: number } | null>(null)
  const [seleccionAlmacen, setSeleccionAlmacen] = useState<{ escenarioId: number; nombre: string } | null>(null)
  const [buscado, setBuscado] = useState<string | null>(null)
  const unidadSeleccionada = seleccionUnidad?.escenarioId === escenarioMapa ? seleccionUnidad.id : null
  const seleccionarUnidad = (id: number | null) => { if (id !== null) setSeleccionAlmacen(null); setSeleccionUnidad(id === null || escenarioMapa === null ? null : { escenarioId: escenarioMapa, id }) }
  const almacenSeleccionado = seleccionAlmacen?.escenarioId === escenarioMapa ? seleccionAlmacen.nombre : null
  const seleccionarAlmacen = (nombre: string | null) => { if (nombre !== null) setSeleccionUnidad(null); setSeleccionAlmacen(nombre === null || escenarioMapa === null ? null : { escenarioId: escenarioMapa, nombre }) }
  useEffect(() => { setSeleccionUnidad(null); setSeleccionAlmacen(null); setBuscado(null) }, [escenarioMapa])
  const consultandoUrl = simId == null && escenarioUrl != null
  const vistaSeleccionada = consultandoUrl && vistaUrl?.id === escenarioUrl ? vistaUrl.vista : null
  const esDia = vistaSeleccionada?.simulacion.tipo === 'DIA_A_DIA' || (escenarioMapa != null && escenarioMapa === dia?.escenarioId)
  const estadoUrl = consultandoUrl ? etiquetaEstadoEscenario(vistaSeleccionada?.simulacion.estado ?? null) : undefined
  const mapaVivo = escenarioMapa != null && (simAlive || escenarioUrl != null || esDia)
  const operacion = useOperacion(escenarioMapa)
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
      m.plan, pedidos, m.incidencias,m.aplicable)
    if (m.aplicable && m.plan) datos.vehiculos = datos.vehiculos.map(v => {
      const ruta = m.plan?.rutas.find(r => r.vehiculoId === v.id && r.horaInicioH <= m.relojH && m.relojH < r.horaFinH)
      return { ...v, direccion: ruta ? direccionEn(ruta.trayectoria, m.relojH) : null }
    })
    if (operacion.detalle === 'actual' && operacion.unidades) {
      const detalles = new globalThis.Map(operacion.unidades.unidades.map(u => [u.id, u]))
      datos.vehiculos = datos.vehiculos.map(v => { const detalle = detalles.get(v.id); return detalle ? { ...v, estado: detalle.estado } : v })
      datos.resumen.vehiculosEnRuta = operacion.unidades.unidades.filter(u => u.estado === 'EN_RUTA' || u.estado === 'EN_SERVICIO').length
    }
    return datos
  }, [operacion.mapa, operacion.detalle, operacion.unidades, historial])

  const mapaError = operacion.error
  const historialActual = historial?.escenarioId === escenarioMapa ? historial.pedidos : null
  const estadoHistorial = historialError?.escenarioId === escenarioMapa ? (historialActual ? 'desactualizado' : 'error') : historialCargando ? 'cargando' : historialActual ? 'actual' : 'cargando'
  // El siguiente sondeo empieza solo después de completar el anterior.
  useEffect(() => {
    if (simId == null || !simAlive) return
    const version = generaciones.actual()
    return sondearSerial(() => consultarSimulacion(simId), v => {
      // Cualquier estado final (también ERROR o INTERRUMPIDA) muestra el resumen y el reporte: antes solo FINALIZADA
      setSim(v); if (!simViva(v)) setState(v.colapso ? 'collapse' : 'complete')
    }, () => generaciones.vigente(version))
  }, [simId, simAlive, revisionSim])
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
  const fechaBase = sim?.simulacion.fechaBase ?? vistaSeleccionada?.simulacion.fechaBase ?? (esDia ? dia?.fechaBase : undefined)
  const hora = useMemo(() => fechaBase ? (h: number) => fechaDesdeBase(fechaBase, h) : horaSimulada, [fechaBase])
  // El registrador ingresa pedidos solo para la operación día a día (o el escenario abierto con ?escenario=N)
  const diaRegistro = escenarioUrl ?? dia?.escenarioId ?? null
  const horaRegistro = useMemo(() => dia && diaRegistro === dia.escenarioId ? (h: number) => fechaDesdeBase(dia.fechaBase, h) : hora, [dia, diaRegistro, hora])
  const effectiveState: ExecState = consultandoUrl ? (vistaSeleccionada?.simulacion.estado === 'EJECUTANDO' ? 'running' : vistaSeleccionada ? 'idle' : 'disconnected') : !sim && scenario === 'day' ? (errorDia ? 'disconnected' : dia?.estadoMotor === 'EJECUTANDO' ? 'running' : 'idle') : state === 'idle' && role === 'visualizador' ? 'running' : state
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
  return <UmbralesCtx.Provider value={umbrales}><ContextoV9 conexion={borradorSimulacion?(inicioPendiente?'preparando':'sin-iniciar'):operacion.conexion} recibidoEn={operacion.recibidoEn} almacenSeleccionado={operacion.mapa?.fisico?.almacenes.find(a => (NOMBRE_ALMACEN[a.codigo] ?? a.codigo) === almacenSeleccionado)?.codigo ?? null} mapa={operacion.mapa} unidades={operacion.detalle === 'actual' ? operacion.unidades : null}><main className="paqrap-app flex h-dvh flex-col overflow-hidden bg-white font-sans text-slate-900">
    <Header idUrl={consultandoUrl ? escenarioUrl : null} estadoUrl={borradorSimulacion?(inicioPendiente?'Preparando simulación':'Sin iniciar'):estadoUrl} scenario={scenario} state={effectiveState} replanned={replanned} sim={sim ?? vistaSeleccionada} segReal={sim?segReal:vistaSeleccionada?.simulacion.segundosEjecutados??(borradorSimulacion?0:dia?.segundosEjecutados??0)} dia={borradorSimulacion?null:dia} escenario={mapa && escenarioMapa != null ? { id: escenarioMapa, relojH: mapa.relojH, dia: esDia, fecha: hora(mapa.relojH) } : null} />
    {!consultandoUrl && !sim && scenario === 'day' && (errorDia || (dia && dia.estadoMotor !== 'EJECUTANDO')) && <div role="status" className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-900">{errorDia ? <>{`Conexión interrumpida: ${errorDia}${dia ? ` · último estado conocido: ${dia.estadoMotor}${dia.ultimoError ? ` · ${dia.ultimoError}` : ''}` : ''}`} <button className="ml-2 border border-amber-400 bg-white px-2 py-1 font-bold" onClick={recuperarDia}>Reintentar</button></> : `Motor: ${estadoEnEspanol(dia?.estadoMotor)}${dia?.ultimoError ? ` · ${dia.ultimoError}` : ''}`}</div>}
    <Nav role={role} setRole={r => { invalidarSim(); setRole(r) }} />
    {role !== 'registrador' && <HerramientasV9 esDia={esDia} sim={sim ?? vistaSeleccionada ?? null} segReal={sim ? segReal : vistaSeleccionada?.simulacion.segundosEjecutados ?? (borradorSimulacion?0:dia?.segundosEjecutados ?? 0)} hora={hora} operador={role === 'operador'} />}
    {role!=='registrador'&&mapaError&&<div role="status" className="aviso-conexion"><AlertTriangle className="size-4 shrink-0"/><span>La conexión se está recuperando. Se muestra el último estado recibido.</span><button onClick={refrescar}>Reintentar</button><span className="sr-only">{mapaError}</span></div>}
    {role === 'registrador'
      ? <div className="min-h-0 flex-1 overflow-y-auto bg-[#f3f5f6] p-5 md:p-7"><div className="mx-auto max-w-[1500px]"><Registrar escenarioId={diaRegistro} disponible={!errorDia && (!consultandoUrl || vistaSeleccionada?.simulacion.estado === 'EJECUTANDO')} rastreo={diaRegistro != null && diaRegistro === escenarioMapa && historialActual ? mapa?.rastreo ?? null : null} hora={horaRegistro} onRegistrado={refrescar} historialDesactualizado={estadoHistorial === 'desactualizado'} /></div></div>
      : <SuperficieOperacion>
          {role === 'operador' && <Operator inicioPendiente={inicioPendiente} setInicioPendiente={setInicioPendiente} mapaActual={operacion.conexion === 'actual'} generaciones={generaciones} invalidarSim={invalidarSim} recuperarDia={recuperarDia} onUmbrales={setUmbrales} mapa={mapa} escenarioId={mapaVivo ? escenarioMapa : null} onCambio={refrescar} hora={hora} segReal={segReal} scenario={scenario} setScenario={setScenario} state={scenario === 'day' ? effectiveState : state} setState={setState} replanned={replanned} setReplanned={setReplanned} sim={sim} setSim={setSim} unidadSeleccionada={unidadSeleccionada} onUnidad={seleccionarUnidad} buscado={buscado} setBuscado={setBuscado} warehouse={almacenSeleccionado} setWarehouse={seleccionarAlmacen} historialCompleto={historialActual !== null && estadoHistorial === 'actual'} />}
          {role === 'visualizador' && <Viewer estadoUrl={estadoUrl} esDia={esDia} sim={sim ?? vistaSeleccionada} mapa={mapa} hora={hora} segReal={segReal} scenario={scenario} state={effectiveState} setState={setState} replanned={replanned} unidadSeleccionada={unidadSeleccionada} onUnidad={seleccionarUnidad} buscado={buscado} setBuscado={setBuscado} warehouse={almacenSeleccionado} setWarehouse={seleccionarAlmacen} />}
          <PanelFlota key={`flota-${escenarioMapa ?? 'sin-escenario'}`} unidades={operacion.unidades?.unidades ?? null} detalle={operacion.detalle} hora={hora} seleccion={unidadSeleccionada} onSeleccion={seleccionarUnidad} incidencias={operacion.mapa?.incidencias ?? []} onPedido={setBuscado} />
          <PanelAlmacenesV9 hora={hora} onAlmacen={codigo => seleccionarAlmacen(NOMBRE_ALMACEN[codigo] ?? codigo)} onUnidad={seleccionarUnidad} onPedido={setBuscado}/><PanelDatosV9/><PanelIndicadoresV9 hora={hora}/><PanelReportesV9 hora={hora} escenarioId={escenarioMapa}/><AbrirReporteAlTerminar escenarioId={sim && !simViva(sim) && sim.simulacion.tipo !== 'DIA_A_DIA' ? sim.simulacion.escenarioId : null} />
          <PanelIncidenciasV9 hora={hora} onUnidad={seleccionarUnidad} />
          <PanelEnvios onAlmacen={codigo => seleccionarAlmacen(NOMBRE_ALMACEN[codigo] ?? codigo)} key={`envios-${escenarioMapa ?? 'sin-escenario'}`} mapa={operacion.mapa} unidades={operacion.detalle === 'actual' ? operacion.unidades : null} historial={historialActual} estadoHistorial={estadoHistorial} estadoMapa={operacion.conexion} hora={hora} onPedido={setBuscado} onUnidad={seleccionarUnidad} />
        </SuperficieOperacion>}
  </main></ContextoV9></UmbralesCtx.Provider>
}
