# Notas para integración — borrador

Estado al 27 de octubre de 2026: evidencia de preparación local; el despliegue y su aceptación siguen a cargo de integración. La referencia base del ensayo frontend fue `864c75bf7a65355cda8c84248c49631836b47a1a`, antes de incorporar los cambios de este candidato. Para identificar la revisión frontend que contiene este documento, consultar `git rev-parse HEAD` en el checkout correspondiente. La corrección de recuperación del backend quedó en `d7fed602ecfa9d40dc018338d27297f5773b8632`, que incluye los commits remotos de ventas anteriores.

## Configuración y contratos

- `NEXT_PUBLIC_API_URL` debe apuntar a la API accesible por cada navegador y definirse antes del build; el valor local usado en las pruebas es `http://localhost:8080`, que solo sirve en la misma máquina.
- Configurar en el backend los orígenes permitidos para la URL efectiva del frontend. Confirmar el acceso desde los clientes previstos, sin dar por aprobado el entorno compartido a partir de localhost.
- La API debe exponer operación actual, simulaciones, mapa, unidades, pedidos e incidencias descritos en [contratos.md](contratos.md). La recuperación diaria debe conservar `ERROR` y su diagnóstico hasta una reanudación explícita.
- El catálogo local confirmó 37 unidades (10 autos, 15 motos y 12 bicicletas) y tres almacenes. El catálogo local informó cero archivos de ventas y bloqueos; la corrida oficial requiere sus datos.

## Lista de integración

- [x] Pruebas focalizadas de lectura operativa y comprobación explícita de TypeScript en la copia local; la configuración de Next omite los errores de tipos en el build.
- [x] Backend local con BD de pruebas, recuperación de error, pedidos, incidencias y composición de flota comprobados según [verificación técnica](verificacion-tecnica.md).
- [ ] Registrar el hash del frontend publicado junto al commit backend indicado y confirmar que sean las revisiones usadas en la integración.
- [ ] Repetir build y pruebas sobre esos commits y con `NEXT_PUBLIC_API_URL` de integración.
- [ ] Comprobar regresiones de simulación. La prueba de API y CORS fuera de localhost con dos clientes fue omitida por indicación del usuario y no está aprobada.
- [ ] La corrida 5D con datos oficiales fue omitida por indicación del usuario y no está aprobada; véase la [matriz de aceptación](aceptacion.md).
- [ ] Entregar esta evidencia al responsable de integración de `sol.integrada.sem11`. El despliegue y la publicación corresponden a integración.
