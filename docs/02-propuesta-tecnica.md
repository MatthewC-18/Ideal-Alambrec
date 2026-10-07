# Propuesta técnica — Cotizador web Ideal Alambrec

**Versión:** v0.2 (actualizada con el piloto construido) · **Fecha:** 2026-10-07

Reemplazo del `Cotizador_PRO_V6R02-2026.xlsm` por una aplicación web centralizada, con SSO, auditoría, dashboard comercial y configuración sin programador.

> Cambio respecto a v0.1: se simplificó la arquitectura. En lugar de un API NestJS separado, Redis y Playwright para PDFs, el piloto usa **una sola aplicación Next.js** (interfaz + servidor) con PostgreSQL. Para ~30 usuarios es más simple de operar para IT y no se pierde nada; si crece, el motor de cálculo y los módulos ya están separados.

---

## 1. Arquitectura

```
 Navegador (PC, tablet, celular)
        │ HTTPS
        ▼
 ┌──────────────────────────────────────────────┐
 │ Next.js 15 (Node 22)                         │
 │  ─ Pantallas (React 19 + Tailwind)           │
 │  ─ Acciones de servidor (validación con Zod) │──► SSO Microsoft Entra ID / Google (OIDC, NextAuth)
 │  ─ Motor de cálculo (TypeScript puro)        │
 │  ─ PDF (@react-pdf/renderer)                 │──► SMTP corporativo (nodemailer)
 └───────────────────────┬──────────────────────┘
                         ▼
                 PostgreSQL 16 (Prisma ORM)
```

### Módulos del código

| Ruta | Contenido |
|---|---|
| `src/lib/engine/` | Motor de cálculo: lenguaje de fórmulas seguro (`expr.ts`), cálculo de cotización (`engine.ts`), rollos de púas (`rolls.ts`), reglas iniciales transcritas del Excel (`default-rules.ts`). No depende de la base de datos: corre igual en el navegador (cálculo en vivo) y en el servidor (validación al guardar). |
| `src/lib/import/excel.ts` | Lector de listas de precios (formato CP_2026) y asesores desde Excel. |
| `src/lib/server/` | Guardado de cotizaciones, PDF, correo, catálogo, validación de reglas. |
| `src/app/actions/` | Acciones de servidor con control de permisos y auditoría. |
| `src/app/(app)/` | Pantallas. |
| `prisma/` | Esquema, migraciones y carga inicial. |
| `tests/` | Pruebas unitarias y comparación contra el Excel original. |

### Datos principales

`User`, `Customer`, `Product`, `PriceList` (+ `PriceListItem`, `PriceListTier`), `RuleSet` (reglas versionadas en JSON), `Quote` (+ `QuoteLine`), `EmailLog`, `Setting`, `AuditLog`.

- Listas de precios y reglas tienen estados **borrador → vigente → archivada**. Cada cotización guarda con qué lista y qué versión de reglas se calculó, así que publicar cambios no altera cotizaciones anteriores.
- `AuditLog` tiene un trigger en PostgreSQL que impide `UPDATE` y `DELETE`.

### Roles

| Acción | Asesor | Supervisor | Admin | Solo lectura |
|---|---|---|---|---|
| Crear / enviar cotizaciones | ✅ propias | ✅ todas | ✅ todas | ❌ |
| Ver cotizaciones | propias | todas | todas | todas |
| Ajustar precios en una cotización | hasta 5 %* | hasta 15 %* | sin límite* | ❌ |
| Listas de precios y reglas de cálculo | ❌ | ✅ | ✅ | ❌ |
| Usuarios, datos de empresa, límites | ❌ | ❌ | ✅ | ❌ |
| Auditoría | ❌ | ✅ | ✅ | ✅ |

\* Límites editables en Configuración → Empresa.

---

## 2. Motor de cálculo

Las reglas del Excel se transcribieron como **datos editables**, no como código:

- **Alturas** por sistema, con sus productos (panel, poste plinto/placa, tapa, perno, brazo) y parámetros (`fijPorPoste`, `permitePlaca`, …).
- **Fórmulas intermedias**, por ejemplo Perimetral: `tramos = roundup(L / 2.5 * (1 + incl))`, `postes = tramos + 1`, `paneles = roundup(L / 2.5)`, `fijaciones = postes * fijPorPoste` (3 en 1,11 m; 5 en 2,08/2,40 m; 7 en 3,05 m; 9 en 4,02 m).
- **Líneas de materiales**: código SAP + cantidad + condición (“solo si hay placa”) + tipo de precio (categoría, descuento livianos, pesados).
- **Validaciones** que bloquean o advierten (p. ej. 3,05 m no se fabrica con placa).

Precio por categoría = `REDONDEAR(PVS × (1 − % categoría); 2)`, igual que el Excel. IVA configurable (15 %).

Las fórmulas usan un lenguaje propio y seguro (números, variables, `+ − * /`, comparaciones, `roundup`, `round`, `min`, `max`, `if`): no puede ejecutar código ni acceder a nada fuera de la cotización.

**Validación:** 285 combinaciones recalculadas en el Excel original (LibreOffice) y comparadas línea por línea. Detalle en `07-hallazgos-excel.md`. Para regenerar la comparación: `npm run golden && npm test`.

---

## 3. Seguridad

- SSO OIDC (Microsoft Entra ID o Google). Solo entran correos registrados y activos; desactivar a un usuario corta su acceso en la siguiente solicitud.
- Acceso piloto con correo + PIN, desactivable con `PILOT_LOGIN=false`.
- Todas las mutaciones pasan por acciones de servidor con verificación de rol y validación de datos; los límites de descuento se vuelven a verificar en el servidor (no se confía en el navegador).
- Auditoría append-only a nivel de base de datos, con IP y navegador.
- Cabeceras de seguridad (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`).
- Exportación CSV protegida contra inyección de fórmulas.
- Secretos solo en variables de entorno (`.env` está en `.gitignore`).

Pendiente para producción: HTTPS en el hosting elegido, respaldos de la base, pen-test si IT lo exige, política de privacidad (LOPDP) para datos de clientes.

---

## 4. Despliegue

- `Dockerfile` + `docker-compose.yml` (app + PostgreSQL). Al arrancar: aplica migraciones, carga la lista de precios y asesores del Excel si la base está vacía, y levanta el servidor.
- Funciona en cualquier nube con contenedores (Azure Container Apps / App Service, AWS ECS, GCP Cloud Run) con PostgreSQL administrado, o en un servidor propio.
- Pasos con IT: ver `08-guia-piloto.md` → *Checklist para pasar a producción*.

---

## 5. Fases

| Fase | Estado | Contenido |
|---|---|---|
| 0 — Descubrimiento | ✅ | Análisis del Excel, decisiones, propuesta. |
| 1 — Piloto / MVP | ✅ construido | Todo lo descrito arriba. Falta: SSO real, SMTP real, hosting (dependen de IT). |
| 2 — Upsell | Propuesto | Aprobación de descuentos por supervisor, facturación electrónica SRI (vía integrador), aceptación online del cliente, integración SAP, reportes avanzados. |
| 3 — Expansión | Opcional | Portal de distribuidores/franquicias, app nativa, multi-empresa. |
