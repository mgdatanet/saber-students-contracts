# Student Enrollment Agreement - SABER College
## Especificacion funcional para reimplementacion
 
Documento de traspaso. Describe QUE HACE el sistema actual (libro Excel
`RN-31 Student Contracts`) para reconstruirlo como programa sin arrastrar sus defectos.
 
---
 
## 1. Objetivo
 
Financial Aid introduce, por alumno, los creditos y las ayudas de cada semestre.
El sistema produce el Student Enrollment Agreement: contrato de 4 paginas,
legalmente vinculante, con las cajas de divulgacion federal (TILA) y el calendario de pagos.
 
REGLA DE ORO: la empleada solo debe ver campos que puede rellenar. El sistema actual
fallo repetidamente porque datos de entrada y calculados convivian en la misma
cuadricula, y al teclear encima de una formula se rompia en silencio.
 
---
 
## 2. Glosario
 
| Termino | Significado |
|---|---|
| Clase | Cohorte con fecha de inicio. Codigo: `RS 07-13-2026` (programa + fecha inicio) |
| Programa | RS / RI = Professional Nursing - PTA = Physical Therapist Assistant - RD = Nursing |
| Semestre | El programa tiene 6 semestres. La estructura soporta 8; 7 y 8 no se usan |
| EFC | Expected Family Contribution del FAFSA. Puede ser negativo. Informativo: NO entra en los calculos |
| Pell | Beca federal, no se devuelve |
| Sub / Unsub | Prestamos federales subsidiado / no subsidiado |
| PLUS | Prestamo a los padres. En la practica siempre vacio |
| Fees | Tasas del semestre ya agregadas (registration + application + lab + materials + other) |
| Saldo / Owed | Lo que el alumno debe de su bolsillo en ese semestre |
| TILA | Divulgacion federal obligatoria cuando hay 4 o mas pagos |
 
---
 
## 3. Modelo de datos
 
```
Clase
  codigo                  str   PK, p.ej. "RS 07-13-2026"
  programa                enum  RS | RI | PTA | RD
  horario                 enum  Day | Evening
  firmante                enum  Dayanis Camps | Solanch Morales
  tarifa_por_credito      money 582   <-- HISTORICO POR COHORTE, ver 6.1
  cohorte                 str   "N-31"
  creditos_programa       int   80
  semanas_programa        int   96
  meses_programa          int   24
  nota_media_minima_pct   int   77
 
Semestre  (6 por clase)
  clase_codigo   FK
  n              int 1..6
  fecha_inicio   date
  fecha_fin      date
 
Alumno
  id, clase_codigo FK
  nombre, apellidos, inicial_media
  ss                    str   formato "999-99-9999"
  fecha_nacimiento      date
  telefono, movil       str   formato "999-999-9999"
  direccion             str
  fecha_contrato        date
 
AyudaSemestre  (6 por alumno)   <-- LO UNICO QUE TECLEA FINANCIAL AID
  alumno_id FK, semestre_n int 1..6
  creditos  int    >= 0
  fees      money  >= 0
  pell      money  >= 0
  sub       money  >= 0
  unsub     money  >= 0
  plus      money  >= 0
  efc       money  (puede ser negativo)
```
 
Los cargos fijos que se imprimen (testing fee, skills lab, books...) son atributos de
la clase o constantes de la institucion, no del alumno. Ver seccion 9.
 
---
 
## 4. Reglas de calculo
 
Por semestre s, con R = tarifa por credito de la clase.
 
```
coste_semestre(s)   = creditos(s) * R + fees(s)
ayuda_semestre(s)   = pell(s) + sub(s) + unsub(s) + plus(s)
saldo(s)            = coste_semestre(s) - ayuda_semestre(s)
 
matricula           = SUMA(creditos(s)) * R
fees_totales        = SUMA(fees(s))
coste_total         = matricula + fees_totales
ayuda_total         = SUMA(ayuda_semestre(s))
```
 
Presentacion en el contrato:
 
```
financiado(s)       = "N/A"  si saldo(s) <= 0   si no  saldo(s)
total_pago(s)       = financiado(s)      # identico: no hay intereses
precio_venta(s)     = financiado(s)      # identico: no hay intereses
num_pagos(s)        = 0  si saldo(s) <= 0   si no  4
importe_pago(s)     = 0  si saldo(s) <= 0   si no  saldo(s) / 4
vencimiento(s)      = fecha_inicio del semestre s
APR                 = 0 %   (constante: la institucion no cobra intereses)
cargo_financiero    = 0     (constante)
graduacion_prevista = fecha_fin del ultimo semestre con creditos
```
 
