# Contexto competitivo y de mercado

**Versión:** v0.2 (corregida) · **Fecha:** 2026-10-07

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

> **Corrección (v0.2):** la versión anterior de este documento tenía una tabla de competidores con su “nivel de digitalización” y afirmaba que ninguno tenía cotizador web. **Eso no estaba verificado** (la búsqueda no devolvió fuentes sobre competidores) y se retiró. Antes de usar este argumento con Ideal hay que confirmarlo.

Pendiente de investigar con fuentes (o preguntarle al área comercial de Ideal, que conoce el mercado):

- Qué fabricantes e importadores compiten en cerramientos, alambre de púas y mallas en Ecuador.
- Si alguno ofrece cotizador en línea, configurador o app para distribuidores.
- Cómo cotizan a constructoras y distribuidores (correo, WhatsApp, portal B2B).

## 3. Referencia dentro de Bekaert (no de Grupo AG)

El catálogo CercasPro 2021 de **Proalco (Bekaert Colombia)** menciona una aplicación para simular visualmente el proyecto. Proalco es de Bekaert, no de Grupo AG (la compra de junio 2025 cubre Ecuador, Costa Rica y Venezuela según la nota citada), así que sirve como ejemplo de la marca CercasPro, **no** como precedente del grupo actual.

> Fuente: [Catálogo Cercas Pro 2021 — Proalco](https://proalco.bekaert.com/content/dam/bekaert-proalco/catalogos/Catalogo-Cercas-Pro-2021.pdf).

## 4. Software CPQ genérico (y por qué no basta tal cual)

- Los CPQ grandes (Salesforce, SAP, Oracle) y los generalistas (HubSpot, Odoo, PandaDoc, Quotient, DealHub) se pueden configurar, pero no traen la lógica de cerramientos de Ideal (tramos por longitud, postes por altura, fijaciones por poste, escalonamiento, rollos de púas): habría que programarla igual, encima de una licencia.
- Las herramientas para cercas que aparecieron en la búsqueda están orientadas a contratistas instaladores de EE. UU. (cobros ACH), no a un fabricante en Ecuador.
- Precios y alcance de cada producto: no verificados; si se usan en la propuesta, cotizarlos con cada proveedor.

**Conclusión:** construir a medida tiene sentido porque la regla de cálculo es propia de Ideal, y ya está validada contra su Excel (ver `07-hallazgos-excel.md`).

> Fuentes: [Capterra directorio CPQ](https://www.capterra.es/directory/30904/cpq/software), [HubSpot — Mejores software de cotización](https://blog.hubspot.es/sales/mejores-software-cotizacion?app=wp).

## 5. Regulación clave en Ecuador

- **Facturación electrónica SRI** — obligatoria desde 2014. Si Ideal quiere emitir factura desde la plataforma, hay que integrar con un emisor autorizado (Dátil, Contífico, Siigo, Facelec, etc.). Esto va a Fase 2.
- **Ley Orgánica de Protección de Datos Personales (LOPDP)** — vigente desde 2023. Obliga a tratar datos con consentimiento, registro, derecho de supresión. Nuestra plataforma debe cumplir.
- **IVA 15%** (vigente desde abril 2024, antes 12%). El cotizador debe permitir ajuste si cambia.

> Fuentes: [Siigo — Obligados a facturar electrónicamente](https://www.siigo.com/ec/obligados-a-facturar-electronicamente/), [Siigo — Qué es facturación electrónica](https://www.siigo.com/ec/blog/contabilidad-y-finanzas/que-es-la-facturacion-electronica-y-como-impulsa-tu-negocio/).

## 6. Mercado y timing

- GlobalData proyecta que la construcción en Ecuador crezca 3,3 % real en 2026.
- El Banco Central registró en el cuarto trimestre de 2025 un crecimiento interanual de apenas 0,8 %.
- (Se retiró una afirmación sobre “obras públicas de Grupo AG”: no tenía fuente.)

## 7. Argumentos de venta hacia Ideal (verificables)

1. **“Cotiza igual que su Excel, pero sin sus errores”** — 285 casos comparados contra el Excel original; 9 hallazgos documentados (`07-hallazgos-excel.md`).
2. **“Cambian precios y reglas ustedes mismos”** — lista nueva desde Excel, ajuste masivo por %, reglas con simulador; sin redistribuir archivos.
3. **“Saben quién hizo qué”** — SSO corporativo + auditoría que ni un administrador puede borrar.
4. **“Precios y reglas versionados”** — cada cotización guarda la lista y las reglas con que se hizo.
5. **“Listo para probar”** — piloto funcionando con sus precios reales y sus 19 asesores.

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
