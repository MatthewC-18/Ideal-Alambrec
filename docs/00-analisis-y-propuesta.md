# Modernización del Cotizador — Ideal Alambrec

**Autor:** Matthew Cedeño · **Fecha:** 2026-10-07 · **Versión:** v0.1 (borrador)

---

## 1. Qué hace hoy el Cotizador PRO V6R02-2026

El archivo analizado (`legacy/Cotizador_PRO_V6R02-2026.xlsm`, 4.2 MB, con VBA) es un cotizador para la línea **CercasPro** de Ideal Alambrec (hoy parte de Grupo AG tras la compra a Bekaert en junio 2025).

### Hojas que contiene

| Hoja | Rol | Estado |
|---|---|---|
| `MENU PRINCIPAL` | Pantalla con botones (ejecutan macros) | visible |
| `Ingreso` / `Ingresar` | Formularios de ingreso de datos del cliente y la obra | visible |
| `Calculo` / `Calcular` | Cálculos internos (122×90 celdas) | **oculta** |
| `Salida` / `Salidar` | Plantilla imprimible de la cotización | visible |
| `Lineal`, `Lineal 2`, `Cubicador` | Hojas auxiliares de cálculo lineal / cubicación | visible |
| `CP_2026` | **Lista de precios 2026** (SAP, producto, peso, acabado, 7 tiers de precio) | visible |
| `CERCAPRO Marzo9` | Lista de precios anterior (histórica) | visible |
| `DATOS PARTIDA`, `DATOS (1)` | Catálogo de asesores (nombre, correo, teléfono) y categorías | visible |

### Datos clave que maneja

- **Cliente:** nombre, empresa, dirección, ciudad, ubicación obra, teléfono, correo, fecha.
- **Obra / cerramiento:** longitud (m), placa, púas, inclinación del terreno (%), altura, color, puertas, adicionales.
- **Tipo de producto:** PERIMETRAL, URBANA, INTRADOMICILIARIA, MÁXIMA SEGURIDAD.
- **Categoría comercial / tier:** CercaSolu, Mallero, Distribuidor, Mayorista, Franquicia, Detallista, PVS.
- **Descuentos:** Livianos (0–20%), Pesados (0–46%).
- **Asesor asignado** (24 vendedores con dominio `@somosgrupoag.com` / `@bekaert.com`).
- **Catálogo:** ~90 SKUs (códigos SAP), con peso, acabado (Verde/Galvanizado/Duplex), precio por tier y costo.

### Lógica

- **Macros VBA** (`Módulo1.bas`): botones UNO/DOS/TRES/CUATRO ocultan/muestran rangos de filas según el tipo elegido; `PROPUESTA` navega entre hojas.
- Las fórmulas se enganchan con la lista de precios (`CP_2026`) por código SAP.
- La macro `PROPUESTA` **llama a otro archivo externo** (`'Cotizador 2023 V1.0.xlsm'!UNO`) → confirma el problema: el programa depende de archivos locales que el programador tiene que redistribuir.

---

## 2. Problemas actuales (lo que ustedes ya identificaron + lo que yo veo)

### Lo que ustedes mencionaron
1. **Excel viejo** — difícil de mantener, se corrompe, pesa 4 MB.
2. **Actualizaciones manuales** — el programador corrige, graba un nuevo `.xlsm`, lo pasa de PC en PC por USB o correo.
3. **Sin autenticación** — no se sabe quién creó/modificó cada cotización.
4. **Sin trazabilidad** — no hay registro de cambios ni versiones.
5. **IT debe aprobar** la nueva solución.
6. Deben respetarse **colores corporativos**.

### Lo que no están tomando en cuenta (y les va a doler si no se piensa ahora)

