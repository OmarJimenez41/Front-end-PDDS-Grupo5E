'use client'
import { createContext } from 'react'
import { UMBRALES_PEDIDO, type Umbrales } from '@/lib/api/operacion'
export const UmbralesCtx = createContext({ pedido: UMBRALES_PEDIDO as Umbrales, stock: { verde: 50, rojo: 20 } as Umbrales })
