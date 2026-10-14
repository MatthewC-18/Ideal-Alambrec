# Hallazgos al migrar el Excel al cotizador web

**Fecha:** 2026-10-07 (actualizado 2026-10-14) · **Archivo analizado:** `legacy/Cotizador_PRO_V6R02-2026.xlsm`

## Cómo se validó el motor nuevo

1. Se leyeron todas las fórmulas de la hoja oculta `Calculo` y de la hoja `Salida` (la duplicada `Calcular`/`Salidar` es una copia exacta y existe solo para hacer una segunda cotización a la vez).
2. Se abrió el Excel original en LibreOffice y se recalculó automáticamente con **394 combinaciones** de entradas: 4 sistemas, todas las alturas, placa/plinto, con/sin púas, con/sin inclinación, las 7 categorías (con énfasis en PVS), descuento livianos de 0/10/20 % y longitudes de 1 m a 2.000 m, incluido un barrido de longitudes con púas para los rollos de alambre.
3. El motor web calculó las mismas combinaciones y se comparó línea por línea (código SAP, cantidad, precio unitario y total de la línea) y luego subtotal, IVA y total (prueba automática `tests/engine.golden.test.ts`).

**Resultado (14-10-2026):** en **306 de 394 casos el resultado es idéntico al centavo**: cada línea, el subtotal, el IVA y el total. Los otros 88 son exactamente los 3 errores del Excel de la tabla siguiente (#1, #2 y #3); en ellos la prueba también verifica que, si se deshace la corrección, el total vuelve a dar el del Excel al centavo.

Para que el resultado sea idéntico, el cotizador replica también la aritmética del Excel:

- **Categoría PVS:** usa el PVS de la lista con todos sus decimales (p. ej. 0,8765432…), como el Excel; las demás categorías redondean a centavos, `REDONDEAR(PVS × (1 − %); 2)`.
- **Totales:** subtotal, IVA y total se calculan sobre los importes sin redondear y solo se redondea lo que se muestra, igual que la hoja `Salida`. Por eso, en PVS, “cantidad × precio unitario mostrado” puede diferir en centavos del total de la línea, exactamente como en el Excel.
- **Paneles de 3,05 m y 4,02 m:** una sola línea con el código combinado (`189168 / 189483`, `189483 / 189483`) y el precio de la categoría calculado sobre la suma de los PVS, como el Excel.
- **Rollos de alambre de púas:** el mismo algoritmo de la hoja `Calculo` (combinación mixta + una opción por tamaño de rollo; menor desperdicio y luego menos rollos).

## Errores encontrados en el Excel actual

| # | Qué hace el Excel | Qué hace el cotizador web | Impacto |
|---|---|---|---|
| 1 | Perimetral 3,05 m o 4,02 m **con placa**: muestra “NO SE DISPONE ESTA OPCIÓN” en la línea del poste pero **igual suma los pernos de anclaje y todo lo demás**, sin postes. | Bloquea la cotización y pide elegir poste con plinto. | Cotizaciones incompletas que parecen válidas (48 de los casos de prueba). |
| 2 | Perimetral 1,11 m **con púas**: el Excel dice “NO APLICA OPCIÓN CON PÚAS”, pero **cobra un perno y una tuerca extra por poste** para brazos que no se cotizan. | Avisa que no aplica y no agrega nada. | Sobreprecio en cada cotización de 1,11 m con púas (crece con la longitud). Si Ideal prefiere conservar el comportamiento del Excel, se cambia en Configuración → Reglas (fórmula `pernos`) sin programar. |
| 3 | Rollos de alambre de púas: cuando la mejor opción **mezcla dos tamaños de rollo**, la hoja de salida **imprime y cobra solo uno** (el de código SAP más alto, con la cantidad más alta). Ej.: 350 m con púas necesita 1.050 m; el Excel elige 2 rollos de 500 m + 1 de 200 m, pero cotiza solo 2 × 500 m = 1.000 m. Pasa, por ejemplo, entre 201–233 m, 334–400 m, 534–566 m, 701–733 m y 867–900 m de cerramiento. | Elige la misma combinación que el Excel y cotiza **todos** los rollos (2 × 500 m + 1 × 200 m). Cuando el Excel elige un solo tamaño de rollo, el resultado es idéntico. | Se cotiza y se despacha menos alambre del necesario. |
| 4 | El peso de varias líneas sale `#N/A` y el peso total las omite: los brazos y fijaciones jumbo nunca suman peso (sus fórmulas miran la fila equivocada) y en 3,05/4,02 m tampoco suman los paneles combinados. Ej.: 130 m a 3,05 m con placa y púas reporta 52 kg. | Peso calculado siempre con el peso de cada producto. | Logística/despacho sin dato confiable de peso. |
| 5 | En la hoja `Ingreso` la **categoría de cliente no tiene lista desplegable**: si se escribe mal, el Excel cobra PVS sin avisar. Además, la validación de “Terreno escalonado” apunta a la lista de categorías y la de colores a una referencia rota (`#REF!`). | Cada campo tiene su propio control y valores válidos. | Precios equivocados o datos mal ingresados sin aviso. |
| 6 | La macro `PROPUESTA` llama a otro archivo (`'Cotizador 2023 V1.0.xlsm'!UNO`) y el libro conserva un vínculo a un archivo de 2019 en el OneDrive de un usuario (`Cotizador CercasPro N#3.2019 ASESORES.xlsm`). | No depende de archivos externos. | Por esto el programador tiene que redistribuir archivos PC por PC. |
| 7 | Urbana con púas agrega los brazos, pero **no el alambre de púas** (las celdas que lo calcularían apuntan a filas que no existen). | Se replicó igual que el Excel. | **Pregunta para Ideal:** ¿Urbana con púas debe incluir el alambre? Si sí, se agrega desde Configuración → Reglas sin programar. |
| 8 | Intradomiciliaria siempre suma **1 kit de puerta**, sin importar la longitud. | Se replicó igual (es un parámetro editable: `puertas`). | **Pregunta para Ideal:** confirmar si es intencional. |
| 9 | Máxima Seguridad: el kit de poste de 3,60 m (PVS $103,50) es más barato que el de 3,00 m ($167,71). | Se usan los precios tal como vienen en la lista. | **Pregunta para Ideal:** revisar si es un error de la lista CP_2026. |

## Diferencias de diseño (mejoras, no errores)

- **Varios cerramientos en una sola cotización:** reemplaza el truco de tener las hojas duplicadas `Ingresar/Calcular/Salidar`.
- **Descuentos “livianos” y “pesados”:** se conservan con los mismos topes (20 % y 46 %), ahora validados por el sistema.