7. **Facturación electrónica SRI** — en Ecuador es obligatoria desde 2014. Hoy el Excel no genera comprobante válido ante el SRI. Si el cotizador se queda solo en “cotización”, bien; si tienen que generar facturas, deben integrar un emisor autorizado (Siigo, Dátil, Factura.net, Contífico) o emitir ellos mismos vía webservice del SRI.
8. **Lista de precios versionada** — hoy una cotización vieja ya no se puede reproducir porque sobrescribieron precios. Hay que guardar **el precio con el que se cotizó** en cada cotización, y versionar las listas (`CP_2024`, `CP_2025`, `CP_2026` ya lo intuyen pero manual).
9. **Workflow de descuentos** — hoy el asesor pone 0–46% a mano. Debería haber **aprobación** por un gerente cuando el descuento pase cierto umbral (por tier y por familia liviana/pesada).
10. **Ciclo de vida de la cotización** — Borrador → Enviada → Vista por el cliente → Aceptada / Rechazada → Pedido → Factura. Hoy no existe.
11. **Multi-sucursal** — Ideal tiene plantas en Quito, Guayaquil y Cuenca. Precios, IVA (15%), stock pueden diferir.
12. **Integración con SAP** — ya usan códigos SAP en el catálogo. Lo ideal es que el cotizador consulte stock y precios del ERP (o al menos reciba un volcado nocturno).
13. **Dispositivos móviles** — asesores en obra con tablet/celular. Excel en celular es inservible.
14. **Email directo al cliente** desde la plataforma + firma del cliente (aceptación).
15. **Reportes / dashboard** — ventas por asesor, por producto, tasa de conversión, pipeline, cotizaciones pendientes. Hoy no se puede sacar.
16. **Backup / respaldo** — si se corrompe el Excel, se pierde todo.
17. **Transición Bekaert → Grupo AG** — los dominios de correo están en migración (`@bekaert.com` y `@somosgrupoag.com` coexisten). Hay que definir con qué marca sale el PDF y qué dominios se aceptan en login.
18. **Permisos por tier** — un “Distribuidor” no debería ver el precio “Franquicia”. Hoy todos ven todo porque es un Excel compartido.
19. **Capacidad offline** — en obra puede no haber internet. Hay que decidir si se cotiza solo online o se guarda localmente y se sincroniza.
20. **Cumplimiento de datos personales** — ley orgánica de protección de datos de Ecuador (LOPDP, vigente desde 2023). Los asesores están manejando datos de clientes y hay que registrar consentimientos y permisos.

---

## 3. Opciones de solución

### Opción A — SaaS multi-tenant (plataforma web pública)
- Toda la data en la nube del proveedor (nosotros).
- Ideal Alambrec paga suscripción mensual/anual por usuario.
- Updates automáticos, sin instalación.
- **Pros:** rapidísimo de lanzar; cero mantenimiento para Ideal; nosotros arreglamos bugs sin tocar sus PCs.
- **Contras:** IT puede resistirse (datos “afuera”); dependencia de internet; vendor lock-in; costo recurrente.
- **Cuándo elegirla:** si queremos vender esto a varios clientes del rubro (otros fabricantes/distribuidores de cercas en LatAm) y es un producto nuestro.

### Opción B — Web app on-premise / en servidor de Ideal (recomendada para IT)
- Mismo stack web pero desplegado en infraestructura de ellos (AWS/Azure/GCP cuenta de Ideal, o server propio).
- Datos quedan en su nube/servidor; nosotros entregamos software + mantenimiento.
- **Pros:** IT aprueba fácil (datos “adentro”); SSO con su Microsoft 365 / Google Workspace; integración con su SAP más directa.
- **Contras:** cada update requiere coordinación con IT; costo inicial más alto; nosotros no vemos la data para soportar.
- **Cuándo elegirla:** si Ideal es cliente único y el equipo IT es exigente en seguridad / soberanía de datos.

### Opción C — Híbrido (recomendada en la realidad)
- Web app desarrollada por nosotros, desplegada en **la nube de Ideal** (su cuenta Azure/AWS), con nuestro acceso de soporte.
- IT la aprueba porque es “su” nube.
- Nosotros mantenemos y actualizamos con un pipeline CI/CD.
- Ellos tienen su propia instancia, sus propios respaldos, su propio dominio (`cotizador.idealalambrec.com`).
- **Pros:** lo mejor de A y B.
- **Contras:** un poco más de setup inicial.

### Opción D — App de escritorio con base de datos centralizada (NO recomendada)
- Instalador .exe en cada PC, apuntando a una base en servidor central.
- **Pros:** se parece a lo que ya conocen; funciona offline.
- **Contras:** vuelve a tener los mismos problemas del Excel (instalar en cada PC, versionar binarios, celular/tablet no sirve). Es un paso atrás disfrazado.

