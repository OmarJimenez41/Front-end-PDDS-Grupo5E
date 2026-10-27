const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, file) => {
  const source = fs.readFileSync(file, 'utf8')
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, file)
}
require.extensions['.tsx'] = (module, file) => {
  const source = fs.readFileSync(file, 'utf8')
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
}
const { leerOperacion } = require('../lib/operacion/lectura.ts')
const { iniciarControlador } = require('../lib/operacion/controlador.ts')
const { puntoCertificado, tramoConfirmado, movimientoPermitido, animarIntervalo } = require('../lib/operacion/movimiento.ts')
const { ampliarCamara, centrarCamara, limitarCamara } = require('../lib/operacion/camara.ts')
const { operacionDesdeVista } = require('../lib/api/simulacion.ts')
const { consultarInstantanea, consultarUnidades, consultarPedidos, posicionFisica, registrarAveria, datosMapa, agruparPosiciones, direccionEn } = require('../lib/api/operacion.ts')
const { PanelFlota, ordenarUnidades, ocupacion, flotaOficial } = require('../components/operacion/PanelFlota.tsx')
const { entregasRecientes, clasificarEnvios } = require('../components/operacion/PanelEnvios.tsx')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const mapa = (version, reloj = version, escenarioId = 1) => ({ escenarioId, versionEstado: version, relojH: reloj })
const unidades = (reloj, escenarioId = 1) => ({ escenarioId, relojH: reloj, unidades: [] })
const signal = new AbortController().signal

