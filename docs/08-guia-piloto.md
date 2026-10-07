# Guía del piloto — Cotizador CercasPro

## Qué incluye el piloto

| Módulo | Qué hace |
|---|---|
| **Inicio (dashboard)** | Cotizado del mes, tasa de cierre, ticket promedio, cotizado vs. aceptado por mes, embudo por estado, ranking de asesores (supervisores), cotizaciones a las que hay que darles seguimiento. |
| **Nueva cotización** | Cliente (búsqueda o alta rápida), varios cerramientos por cotización (Perimetral, Urbana, Intradomiciliaria, Máxima Seguridad), opciones con fotos (placa/plinto, púas, terreno escalonado), materiales calculados en vivo, ajuste de cantidades y precios con límite por rol, puertas/portones del catálogo, ítems libres (transporte, instalación), descuentos, observaciones. |
| **Detalle de cotización** | PDF con la marca Ideal Alambrec + Grupo AG, envío por correo con el PDF adjunto, estados (borrador, enviada, aceptada, rechazada, vencida), duplicar con precios vigentes, historial de cambios. |
| **Clientes** | Base compartida, categoría de precio por cliente, cotizaciones y monto aceptado por cliente. |
| **Catálogo y precios** | Lista vigente por familia, con el precio de cada categoría (reemplaza la hoja CP_2026). |
| **Configuración** | Listas de precios (importar Excel, editar, ajuste masivo por %, comparar, publicar), reglas de cálculo (editar fórmulas, simulador, publicar, restaurar versiones), usuarios y roles, datos de la empresa, IVA, límites de descuento por rol, plantilla de correo, borrar datos de demostración. |
| **Auditoría** | Registro inalterable (protegido en la base de datos) de inicios de sesión, cotizaciones, envíos, descargas, precios, reglas, usuarios y configuración. Exportable a CSV. |

## Cómo levantarlo

### Opción A — Docker (recomendada para IT)

```bash
cp .env.example .env          # cambia NEXTAUTH_SECRET y PILOT_PIN
docker compose up --build     # crea la base, carga precios y asesores del Excel, y arranca
# abrir http://localhost:3000
```

> Nota: el `Dockerfile` y el `docker-compose.yml` se escribieron pero **no se pudieron ejecutar en el entorno donde se construyó el piloto** (no tenía Docker). Verificarlos en la primera prueba de IT.

### Opción B — Node + PostgreSQL

Requisitos: Node 22, PostgreSQL 16.

```bash
npm ci
cp .env.example .env                 # ajusta DATABASE_URL
npx prisma migrate deploy            # crea las tablas
npm run db:seed                      # importa lista CP_2026 y asesores del Excel + datos demo
npm run build && npm start           # http://localhost:3000
```

## Cuentas de prueba (modo piloto)

Mientras no esté configurado el SSO, se entra con **correo + PIN del piloto** (`PILOT_PIN` en `.env`).

| Cuenta | Rol | Para mostrar |
|---|---|---|
| `admin@piloto.local` | Administrador | Todo, incluidos usuarios y datos de la empresa |
| `supervisor@piloto.local` | Supervisor comercial | Dashboard del equipo, precios, reglas, auditoría |
| `asesor@piloto.local` | Asesor comercial | Flujo diario de cotización |
| `gerencia@piloto.local` | Solo lectura | Consulta de todo sin poder modificar |

Los 19 asesores de la hoja `DATOS (1)` del Excel (correos `@somosgrupoag.com`) también quedan creados y pueden entrar con su correo y el PIN.

Las cotizaciones `DEMO-…` y los clientes “(demo)” son **ficticios** y existen solo para que el dashboard tenga datos. Se borran desde Configuración → Empresa → *Borrar datos de demostración*.

## Guion de demo (10 minutos)

1. **Login** como asesor → el dashboard muestra su actividad y las cotizaciones por seguir.
2. **Nueva cotización** → buscar “Andina” → Perimetral → 130 m → 2,08 m → con púas. Mostrar que los materiales y el total aparecen al instante y abrir *¿Cómo se calculó?*.
3. Agregar un **portón** del catálogo y un ítem libre “Transporte”. Bajar 3 % el precio de un poste (se permite y queda marcado); intentar bajar 20 % el panel (el sistema lo bloquea por el límite del rol).
4. **Guardar → Ver PDF → Enviar al cliente.** Mostrar el historial a la derecha.
5. Entrar como **supervisor** → *Cotizaciones → Solo con ajustes manuales*: el supervisor ve qué precios cambió cada asesor.
6. **Configuración → Listas de precios → Editar sobre la vigente → Ajuste masivo +3 % a Perimetral → Publicar.** Volver a cotizar: el precio nuevo ya está, sin mandar ningún archivo.
7. **Configuración → Reglas de cálculo → Crear borrador** → cambiar `fijPorPoste` de 2,08 m a 6 → el simulador muestra la diferencia contra la versión vigente → *Guardar y validar* → *Publicar*.
8. **Auditoría:** cada paso anterior aparece con usuario, fecha e IP.
9. Cerrar con `docs/07-hallazgos-excel.md`: los errores del Excel que el sistema corrige.

## Checklist para pasar a producción (con IT)

- [ ] Elegir hosting (nube de Ideal/Grupo AG o la nuestra) y dominio, p. ej. `cotizador.idealalambrec.com`.
- [ ] **SSO Microsoft Entra ID:** registrar una aplicación en el tenant de Grupo AG con la URL de retorno `https://<dominio>/api/auth/callback/azure-ad`; cargar `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET` y `AZURE_AD_TENANT_ID`. (Si usan Google Workspace: `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, retorno `/api/auth/callback/google`.)
- [ ] Poner `PILOT_LOGIN="false"` cuando el SSO funcione.
- [ ] `NEXTAUTH_SECRET` largo y aleatorio; `NEXTAUTH_URL` con el dominio final.
- [ ] Correo saliente: `SMTP_*` (Microsoft 365 o el relay que defina IT). Sin esto los envíos quedan como “simulado”.
- [ ] Respaldos automáticos de PostgreSQL (diarios, retención mínima 7 días).
- [ ] Revisar con Ideal las 3 preguntas abiertas de `docs/07-hallazgos-excel.md`.
- [ ] Borrar datos de demostración y desactivar las cuentas `@piloto.local`.
- [ ] Hacer el repositorio **privado** (contiene la lista de precios con costos y datos de asesores).

## Limitaciones conocidas del piloto

- Sin facturación electrónica SRI ni flujo de aprobación de descuentos (propuestos para Fase 2).
- Sin portal para el cliente final (Fase 3).
- El correo sale en texto plano con el PDF adjunto.
- Probado en Chromium (escritorio y móvil, 390 px). Falta probar en Safari/iPhone y Edge.
