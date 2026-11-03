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

## Candidato local del 3 de noviembre de 2026

- Frontend: `git rev-parse HEAD` = `f6f311ea90b85069cf719742cd2c56429ab1654b`; el árbol contiene modificaciones sin commit en `app/page.tsx`, pruebas y documentación, y nuevos módulos en `lib/operacion/`. El hash identifica solo la base confirmada, no contiene esos cambios. Los artefactos OpenSpec del cambio también tienen modificaciones locales.
- Backend: `git rev-parse HEAD` = `9945a4fc4832437fc8558b99569d22f96e2da1cf`; `git status --short` no mostró cambios. JAR compilado con Maven 3.9.9 y Java 25.0.2 usando `-DskipTests`.
- API local del ensayo: `http://127.0.0.1:18080`, MySQL aislado `127.0.0.1:13316`, base `paqrap_semana11`; frontend de desarrollo `http://localhost:3000`. Estas direcciones son locales. Fijar `NEXT_PUBLIC_API_URL` antes del build y configurar CORS para el origen efectivo de integración.
- Comprobaciones del frontend: `node tests/lectura-operacion.cjs`, `corepack pnpm exec tsc --noEmit` y `corepack pnpm build`, con Node 24.21.0 y pnpm 10.18.3. El build de Next no verifica tipos por sí solo.
- Preparación reproducible: iniciar MySQL aislado con las migraciones V1–V8 y el usuario limitado a la base de pruebas; copiar los archivos suministrados de ventas, bloqueos y mantenimiento a una carpeta aislada. Definir `BD_URL`, `BD_USUARIO`, `BD_CLAVE`, `SIM_DATOS_DIR` y `PUERTO` para el proceso backend, iniciar el JAR con `--server.address=127.0.0.1` y comprobar `/api/salud`, `/api/datos` y `/api/operacion/actual`. Para reconstruir el backend en este entorno: `mvn -Dmaven.repo.local=<repositorio-maven-local> -DskipTests package`. Las credenciales locales no forman parte de estas notas ni del repositorio.
- Contratos y resultados: [contratos.md](contratos.md) y [verificacion-tecnica.md](verificacion-tecnica.md). Se ensayaron recuperación diaria, controles cortos de 5D/Colapso y final de mantenimiento; la sincronización de detalle bajo avance rápido precisó pausar el escenario de prueba.
- Pendientes externos: prueba multiusuario fuera de localhost, corrida oficial completa 5D y aceptación y despliegue compartidos. La revisión visual local 4.5 está documentada en [revisión visual](revision-visual-2026-11-03.md). Ninguna de estas comprobaciones se presenta como aprobada por el ensayo local ni se exige para preparar este candidato local.
