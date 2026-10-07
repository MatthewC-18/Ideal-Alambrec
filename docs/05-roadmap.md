# Roadmap de ejecución

**Versión:** v0.2 · **Fecha:** 2026-10-07

## Fase 0 — Descubrimiento
- [x] Análisis del Excel (fórmulas, macros, hojas ocultas, lista de precios).
- [x] Decisiones iniciales con el cliente (`01-decisiones.md`).
- [ ] Reunión con IT de Grupo AG (hosting, SSO, dominio, correo).
- [ ] Manual de marca oficial (el piloto usa el logo Ideal Alambrec + Grupo AG que trae el Excel).
- [ ] Respuestas a las 3 preguntas de `07-hallazgos-excel.md`.

## Fase 1 — Piloto / MVP
- [x] Motor de cálculo configurable + 285 casos comparados contra el Excel.
- [x] Base de datos PostgreSQL con migraciones; auditoría append-only.
- [x] Login SSO (Microsoft/Google listo para conectar) + acceso piloto con PIN.
- [x] Roles: asesor, supervisor, administrador, solo lectura.
- [x] Armador de cotizaciones con cálculo en vivo, varios cerramientos, ajustes con límite por rol, catálogo e ítems libres.
- [x] PDF con marca; envío por correo (simulado hasta tener SMTP).
- [x] Estados, duplicar con precios vigentes, historial por cotización.
- [x] Dashboard (KPIs, cotizado vs aceptado, embudo, asesores, seguimiento).
- [x] Clientes, catálogo por categoría.
- [x] Configuración: listas de precios (importar Excel, ajuste masivo, comparar, publicar), reglas con simulador y versiones, usuarios, empresa/IVA/límites/correo, borrar datos demo.
- [x] Auditoría con filtros y exportación CSV.
- [x] Diseño responsive (probado a 390 px) y build de producción.
- [ ] Probar `docker compose` en un equipo con Docker.
- [ ] Probar en Safari/iPhone y Edge.
- [ ] Conectar SSO real y SMTP real.
- [ ] UAT con 2–3 asesores.
- [ ] Capacitación y go-live.

## Fase 2 — Upsell (propuesta)
- [ ] Flujo de aprobación de descuentos por supervisor.
- [ ] Aceptación online de la cotización por el cliente (link firmado).
- [ ] Facturación electrónica SRI vía integrador.
- [ ] Integración con SAP (precios, stock, clientes).
- [ ] Reportes avanzados.

## Fase 3 — Expansión (opcional)
- [ ] Portal para distribuidores y franquicias con su categoría de precio.
- [ ] App móvil nativa / modo sin conexión.
- [ ] Multi-empresa (otros países del grupo).
