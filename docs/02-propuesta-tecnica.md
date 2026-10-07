# Propuesta técnica — Cotizador web Ideal Alambrec

**Versión:** v0.1 · **Fecha:** 2026-10-07

Reemplazo del `Cotizador_PRO_V6R02-2026.xlsm` por una aplicación web centralizada, con autenticación SSO, auditoría, y dashboard comercial.

---

## 1. Arquitectura

```
                     ┌───────────────────────────┐
                     │  Asesor / Supervisor / Admin
                     │  (navegador: PC, tablet)
                     └──────────────┬────────────┘
                                    │ HTTPS
                                    ▼
                    ┌───────────────────────────────┐
                    │  cotizador.idealalambrec.com  │
                    │  ─ Next.js 14 (App Router)    │
                    │  ─ Tema Ideal Alambrec        │
                    │  ─ PWA (instalable)           │
                    └──────────────┬────────────────┘
                                   │
          ┌────────────────────────┼──────────────────────────┐
          ▼                        ▼                          ▼
 ┌─────────────────┐     ┌───────────────────┐     ┌──────────────────┐
 │  Auth (SSO)      │     │  API NestJS       │     │  Generador PDF   │
 │  Microsoft Entra │     │  (Node 20 LTS)    │     │  (Playwright     │
 │  o Google WS     │     │  REST + OpenAPI   │     │   headless)      │
 └─────────────────┘     └─────────┬─────────┘     └──────────────────┘
                                   │
                   ┌───────────────┼───────────────┐
                   ▼               ▼               ▼
          ┌───────────────┐ ┌────────────┐ ┌──────────────┐
          │ PostgreSQL 16 │ │ Redis      │ │ Blob storage │
          │ (datos +      │ │ (cache +   │ │ (PDFs, logos)│
          │  audit_log)   │ │  colas)    │ │              │
          └───────────────┘ └────────────┘ └──────────────┘
```

### Entidades principales

- `User` (id, email, nombre, rol, tenant_id, activo)
- `Role` (asesor, supervisor, admin, lector)
- `Customer` (id, nombre, empresa, direccion, ciudad, tier, telefono, correo)
- `Product` (id, sap_code, familia, descripcion, acabado, peso, es_liviano, es_pesado, foto_url)
- `PriceList` (id, nombre, vigente_desde, vigente_hasta, activo)
- `PriceListItem` (price_list_id, product_id, tier, precio, costo)
- `Quote` (id, numero, user_id, customer_id, tipo, longitud_m, altura, color, placa, puas, inclinacion, precio_total, estado, created_at, price_list_id_snapshot)
- `QuoteLine` (quote_id, product_id, cantidad, precio_unitario, descuento_pct, subtotal, peso_total)
- `AuditLog` (id, user_id, entity, entity_id, action, before_json, after_json, ip, timestamp)

### Permisos por rol

| Acción | Asesor | Supervisor | Admin | Lector |
|---|---|---|---|---|
| Crear cotización | ✅ | ✅ | ✅ | ❌ |
| Ver sus propias cotizaciones | ✅ | ✅ (todas) | ✅ (todas) | ✅ (todas) |
| Editar cotización ajena | ❌ | ✅ (de su equipo) | ✅ | ❌ |
| Aplicar descuento sobre umbral | ❌ (requiere aprobación) | ✅ | ✅ | ❌ |
| Editar lista de precios | ❌ | ❌ | ✅ | ❌ |
| Alta/baja de usuarios | ❌ | ❌ | ✅ | ❌ |
| Ver dashboard global | ❌ | ✅ | ✅ | ✅ |

---

## 2. Stack tecnológico

| Capa | Elección | Por qué |
|---|---|---|
| Frontend | **Next.js 14 + TypeScript + Tailwind + shadcn/ui** | Rápido, SEO-ready, PWA, componentes profesionales |
| Backend | **NestJS 10 + TypeScript** | API estructurada, OpenAPI auto-generado, mismos tipos TS que el front |
| ORM | **Prisma 5** | Migraciones versionadas, autocompletado completo |
| Base de datos | **PostgreSQL 16** | Soporta `jsonb` para audit log, maduro, open source |
| Cache / colas | **Redis 7** (BullMQ) | Encolar PDFs y envíos de correo sin bloquear al usuario |
| Autenticación | **NextAuth.js + Entra ID OIDC** (o Google OIDC) | SSO oficial del tenant Grupo AG |
| PDFs | **Playwright headless** (render de template HTML) | Mismo diseño que la web, soporta logo, fuentes y tablas sin dolor |
| Correos | **Resend** o **SendGrid** (SMTP del propio Grupo AG si lo exigen) | Entrega confiable, logs de envío |
| Infra | **Azure App Service / Container Apps** o **AWS ECS** | Lo que exija IT. Infra como código con Terraform |
| CI/CD | **GitHub Actions** → staging → aprobación manual → prod | Pipeline reproducible |
| Monitoreo | **Sentry** (errores) + **Grafana Cloud** (métricas) | Visibilidad sin que IT tenga que operarlo |
| Backups | Snapshots diarios de Postgres (7 días) + export S3 semanal | RPO 24h, RTO 2h |

