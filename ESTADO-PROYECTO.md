# Estado del proyecto — firma electrónica de contratos

Última actualización: 2026-09-13 (Miami).
Rama de trabajo: `main` (es la que despliega Vercel) y espejo en `claude/session-0obeaq`.
Último commit: `6becebd`.

---

## Estado: las 6 fases están terminadas y probadas en producción

El flujo completo funciona de punta a punta y Miguel lo validó en computadora
y en iPhone: enviar a firmar, el estudiante coloca iniciales y firma sobre el
contrato real, Financial Aid contrafirma, y el estudiante recibe la copia
ejecutada por email.

Los problemas que fueron apareciendo y ya están resueltos, por si reaparecen:

| Síntoma | Causa real | Commit |
|---|---|---|
| Firma en hoja aparte, sin iniciales | El PDF se firmaba anexando una página en vez de rellenar el documento | `2b16110` |
| Cajas amarillas muertas, sin clic | El `iframe` se cargaba antes de que React pusiera el listener | `d880934` |
| Preview mostraba el contrato en blanco | Abría `pdf_path` en vez de la versión más firmada | `3ce4f1e` |
| Páginas montadas en iPhone | Safari de iOS infla el texto en bloques más anchos que la pantalla | `8568abf` |
| Documento angosto con franja muerta | El escalado estaba topado en 1:1 | `c06ec1f` |
| Trazo de firma demasiado fino | Se captura grande y se reduce a un cuarto | `475592e` |
| Archivos huérfanos en Storage | El bucket no tenía política de DELETE: `remove()` fallaba en silencio | `6becebd` |

## Dónde quedó la funcionalidad

### Completado (Fases 1–5)

1. **Fase 1 — esquema BD.** Enums `contract_status` (`issued`, `pending_signature`,
   `signed_by_student`, `countersigned`, `voided`) y `user_role` (+`financial_aid`).
2. **Fase 2 — rol `financial_aid`.** `requireStaffProfile()` lo manda siempre a
   `/pending-signatures`; el nav filtra por `roles?: Role[]`.
3. **Fase 3 — Resend.** Dominio `mail.sabercollege.edu` verificado, remitente
   `enrollments@sabercollege.edu`. `sendEmail()` nunca lanza excepción.
4. **Fase 4 — página pública de firma.** `/sign/[token]`, sin cuenta de estudiante;
   el token es la única credencial. `/sign` está en `PUBLIC_PATHS` del middleware.
5. **Fase 5 — contrafirma y PDF ejecutado.** Cola real en `/pending-signatures`,
   canvas compartido `SignaturePad`, certificado de firma anexado al PDF emitido,
   email al estudiante con la copia adjunta.

### Decisiones que ya están tomadas (no reabrir sin motivo)

- Firma electrónica **propia**, no DocuSign.
- Firma **dibujada** en canvas + casilla de consentimiento (no click-to-sign).
- Contrafirma limitada a `admin` y `financial_aid`.
- El PDF emitido **nunca se regenera**: se le anexa una página de certificado.
  Ese documento es el que el estudiante leyó y firmó.
- Notificación de "el estudiante firmó" va solo a `financial_aid`, con
  *fallback* a `admin` si todavía no existe ningún usuario `financial_aid`
  (hoy no existe ninguno).

### Garantías de seguridad ya implementadas

- El `UPDATE` de contrafirma pasa por la sesión del firmante → aplican RLS y el
  trigger `enforce_contract_immutability`, que solo permite estas transiciones:
  `issued→pending_signature`, `pending_signature→signed_by_student`,
  `pending_signature→issued`, `signed_by_student→countersigned`.
  Postgres mismo impide marcar `countersigned` algo que el estudiante no firmó.
- El `sign_token` se anula al usarse: el link no se puede reutilizar. Caduca a 7 días.
- Se registran fecha, hora e IP del estudiante como rastro de auditoría.

---

## Archivos clave

```
app/src/lib/actions/signing.ts      sendContractForSignature, getContractByToken,
                                    submitStudentSignature, countersignContract,
                                    getExecutedPdfUrl, notifySchool
app/src/lib/pdf/executedPdf.ts      buildExecutedPdf — la página de certificado
app/src/lib/email/templates.ts      signRequestEmail, studentSignedEmail, fullyExecutedEmail
app/src/lib/email/send.ts           Resend REST, soporta adjuntos
app/src/components/SignaturePad.tsx canvas compartido (estudiante + escuela)
app/src/app/sign/[token]/           página pública de firma
app/src/app/(app)/pending-signatures/  cola de contrafirma
app/src/lib/supabase/middleware.ts  PUBLIC_PATHS incluye /sign
```

Columnas añadidas a `contracts`: `sent_at`, `sign_token`, `sign_token_expires_at`,
`student_signed_at`, `student_signature_path`, `student_signature_ip`,
`countersigned_by`, `countersigned_at`, `school_signature_path`, `executed_pdf_path`.

Las migraciones viven **solo en Supabase** (proyecto `reuuuahejodesmqmdqpo`), el repo
no tiene carpeta de migraciones. Última: `add_countersignature_columns_to_contracts`.

---

## Pendiente

### Limpieza — terminada el 13 de septiembre
Los datos y archivos de prueba ya no existen, y el cliente `ZZ TEST - borrar`
se borró de Stripe. Verificado: 7 estudiantes, 7 contratos, 7 archivos en el
bucket, ningún contrato sin su PDF, y la suscripción real de SABER intacta
(`active`, $1/mes).

Lección que dejó: el bucket `contracts` no tenía política de DELETE, así que
`remove()` llevaba fallando en silencio desde siempre y el borrado de
contratos nunca eliminó un archivo. Arreglado en `6becebd` — si vuelven a
aparecer huérfanos, mirar ahí primero.

### Administrativo (lo hace Miguel, no el asistente)
- Cambiar la suscripción de $1 → $299 cuando llegue la tarjeta real de SABER.
- Cambiar la dirección de soporte en Stripe.
- DBA en Sunbiz (pendiente).
- Tax ID del IRS — requiere PIN por correo postal (~14 días). **Antes del 7 de octubre.**
- Dejar `SUBSCRIPTION_GATING_ENABLED` activo de forma permanente.

## Reglas de trabajo que Miguel fijó (respetarlas siempre)

> "Los secretos (sk_live_, whsec_, EIN, SSN, datos bancarios) NO pasan por el chat.
> Van del dashboard a su destino directamente, los copio yo."

> "Los clics que mueven dinero real o firman algo legal los doy yo, no el asistente."

> "Nada se da por bueno sin verlo en pantalla. Si algo no se puede verificar, se dice."

---

## Cómo verificar antes de empujar

```bash
cd app
npx tsc --noEmit        # limpio
npx eslint src          # 1 warning preexistente en reports/ResultsTable.tsx
npm run build           # limpio
```

Para revisar la maquetación de un PDF sin desplegar: `poppler-utils` está instalado
en el contenedor (`apt-get install -y poppler-utils` si el contenedor es nuevo), y
así se puede leer el PDF generado página por página.
