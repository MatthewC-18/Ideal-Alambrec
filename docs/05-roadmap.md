# Roadmap de ejecución

**Versión:** v0.1 · **Fecha:** 2026-10-07

Checklist viva. Marcar `[x]` conforme avanzamos.

---

## Fase 0 — Descubrimiento y validación (semanas 1–2)

- [ ] Reunión con IT de Grupo AG — confirmar modelo de hosting.
- [ ] Validar lista maestra de precios 2026 con el área comercial.
- [ ] Obtener manual de marca de Ideal Alambrec (logo vectorial, paleta, tipografía).
- [ ] Confirmar dominio y tenant de SSO.
- [ ] Firma de NDA + propuesta comercial.
- [ ] Firma de contrato + anticipo.

## Fase 1 — MVP (semanas 3–10)

### Infra
- [ ] Repo con CI/CD en GitHub Actions.
- [ ] Entorno staging con dominio propio.
- [ ] Base de datos PostgreSQL + migraciones Prisma.
- [ ] Redis + colas.
- [ ] Blob storage para PDFs y logos.

### Backend
- [ ] Modelo de datos (User, Customer, Product, PriceList, Quote).
- [ ] Endpoints REST + OpenAPI.
- [ ] Autenticación SSO (Entra ID / Google OIDC).
- [ ] Permisos por rol (Asesor, Supervisor, Admin, Lector).
- [ ] Audit log append-only.
- [ ] Importador de precios desde CSV.
- [ ] Importador de asesores desde CSV.
- [ ] Motor de cálculo `QuoteCalculator` con tests contra el Excel original.
- [ ] Servicio de generación de PDF.
- [ ] Servicio de envío de correo con tracking de entrega.

### Frontend
- [ ] Diseño UI en Figma (3 iteraciones con cliente).
- [ ] Theme con colores corporativos de Ideal Alambrec.
- [ ] Login con SSO.
- [ ] Dashboard por asesor (mis cotizaciones del mes, pipeline).
- [ ] Dashboard de supervisor (todo el equipo).
- [ ] Formulario de cotización por tipo (Perimetral, Urbana, Intradomiciliaria, Máxima Seguridad).
- [ ] Preview del PDF en pantalla.
- [ ] Botón enviar al cliente por correo.
- [ ] Historial y búsqueda de cotizaciones.
- [ ] Admin: edición de productos, precios, usuarios.
- [ ] Panel de audit log para supervisores.
- [ ] PWA instalable (web app en móvil).

### Validación
- [ ] 20 cotizaciones de prueba comparadas contra el Excel original — diferencia ≤ $0.01.
- [ ] Pruebas de carga con 50 usuarios concurrentes.
- [ ] Pen-test básico (headers, auth, injection).
- [ ] UAT con 2–3 asesores "early adopters".

### Lanzamiento
- [ ] Capacitación en vivo (2 sesiones de 1h).
- [ ] Video de capacitación grabado.
- [ ] Manual de usuario (PDF).
- [ ] Go-live.
- [ ] 30 días de hypercare.

## Fase 2 — Upsell (a partir del mes 3)

- [ ] Flujo de aprobación de descuentos.
- [ ] Firma / aceptación online del cliente (link firmado).
- [ ] Facturación electrónica SRI (integración con Dátil o Contífico).
- [ ] Integración con SAP (si hay webservice disponible).
- [ ] Reportes avanzados (cohortes, pronóstico, ranking).

## Fase 3 — Expansión (opcional, a partir del mes 6)

- [ ] Portal del cliente final.
- [ ] App móvil nativa.
- [ ] Multi-tenant para revender a otros fabricantes LatAm.
- [ ] Internacionalización (Costa Rica, Venezuela, Colombia).