UN SALDO NEGATIVO significa que la ayuda cubre de mas: se muestra N/A,
nunca un numero negativo y nunca un reembolso.
 
### Ejemplo verificado (Ana Muguerza Horta, R = 582)
 
| Sem | Cred | Fees | Coste | Pell | Sub | Unsub | Ayuda | Saldo | Financiado | Pago x4 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 13 | 217 | 7783 | 3698 | 1732 | 2969 | 8399 | -616 | N/A | 0 |
| 2 | 13 | 217 | 7783 | 3698 | 1732 | 2969 | 8399 | -616 | N/A | 0 |
| 3 | 13 | 603 | 8169 | 3697 | 2227 | 2969 | 8893 | -724 | N/A | 0 |
| 4 | 14 | 603 | 8751 | 3697 | 2227 | 2969 | 8893 | -142 | N/A | 0 |
| 5 | 13 | 603 | 8169 | 0 | 2721 | 3464 | 6185 | 1984 | 1984 | 496.00 |
| 6 | 14 | 603 | 8751 | 0 | 2721 | 3464 | 6185 | 2566 | 2566 | 641.50 |
 
Totales: creditos 80, matricula 46560, coste 49406, ayuda 46954.
 
---
 
## 5. El contrato (4 paginas)
 
El PDF `Contracts 2026.pdf` que ya tienes es un contrato correcto ya emitido.
Usalo como TEST DE ACEPTACION: el generador debe reproducir sus campos variables identicos.
 
Pagina 1 - Information
  Cabecera institucion; nombre, SS, fecha nac., telefono, movil, direccion;
  titulo del programa; creditos totales; semanas totales; credencial;
  horario marcado (X) el que aplica y ( ) el otro; metodo de entrega; casilla de iniciales.
 
Pagina 2 - Cancellation and Refund Policy
  Texto legal fijo. No depende del alumno. Reproducir tal cual.
 
Pagina 3 - Costes y TILA  (la unica pagina con calculo)
  Desglose de cargos a dos columnas; metodos de pago con casillas;
  4 cajas TILA (APR, cargo financiero, financiado, total pago, precio venta) con 6 filas;
  calendario de pagos (num pagos, importe, vencimiento); nombre del alumno al pie.
 
Pagina 4 - Firmas
  Requisitos de graduacion (77%); asistencia en el empleo; modalidad; fecha de inicio;
  graduacion prevista; horas teoria-lab / clinica; duracion meses y semanas;
  titulacion otorgada; firmas y `Accepted by: <firmante>`.
 
Formatos de salida:
  moneda                    $#,##0.00
  fechas calendario pagos   July 13, 2026     (mes completo)
  fecha de graduacion       Jul 02, 2028      (mes abreviado)
  fecha de nacimiento       8/12/02
 
---
 
## 6. Trampas del sistema actual - NO las repitas
 
Fallos reales encontrados y corregidos. Son el motivo del rediseno.
 
### 6.1 La tarifa por credito es historica por cohorte
Convivian 525, 565 y 582 $/credito escritos a mano en distintas formulas. Las cohortes
antiguas se facturaron legitimamente a su tarifa. LA TARIFA ES UN ATRIBUTO DE LA CLASE,
INMUTABLE una vez emitido un contrato. No la globalices ni la actualices retroactivamente.
 
### 6.2 Cotejo de codigos de clase por texto libre
El codigo estaba escrito `RS 07-13-2026` en una tabla y `RS -07-13-26` en otra. El cruce
fallo y produjo 912 celdas de error en cascada. Usa una CLAVE REAL con integridad
referencial, no cadenas tecleadas dos veces.
 
### 6.3 Datos fantasma al anadir un alumno
Las filas vacias traian arrastradas las cifras del primer alumno. Al dar de alta a alguien
nuevo, HEREDABA LA AYUDA FINANCIERA DE OTRA PERSONA sin ningun aviso.
Un alumno nuevo debe nacer con todos los importes a cero.
 
### 6.4 Desalineacion silenciosa de una fila
Varias formulas apuntaban a la fila del alumno siguiente. Resultado: CONTRATOS CON EL
NOMBRE DE UNA PERSONA Y EL DINERO DE OTRA, sin ningun error visible. Es el fallo mas
peligroso y el que justifica relaciones explicitas en vez de posiciones.
 
### 6.5 Semestre 6 nunca dado de alta
Las columnas del semestre 6 de la tabla de tipos de ayuda estaban vacias y otra formula lo
tapaba reutilizando las del semestre 5. VALIDA que los 6 semestres existan antes de emitir.
 