async function main() {
  const realFetch = global.fetch
  const flota = [{ codigo: 'C', ocupacionPct: 100, salidaH: null }, { codigo: 'B', ocupacionPct: 8, salidaH: 26 }, { codigo: 'A', ocupacionPct: 50, salidaH: 23 }]
  assert.deepEqual(ordenarUnidades(flota, 'ocupacionPct', true).map(u => u.ocupacionPct), [8, 50, 100])
  assert.deepEqual(ordenarUnidades(flota, 'ocupacionPct', false).map(u => u.ocupacionPct), [100, 50, 8])
  assert.deepEqual(ordenarUnidades(flota, 'salidaH', false).map(u => u.codigo), ['B', 'A', 'C'])
  assert.deepEqual(ordenarUnidades(flota, 'salidaH', true).map(u => u.codigo), ['A', 'B', 'C'])
  const empates = [{ codigo: 'B', llegadaH: 27 }, { codigo: 'A', llegadaH: 27 }, { codigo: 'Z', llegadaH: null }]
  assert.deepEqual(ordenarUnidades(empates, 'llegadaH', false).map(u => u.codigo), ['A', 'B', 'Z'])
  assert.deepEqual(ordenarUnidades(empates, 'llegadaH', true).map(u => u.codigo), ['A', 'B', 'Z'])
  assert.equal(ocupacion(49.9, 10), 'verde')
  assert.equal(ocupacion(50, 10), 'ámbar')
  assert.equal(ocupacion(80, 10), 'rojo')
  assert.equal(ocupacion(0, 0), 'no disponible')
  const ejemploUnidad = { id: 7, codigo: 'TM01', tipo: 'MOTO', capacidad: 8, carga: 2, ocupacionPct: 25, x: 0, y: 0, almacenBase: 'A', origen: null, destino: null, salidaH: null, llegadaH: null, pedidos: [], averia: null, recorridoKm: 0 }
  for (const estado of ['EN_BASE', 'PROGRAMADA', 'EN_RUTA', 'EN_SERVICIO', 'AVERIADA', 'EN_MANTENIMIENTO']) {
    const unidad = { ...ejemploUnidad, estado, pedidos: estado === 'PROGRAMADA' ? [{ id: 4, codigo: 'PED-4', cantidad: 2, etaH: 3, enServicio: false }] : [] }
    const html = renderToStaticMarkup(React.createElement(PanelFlota, { unidades: [unidad], detalle: 'actual', hora: h => `H${h}`, seleccion: 7, onSeleccion: () => {}, incidencias: [], onPedido: () => {} }))
    assert.ok(html.includes(estado.replaceAll('_', ' ')))
    assert.ok(html.includes('Sin asignación'))
    if (estado === 'PROGRAMADA') assert.ok(html.includes('Pedidos programados') && html.includes('PED-4'))
  }
  const enRuta = { ...ejemploUnidad, estado: 'EN_RUTA', origen: { codigo: 'CENTRAL' }, destino: { codigo: 'CLIENTE' }, salidaH: 2, llegadaH: 7, pedidos: [{ id: 4, codigo: 'PED-4', cantidad: 2, etaH: 3, enServicio: false }] }
  const fichaHtml = renderToStaticMarkup(React.createElement(PanelFlota, { unidades: [enRuta], detalle: 'actual', hora: h => `H${h}`, seleccion: 7, onSeleccion: () => {}, incidencias: [], onPedido: () => {} }))
  for (const texto of ['CENTRAL', 'CLIENTE', 'H2', 'H7', 'H3', 'PED-4']) assert.ok(fichaHtml.includes(texto))
  const propsMantenimiento = { detalle: 'actual', hora: h => `H${h}`, seleccion: 7, onSeleccion: () => {}, onPedido: () => {} }
  const mantenimientoHtml = renderToStaticMarkup(React.createElement(PanelFlota, { ...propsMantenimiento, unidades: [{ ...ejemploUnidad, estado: 'EN_MANTENIMIENTO' }], incidencias: [{ id: 8, tipo: 'MANTENIMIENTO', vehiculoId: 7, instanteH: 2, finH: 4 }] }))
  assert.ok(mantenimientoHtml.includes('Mantenimiento') && mantenimientoHtml.includes('H2') && mantenimientoHtml.includes('H4'))
  assert.ok(!mantenimientoHtml.includes('Unidad reparada'))
  const reincorporada = renderToStaticMarkup(React.createElement(PanelFlota, { ...propsMantenimiento, unidades: [{ ...ejemploUnidad, estado: 'EN_BASE' }], incidencias: [] }))
  assert.ok(reincorporada.includes('EN BASE'))
  assert.ok(!reincorporada.includes('Mantenimiento · desde'))
  const aristas = [{ x1: 0, y1: 0, x2: 1, y2: 0, salidaH: 0, llegadaH: 1 }, { x1: 1, y1: 0, x2: 1, y2: 1, salidaH: 2, llegadaH: 3 }, { x1: 1, y1: 1, x2: 1, y2: 1, salidaH: 3, llegadaH: 4 }]
  assert.equal(direccionEn(aristas, 0.5), 0)
  assert.equal(direccionEn(aristas, 1.5), null)
  assert.equal(direccionEn(aristas, 2.5), -90)
  assert.equal(direccionEn(aristas, 3.5), null)
  assert.equal(direccionEn([], 1), null)
  const esquina = aristas.slice(0, 2)
  const copiaEsquina = structuredClone(esquina)
  assert.deepEqual(puntoCertificado(esquina, 0.5), { x: 0.5, y: 0 })
  assert.deepEqual(puntoCertificado(esquina, 1.5), { x: 1, y: 0 })
  assert.deepEqual(puntoCertificado(esquina, 2.5), { x: 1, y: 0.5 })
  assert.equal(tramoConfirmado(esquina, 0.5, 2.5, { x: 0.5, y: 0 }, { x: 1, y: 0.5 }), true)
  assert.equal(tramoConfirmado(esquina, 0.5, 2.5, { x: 0.5, y: 0 }, { x: 3, y: 3 }), false)
  assert.deepEqual(esquina, copiaEsquina, 'La animación no modifica la trayectoria confirmada')
  assert.equal(puntoCertificado([{ x1: 0, y1: 0, x2: 1, y2: 1, salidaH: 0, llegadaH: 1 }], 0.5), null)
  const anteriorMovimiento = { escenarioId: 1, relojH: 1, aplicable: true, plan: { id: 1 }, fisico: {} }
  const actualMovimiento = { ...anteriorMovimiento, relojH: 2 }
  assert.equal(movimientoPermitido(anteriorMovimiento, actualMovimiento, true, false), true)
  assert.equal(movimientoPermitido(anteriorMovimiento, actualMovimiento, false, false), false)
  assert.equal(movimientoPermitido(anteriorMovimiento, actualMovimiento, true, true), false)
  assert.equal(movimientoPermitido(anteriorMovimiento, { ...actualMovimiento, aplicable: false }, true, false), false)
  assert.equal(movimientoPermitido(anteriorMovimiento, { ...actualMovimiento, plan: { id: 2 } }, true, false), false)
  assert.equal(movimientoPermitido(anteriorMovimiento, { ...actualMovimiento, escenarioId: 2 }, true, false), false)
  const vistaError = { simulacion: { escenarioId: 1, fechaBase: '2026-10-27', relojH: 3, estado: 'ERROR', ultimoError: 'fallo de prueba' }, fechaSimulada: '2026-10-27T03:00:00', pedidos: {} }
  assert.equal(operacionDesdeVista(vistaError).estadoMotor, 'ERROR')
  assert.equal(operacionDesdeVista(vistaError).ultimoError, 'fallo de prueba')
  let cuadroPendiente, cancelado = 0, cuadrosPintados = 0
  const cancelarAnimacion = animarIntervalo(() => { cuadrosPintados++ }, fn => { cuadroPendiente = fn; return 1 }, () => { cancelado++ })
  cuadroPendiente(0)
  const cuadroTardio = cuadroPendiente
  cancelarAnimacion()
  cuadroTardio(500)
  assert.equal(cuadrosPintados, 1)
  assert.equal(cancelado, 1)
  const camara = { escala: 1, x: 0, y: 0 }, ancla = { x: 250, y: 200 }
  const ampliada = ampliarCamara(camara, 2, ancla, 1000, 800)
  assert.deepEqual(ampliada, { escala: 2, x: -250, y: -200 })
  assert.equal((ancla.x - ampliada.x) / ampliada.escala, ancla.x)
  assert.equal((ancla.y - ampliada.y) / ampliada.escala, ancla.y)
  assert.deepEqual(limitarCamara(100, -5000, 2, 1000, 800), { escala: 2, x: 100, y: -1200 })
  const centro = centrarCamara(camara, { x: 35, y: 25 }, 1000, 800)
  assert.deepEqual(centro, { escala: 2, x: -500, y: -400 })
  for (const punto of [{ x: 27, y: 14 }, { x: 12, y: 38 }, { x: 57, y: 27 }]) {
    const c = centrarCamara(camara, punto, 1000, 800)
    assert.ok(Math.abs(c.x + punto.x / 70 * 1000 * c.escala - 500) < 1e-8)
    assert.ok(Math.abs(c.y + (1 - punto.y / 50) * 800 * c.escala - 400) < 1e-8)
  }
  const esquinaCentro = centrarCamara(camara, { x: 0, y: 0 }, 1000, 800)
  assert.equal(esquinaCentro.x, 500)
  assert.equal(esquinaCentro.y + 800 * esquinaCentro.escala, 400)
  const pantallaPequena = ampliarCamara(camara, 2, { x: 90, y: 320 }, 360, 640)
  assert.equal((90 - pantallaPequena.x) / pantallaPequena.escala, 90)
  assert.equal((320 - pantallaPequena.y) / pantallaPequena.escala, 320)
  const baseEstado = { escenarioId: 1, versionEstado: 1, relojH: 0, fisico: { relojH: 0, almacenes: [], vehiculos: [{ id: 1, codigo: 'TA01', tipo: 'AUTO', almacenBaseId: 1, capacidad: 10, carga: 2, x: 0, y: 0, disponible: true }, { id: 2, codigo: 'TM01', tipo: 'MOTO', almacenBaseId: 1, capacidad: 10, carga: 2, x: 0, y: 0, disponible: true }] } }
  const pedido = { id: 1, codigo: 'P1', posX: 1, posY: 1, cantidad: 4, tipo: 'REGULAR', horaIngresoH: 0, fechaLimiteH: 36, estado: 'PENDIENTE', entregadoEnH: null }
  const ruta = (id, vehiculoId) => ({ id, vehiculoId, tipoVehiculo: vehiculoId === 1 ? 'AUTO' : 'MOTO', horaInicioH: 0, horaFinH: 4, trazado: [{ secuencia: 0, x: 0, y: 0, instanteH: 0 }, { secuencia: 1, x: 1, y: 0, instanteH: 1 }], paradas: [{ pedidoId: 1, codigoPedido: 'P1', secuencia: 0, etaH: 1, entregado: false, cantidad: 2 }] })
  const dosRutas = datosMapa(baseEstado, { id: 1, rutas: [ruta(10, 1), ruta(20, 2)] }, [pedido]).rastreo[0]
  assert.deepEqual(dosRutas.asociaciones.map(a => a.rutaId), [10, 20])
  assert.deepEqual(dosRutas.asociaciones.map(a => a.cantidad), [2, 2])
  assert.deepEqual(datosMapa(baseEstado, null, [pedido]).rastreo[0].asociaciones, [])
  assert.deepEqual(datosMapa(baseEstado, { id: 1, rutas: [ruta(10, 1)] }, [{ ...pedido, estado: 'ENTREGADO' }]).rastreo[0].asociaciones, [])
  const mapaEnvios = { relojH: 1, aplicable: true, plan: { rutas: [{ ...ruta(10, 1), horaInicioH: 2 }, ruta(20, 2)] }, pedidos: [pedido, { ...pedido, id: 2, codigo: 'P2' }] }
  assert.deepEqual(clasificarEnvios(mapaEnvios).futuras.map(r => r.id), [10])
  assert.deepEqual(clasificarEnvios(mapaEnvios).enRuta.map(r => r.id), [20])
  assert.deepEqual(clasificarEnvios(mapaEnvios).sinAsignar.map(p => p.id), [2])
  assert.equal(clasificarEnvios({ ...mapaEnvios, aplicable: false }).futuras.length, 0)
  const servicio = { entregaId: 'entrega-1', vehiculoId: 2, pedidoId: 1, llegadaH: 1, finH: 2, cantidad: 2, confirmada: false }
  const conServicio = { ...baseEstado, fisico: { ...baseEstado.fisico, servicios: [servicio] } }
  const rastreoServicio = datosMapa(conServicio, { id: 2, rutas: [] }, [pedido]).rastreo[0]
  assert.equal(rastreoServicio.asociaciones[0].rutaId, null)
  assert.equal(rastreoServicio.asociaciones[0].vehiculoCodigo, 'TM01')
  assert.equal(rastreoServicio.asociaciones[0].enServicio, true)
  assert.equal(clasificarEnvios({ ...mapaEnvios, plan: { rutas: [] }, fisico: { servicios: [servicio] } }).sinAsignar.some(p => p.id === 1), false)
  const depositos = [{ id: 1, codigo: 'CENTRAL', central: true, capacidad: null, stock: null, x: 0, y: 0 }, { id: 2, codigo: 'CERO', central: false, capacidad: 10, stock: 0, x: 1, y: 1 }, { id: 3, codigo: 'AUSENTE', central: false, capacidad: 10, stock: null, x: 2, y: 2 }, { id: 4, codigo: 'MEDIO', central: false, capacidad: 10, stock: 5, x: 3, y: 3 }]
  assert.deepEqual(datosMapa({ ...baseEstado, fisico: { ...baseEstado.fisico, almacenes: depositos } }, null, []).almacenes.map(a => a.pct), [null, 0, null, 50])
  const entregas = [{ ...pedido, id: 2, codigo: 'B', estado: 'ENTREGADO', entregadoEnH: 4 }, { ...pedido, id: 3, codigo: 'A', estado: 'ENTREGADO', entregadoEnH: 4 }, { ...pedido, id: 4, codigo: 'C', estado: 'EN_RUTA', entregadoEnH: 5 }]
  assert.deepEqual(entregasRecientes(entregas).map(p => p.codigo), ['A', 'B'])
  let paginas = 0
  global.fetch = async url => { paginas++; const desde = Number(new URL(url).searchParams.get('desdeId')); const registros = Array.from({ length: desde ? 2 : 500 }, (_, i) => ({ ...pedido, id: desde + i + 1, codigo: `P${desde + i + 1}` })); return { ok: true, status: 200, json: async () => registros } }
  assert.equal((await consultarPedidos(1)).length, 502)
  assert.equal(paginas, 2)
  paginas = 0
  global.fetch = async () => { paginas++; if (paginas === 2) throw Error('fallo en página'); return { ok: true, status: 200, json: async () => Array.from({ length: 500 }, (_, i) => ({ ...pedido, id: i + 1 })) } }
  await assert.rejects(consultarPedidos(1), /fallo en página/)
  paginas = 0
  const [historiaFallida, mapaIndependiente] = await Promise.allSettled([
    consultarPedidos(1),
    leerOperacion(1, signal, () => true, null, { mapa: async () => mapa(3), unidades: async () => unidades(3) }),
  ])
  assert.equal(historiaFallida.status, 'rejected')
  assert.equal(mapaIndependiente.status, 'fulfilled')
  let mapas = [mapa(1), mapa(2), mapa(2)]
  let detalles = [unidades(1), unidades(2)]
  let seen = []
  let result = await leerOperacion(1, signal, m => { seen.push(m.versionEstado); return true }, null,
    { mapa: async () => mapas.shift(), unidades: async () => detalles.shift() })
  assert.deepEqual(seen, [1, 2, 2])
  assert.equal(result.estadoDetalle, 'actual')
  assert.equal(result.unidades.relojH, 2)

  let liberar
  const espera = new Promise(resolve => { liberar = resolve })
  let publicado = null
  const lecturaPendiente = leerOperacion(1, signal, m => { publicado = m; return true }, null,
    { mapa: async () => mapa(7), unidades: async () => espera })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(publicado.versionEstado, 7, 'El mapa debe publicarse antes de que termine la ficha')
  liberar(unidades(7))
  assert.equal((await lecturaPendiente).estadoDetalle, 'actual')

  // Una respuesta que ignora AbortSignal no puede publicar tras cambiar de escenario.
  let resolverAnterior
  const respuestaAnterior = new Promise(resolve => { resolverAnterior = resolve })
  const eventos = []
  const viejo = iniciarControlador(1, { mapa: m => eventos.push(m.escenarioId), detalle: () => {}, error: () => {} },
    { mapa: () => respuestaAnterior, unidades: async () => unidades(1) }, 100000)
  viejo.cerrar()
  const nuevo = iniciarControlador(2, { mapa: m => eventos.push(m.escenarioId), detalle: () => {}, error: () => {} },
    { mapa: async () => mapa(1, 1, 2), unidades: async () => unidades(1, 2) }, 100000)
  resolverAnterior(mapa(9))
  await new Promise(resolve => setImmediate(resolve))
  nuevo.cerrar()
  assert.ok(eventos.length > 0)
  assert.ok(eventos.every(id => id === 2), 'Nunca se publica el escenario anterior')

  // Los refrescos durante una lectura se agrupan sin solapar ciclos.
  let resolverMapa, llamadas = 0, concurrentes = 0, maximo = 0
  const lenta = new Promise(resolve => { resolverMapa = resolve })
  const controlador = iniciarControlador(1, { mapa: () => {}, detalle: () => {}, error: () => {} }, {
    mapa: async () => { llamadas++; concurrentes++; maximo = Math.max(maximo, concurrentes); const m = llamadas === 1 ? await lenta : mapa(2); concurrentes--; return m },
    unidades: async () => unidades(2),
  }, 100000)
  controlador.refrescar(); controlador.refrescar()
  assert.equal(llamadas, 1)
  resolverMapa(mapa(2))
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(maximo, 1)
  assert.equal(llamadas, 4, 'Un refresco pendiente equivale a un ciclo adicional')
  controlador.cerrar()

  const versiones = []
  const colaVersiones = [mapa(5), mapa(5), mapa(4)]
  const cVersion = iniciarControlador(1, { mapa: m => versiones.push(m.versionEstado), detalle: () => {}, error: () => {} },
    { mapa: async () => colaVersiones.shift(), unidades: async () => unidades(5) }, 100000)
  await new Promise(resolve => setImmediate(resolve))
  cVersion.refrescar()
  await new Promise(resolve => setImmediate(resolve))
  cVersion.cerrar()
  assert.deepEqual(versiones, [5, 5], 'La versión aceptada nunca retrocede')

  mapas = [mapa(1), mapa(2), mapa(3)]
  result = await leerOperacion(1, signal, () => true, null,
    { mapa: async () => mapas.shift(), unidades: async () => unidades(0) })
  assert.equal(result.mapa.versionEstado, 3)
  assert.equal(result.estadoDetalle, 'pendiente')
  assert.equal(result.unidades, null)

  result = await leerOperacion(1, signal, () => true, unidades(1),
    { mapa: async () => mapa(2), unidades: async () => { throw Error('sin conexión') } })
  assert.equal(result.mapa.versionEstado, 2)
  assert.equal(result.estadoDetalle, 'desactualizado')

  mapas = [mapa(5), mapa(4)]
  let version = 0
  result = await leerOperacion(1, signal, m => m.escenarioId === 1 && m.versionEstado >= version && !!(version = m.versionEstado), null,
    { mapa: async () => mapas.shift(), unidades: async () => unidades(5) })
  assert.equal(result.mapa.versionEstado, 5)
  assert.equal(result.estadoDetalle, 'pendiente')

  global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ versionContrato: 2, escenarioId: 1, relojH: 0 }) })
  await assert.rejects(consultarInstantanea(1), /Contrato inválido/)
  global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ versionContrato: 1, escenarioId: 2, relojH: 0, unidades: [] }) })
  await assert.rejects(consultarUnidades(1), /Contrato inválido/)
  if (process.env.SEMANA11_API_TEST === '1') {
    global.fetch = realFetch
    const a = await realFetch('http://localhost:8080/api/operacion/actual').then(r => r.json())
    const m = await consultarInstantanea(a.escenarioId)
    const u = await consultarUnidades(a.escenarioId)
    assert.ok((await consultarPedidos(a.escenarioId)).some(p => p.codigo === 'PED-SEM11'))
    assert.equal(m.escenarioId, a.escenarioId)
    assert.equal(u.unidades.length, 37)
    assert.equal(flotaOficial(u.unidades), true)
    assert.equal(flotaOficial(u.unidades.slice(0, 30)), false)
    assert.ok(m.incidencias.some(i => i.tipo === 'MANTENIMIENTO'))
    const conResidual = structuredClone(m)
    conResidual.plan = { rutas: [{ id: 1, vehiculoId: 1, tipoVehiculo: 'AUTO', horaInicioH: 1, horaFinH: 2, distanciaKm: 1, costo: 1, cargaTotal: 0, paradas: [], trazado: [], trayectoria: [{ x1: 27, y1: 14, x2: 28, y2: 14, salidaH: 1, llegadaH: 2 }] }] }
    conResidual.fisico.vehiculos[0].residual = { x: 27.5, y: 14, destinoX: 28, destinoY: 14, finH: 12, distanciaKm: 0.5 }
    global.fetch = async () => ({ ok: true, status: 200, json: async () => conResidual })
    assert.equal((await consultarInstantanea(a.escenarioId)).fisico.vehiculos[0].residual.x, 27.5)
    assert.deepEqual(posicionFisica(conResidual.fisico.vehiculos[0]), { x: 27.5, y: 14 })
    const adaptado = datosMapa({ escenarioId: a.escenarioId, versionEstado: m.versionEstado, relojH: m.relojH, fisico: conResidual.fisico }, null, m.pedidos, m.incidencias)
    assert.equal(adaptado.vehiculos.length, 37)
    assert.equal(adaptado.vehiculos[0].x, 27.5)
    const estacionadas = adaptado.vehiculos.map(v => ({ ...v, x: 27, y: 14 }))
    const agrupadas = agruparPosiciones(estacionadas).get('27,14')
    assert.equal(agrupadas.length, 37)
    assert.equal(new Set(agrupadas.map(v => v.id)).size, 37)
    assert.ok(agrupadas.every(v => v.x === 27 && v.y === 14))
    conResidual.plan.rutas[0].trayectoria[0].llegadaH = 'incorrecto'
    await assert.rejects(consultarInstantanea(a.escenarioId), /Contrato inválido/)
    const invalido = structuredClone(u)
    invalido.unidades[0].ocupacionPct = 'dato inválido'
    global.fetch = async () => ({ ok: true, status: 200, json: async () => invalido })
    await assert.rejects(consultarUnidades(a.escenarioId), /Contrato inválido/)
    if (process.env.SEMANA11_AVERIAS === '1') {
      global.fetch = realFetch
      const disponibles = u.unidades.filter(v => v.estado === 'EN_BASE').slice(0, 3)
      assert.equal(disponibles.length, 3)
      for (let tipo = 1; tipo <= 3; tipo++) {
        const incidencia = await registrarAveria(a.escenarioId, disponibles[tipo - 1].id, tipo, `Prueba local tipo ${tipo}`)
        assert.equal(incidencia.tipoAveria, tipo)
        assert.equal(incidencia.tipo, 'AVERIA')
        console.log(`Avería local tipo ${tipo}: incidencia ${incidencia.id}, unidad ${disponibles[tipo - 1].codigo}`)
      }
    }
  }
  console.log('Lectura operativa: pruebas focalizadas correctas')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
