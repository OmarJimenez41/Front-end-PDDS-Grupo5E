export type Camara = { escala: number; x: number; y: number }
export function limitarCamara(x: number, y: number, escala: number, ancho: number, alto: number): Camara {
  if (escala === 1) return { escala, x: 0, y: 0 }
  // Permite centrar incluso nodos de los bordes, sin dejar que el mapa salga de la vista.
  return { escala, x: Math.min(ancho / 2, Math.max(ancho / 2 - ancho * escala, x)), y: Math.min(alto / 2, Math.max(alto / 2 - alto * escala, y)) }
}
export function ampliarCamara(c: Camara, factor: number, punto: { x: number; y: number }, ancho: number, alto: number): Camara {
  const escala = Math.min(8, Math.max(1, c.escala * factor))
  const razon = escala / c.escala
  return limitarCamara(punto.x - (punto.x - c.x) * razon, punto.y - (punto.y - c.y) * razon, escala, ancho, alto)
}
export function centrarCamara(c: Camara, punto: { x: number; y: number }, ancho: number, alto: number): Camara {
  const escala = Math.max(2, c.escala)
  return limitarCamara(ancho / 2 - punto.x / 70 * ancho * escala, alto / 2 - (1 - punto.y / 50) * alto * escala, escala, ancho, alto)
}