Nada aquí es "lock-in agresivo": todo corre en Docker y puede moverse a la nube de Ideal cuando IT lo decida.

---

## 3. Lógica de cálculo (replica del Excel)

El Excel actual tiene 4 hojas de cálculo (hojas `Calculo`, `Lineal`, `Lineal 2`, `Cubicador`) con fórmulas que:

1. A partir de la **longitud en metros**, calcular cuántos **paneles** entran (`longitud / 2.50`, redondeado hacia arriba).
2. Calcular cuántos **postes** entran (`paneles + 1`), con diferencias por esquinas.
3. Calcular **fijaciones, pernos y tuercas** por panel (6 unidades por panel en Perimetral).
4. Ajustar por **altura** (`1.11 m`, `2.08 m`, `2.40 m`) → cambia modelo de panel.
5. Ajustar por **inclinación del terreno (escalonado)** → modifica cantidad de postes.
6. Opcional: sumar **brazos**, **puas**, **puertas**, **adicionales**.
7. Aplicar **tier de precio** del cliente y **descuentos** (Livianos 0–20%, Pesados 0–46%).
8. Calcular **peso total**, **precio total**, resumen y plantilla imprimible.

**Plan:** encapsular esta lógica en un servicio `QuoteCalculator` con tests unitarios que:

- Para cada tipo (Perimetral, Urbana, Intradomiciliaria, Máxima Seguridad), tome inputs idénticos a los del Excel.
- Compare el resultado contra una batería de **cotizaciones reales** generadas con el Excel original (al menos 20 casos: alturas distintas, con/sin puertas, con/sin púas, pendientes 0%/5%/15%).
- Rechazar la entrega si algún caso difiere en más de $0.01.

Esto evita el riesgo clásico de "el nuevo sistema calcula distinto al Excel" que mata adopción.

---

## 4. Trazabilidad y auditoría

Cada acción que modifica datos pasa por un `AuditInterceptor` que escribe en `audit_log`:

- Quién (`user_id`, `email`)
- Qué (`entity`, `entity_id`, `action`)
- Antes y después (`before_json`, `after_json`)
- Desde dónde (`ip`, `user_agent`)
- Cuándo (`timestamp UTC`)

El log es **append-only**: nadie, ni admin, puede borrarlo desde la UI. Solo con acceso directo a Postgres se podría tocar, y ese acceso se restringe a 1–2 personas con credenciales rotadas.

En la UI, cada cotización muestra:

> _Creada por Melanie Naranjo el 2026-10-07 14:22. Última edición: Lauro Cordero el 2026-10-07 15:05. 3 ediciones. Ver historial →_

---

## 5. Seguridad

- **TLS 1.3** en todo el tráfico. Certificado Let's Encrypt renovado automáticamente.
- **SSO con MFA** heredado del tenant Grupo AG (los admins ya exigen MFA ahí).
- **Secrets** en Azure Key Vault o AWS Secrets Manager (nunca en el repo).
- **CSP + security headers** estrictos (Helmet).
- **Rate limiting** en login y en API pública.
- **Dependencias auditadas** semanalmente (Dependabot).
- **Pen-test** inicial antes de salir a producción (opcional, cotizable aparte).
- **Backups cifrados** at rest.
- **Cumplimiento LOPDP Ecuador**: política de privacidad visible, consentimiento explícito del cliente final al recibir su cotización por correo, derecho de supresión documentado.

---

## 6. Fases y entregables

### Fase 0 — Descubrimiento (semana 1–2)
- Reunión con IT de Grupo AG.
- Confirmar hosting final, dominios SSO, acceso a infra.
- Validación de la lista de precios 2026.
- Entrega del manual de marca.

### Fase 1 — MVP (semana 3–10, ~8 semanas)
- Repo + CI/CD + staging.
- Diseño UI (Figma, 3 iteraciones).
- Login SSO.
- Catálogo + lista de precios versionada.
- Formulario de cotización (4 tipos).
- Motor de cálculo con tests contra Excel.
- Generación de PDF.
- Envío por correo.
- Panel admin básico (precios, usuarios).
- Dashboard por asesor (métricas básicas).
- Auditoría.
- Deploy a producción + capacitación.

### Fase 2 — Upsell (semana 11+, ~6 semanas)
- Aprobación de descuentos.
- Facturación electrónica SRI (integrador: Dátil o Contífico).
- Firma / aceptación online del cliente.
- Reportes avanzados.
- Integración con SAP (si Ideal expone webservice).

### Fase 3 — Expansión (opcional)
- Portal del cliente final.
- App móvil nativa.
- Multi-tenant (si vendemos a otros fabricantes).

---

## 7. Lo que no hace la propuesta (fuera de alcance MVP)

- Inventario / stock en tiempo real.
- Pedidos, despachos, cobranza.
- Contabilidad.
- Facturación electrónica (va a Fase 2).
- Integración con SAP (va a Fase 2).
- CRM completo (solo contactos mínimos).
- Portal del cliente final (va a Fase 3).

Si alguna de estas es imprescindible, hay que repriorizar.
