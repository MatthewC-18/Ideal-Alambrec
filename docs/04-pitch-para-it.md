# Pitch para IT de Ideal Alambrec / Grupo AG

**Documento de 1 página para la primera reunión con sistemas.**

---

## El problema

Los 24 asesores comerciales de Ideal Alambrec cotizan hoy con un archivo Excel con macros (`Cotizador_PRO_V6R02-2026.xlsm`, 4 MB). Esto genera:

- Cada actualización de precios obliga al programador a enviar el archivo a cada PC manualmente.
- No hay forma de saber **quién** generó o modificó cada cotización.
- No hay respaldo centralizado; si un asesor pierde el archivo, se pierde el histórico.
- No hay reportes comerciales (cotizaciones del mes, tasa de cierre, ranking de productos).
- Los asesores en obra no pueden cotizar desde celular o tablet.

## La solución

**Cotizador web** desplegado en `cotizador.idealalambrec.com`, accesible desde navegador en cualquier dispositivo.

- **Autenticación con SSO** del tenant corporativo de Grupo AG (sin contraseñas nuevas).
- **Lista de precios centralizada**: un admin la actualiza y todos los asesores ven la versión vigente al instante.
- **Audit log inmutable**: cada acción queda registrada con usuario, fecha, IP.
- **PDF corporativo** con marca de Ideal, enviado al cliente por correo desde la misma plataforma.
- **Dashboard por asesor y por supervisor**: cotizaciones del día/mes, pipeline, conversión.
- **Mismo cálculo que el Excel actual**, validado con 285 casos recalculados del archivo original; además corrige 3 errores del Excel que hoy producen cotizaciones incompletas o con sobreprecio (ver `07-hallazgos-excel.md`).
- **Configuración sin programador**: precios (importando el Excel de siempre), reglas de cálculo con simulador, usuarios y límites de descuento.

## Lo que necesitamos de IT (ronda 1)

1. **Modelo de hosting** — ¿SaaS en nuestra nube (opción A) o despliegue en la nube de Ideal/Grupo AG (opción B)? Ambas están diseñadas y presupuestadas.
2. **Identity Provider** — ¿Microsoft Entra ID o Google Workspace? ¿Dominio del tenant?
3. **Dominio** — ¿Pueden asignar `cotizador.idealalambrec.com` o prefieren un subdominio bajo `grupoag.com`?
4. **Políticas de seguridad** — Pen-test obligatorio, cumplimiento LOPDP Ecuador, SOC 2 (si aplica).
5. **Correos salientes** — ¿Enviamos vía Resend/SendGrid o vía su SMTP corporativo?

## Lo que entregamos

- Código fuente completo (TypeScript / Next.js / PostgreSQL — stack estándar auditable).
- `Dockerfile` y `docker-compose.yml` para levantarlo en cualquier nube o servidor.
- Documentación técnica + runbook de operación.
- Capacitación a asesores y a IT.
- Soporte 24h en los primeros 30 días post go-live.

## Tiempos

- **Reunión de alineamiento con IT**: semana 1.
- **Piloto funcional**: listo (con datos reales de precios y asesores). Producción depende de SSO, correo y hosting.
- **Fase 2** (facturación SRI, aprobación de descuentos, SAP): a partir del mes 3.

## Seguridad

Ya implementado en el piloto:
- SSO OIDC (Microsoft Entra ID / Google); MFA y altas/bajas los controla el tenant de Grupo AG.
- Permisos por rol verificados en el servidor; límites de descuento por rol.
- Auditoría append-only protegida por un trigger en PostgreSQL, exportable a CSV.
- Cabeceras de seguridad HTTP; secretos solo en variables de entorno.

A configurar en producción con IT:
- HTTPS/TLS en el hosting elegido, gestor de secretos (Key Vault / Secrets Manager), respaldos cifrados de la base, monitoreo de dependencias, pen-test si lo exigen.

---

**Siguiente paso sugerido:** 45 min de reunión con IT para resolver los 5 puntos arriba, con demo del piloto (guion en `08-guia-piloto.md`).