### 6.6 Condicionales sin caso por defecto
Varios IF sin rama final imprimian literalmente FALSE en el contrato.
Todo condicional necesita rama por defecto explicita.
 
### 6.7 Un centimo de mas, un digito de menos
Un pago estaba escrito a mano como 88,75 cuando debia ser 888,75, y otro como 0 cuando
debia ser 357,50. NINGUN IMPORTE DEL CONTRATO DEBE PODER TECLEARSE A MANO.
 
---
 
## 7. Requisitos funcionales
 
| # | Requisito |
|---|---|
| F1 | Alta y edicion de clases: codigo, programa, horario, firmante, tarifa/credito, 6 pares de fechas |
| F2 | Alta y edicion de alumnos con su identidad; asignacion a una clase |
| F3 | Entrada de creditos/fees/ayudas/EFC por alumno y semestre - LA PANTALLA PRINCIPAL |
| F4 | Calculo automatico de saldos, financiado, num de pagos, importes y vencimientos |
| F5 | Generar el contrato de 4 paginas en PDF para un alumno |
| F6 | Generar en lote los contratos de todos los alumnos de una clase |
| F7 | Validaciones bloqueantes antes de emitir |
| F8 | Los contratos emitidos quedan INMUTABLES: se archiva el PDF y la tarifa aplicada |
| F9 | Consulta del historico: 866 alumnos de cohortes anteriores, solo lectura |
 
Validaciones (F7) - bloquean la emision:
  - La clase tiene sus 6 semestres con fecha de inicio y fin.
  - El alumno tiene nombre, apellidos, SS y fecha de nacimiento.
  - La suma de creditos coincide con creditos_programa de la clase (80).
  - Ningun importe negativo salvo el EFC.
  - Aviso NO bloqueante si la ayuda total supera el coste total.
 
---
 
## 8. Requisitos de interfaz (lo que motivo el rediseno)
 
| # | Requisito |
|---|---|
| U1 | Los campos calculados NO son editables. Nunca. Ni por accidente |
| U2 | Una sola pantalla: elegir clase -> lista de alumnos -> rejilla 6 semestres x 7 campos |
| U3 | Cada campo con etiqueta en lenguaje natural. Prohibido `needed3`, `Fees4`, `Sub6`, `-587` |
| U4 | Totales y saldos se recalculan al teclear, visibles al lado |
| U5 | Semaforo por alumno: listo para emitir / faltan datos / revisar |
| U6 | Boton de generar contrato, y otro de generar toda la clase |
| U7 | TODO EN INGLES: interfaz y contrato. Ninguna cadena en espanol en el producto final |
| U8 | Importes con formato moneda; negativos entre parentesis |
 
---
 
## 9. Datos de prueba y resultados esperados
 
Clase RS 07-13-2026 - programa RS (Professional Nursing) - credencial Associate in Science
horario Evening - firmante Dayanis Camps - tarifa 582 $/credito - cohorte N-31
creditos_programa 80 - semanas 96 - meses 24 - nota media minima 77%
 
Semestres:
  1  2026-07-13 .. 2026-11-01
  2  2026-11-09 .. 2027-03-07
  3  2027-03-15 .. 2027-06-27
  4  2027-07-05 .. 2027-10-24
  5  2027-11-01 .. 2028-02-27
  6  2028-03-06 .. 2028-07-02
 
Cargos fijos del contrato:
  testing_fee 50 - application_fee_por_semestre 50 - registration_fee 100
  skills_lab_fee 500 - materials_and_supplies 300 - books_and_supplies 1546.23
  bls_training_certificate 300 - other_costs 300
 
Tipos de ayuda activos en los 6 semestres: PELL, SUB LOAN, UNSUB LOAN, PLUS
 
### Alumno 1 - Ana Muguerza Horta  (la ayuda cubre casi todo)
  ss 307-83-0409 - dob 2002-08-12 - movil 786-651-4796
  direccion "3545 NE 167 St apt#207, Miami FL 33160" - contrato 2026-07-13
  sem: creditos/fees/pell/sub/unsub/plus/efc
   1: 13/217/3698/1732/2969/0/-1500
   2: 13/217/3698/1732/2969/0/-1500
   3: 13/603/3697/2227/2969/0/-1500
   4: 14/603/3697/2227/2969/0/-1500
   5: 13/603/0/2721/3464/0/0
   6: 14/603/0/2721/3464/0/0
  ESPERADO: creditos 80, matricula 46560, coste_total 49406, ayuda_total 46954
    financiado      [N/A, N/A, N/A, N/A, 1984, 2566]
    num_pagos       [0, 0, 0, 0, 4, 4]
    importe_pago    [0, 0, 0, 0, 496.00, 641.50]
    estado: ready to issue
 
