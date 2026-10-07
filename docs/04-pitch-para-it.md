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
- **Idéntico resultado numérico que el Excel actual** (validado con tests contra el archivo original).

## Lo que necesitamos de IT (ronda 1)

1. **Modelo de hosting** — ¿SaaS en nuestra nube (opción A) o despliegue en la nube de Ideal/Grupo AG (opción B)? Ambas están diseñadas y presupuestadas.
2. **Identity Provider** — ¿Microsoft Entra ID o Google Workspace? ¿Dominio del tenant?
3. **Dominio** — ¿Pueden asignar `cotizador.idealalambrec.com` o prefieren un subdominio bajo `grupoag.com`?
4. **Políticas de seguridad** — Pen-test obligatorio, cumplimiento LOPDP Ecuador, SOC 2 (si aplica).
5. **Correos salientes** — ¿Enviamos vía Resend/SendGrid o vía su SMTP corporativo?

## Lo que entregamos

- Código fuente completo (TypeScript / Node / PostgreSQL — stacks estándar auditables).
- Infraestructura como código (Terraform) para que IT pueda revisarla.
- Documentación técnica + runbook de operación.
- Capacitación a asesores y a IT.
- Soporte 24h en los primeros 30 días post go-live.

## Tiempos

- **Reunión de alineamiento con IT**: semana 1.
- **MVP en producción**: semana 10.
- **Fase 2** (facturación SRI, aprobación de descuentos, SAP): a partir del mes 3.

## Seguridad resumida

- TLS 1.3 extremo a extremo.
- MFA heredado del SSO corporativo.
- Secrets en Key Vault / Secrets Manager, nunca en código.
- Backups cifrados at rest.
- Dependencias auditadas semanalmente.
- Logs de auditoría append-only.

---

**Siguiente paso sugerido:** 45 min de reunión con IT para resolver los 5 puntos arriba y firmar NDA.
