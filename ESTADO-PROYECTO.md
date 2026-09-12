# Estado del proyecto — firma electrónica de contratos

Última actualización: 2026-09-12, 01:50 AM (Miami).
Rama de trabajo: `main` (es la que despliega Vercel) y espejo en `claude/session-0obeaq`.
Último commit: `a26b658` — "Let Financial Aid countersign and issue the executed contract".

---

## 🔴 LO PRIMERO AL RETOMAR

Miguel contrafirmó el contrato de prueba, **le llegó el email con el PDF adjunto**, pero dijo:
*"tenemos algunos problemas"* — y se fue a dormir antes de describirlos.

**No están diagnosticados todavía. Empezar preguntándole cuáles son**, o pidiéndole
captura de pantalla del PDF / de la cola. No asumir ni "arreglar" nada a ciegas.

Sitios donde mirar según lo que describa:

| Si el problema es... | Mirar en |
|---|---|
| Maquetación del certificado, firma cortada o torcida | `app/src/lib/pdf/executedPdf.ts` (`buildExecutedPdf`, `drawSignatureBlock`) |
| Hueco vacío grande en la mitad de la página | mismo archivo — los bloques quedan arriba y el pie está anclado abajo |
| Firma que se ve pixelada o muy pequeña | escalado en `drawSignatureBlock`: `boxWidth = contentWidth * 0.6`, `boxHeight = 64` |
| Hora equivocada en el certificado | `formatStamp()` usa `America/New_York` a propósito |
| Texto del email, asunto, adjunto | `app/src/lib/email/templates.ts` → `fullyExecutedEmail` |
| La cola, el orden, los badges de antigüedad | `app/src/app/(app)/pending-signatures/` |
| Permisos / quién puede contrafirmar | `countersignContract` en `app/src/lib/actions/signing.ts` |

---

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

### Fase 6 — reportes de estado de firma (no empezada)
Lo acordado: embudo de conversión (emitidos → enviados → firmados → contrafirmados),
tiempo promedio hasta la firma, pendientes por antigüedad, tasa de links vencidos.
Punto de partida: `app/src/app/(app)/reports/`.

### Limpieza de la prueba
- Estudiante `ZZ TEST Firma Electronica` — id `94ea6f06-4999-4892-bb95-96e24f2dfa8a`,
  contrato `SC-2026-000011` (ya contrafirmado). Borrar cuando terminen las pruebas.
- Stripe: cliente `ZZ TEST - borrar` (`cus_VDfJLaW1zfggIB`) todavía existe.

### Administrativo (lo hace Miguel, no el asistente)
- Cambiar la suscripción de $1 → $299 cuando llegue la tarjeta real de SABER.
- Cambiar la dirección de soporte en Stripe.
- DBA en Sunbiz (pendiente).
- Tax ID del IRS — requiere PIN por correo postal (~14 días). **Antes del 7 de octubre.**
- Dejar `SUBSCRIPTION_GATING_ENABLED` activo de forma permanente.

---

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
