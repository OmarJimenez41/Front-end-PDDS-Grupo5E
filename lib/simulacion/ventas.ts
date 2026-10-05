// Lectura en el navegador de los archivos mensuales de ventas del curso.
// Formato publicado: archivo ventasAAAAMM (con o sin .txt); registro ##d##h##m:posX,posY,cIdCliente,qq,hl.
// Sirve para validar la cobertura antes de subir los archivos; el back-end vuelve a validarlos.

const NOMBRE = /^ventas(\d{4})(\d{2})(?:\.txt)?$/i
const REGISTRO = /^(\d{1,2})d(\d{1,2})h(\d{1,2})m\s*:\s*(\d+)\s*,\s*(\d+)\s*,\s*([^,\s]+)\s*,\s*(\d+)\s*,\s*(\d+)$/
const PLAZOS = [36, 4, 8, 12, 18]

/** Minutos desde 1970 en UTC: aritmética de fechas sin husos horarios ni horario de verano. */
type Minuto = number

export interface Venta { ingreso: Minuto; x: number; y: number; cliente: string; cantidad: number; horasLimite: number }

export interface LecturaVentas {
  archivo: File
  /** 'aaaa-mm' */
  mes: string
  ventas: Venta[]
  lineasInvalidas: number
  errores: string[]
}

export interface CoberturaLocal {
  meses: string[]
  faltantes: string[]
  pedidos: number
  lineasInvalidas: number
  /** Archivos que no corresponden a ningún mes de la ventana: no hace falta subirlos. */
  sobrantes: string[]
}

const dosDigitos = (n: number) => String(n).padStart(2, '0')
const diasDelMes = (anio: number, mes: number) => new Date(Date.UTC(anio, mes, 0)).getUTCDate()

/** Mes que declara el nombre del archivo, 'aaaa-mm', o null si no sigue la convención del curso. */
export function mesDelArchivo(nombre: string): string | null {
  const m = NOMBRE.exec(nombre)
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return null
  return `${m[1]}-${m[2]}`
}

/** 'aaaa-mm-ddThh:mm' del input datetime-local → minuto UTC. */
export function minutoDe(fechaHora: string): Minuto {
  const [f, h = '00:00'] = fechaHora.split('T')
  const [a, m, d] = f.split('-').map(Number)
  const [hh, mm] = h.split(':').map(Number)
  return Date.UTC(a, m - 1, d, hh, mm) / 60000
}

const mesDe = (minuto: Minuto) => { const d = new Date(minuto * 60000); return `${d.getUTCFullYear()}-${dosDigitos(d.getUTCMonth() + 1)}` }

export async function leerVentas(archivo: File): Promise<LecturaVentas> {
  const mes = mesDelArchivo(archivo.name)
  if (!mes) throw new Error(`«${archivo.name}» no sigue el nombre ventasAAAAMM`)
  const [anio, numeroMes] = mes.split('-').map(Number)
  const ventas: Venta[] = []
  const errores: string[] = []
  let invalidas = 0
  const lineas = (await archivo.text()).replace(/^﻿/, '').split(/\r?\n/)
  lineas.forEach((cruda, i) => {
    const linea = cruda.trim()
    if (!linea || linea.startsWith('#')) return
    const m = REGISTRO.exec(linea)
    const falla = (motivo: string) => { invalidas++; if (errores.length < 5) errores.push(`línea ${i + 1}: ${motivo}`) }
    if (!m) return falla('no cumple ##d##h##m:posX,posY,cliente,qq,hl')
    const [dia, hora, minuto, x, y] = [1, 2, 3, 4, 5].map(k => Number(m[k]))
    const cantidad = Number(m[7])
    const horasLimite = Number(m[8])
    if (dia < 1 || dia > diasDelMes(anio, numeroMes) || hora > 23 || minuto > 59) return falla('instante fuera del mes')
    if (x > 70 || y > 50) return falla('ubicación fuera del mapa 70×50')
    if (cantidad <= 0) return falla('cantidad no positiva')
    if (!PLAZOS.includes(horasLimite)) return falla(`plazo hl=${horasLimite} no admitido`)
    ventas.push({ ingreso: Date.UTC(anio, numeroMes - 1, dia, hora, minuto) / 60000, x, y, cliente: m[6], cantidad, horasLimite })
  })
  return { archivo, mes, ventas, lineasInvalidas: invalidas, errores }
}

/**
 * Cobertura de los cinco días que empiezan en {@code inicio}: qué meses toca la ventana
 * (puede cruzar de un mes al siguiente), cuáles faltan y cuántos pedidos caen en [inicio, inicio + 5 d).
 */
export function cobertura(inicio: string, lecturas: LecturaVentas[], dias = 5): CoberturaLocal {
  const desde = minutoDe(inicio)
  const hasta = desde + dias * 24 * 60
  const meses: string[] = []
  for (let mes = mesDe(desde); ; ) {
    meses.push(mes)
    if (mes === mesDe(hasta - 1)) break
    const [a, m] = mes.split('-').map(Number)
    mes = m === 12 ? `${a + 1}-01` : `${a}-${dosDigitos(m + 1)}`
  }
  const porMes = new Map(lecturas.map(l => [l.mes, l]))
  const usadas = meses.flatMap(m => porMes.get(m) ?? [])
  return {
    meses,
    faltantes: meses.filter(m => !porMes.has(m)).map(m => `ventas${m.replace('-', '')}`),
    pedidos: usadas.reduce((n, l) => n + l.ventas.filter(v => v.ingreso >= desde && v.ingreso < hasta).length, 0),
    lineasInvalidas: usadas.reduce((n, l) => n + l.lineasInvalidas, 0),
    sobrantes: lecturas.filter(l => !meses.includes(l.mes)).map(l => l.archivo.name),
  }
}
