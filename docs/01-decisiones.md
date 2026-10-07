# Decisiones tomadas

**Fecha:** 2026-10-07
**Cliente:** Ideal Alambrec S.A. (hoy parte de Grupo AG, adquirida a Bekaert en junio 2025).

## Lo que ya decidimos

| # | Tema | Decisión | Impacto |
|---|---|---|---|
| 1 | **Hosting** | Pendiente final. Default: **SaaS en nuestra nube** (opción A), diseñado para poder trasladar a la nube de Ideal (opción C) si IT lo exige. | Nos permite demo rápido sin esperar aprobaciones de IT, y mantener puerta abierta para revender a otros fabricantes LatAm. |
| 2 | **MVP (Fase 1)** | Cotizador web + PDF + envío por correo + **Dashboard de ventas por asesor**. | Reemplaza al Excel y suma lo que hoy no tienen (métricas comerciales). |
| 3 | **Fase 2 (upsell, documentar y ofrecer)** | Aprobación de descuentos por supervisor + Facturación electrónica SRI. | Nos sirve para ampliar el contrato después del éxito del MVP. |
| 4 | **Autenticación** | **SSO con el tenant corporativo de Grupo AG** (no Bekaert — ya migró). Proveedor IdP exacto (Entra ID / Google) por confirmar con IT. | Cero gestión de contraseñas por nuestro lado. IT lo adora. |
| 5 | **Marca** | **Ideal Alambrec** (85 años de reconocimiento en Ecuador). Theme con variables para poder sumar Grupo AG o cambiar sin tocar código. | PDF y UI con logo y colores de Ideal. |
| 6 | **Volumen inicial** | ~30 usuarios (24 asesores + 2–3 supervisores + admins). Arquitectura preparada para crecer a 500+ si abren a franquicias/distribuidores en Fase 3. | Infra barata al inicio, escalable sin reescribir. |
| 7 | **Portal del cliente final** | **No** en el MVP. El asesor envía PDF por correo como hoy. | Reduce alcance del MVP y evita onboarding de miles de clientes. |
| 8 | **Precios** | **Lista oficial por tier** (los 7 tiers del Excel: CercaSolu, Mallero, Distribuidor, Mayorista, Franquicia, Detallista, PVS). Precios pactados por cliente → Fase 2. | Replica fielmente lo que hoy manejan. |
| 9 | **Contacto IT** | Todavía no. Armamos primero propuesta técnica + comercial + pitch de 1 página para IT. | Entramos con todo cocinado, no con un pedido vago. |

## Pendientes por confirmar antes de empezar código

1. Dominio real del tenant SSO del grupo (`@grupoag.com`, `@somosgrupoag.com`, `@idealalambrec.com`, o combinación durante transición).
2. Proveedor IdP real (Microsoft Entra ID o Google Workspace).
3. Reunión con IT de Ideal/Grupo AG para alinear: hosting, seguridad, datos.
4. Manual de marca de Ideal Alambrec (logo oficial vectorial, paleta, tipografía).
5. Lista maestra de precios 2026 vigente (hoy la tenemos en `CP_2026` del Excel; confirmar que es la correcta).
6. Lista maestra de asesores vigente (dominios `@bekaert.com` + `@somosgrupoag.com` en transición).

## Decisiones de la Fase 1 (construcción del piloto)

| Tema | Decisión | Por qué |
|---|---|---|
| Arquitectura | Una sola app Next.js (pantallas + servidor) + PostgreSQL, sin API ni Redis separados. | Menos piezas para IT con ~30 usuarios; el motor de cálculo quedó independiente por si se separa después. |
| Diferenciador | **Configuración sin programador**: precios, reglas de cálculo, usuarios, límites y textos se cambian desde la app, con borradores, simulador y versiones. | Es el problema de fondo: hoy cada cambio exige un Excel nuevo distribuido PC por PC. |
| Ajuste de precios por el asesor | Permitido por línea, con tope por rol (asesor 5 %, supervisor 15 %, admin sin tope; editable). Queda marcado y auditado. | Da autonomía al asesor sin perder control. La aprobación por encima del tope es Fase 2. |
| Errores del Excel | Se corrigen 3 errores de cálculo y se preguntan 3 dudas a Ideal (`07-hallazgos-excel.md`). | Cotizar “igual que el Excel” incluyendo sus errores no le sirve al cliente. |
| Datos sensibles | Precios y datos de asesores se leen del Excel en la carga inicial; no se copian a archivos del repo. | El repositorio está público mientras no se cambie su visibilidad. |
| Branding | Logo Ideal Alambrec + Grupo AG extraído del Excel; colores tomados del logo (#00AEEF, #003DA7, #294A8D). | Es la versión que ya usa el equipo comercial. |
