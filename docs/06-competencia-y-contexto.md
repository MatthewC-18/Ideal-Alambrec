# Contexto competitivo y de mercado

**Versión:** v0.1 · **Fecha:** 2026-10-07

Material para blindar la propuesta frente a Ideal/Grupo AG y preparar los próximos pasos de venta.

---

## 1. Quién es Ideal Alambrec hoy

- Fundada hace ~85 años; ~351 empleados; líder metalmecánico en Ecuador.
- Facturación 2024 ≈ 82 M USD; utilidad ≈ 4.2 M USD.
- **Junio 2025:** Grupo AG (Centroamérica) adquirió Ideal Alambrec a Bekaert. La operación también cubre Costa Rica y Venezuela.
- Plantas: Quito, Guayaquil, Cuenca.
- Marca comercial principal: **CercasPro** (perimetral, urbana, intradomiciliaria, máxima seguridad). Catálogo también: Cercas Link (simple, triple protección, campera, hexagonal), barbed wire (Motto, Iowa, Fort, Cebú), cercas eléctricas Volt, malla galvanizada + PVC.
- Patente propia (via Bekaert): **Bezinal**, recubrimiento zinc-aluminio.

> Fuente: catálogos oficiales de idealalambrec.bekaert.com y nota de prensa sobre la adquisición ([El Oriente, 2025](https://www.eloriente.com/articulo/grupo-ag-adquirioacute-ideal-alambrec/51566)).

## 2. Competencia directa de Ideal Alambrec en Ecuador

| Competidor | Enfoque | Nivel de digitalización comercial |
|---|---|---|
| **Novacero** | Acero, varilla, mallas electrosoldadas, cerramientos | Catálogo online pero cotización por correo/vendedor |
| **Adelca / Andec** | Varilla, acero estructural, perfiles | Portal B2B parcial; cotización offline |
| **Prodinsa (Chile, exporta a EC)** | Alambres y mallas | Catálogo online; sin cotizador público |
| **ArcelorMittal** | Acero importado | Enterprise; no local al mercado ecuatoriano |
| **Fisum, Imeco, Trefilería Perseo** | Jugadores menores | Teléfono y WhatsApp |

**Hallazgo:** ninguno tiene un cotizador web público para cerramientos en Ecuador. Si Ideal lo lanza primero, se diferencia claramente.

## 3. Precedente dentro del grupo

**Proalco (Bekaert Colombia)** publicó una app para simular proyectos CercasPro. Hay base de que el grupo acepta herramientas digitales de cotización. Vale la pena citarlo en la propuesta a IT.

> Fuente: [Catálogo Cercas Pro 2021 — Proalco](https://proalco.bekaert.com/content/dam/bekaert-proalco/catalogos/Catalogo-Cercas-Pro-2021.pdf).

## 4. Software CPQ genérico (y por qué no sirve tal cual)

| Producto | Pega para Ideal |
|---|---|
| **Salesforce CPQ / SAP CPQ / Oracle CPQ** | Precio enterprise (50k+/año), largo onboarding. Over-engineered. |
| **HubSpot CPQ** | No tiene lógica de cálculo lineal por metro. |
| **Odoo** (open source) | Flexible pero requiere consultor Odoo caro, UI pesada. |
| **Flowlu, QuoteWerks, PandaDoc** | Genéricos para servicios. No entienden "paneles por longitud". |
| **Software CPQ específico para cercas (US: Harvest, FenceWorks)** | Pensado para contratistas instaladores, no fabricantes. Facturación US (ACH). No cumple SRI Ecuador. |

**Conclusión:** la lógica de cálculo del Excel actual (paneles, postes, accesorios por metro, ajuste por pendiente) es específica y no la trae ningún CPQ comercial. Por eso tiene sentido construirla a medida — y venderla después a otros fabricantes LatAm.

> Fuentes: [Capterra directorio CPQ](https://www.capterra.es/directory/30904/cpq/software), [HubSpot — Mejores software de cotización](https://blog.hubspot.es/sales/mejores-software-cotizacion?app=wp).

## 5. Regulación clave en Ecuador

- **Facturación electrónica SRI** — obligatoria desde 2014. Si Ideal quiere emitir factura desde la plataforma, hay que integrar con un emisor autorizado (Dátil, Contífico, Siigo, Facelec, etc.). Esto va a Fase 2.
- **Ley Orgánica de Protección de Datos Personales (LOPDP)** — vigente desde 2023. Obliga a tratar datos con consentimiento, registro, derecho de supresión. Nuestra plataforma debe cumplir.
- **IVA 15%** (vigente desde abril 2024, antes 12%). El cotizador debe permitir ajuste si cambia.

> Fuentes: [Siigo — Obligados a facturar electrónicamente](https://www.siigo.com/ec/obligados-a-facturar-electronicamente/), [Siigo — Qué es facturación electrónica](https://www.siigo.com/ec/blog/contabilidad-y-finanzas/que-es-la-facturacion-electronica-y-como-impulsa-tu-negocio/).

## 6. Mercado y timing

- GlobalData proyecta la construcción en Ecuador +3.3% real en 2026 — buen momento para digitalizar la venta de materiales.
- El tercer trimestre de 2025 cerró con crecimiento interanual débil (0.8%), pero el pipeline de obras públicas de Grupo AG (Quito, Guayaquil, provincias) está activo.
- Las franquicias y distribuidores de Ideal — segmento de alto volumen de cotizaciones — son los **early adopters naturales** si en Fase 3 se abre el acceso a tier distribuidor.

## 7. Argumentos de venta hacia Ideal

Cuando presentes la propuesta, apóyate en:

1. **"Nadie en su rubro lo tiene"** — diferenciador competitivo real.
2. **"Grupo AG ya aceptó herramientas digitales en Colombia"** — hay precedente.
3. **"Cumple SRI y LOPDP"** — IT no se puede negar por regulación.
4. **"Idéntico al Excel actual"** — mitiga el miedo al cambio.
5. **"Pueden crecer sin reescribir"** — llegamos a franquicias, distribuidores, otros países del grupo.
6. **"Pagan el SaaS en 2 meses contra el costo de mantener el Excel"** — ROI claro.

---

## Fuentes citadas

- [Grupo AG adquirió Ideal Alambrec — El Oriente, 2025](https://www.eloriente.com/articulo/grupo-ag-adquirioacute-ideal-alambrec/51566)
- [Soluciones para la construcción V02 — Ideal Alambrec Bekaert](https://idealalambrec.bekaert.com/content/dam/bekaert-ideal-alambrec/Catalogos/SOLUCIONES-PARA-LA-CONSTRUCCIN-V02-baja.pdf)
- [Catálogo Productos Ferretero — Ideal Alambrec Bekaert](https://idealalambrec.bekaert.com/content/dam/bekaert-ideal-alambrec/Catalogos/CATALOGOPRODUCTOS-FERRETERO-compressed.pdf)
- [Ficha CercasPro Perimetral Ideal HR](https://idealalambrec.bekaert.com/content/dam/bekaert-ideal-alambrec/Fichas/Ficha-CercasPro_Perimetral_IDEAL_HR.pdf)
- [Ficha CercasPro Máxima Seguridad Ideal HR](https://idealalambrec.bekaert.com/content/dam/bekaert-ideal-alambrec/Fichas/Ficha-CercasPro_MaxSeguridad_IDEAL_HR.pdf)
- [Catálogo Agro Ideal Alambrec](https://idealalambrec.bekaert.com/content/dam/bekaert-ideal-alambrec/Catalogos/Catalogo-Agro-Idelalambrec-Comprimido.pdf)
- [Catálogo Cercas Pro 2021 — Proalco Bekaert](https://proalco.bekaert.com/content/dam/bekaert-proalco/catalogos/Catalogo-Cercas-Pro-2021.pdf)
- [Capterra — Directorio de software CPQ en español](https://www.capterra.es/directory/30904/cpq/software)
- [Infor — Qué es CPQ (LATAM)](https://www.infor.com/latam/solutions/service-sales/configure-price-quote/what-is-cpq)
- [HubSpot — Mejores software de cotización](https://blog.hubspot.es/sales/mejores-software-cotizacion?app=wp)
- [SAP — Qué es CPQ (España)](https://www.sap.com/spain/resources/what-is-cpq)
- [Siigo Ecuador — Facturación electrónica SRI](https://www.siigo.com/ec/obligados-a-facturar-electronicamente/)
- [Siigo Ecuador — Qué es la facturación electrónica](https://www.siigo.com/ec/blog/contabilidad-y-finanzas/que-es-la-facturacion-electronica-y-como-impulsa-tu-negocio/)
