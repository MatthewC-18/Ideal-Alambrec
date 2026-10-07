# Ideal Alambrec — Modernización del Cotizador

Proyecto para reemplazar el **Cotizador PRO V6R02-2026** (archivo Excel con macros VBA) por una aplicación web centralizada, con autenticación SSO, auditoría y dashboard de ventas.

## Estructura del repo

| Carpeta | Contenido |
|---|---|
| `legacy/` | Archivo Excel original (`Cotizador_PRO_V6R02-2026.xlsm`) como fuente de verdad del comportamiento actual. |
| `docs/` | Análisis, decisiones, propuesta técnica y comercial, pitch para IT. |
| _(próximamente)_ | `apps/web`, `apps/api`, `infra` — se agregan cuando se firme el contrato. |

## Documentos

| Doc | Para quién | Qué contiene |
|---|---|---|
| [`docs/00-analisis-y-propuesta.md`](docs/00-analisis-y-propuesta.md) | Interno (nosotros) | Qué hace el Excel, qué duele, opciones (SaaS vs on-prem vs híbrido), features del MVP y futuras. |
| [`docs/01-decisiones.md`](docs/01-decisiones.md) | Interno | Decisiones ya tomadas con el cliente + pendientes. |
| [`docs/02-propuesta-tecnica.md`](docs/02-propuesta-tecnica.md) | IT de Ideal / Grupo AG | Arquitectura, stack, seguridad, fases. |
| [`docs/03-propuesta-comercial.md`](docs/03-propuesta-comercial.md) | Comercial de Ideal | Dos modelos de precio (SaaS vs desarrollo + mantenimiento) y upsell Fase 2. |
| [`docs/04-pitch-para-it.md`](docs/04-pitch-para-it.md) | IT de Ideal / Grupo AG | 1 página para la primera reunión con sistemas. |
| [`docs/05-roadmap.md`](docs/05-roadmap.md) | Interno | Checklist viva de ejecución Fase 0 → Fase 3. |
| [`docs/06-competencia-y-contexto.md`](docs/06-competencia-y-contexto.md) | Interno | Competencia directa, precedentes del grupo, regulación (SRI, LOPDP), fuentes citadas. |

## Fase actual

**Fase 0 — Descubrimiento.** Esperando decisión de hosting y reunión con IT de Ideal / Grupo AG antes de empezar a construir.

## Próximos pasos

1. Confirmar modelo de hosting (SaaS vs nube de Ideal).
2. Reunión con IT para alinear SSO, dominio, seguridad.
3. Firma de contrato + anticipo.
4. Kickoff de Fase 1 (MVP, ~8 semanas).
