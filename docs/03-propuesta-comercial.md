# Propuesta comercial — Cotizador web Ideal Alambrec

**Versión:** v0.1 · **Fecha:** 2026-10-07

Este documento define cómo vender el proyecto a Ideal Alambrec. Dos modelos a elegir según la conversación con IT.

---

## Modelo A — SaaS (suscripción mensual)

**La plataforma vive en nuestra nube. Ideal paga por usar.**

| Concepto | Monto (USD) |
|---|---|
| **Setup inicial** (desarrollo del MVP, migración de precios, capacitación) | 6 500 – 9 500 |
| **Suscripción mensual** por 30 usuarios | 450 – 650 / mes |
| **Soporte y mantenimiento** incluido | ✓ |
| **Updates y mejoras continuas** incluidas | ✓ |
| **Hosting, backups, monitoreo** incluidos | ✓ |

Ventajas para Ideal:
- Baja inversión inicial.
- No necesitan infra propia.
- Reciben mejoras gratis conforme crece el producto.

Ventajas para nosotros:
- Ingreso recurrente predecible.
- Podemos revender la plataforma a otros fabricantes LatAm (Novacero, Prodinsa, mercados Costa Rica / Venezuela de Grupo AG) sin reconstruir.

---

## Modelo B — Desarrollo + mantenimiento (hosting en nube de Ideal)

**La plataforma vive en la nube de Ideal (Azure/AWS de ellos). Nosotros desarrollamos, entregamos código, mantenemos.**

| Concepto | Monto (USD) |
|---|---|
| **Desarrollo MVP** (llave en mano, código entregado) | 14 000 – 19 000 |
| **Infra en la nube de Ideal** | la paga Ideal directamente (~80–150/mes) |
| **Soporte y mantenimiento** mensual | 650 – 950 / mes |
| **Updates por release** (cada 3 meses) | incluido |
| **Features nuevas fuera de scope** | por hora (45–60 USD/h) |

Ventajas para Ideal:
- El software es suyo. Pueden auditarlo, cambiarlo, llevarlo a otro proveedor.
- IT lo aprueba más fácil (datos en su nube).
- Costo total menor en 3+ años si la plataforma se estabiliza.

Ventajas para nosotros:
- Ticket inicial más grande.
- Contrato de mantenimiento recurrente.
- Facilita escalar a Fase 2 (facturación SRI, SAP) con un adendum.

---

## Fase 2 — Upsell (ambos modelos)

Documentado desde ya para presentarlo cuando el MVP esté en producción:

| Feature | Modelo A (sumado a mensualidad) | Modelo B (precio fijo) |
|---|---|---|
| Flujo de aprobación de descuentos | +80 USD / mes | 1 800 – 2 500 USD |
| Firma / aceptación online del cliente | +100 USD / mes | 2 200 – 3 000 USD |
| Facturación electrónica SRI (integrador Dátil) | +150 USD / mes + costo del integrador | 3 500 – 5 000 USD + costo del integrador |
| Integración con SAP (precios, stock, clientes) | +120 USD / mes | 2 800 – 4 000 USD |
| Dashboard avanzado (BI, cohortes, pronóstico) | +60 USD / mes | 1 500 – 2 200 USD |

---

## Mi recomendación comercial

**Vender Modelo A primero** (SaaS). Argumentos:

1. **Menor fricción de entrada** — IT no tiene que aprovisionar nada. Firman el contrato y en 8 semanas están usando la plataforma.
2. **Menor riesgo para Ideal** — Si no les sirve, cancelan. No invirtieron 15k.
3. **Mayor margen para nosotros** — ingreso recurrente, posibilidad de revender a otros clientes.
4. **Fácil de migrar al modelo B después** — si en 1–2 años Ideal quiere "comprar" el software, les cobramos la migración a su nube y queda modelo B.

Si IT bloquea el SaaS por política de datos, se cambia a Modelo B sin perder el trabajo hecho.

---

## Timeline comercial sugerido

| Semana | Hito |
|---|---|
| 1 | Enviar propuesta a Ideal (comercial + 1 página para IT). |
| 2 | Reunión con IT. Definir modelo (A o B) y SSO. |
| 3 | Firma de contrato + anticipo (30%). |
| 4–11 | Desarrollo MVP. Demos quincenales. |
| 12 | Capacitación + go-live. Pago final (70% en A, 50% en B + contrato de mantenimiento). |
| 13+ | Operación + Fase 2 cuando Ideal lo pida. |

---

## Lo que incluimos "de regalo" para cerrar

- Diseño del PDF corporativo con la marca de Ideal (vale ~500 USD aparte).
- Capacitación en vivo a los 24 asesores + un video grabado.
- 30 días de hypercare post go-live (bugs corregidos en < 24h).
- Export completo de datos a Excel para que nunca se sientan atrapados.

---

## Riesgos comerciales

| Riesgo | Mitigación |
|---|---|
| IT exige nube propia | Modelo B listo. |
| Grupo AG tiene su propio software corporativo en roadmap | Preguntar en primera reunión; nuestra propuesta es más rápida de desplegar y específica para Ecuador. |
| Resistencia al cambio de asesores | Incluir capacitación + UI que replica el flujo del Excel. |
| Precio percibido como alto | Comparar con costo de 1 persona de IT dedicada a actualizar el Excel = $900/mes mínimo. Nuestro SaaS lo paga en 2 meses. |