### Opción E — Potenciar el Excel (parche, NO recomendada)
- Dejar Excel con VBA pero conectarlo a OneDrive/SharePoint para que todos lean la lista de precios desde un solo lugar.
- **Pros:** barato, rápido.
- **Contras:** no resuelve autenticación, auditoría ni ciclo de vida. Sigue siendo frágil. Es un curita.

---

## 4. Mi recomendación

**Opción C — Web app desplegada en nube de Ideal Alambrec**, como **SaaS interno** del grupo.

- Frontend: Next.js (React) con tema de colores corporativos de Ideal Alambrec / Grupo AG.
- Backend: Node.js (en el piloto se integró en la misma app Next.js; ver `02-propuesta-tecnica.md` v0.2).
- Base de datos: PostgreSQL.
- Autenticación: **SSO con Microsoft 365** (ya tienen correos `@bekaert.com`), con roles (Asesor, Supervisor, Gerente Comercial, IT, Lector).
- Auditoría: tabla `audit_log` con `user_id, action, entity, before, after, timestamp, ip`.
- Despliegue: Azure App Service o AWS ECS en cuenta de Ideal; dominio `cotizador.idealalambrec.com`.
- CI/CD: GitHub Actions → despliegue a staging → aprobación de IT → producción.
- Mobile: web responsive (PWA, instalable como app).

Esto cubre todos los dolores que mencionaron **y** los puntos que no estaban considerando.

---

## 5. Features MVP (fase 1)

1. Login SSO con Microsoft 365 + roles.
2. Catálogo de productos con fotos (ya tenemos las imágenes del Excel).
3. Lista de precios versionada (`CP_2026`, histórico), editable solo por rol Admin.
4. Formulario de cotización por tipo (Perimetral / Urbana / Intradomicilaria / Máxima Seguridad).
5. Cálculo automático (replica la lógica de las hojas `Calculo` / `Lineal` / `Cubicador`).
6. Selector de tier de cliente con descuentos autorizados.
7. Aprobación de descuentos sobre umbral.
8. Generación de PDF con marca corporativa.
9. Envío de la cotización por correo al cliente.
10. Listado de mis cotizaciones + búsqueda / filtro.
11. Audit log visible para supervisores.
12. Panel admin para editar precios y asesores.

## 6. Features Fase 2 (siguientes)

- Firma electrónica / aceptación online del cliente.
- Dashboard de ventas (por asesor, por producto, tasa de cierre).
- Integración con SAP (sincronización de precios y stock).
- Facturación electrónica SRI (vía integrador).
- App móvil nativa (si la PWA no basta).
- CRM mínimo (contactos, oportunidades, pipeline).

---

## 7. Competencia / referencias del sector

### Competencia directa de Ideal Alambrec en Ecuador

> **Corrección:** la versión anterior listaba competidores y afirmaba que “nadie en el rubro tiene un cotizador web”. No estaba verificado y se retiró; ver `06-competencia-y-contexto.md` §2 para lo que falta confirmar.

Referencia de la marca CercasPro: **Proalco (Bekaert Colombia)** menciona en su catálogo 2021 una app para simular proyectos. Es de Bekaert, no de Grupo AG.

### Competencia de software CPQ genérico
- Salesforce CPQ, HubSpot CPQ, SAP CPQ, Oracle CPQ → caros, demasiado grandes para este caso.
- Odoo (open source) → tiene módulo de cotizaciones, se puede personalizar.
- Flowlu, QuoteWerks, PandaDoc → genéricos, no entienden cálculo lineal por metro.

Ninguno trae de fábrica la lógica de cálculo de cerramientos de Ideal; habría que programarla igual. Por eso tiene sentido hacerlo a medida.

---

## 8. Riesgos y supuestos

| Riesgo | Mitigación |
|---|---|
| IT de Ideal rechaza la nube externa | Opción C: desplegamos en SU nube. |
| El cálculo del Excel tiene reglas no documentadas en las fórmulas | Replicar hoja por hoja con test cases contra el Excel original. |
| La transición Bekaert → Grupo AG cambia la marca a mitad del proyecto | Diseñar la plataforma con el logo y colores como variables (theme), no hardcode. |
| Asesores resisten dejar el Excel | UI que replique el flujo que ya conocen + capacitación. |
| Precios SAP cambian seguido | Admin con importación CSV + historial. |

---

## 9. Siguientes pasos

Antes de empezar a construir, necesito respuestas a las preguntas del documento `docs/01-preguntas-para-definir.md` (siguiente paso de esta conversación).
