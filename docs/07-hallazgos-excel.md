# Hallazgos al migrar el Excel al cotizador web

**Fecha:** 2026-10-07 · **Archivo analizado:** `legacy/Cotizador_PRO_V6R02-2026.xlsm`

## Cómo se validó el motor nuevo

1. Se leyeron todas las fórmulas de la hoja oculta `Calculo` y de la hoja `Salida` (la duplicada `Calcular`/`Salidar` es una copia exacta y existe solo para hacer una segunda cotización a la vez).
2. Se abrió el Excel original en LibreOffice y se recalculó automáticamente con **285 combinaciones** de entradas (4 sistemas, todas las alturas, placa/plinto, con/sin púas, con/sin inclinación, 7 categorías, longitudes de 5 m a 1.250 m).
3. El motor web calculó las mismas 285 combinaciones y se comparó línea por línea: código SAP, cantidad y precio unitario (prueba automática `tests/engine.golden.test.ts`).

**Resultado:** 285 de 285 casos cuadran. En 139 el resultado es idéntico al centavo. El resto difiere solo por los errores del Excel que se listan abajo (el motor los corrige a propósito) o por menos de un centavo de redondeo en la categoría PVS.

## Errores encontrados en el Excel actual

| # | Qué hace el Excel | Qué hace el cotizador web | Impacto |
|---|---|---|---|
| 1 | Perimetral 3,05 m o 4,02 m **con placa**: muestra “NO SE DISPONE ESTA OPCIÓN” en la línea del poste pero **igual suma los pernos de anclaje y todo lo demás**, sin postes. | Bloquea la cotización y pide elegir poste con plinto. | Cotizaciones incompletas que parecen válidas (48 de los casos de prueba). |
| 2 | Perimetral 1,11 m **con púas**: el Excel dice “NO APLICA OPCIÓN CON PÚAS”, pero **cobra un perno y una tuerca extra por poste** para brazos que no se cotizan. | Avisa que no aplica y no agrega nada. | Sobreprecio pequeño en cada cotización de 1,11 m con púas. |
| 3 | Rollos de alambre de púas: la combinación “mixta” puede quedarse **corta en metros** y en la hoja de salida solo aparece **un tipo de rollo** (el de código SAP más alto). Para 3.750 m pide 19 rollos de 200 m. | Siempre cubre los metros necesarios, con el menor desperdicio y la menor cantidad de rollos. Para 3.750 m: 7 rollos de 500 m + 1 de 300 m (mismos metros, 8 rollos en vez de 19, más barato). | Pedidos de rollos incorrectos en obras grandes. |
| 4 | El peso de varias líneas sale `#N/A` y el peso total las omite: los brazos y fijaciones jumbo nunca suman peso (sus fórmulas miran la fila equivocada) y en 3,05/4,02 m tampoco suman los paneles combinados. Ej.: 130 m a 3,05 m con placa y púas reporta 52 kg. | Peso calculado siempre con el peso de cada producto. | Logística/despacho sin dato confiable de peso. |
| 5 | En la hoja `Ingreso` la **categoría de cliente no tiene lista desplegable**: si se escribe mal, el Excel cobra PVS sin avisar. Además, la validación de “Terreno escalonado” apunta a la lista de categorías y la de colores a una referencia rota (`#REF!`). | Cada campo tiene su propio control y valores válidos. | Precios equivocados o datos mal ingresados sin aviso. |
| 6 | La macro `PROPUESTA` llama a otro archivo (`'Cotizador 2023 V1.0.xlsm'!UNO`) y el libro conserva un vínculo a un archivo de 2019 en el OneDrive de un usuario (`Cotizador CercasPro N#3.2019 ASESORES.xlsm`). | No depende de archivos externos. | Por esto el programador tiene que redistribuir archivos PC por PC. |
| 7 | Urbana con púas agrega los brazos, pero **no el alambre de púas** (las celdas que lo calcularían apuntan a filas que no existen). | Se replicó igual que el Excel. | **Pregunta para Ideal:** ¿Urbana con púas debe incluir el alambre? Si sí, se agrega desde Configuración → Reglas sin programar. |
| 8 | Intradomiciliaria siempre suma **1 kit de puerta**, sin importar la longitud. | Se replicó igual (es un parámetro editable: `puertas`). | **Pregunta para Ideal:** confirmar si es intencional. |
| 9 | Máxima Seguridad: el kit de poste de 3,60 m (PVS $103,50) es más barato que el de 3,00 m ($167,71). | Se usan los precios tal como vienen en la lista. | **Pregunta para Ideal:** revisar si es un error de la lista CP_2026. |

## Diferencias de diseño (mejoras, no errores)

- **Paneles dobles (3,05 m y 4,02 m):** el Excel los muestra en una sola línea con código combinado “189168 / 189483”. El cotizador muestra cada panel con su código SAP (sirve para el pedido en SAP); el total puede variar en un centavo por el redondeo.
- **Categoría PVS:** el Excel multiplica la cantidad por el PVS sin redondear (ej. $35,5586…). El cotizador redondea el precio unitario a centavos, que es lo que ve el cliente en el PDF.
- **Varios cerramientos en una sola cotización:** reemplaza el truco de tener las hojas duplicadas `Ingresar/Calcular/Salidar`.
- **Descuentos “livianos” y “pesados”:** se conservan con los mismos topes (20 % y 46 %), ahora validados por el sistema.
