const assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript')
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, f)
const { datosMapa } = require('../lib/api/operacion.ts')
const { cumplimientoPlazo } = require('../lib/operacion/cumplimiento.ts')
const { resultadoSimulacion, reporteHtml } = require('../lib/operacion/reporteLegible.ts')
const p = { id: 1, codigo: 'P', posX: 0, posY: 0, cantidad: 4, tipo: 'PRIORIZADO', horaIngresoH: 7, fechaLimiteH: 11, estado: 'ENTREGADO', entregadoEnH: 12 }
const servicio = (cantidad, llegadaH, confirmada = true) => ({ entregaId: String(llegadaH), pedidoId: 1, vehiculoId: 1, cantidad, llegadaH, finH: llegadaH + 1, confirmada })
const ficha = servicios => datosMapa({ escenarioId: 1, versionEstado: 1, relojH: 12, fisico: { relojH: 12, almacenes: [], vehiculos: [], servicios } }, null, [p]).rastreo[0]
let r = ficha([servicio(2, 10), servicio(2, 11)])
assert.equal(r.llegadaRealH, 11); assert.equal(r.entregadoEnH, 12); assert.equal(r.margenH, 0)
assert.equal(cumplimientoPlazo(r), 'a tiempo')
r = ficha([servicio(2, 11.25), servicio(2, 10)])
assert.equal(cumplimientoPlazo(r), 'fuera de plazo')
assert.equal(cumplimientoPlazo(ficha([servicio(2, 10), servicio(2, 11, false)])), null)
assert.equal(cumplimientoPlazo(ficha([])), null)
const vista = { simulacion: { tipo: 'CINCO_DIAS', inicioH: 0, relojH: 120 }, pedidos: { incorporados: 5, entregados: 4, entregadosATiempo: 2, sinRegistroLlegada: 1, noEntregados: 0, abiertos: 1 } }
const res = resultadoSimulacion(vista, String)
assert.equal(res.tarde, 1); assert.equal(res.sinRegistroLlegada, 1)
const reporte = { escenarioId: 1, versionEstado: 1, relojH: 120, estado: 'FINALIZADO', generadoEn: '2026-11-06T18:00:00Z', planAplicable: false, cierreDefinitivo: true, criterioEstabilidad: '', pedidos: [], paquetes: [], fisico: { vehiculos: [], almacenes: [] }, acumulado: null, ultimaPlanificacionEstable: null }
const html = reporteHtml(reporte, String, vista)
assert.match(html, /Sin registro de llegada/); assert.match(html, /llegada de todas las entregas parciales/)
console.log('Cumplimiento por llegadas: puntuales, parciales tardías y ausencia de historia verificados')