### Alumno 2 - Karelia Montero Guerra  (mixto: el semestre 4 sale N/A en medio)
  ss 382-45-0476 - dob 1996-02-07 - movil 305-546-8907
  direccion "11000 SW 200th St apt #514, Culter Bay, Fl 33157" - contrato 2026-07-13
   1: 13/217/1543/1732/2969/0/4311
   2: 13/217/1543/1732/2969/0/4311
   3: 13/603/1543/2227/2969/0/4311
   4: 14/603/3697/2227/2969/0/-1500
   5: 13/603/0/2721/3464/0/0
   6: 14/603/0/2721/3464/0/0
  ESPERADO: creditos 80, matricula 46560, coste_total 49406, ayuda_total 40490
    financiado      [1539, 1539, 1430, N/A, 1984, 2566]
    num_pagos       [4, 4, 4, 0, 4, 4]
    importe_pago    [384.75, 384.75, 357.50, 0, 496.00, 641.50]
    estado: ready to issue
 
### Alumno 3 - Julio Bakeiro  (recien matriculado)
  ss 987-23-4567 - dob 1984-12-01 - movil 789-987-1234
  direccion "4980 SE 20th Ave Miami Beach FL 331310" - contrato 2026-07-13
  los 6 semestres a cero
  ESPERADO: creditos 0, coste_total 0, ayuda_total 0
    DEBE FALLAR la validacion y NO permitir emitir contrato:
    "Credits total 0, must total 80"
 
AVISO: estos son datos personales reales (SSN, direcciones). No los subas a un
repositorio publico. Si usas git, anade fixtures/ al .gitignore.
 
---
 
## 10. Que NO hay que migrar
 
- Una hoja de exportacion con ~98000 referencias roscadas que ninguna otra hoja lee.
- Dos hojas auxiliares sin uso.
- Una segunda copia del contrato dentro de la misma hoja: plantilla original que se quedo
  desactualizada y llevaba anos sin mantenerse. La buena es la que reproduce el PDF.
- Los semestres 7 y 8: estructura presente, nunca usada, y con las formulas mal construidas.
 
---
 
## 11. Decisiones abiertas para el implementador
 
1. Aplicacion web, de escritorio, o generador de Excel? El uso es de 1-2 personas en una
   oficina. Una app local con SQLite y salida PDF cubre todo sin servidor.
2. Donde vive el historico? Migrar los 866 alumnos, o dejarlos en el Excel como archivo
   de solo lectura y empezar limpio con las clases nuevas.
3. Numeracion de contratos y auditoria. Hoy no existe. Conviene: numero de contrato,
   quien lo emitio, cuando, y el PDF congelado.
4. Firma electronica. Hoy se imprime y se firma a mano.
 
---
 
## 12. Anexo - cadenas de interfaz en ingles
 
Todo el producto va en ingles. Estas son las etiquetas ya en uso en el libro actual;
reutilizalas para que la empleada no note el cambio de herramienta.
 
Class setup:
  Class:                      codigo de clase
  Tuition per credit ($):     tarifa por credito
  Schedule:                   valores Day / Evening
  Program:                    valores RS / RI / PTA / RD
  Accepted by:                firmante
  Student for contract:       selector de alumno
 
Bloque automatico de clase: CLASS DATES & CHECKS (automatic)
  columnas Semester / Start / End
  comprobaciones: "Class in startendtable:" y "Class in pelltaxestable:"
  resultado: OK  o  "MISSING - add it"
 
Rejilla de alumnos: STUDENT DATA - type in the blue cells only
  No. | Student name | SEMESTER 1..6
  campos: Credits, Fees, Pell, Sub, Unsub, PLUS, EFC
 
Columnas calculadas: CHECKS (automatic)
  Total cost | Total aid | Balance 1..6 | Sem. to pay | Warning
 
Mensajes de validacion / columna Warning:
  Alumno con nombre y 0 creditos      ->  Missing credits
  Creditos pero ninguna ayuda         ->  No aid entered
  Los creditos no suman los del prog. ->  Credits total {n}, must total {m}
  Importe negativo (salvo EFC)        ->  Semester {n}: {field} cannot be negative
  Falta identidad                     ->  Missing student details
  Datos financieros sin alumno        ->  Data with no student name
  Ayuda mayor que el coste            ->  Total aid exceeds total cost
  Clase sin sus 6 semestres           ->  Class must have 6 semesters with dates
  Listo                               ->  (vacio)
 
El CONTRATO va en ingles, exactamente como el PDF de referencia.
NUNCA traducir el contrato: es un documento legal ya aprobado.
 
FIN
