# Cotizador CercasPro — Ideal Alambrec

Aplicación web que reemplaza el **Cotizador PRO V6R02-2026** (Excel con macros) de Ideal Alambrec · Grupo AG: precios centralizados, login corporativo (SSO), auditoría de quién hizo qué, PDF con la marca, dashboard comercial y **configuración sin programador** (precios, reglas de cálculo, usuarios y límites).

> ⚠️ Este repositorio es **público** y `legacy/` contiene el Excel original con la lista de precios (incluida la columna de costos) y datos de asesores. Cámbialo a privado en GitHub → Settings → General → Danger Zone.

## Arranque rápido

Requisitos: Node 22 y PostgreSQL 16 (o Docker).

```bash
npm ci
cp .env.example .env              # ajusta DATABASE_URL, NEXTAUTH_SECRET y PILOT_PIN
npx prisma migrate deploy
npm run db:seed                   # lista CP_2026 + asesores desde legacy/*.xlsm + datos demo
npm run dev                       # http://localhost:3000
```

Con Docker: `cp .env.example .env && docker compose up --build`.

Cuentas de prueba (correo + `PILOT_PIN`): `admin@piloto.local`, `supervisor@piloto.local`, `asesor@piloto.local`, `gerencia@piloto.local`. Guion de demo y checklist para producción en [`docs/08-guia-piloto.md`](docs/08-guia-piloto.md).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build && npm start` | Producción |
| `npm test` | Pruebas del motor (las comparaciones contra el Excel corren si existe el fixture local) |
| `npm run golden` | Recalcula el Excel original en LibreOffice con 285 combinaciones y guarda el fixture (gitignored, contiene precios) |
| `npm run lint` / `npm run typecheck` | Calidad de código |
| `npm run db:seed` | Carga inicial (idempotente). `SEED_RESET_DEMO=true` regenera solo los datos demo |

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/lib/engine/` | Motor de cálculo y lenguaje de fórmulas (corre en navegador y servidor) |
| `src/lib/import/` | Lectura de listas de precios y asesores desde Excel |
| `src/lib/server/` | Cotizaciones, PDF, correo, catálogo |
| `src/app/` | Pantallas y acciones de servidor |
| `prisma/` | Esquema, migraciones y carga inicial |
| `tests/` | Pruebas unitarias y comparación contra el Excel |
| `scripts/golden/` | Generador de casos desde el Excel (LibreOffice) |
| `legacy/` | Excel original |
| `docs/` | Análisis, decisiones, propuestas, hallazgos y guía del piloto |

## Documentos

| Doc | Contenido |
|---|---|
| [`00-analisis-y-propuesta.md`](docs/00-analisis-y-propuesta.md) | Qué hace el Excel, problemas, opciones de solución |
| [`01-decisiones.md`](docs/01-decisiones.md) | Decisiones tomadas y pendientes |
| [`02-propuesta-tecnica.md`](docs/02-propuesta-tecnica.md) | Arquitectura, motor, seguridad, despliegue |
| [`03-propuesta-comercial.md`](docs/03-propuesta-comercial.md) | Modelos de precio (estimaciones) y Fase 2 |
| [`04-pitch-para-it.md`](docs/04-pitch-para-it.md) | Una página para la reunión con IT |
| [`05-roadmap.md`](docs/05-roadmap.md) | Estado por fase |
| [`06-competencia-y-contexto.md`](docs/06-competencia-y-contexto.md) | Contexto de mercado (con correcciones) |
| [`07-hallazgos-excel.md`](docs/07-hallazgos-excel.md) | Validación contra el Excel y errores encontrados |
| [`08-guia-piloto.md`](docs/08-guia-piloto.md) | Cómo levantarlo, demo y checklist de producción |
