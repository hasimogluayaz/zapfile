/* Spanish blog post bodies (markdown), keyed by post slug. Tool links are rewritten to /es/... on render. */
const posts: Record<string, string> = {
  "how-to-compress-images-without-losing-quality": `# Cómo comprimir imágenes sin perder calidad

Las imágenes pesadas ralentizan las webs, llenan el almacenamiento y complican compartirlas. La buena noticia: con el método adecuado puedes reducir mucho el tamaño sin una pérdida de calidad visible.

## Entender la compresión de imágenes

Hay dos grandes tipos de compresión:

- **La compresión sin pérdida** elimina datos redundantes sin descartar información de los píxeles. La imagen descomprimida es idéntica a la original. PNG usa compresión sin pérdida por defecto.
- **La compresión con pérdida** descarta de forma selectiva datos que el ojo humano apenas nota. JPEG y WebP la admiten, por eso consiguen archivos mucho más pequeños en fotografías.

El truco para comprimir «sin perder calidad» es quedarse en el rango en el que los datos descartados no se perciben. En la mayoría de las fotos, una calidad JPEG de 75 a 85 da archivos entre un 60 y un 80 % más pequeños, sin diferencias visibles a tamaño normal.

## Técnicas prácticas

### 1. Elige el formato adecuado

El formato importa más que cualquier ajuste:

- **JPEG** es lo mejor para fotos e imágenes complejas con muchos colores.
- **PNG** es lo mejor para gráficos, logotipos, capturas de pantalla e imágenes con transparencia.
- **WebP** sirve para ambos casos y suele generar archivos entre un 25 y un 35 % más pequeños que JPEG con la misma calidad. La mayoría de los navegadores modernos lo admiten.

Si necesitas cambiar de formato, [el conversor de imágenes de ZapFile](/tools/convert-image) lo hace al instante en tu navegador.

### 2. Redimensiona antes de comprimir

Un error habitual es comprimir una foto de 4000×3000 que solo se mostrará a 800×600. Reducirla primero al tamaño real de visualización puede recortar el peso un 90 % antes de comprimir. Usa [el redimensionador de imágenes de ZapFile](/tools/resize-image) para fijar medidas exactas o escalar por porcentaje.

### 3. Usa ajustes de calidad sensatos

Al guardar en JPEG o WebP, la calidad decide cuántos datos se descartan:

- **90-100**: casi sin pérdida, archivos grandes. Para archivo o impresión.
- **75-85**: el punto ideal para la web. A tamaño normal no se distingue del original.
- **50-70**: se nota algo de suavizado de cerca, pero vale para miniaturas.

### 4. Elimina los metadatos

Las fotos de cámaras y móviles incluyen metadatos EXIF: coordenadas GPS, modelo de cámara, velocidad de obturación y más. Pueden añadir entre 50 y 100 KB a cada imagen. Quitarlos reduce el tamaño y protege tu privacidad. Puedes ver qué metadatos tienen tus imágenes con [el visor EXIF de ZapFile](/tools/exif-viewer).

## Compresión por lotes sin subir archivos

Muchas herramientas online te obligan a subir las imágenes a un servidor, con los problemas de privacidad y los límites de tamaño que eso implica. Las herramientas que funcionan en el navegador, como [el compresor de imágenes de ZapFile](/tools/compress-image), lo procesan todo en tu dispositivo. Tus imágenes nunca salen del ordenador, no hay límites de tamaño y el resultado es inmediato.

## Lista rápida

- Elige el formato adecuado (JPEG para fotos, PNG para gráficos, WebP para ambos).
- Redimensiona a las medidas que realmente necesitas.
- Usa una calidad de 75 a 85 para la web.
- Elimina los metadatos innecesarios.
- Usa un compresor en el navegador que respete tu privacidad.

Siguiendo estos pasos obtendrás siempre archivos más pequeños sin pérdida de calidad apreciable.`,

  "jpg-vs-png-vs-webp-which-format-to-use": `# JPG, PNG o WebP: ¿qué formato de imagen usar?

Elegir mal el formato puede duplicar o triplicar el tamaño de un archivo sin ningún beneficio visible. Esta guía explica los tres formatos más usados para que decidas rápido y con criterio.

## JPEG (JPG)

JPEG es el formato por defecto para fotos en la web desde los años 90. Usa compresión con pérdida: descarta para siempre algunos datos para lograr archivos más pequeños.

**Ideal para:**
- Fotografías e imágenes con degradados suaves
- Publicaciones en redes sociales
- Cualquier imagen en la que una pequeña pérdida de calidad sea aceptable

**Limitaciones:**
- No admite transparencia
- Cada nuevo guardado con pérdida degrada más la imagen
- No es ideal para texto, dibujos de líneas o bordes nítidos

Una foto JPEG de buena calidad suele ser entre 5 y 10 veces más pequeña que la misma imagen en PNG.

## PNG

PNG usa compresión sin pérdida, así que la imagen decodificada es una copia perfecta del original. Además admite transparencia alfa completa, por lo que es imprescindible para logotipos, iconos y elementos de interfaz.

**Ideal para:**
- Logotipos, iconos y gráficos con bordes nítidos
- Capturas de pantalla e imágenes con texto
- Cualquier imagen que necesite fondo transparente
- Imágenes que se editarán y guardarán varias veces

**Limitaciones:**
- Archivos mucho más grandes en fotos (a menudo de 3 a 5 veces más que JPEG)
- Sin animación nativa (para eso están GIF y APNG)

## WebP

Desarrollado por Google, WebP admite compresión con y sin pérdida, además de transparencia y animación. Con la misma calidad, genera siempre archivos más pequeños que JPEG y PNG.

**Ideal para:**
- Publicar en la web cuando quieres el archivo más pequeño posible
- Imágenes que necesitan calidad y transparencia
- Aplicaciones web progresivas y sitios centrados en el rendimiento

**Limitaciones:**
- Algunos navegadores muy antiguos no lo admiten (aun así, el soporte global supera el 97 %)
- Algunos visores y editores de escritorio lo admiten de forma limitada
- Menos aceptado en flujos de impresión

## Comparativa

| Característica | JPEG | PNG | WebP |
|---|---|---|---|
| Compresión | Con pérdida | Sin pérdida | Ambas |
| Transparencia | No | Sí | Sí |
| Animación | No | No | Sí |
| Ideal para | Fotos | Gráficos | Ambos |
| Tamaño relativo | Pequeño | Grande | El más pequeño |
| Soporte en navegadores | Universal | Universal | 97 %+ |

## Cómo elegir

Un proceso sencillo:

1. **¿Es una foto?** Usa JPEG con calidad 80, o WebP si tu público lo admite.
2. **¿Necesita transparencia?** PNG para máxima compatibilidad o WebP para archivos más pequeños.
3. **¿Es un logotipo, icono o captura?** Usa PNG.
4. **¿Optimizas el rendimiento web?** Usa WebP con JPEG como alternativa.

## Convertir entre formatos

Si tus imágenes están en el formato equivocado, convertirlas es fácil. [El conversor de imágenes de ZapFile](/tools/convert-image) admite estos formatos y procesa los archivos por completo en tu navegador. Sin subidas, sin esperas y sin límites de tamaño.

También puedes usar [el compresor de imágenes de ZapFile](/tools/compress-image) para ajustar la calidad después de convertir y lograr el mejor equilibrio entre tamaño y nitidez.

## Resumen

No hay un único formato «mejor». JPEG brilla en fotos, PNG es imbatible en gráficos nítidos o con transparencia, y WebP es el todoterreno moderno con los archivos más pequeños. Elige el formato según tu contenido y tu público, y acertarás siempre.`,

  "how-to-merge-pdf-files-online-free": `# Cómo unir archivos PDF online gratis

Juntar facturas, montar un informe a partir de capítulos sueltos o enviar documentos a un cliente en un solo paquete: unir PDF es una de las tareas con archivos más habituales. Así puedes hacerlo rápido, gratis y sin comprometer tu privacidad.

## ¿Por qué unir PDF?

Enviar varios adjuntos PDF es engorroso. Quien los recibe tiene que descargar y abrir cada archivo por separado, y el orden puede liarse. Un único documento es más fácil de compartir y de leer, y queda más profesional.

Situaciones típicas:

- Juntar páginas escaneadas en un solo documento
- Reunir apartados de un contrato de distintos equipos
- Preparar un portafolio o una solicitud con varios anexos
- Crear un único documento a partir de varias presentaciones exportadas a PDF

## Método 1: herramientas en el navegador (las más rápidas y privadas)

Las herramientas PDF que funcionan en el navegador procesan tus archivos directamente en tu dispositivo. Nada se sube a un servidor, así que tus documentos siguen siendo totalmente privados.

[La herramienta Unir PDF de ZapFile](/tools/merge-pdf) funciona así:

1. Abre la herramienta en tu navegador.
2. Arrastra y suelta tus PDF en la zona de carga o haz clic para elegirlos.
3. Ordena los archivos arrastrándolos.
4. Descarga el PDF unido.

Todo tarda segundos, funciona con cualquier número de archivos y, como se ejecuta en local, no hay límites de tamaño.

## Método 2: programas de escritorio

Si trabajas a menudo sin conexión, programas como Adobe Acrobat, PDF-XChange Editor o el gratuito PDFsam pueden unir archivos. El inconveniente es que la mayoría de los editores PDF completos son de pago y las alternativas gratuitas pueden ser engorrosas de instalar y configurar.

## Método 3: línea de comandos

Los usuarios técnicos pueden unir PDF con Ghostscript o la biblioteca de Python PyPDF2 mediante scripts. Es útil para automatizar, pero excesivo para una tarea puntual.

## La privacidad importa

Muchas herramientas PDF online populares suben tus archivos a servidores remotos para procesarlos. Tus documentos pasan por infraestructura de terceros y tienes que confiar en que se borren después. Con documentos sensibles como contratos, declaraciones de impuestos o historiales médicos, es un problema real.

Las herramientas en el navegador eliminan ese riesgo por completo. Cuando unes PDF con [ZapFile](/), tus archivos nunca salen de tu dispositivo. El procesamiento se hace con JavaScript y WebAssembly en la pestaña del navegador. Al cerrarla no queda nada en ningún servidor, porque nunca se envió nada.

## Consejos para una unión limpia

- **Comprueba la orientación de las páginas** antes de unir. Si unas son horizontales y otras verticales, el resultado puede verse desigual.
- **Quita antes las páginas que sobren.** Usa un [divisor de PDF](/tools/split-pdf) para quedarte solo con las páginas que necesitas.
- **Revisa el documento final** desplazándote por él para confirmar el orden de las páginas.

## Resumen

Unir PDF no exige programas caros ni subir documentos sensibles a servidores desconocidos. Una herramienta en el navegador como [Unir PDF de ZapFile](/tools/merge-pdf) da resultados al instante, admite cualquier tamaño y mantiene tus documentos privados. Abre la herramienta, suelta tus archivos y listo en segundos.`,

  "best-free-online-file-tools-2025": `# Las mejores herramientas de archivos online gratis de 2025

La web está llena de herramientas para archivos, pero la mayoría están plagadas de anuncios, limitan mucho la versión gratuita o te piden subir documentos sensibles a servidores desconocidos. Esta guía destaca las que de verdad son gratis, rápidas y respetan tu privacidad.

## Qué buscar en una herramienta online

Antes de entrar en herramientas concretas, estos son los criterios que importan:

- **Sin cuenta obligatoria.** Si una herramienta te obliga a registrarte para comprimir una imagen, sigue buscando.
- **Sin límites de tamaño.** Los topes artificiales existen para empujarte a un plan de pago.
- **Procesamiento que prioriza la privacidad.** Las mejores procesan los archivos en tu navegador: no se sube nada.
- **Interfaz limpia.** No deberías tener que esquivar ventanas emergentes y banners para trabajar.

## Herramientas PDF

### Unir, dividir y comprimir PDF

El PDF es el formato universal de documentos y trabajar con él no debería requerir software caro. [ZapFile](/tools/merge-pdf) ofrece un conjunto completo de herramientas PDF que funcionan por completo en el navegador:

- **Unir PDF** – Combina varios archivos en un documento y ordénalos arrastrando.
- **Dividir PDF** – Extrae páginas o rangos de páginas en archivos separados.
- **PDF a imágenes** – Convierte cada página de un PDF en PNG o JPEG de alta calidad.

Todo se procesa en local, así que puedes trabajar con contratos, documentos financieros y otros archivos sensibles con tranquilidad.

## Herramientas de imagen

### Comprimir y convertir imágenes

Optimizar imágenes es clave para el rendimiento web y para ahorrar espacio. Busca herramientas que te dejen controlar la calidad en vez de aplicar una compresión igual para todo.

[Las herramientas de imagen de ZapFile](/tools/compress-image) incluyen:

- **Compresor de imágenes** – Reduce JPEG, PNG y WebP con calidad ajustable.
- **Conversor de imágenes** – Cambia al instante entre JPG, PNG, WebP y AVIF.
- **Redimensionador** – Fija medidas exactas o escala por porcentaje.
- **Visor EXIF** – Consulta, analiza y elimina los metadatos de tus fotos directamente en el navegador.

### Crear y editar

Más allá de la compresión, estas herramientas de imagen resultan útiles:

- **Creador de collages** – Coloca varias fotos en cuadrícula.
- **Generador de memes** – Añade texto a imágenes con fuente y posición personalizables.
- **Generador de favicon** – Crea favicons del tamaño correcto a partir de cualquier imagen.

ZapFile ofrece todo esto en [zapfile.xyz/tools](/tools).

## Herramientas útiles

Algunas de las que más tiempo ahorran son pequeñas utilidades que usas de vez en cuando:

- **Generador de códigos QR** – Crea códigos QR para enlaces, texto o datos de contacto. [El generador de QR de ZapFile](/tools/qr-generator) te deja personalizar colores y descargar en varios formatos.
- **Generador de contraseñas** – Crea contraseñas fuertes y aleatorias con longitud y tipos de caracteres configurables.
- **Formateador JSON** – Pega un JSON desordenado y obtenlo formateado y validado al instante.
- **Comparador de textos** – Compara dos textos lado a lado para ver las diferencias.
- **Contador de palabras** – Cuenta palabras, caracteres y frases y estima el tiempo de lectura.

## Por qué ganan las herramientas en el navegador

En 2025 la tendencia es clara: procesar en el navegador. Los navegadores modernos hacen tareas que antes exigían software de escritorio o un servidor. Las ventajas son evidentes:

- **Privacidad** – Tus archivos no salen de tu dispositivo.
- **Velocidad** – Sin esperas de subida ni de descarga.
- **Sin límites** – Sin topes de tamaño artificiales.
- **Sin instalaciones** – Funciona en cualquier dispositivo con un navegador moderno.

## Resumen

No necesitas pagar suscripciones ni confiar tus archivos a servidores cualesquiera. Herramientas como [ZapFile](/) ofrecen un conjunto completo y centrado en la privacidad que cubre PDF, imágenes, vídeo, audio y utilidades del día a día. Guarda en marcadores las que más uses y deja de perder tiempo con alternativas llenas de anuncios.`,

  "why-browser-based-tools-are-more-private": `# Por qué las herramientas en el navegador son más privadas que las de la nube

Cuando usas una herramienta online típica para comprimir una imagen o unir un PDF, tu archivo se sube a un servidor remoto, se procesa allí y se te devuelve. Confías en que ese servidor trate tus datos con responsabilidad, los borre pronto y los proteja de filtraciones. Las herramientas en el navegador eliminan por completo esa necesidad de confiar.

## Cómo funcionan las herramientas en la nube

El modelo tradicional sigue estos pasos:

1. Eliges un archivo en tu dispositivo.
2. El archivo se sube por Internet al servidor de la herramienta.
3. El servidor lo procesa (comprime, convierte, une, etc.).
4. El archivo procesado se envía de vuelta a tu navegador para descargarlo.
5. El servidor debería borrar tu archivo, pero no tienes forma de comprobarlo.

En cada paso, tu archivo está en una infraestructura que no controlas. Pasa por routers, balanceadores de carga y sistemas de almacenamiento de terceros. Aunque el servicio tenga buenas intenciones, una filtración, un servidor mal configurado o un empleado malintencionado podrían exponer tus archivos.

## Cómo funcionan las herramientas en el navegador

Las herramientas en el navegador funcionan de otra manera:

1. Abres la herramienta en el navegador.
2. Su código (JavaScript y a veces WebAssembly) se carga en tu navegador.
3. Eliges un archivo; se lee directamente desde tu dispositivo a la memoria del navegador.
4. El procesamiento ocurre por completo en la pestaña.
5. El resultado se genera en local y lo descargas desde tu propio dispositivo.

Tu archivo nunca toca un servidor remoto. No hay nada que interceptar, filtrar ni borrar, porque los datos nunca salieron de tu equipo.

## Qué lo hace posible

Los navegadores modernos son muy potentes. Estas tecnologías permiten procesar archivos en local:

- **API Canvas** para editar, redimensionar y convertir imágenes.
- **API Web Audio** para procesar y convertir audio.
- **WebAssembly (WASM)**, que ejecuta código compilado a velocidad casi nativa. Así herramientas como [ZapFile](/) pueden procesar PDF complejos e imágenes por completo en el navegador.
- **API File y Blobs** para leer y escribir archivos sin servidor.

Estas API han madurado mucho en los últimos años y han cerrado la brecha de rendimiento con el procesamiento en servidor.

## Lo que significa para tu privacidad

Piensa en los archivos que la gente procesa online:

- **Declaraciones de impuestos y extractos bancarios** con números de cuenta e ingresos.
- **Contratos y documentos legales** con cláusulas confidenciales.
- **Historiales médicos**, protegidos por la normativa.
- **Fotos** con metadatos EXIF que incluyen coordenadas GPS y fechas.
- **Documentos de empresa** con información confidencial.

Subir cualquiera de ellos a una herramienta en la nube crea una copia en el servidor de otra persona. Con una herramienta en el navegador como [ZapFile](/), esos archivos se quedan en tu dispositivo durante todo el proceso. (La única excepción en ZapFile es el modo rápido opcional de Word, Excel, PowerPoint y HTML a PDF, que convierte en nuestro servidor y borra el archivo justo después; el modo privado de esas herramientas convierte en tu navegador.)

## Cómo comprobar que una herramienta funciona de verdad en el navegador

No todas las herramientas que se dicen «privadas» procesan los archivos en local. Así puedes comprobarlo:

### Revisa la actividad de red

Abre las herramientas de desarrollo del navegador (F12), ve a la pestaña Red y procesa un archivo. Si ves grandes subidas al servidor de la herramienta, tu archivo se está enviando a la nube.

### Prueba sin conexión

Una herramienta que funciona de verdad en el navegador sigue funcionando aunque te desconectes de Internet, una vez cargada la página. Apaga el Wi-Fi y procesa un archivo. Si funciona, el procesamiento es local.

### Lee la política de privacidad

Las herramientas legítimas en el navegador dicen claramente que los archivos no se suben. Desconfía de frases vagas como «nos tomamos en serio tu privacidad» sin detalles.

## Las contrapartidas

Procesar en el navegador también tiene límites:

- **La velocidad** depende de tu dispositivo. Un móvil poco potente será más lento que un servidor en la nube con hardware dedicado.
- **Los archivos muy grandes** pueden exigir demasiado a dispositivos con poca memoria.
- **Las operaciones pesadas** como el OCR o quitar fondos con IA descargan un modelo o motor la primera vez, lo que tarda un momento. ZapFile ejecuta ambos en el navegador.

Aun así, para la gran mayoría de tareas habituales, las herramientas en el navegador son lo bastante rápidas y la ventaja en privacidad es enorme.

## Resumen

Elegir herramientas en el navegador en lugar de alternativas en la nube es uno de los pasos más sencillos para proteger tus archivos. Herramientas como [ZapFile](/) demuestran que no hace falta renunciar a la comodidad por la privacidad. La próxima vez que comprimas una imagen, unas un PDF o conviertas un vídeo, comprueba si la herramienta procesa los archivos en local. Tus datos lo merecen.`,

  "how-to-compress-pdf-on-iphone": `# Cómo comprimir un PDF en el iPhone

El iPhone maneja PDF en todas partes: adjuntos del correo, descargas y escaneos. Cuando un archivo es demasiado grande para enviarlo o subirlo, la solución es comprimirlo. Aquí tienes un método práctico que respeta tu privacidad.

## Por qué importa el tamaño

Los PDF grandes superan los límites del correo, ralentizan las subidas a formularios y ocupan espacio. La compresión reduce el peso y mantiene el documento legible.

## Comprimir en el navegador

Safari puede abrir **ZapFile** y otras herramientas que funcionan en el navegador. Tu PDF se queda en el dispositivo; el procesamiento se hace en local con JavaScript. Así evitas subir contratos sensibles a servidores desconocidos.

## Pasos

1. Abre [Comprimir PDF](/tools/pdf-compress) o una herramienta similar en Safari.
2. Elige tu PDF desde Archivos o Fotos.
3. Descarga el archivo más ligero.

## Consejos

- En escaneos, baja la resolución antes de exportar si la app lo permite.
- Si el texto queda borroso tras comprimir, comprime menos o divide el documento.

## Resumen

Para **comprimir un PDF en el iPhone**, elige herramientas que digan claramente que los archivos se procesan en el navegador. [ZapFile](/tools) ofrece compresión y otras utilidades sin subir archivos.`,

  "jpg-vs-webp-which-is-better": `# JPG o WebP: ¿cuál es mejor?

**JPEG** es el formato por defecto para fotos desde hace décadas. **WebP** es el formato moderno de Google, con mejor compresión y transparencia opcional.

## Tamaño de archivo

Con una calidad visual parecida, WebP suele generar archivos **entre un 25 y un 35 % más pequeños** que JPEG. Eso mejora las Core Web Vitals y el SEO.

## Cuándo usar JPEG

- Para la máxima compatibilidad con sistemas antiguos.
- Con cámaras y móviles que guardan en JPEG por defecto.

## Cuándo usar WebP

- En webs y apps pensadas para navegadores modernos.
- Cuando quieres archivos más pequeños sin pérdida visible.

## Convertir

Usa [el conversor de imágenes de ZapFile](/tools/convert-image) para pasar PNG o JPEG a WebP en tu navegador.

## Resumen

En la mayoría de los proyectos web, **WebP gana en tamaño**; **JPEG** sigue siendo la alternativa para una compatibilidad universal.`,

  "what-is-qr-code-how-to-create": `# ¿Qué es un código QR?

Un **código QR** guarda texto – a menudo una URL, la configuración de una red Wi-Fi o datos de contacto – en un patrón cuadrado que los móviles leen con la cámara.

## Usos habituales

- Cartas de restaurantes y folletos
- Enlaces de descarga de apps
- Entradas para eventos

## Crear un código QR

Usa [el generador de códigos QR de ZapFile](/tools/qr-generator): escribe tu URL o texto y descarga la imagen. No hace falta cuenta; el código se genera en el navegador.

## Resumen

Los códigos QR conectan lo impreso con lo digital. Para crearlos gratis y en privado, usa un generador que no suba tus datos a la nube.`,

  "how-to-merge-pdf-files-step-by-step": `# Cómo unir archivos PDF

Unir combina varios PDF en un solo archivo: ideal para informes, solicitudes y archivos.

## Pasos

1. Reúne todos los PDF y decide el orden.
2. Abre **Unir PDF** en tu navegador.
3. Añade los archivos en orden.
4. Descarga el PDF unido.

## Privacidad

Elige [herramientas para unir PDF](/tools/merge-pdf) que procesen los archivos en local para que tus contratos y documentos de identidad nunca salgan de tu equipo.

## Resumen

Unir es sencillo; la verdadera decisión es de **confianza**. Prefiere el procesamiento en el navegador.`,

  "how-to-split-pdf-extract-pages": `# Cómo dividir un PDF

Dividir te permite sacar páginas o capítulos sin enviar el archivo completo.

## Usos

- Enviar por correo solo las páginas relevantes
- Quitar páginas en blanco o sensibles

## Herramienta

Con [Dividir PDF](/tools/split-pdf) eliges las páginas en el navegador y descargas archivos separados o un ZIP.

## Resumen

Dividir es imprescindible en muchos flujos de trabajo. Mantén los archivos en local siempre que puedas.`,

  "free-pdf-tools-no-signup": `# Herramientas PDF gratis sin registro

Muchas herramientas obligan a crear una cuenta para analítica o ventas. Las herramientas **sin registro** evitan esa fricción y suelen ir de la mano de la privacidad.

## Señales de alarma

- Subida obligatoria a la nube incluso para tareas sencillas
- Políticas de conservación de datos poco claras

## Buenas señales

- Procesamiento en el navegador
- Declaraciones de privacidad claras

## ZapFile

[ZapFile](/) ofrece decenas de herramientas PDF y de imagen sin cuenta. Casi todo funciona en tu navegador; solo el modo rápido opcional de Office a PDF convierte en nuestro servidor y borra el archivo justo después.

## Resumen

Puedes unir, dividir y comprimir PDF sin crear otra contraseña más.`,

  "compress-image-for-web-core-web-vitals": `# Las imágenes y las Core Web Vitals

El **Largest Contentful Paint (LCP)** depende a menudo de la imagen principal de la página. Los archivos pesados retrasan la carga y perjudican el posicionamiento.

## Estrategia

1. Elige el formato adecuado (WebP/AVIF cuando sea posible).
2. Redimensiona al tamaño de visualización.
3. Comprime con una calidad razonable.

## Herramienta

Usa [Comprimir imagen](/tools/compress-image) con sus controles de calidad y dimensión máxima.

## Resumen

Las imágenes más ligeras mejoran el SEO y la experiencia de usuario. En una web competitiva, comprimir no es opcional.`,

  "remove-pdf-metadata-privacy": `# Metadatos y privacidad

Los PDF y las imágenes pueden incluir **metadatos**: autor, fecha de creación, coordenadas GPS y modelo de cámara.

## Riesgos

Compartir archivos públicamente puede revelar más de lo que pretendes.

## Cómo evitarlo

- Usa un **visor EXIF** para revisar los datos.
- Elimina los metadatos antes de publicar cuando sea necesario.

## Herramientas

El [visor EXIF](/tools/exif-viewer) muestra los datos incrustados en las imágenes y guarda una copia limpia sin ellos. Volver a codificar una imagen con [Comprimir imagen](/tools/compress-image) también elimina los datos EXIF.

## Resumen

Los metadatos no se ven, pero existen. Revísalos antes de compartir.`,

  "jwt-tokens-explained-developers": `# JWT explicado

Un **JWT** tiene tres partes: encabezado, contenido (payload) y firma, codificadas en **base64url**.

## Decodificar

Usa el [decodificador JWT](/tools/jwt-decoder) en el navegador para revisar los claims. **Nunca** confíes en un contenido decodificado sin verificar la firma en el servidor.

## Resumen

Los JWT son prácticos para las API; decodificarlos es didáctico, pero no es autorización.`,

  "uuid-vs-nanoid": `# UUID o Nanoid

Los **UUID** son identificadores de 128 bits con un formato de texto estándar. **Nanoid** genera identificadores más cortos y seguros para URL, con una aleatoriedad similar.

## Generar

Usa el [generador UUID](/tools/uuid-generator) para crear rápidamente identificadores aleatorios para pruebas y scripts.

## Resumen

UUID para la interoperabilidad; Nanoid cuando quieres cadenas más cortas.`,

  "qr-code-scanner-vs-generator": `# Lector o generador

- **Generador**: crea un QR a partir de un texto o una URL.
- **Lector**: lee un QR desde una imagen subida o la cámara.

ZapFile ofrece un [generador de códigos QR](/tools/qr-generator) y un [lector de códigos QR](/tools/qr-scanner).

## Resumen

Usa la herramienta adecuada para cada sentido de tu flujo de trabajo.`,

  "browser-based-vs-cloud-pdf-tools": `# PDF en el navegador o en la nube

Las herramientas **en la nube** suben tu archivo a un servidor. Las herramientas **en el navegador** lo procesan en local una vez cargada la página.

## Cuándo gana lo local

- Documentos legales, médicos o financieros
- Conexión a Internet mala o limitada

## Cuándo gana la nube

- OCR a gran escala
- Automatización intensiva mediante API

## ZapFile

ZapFile está pensado para que tus archivos se queden en tu dispositivo: privacidad desde el diseño. Incluso el OCR funciona en el navegador. La única excepción es el modo rápido opcional de Word, Excel, PowerPoint y HTML a PDF, que convierte en nuestro servidor y borra el archivo justo después.

## Resumen

Elige el método según lo sensible que sea el documento.`,

  "resize-images-for-instagram-and-web": `# Redimensionar imágenes para cada plataforma

Cada plataforma tiene sus propias recomendaciones de **proporción** y **píxeles**.

## Flujo de trabajo

1. Conoce las medidas de destino.
2. Bloquea la proporción en [Redimensionar imagen](/tools/resize-image).
3. Exporta en el formato adecuado.

## Resumen

Las medidas correctas evitan recortes torpes y ampliaciones borrosas.`,

  "json-formatter-why-developers-use-it": `# Formateador JSON

El **JSON** está en todas las API. El JSON minificado cuesta de leer.

## Formatear

Usa el [formateador JSON](/tools/json-formatter) para indentar y detectar errores en tu navegador.

## Resumen

Formatea en local cuando las respuestas contengan datos sensibles.`,

  "hash-generator-sha256-md5-explained": `# Conceptos básicos de hash

Un **hash** convierte datos en una huella de longitud fija. **SHA-256** está muy extendido; **MD5** es débil para la seguridad.

## Usos

- Verificar la integridad de archivos
- Comparar duplicados

## Herramienta

El [generador de hash](/tools/hash-generator) calcula los hashes en el navegador.

## Resumen

Usa SHA-256 en proyectos nuevos.`,

  "color-palette-from-image": `# Paletas de colores a partir de imágenes

Los diseñadores suelen **ajustar** los colores de una interfaz a sus fotografías.

## Flujo de trabajo

Sube una imagen a [Paleta de colores](/tools/color-palette) y copia los códigos HEX.

## Resumen

Paletas rápidas y coherentes sin usar el cuentagotas a mano.`,

  "base-converter-decimal-hex-binary": `# Conversión de bases numéricas

Los programadores pasan constantemente entre **decimal**, **hexadecimal**, **binario** y **octal**.

## Herramienta

El [convertidor de bases](/tools/base-converter) convierte al instante en tu navegador.

## Resumen

Ten un convertidor a mano cuando leas registros y volcados de memoria.`,

  "css-minifier-faster-websites": `# Minificar CSS

El **CSS minificado** reduce los bytes transferidos. Guarda siempre los originales en el control de versiones.

## Herramienta

El [minificador CSS](/tools/css-minifier) formatea y minifica en el navegador.

## Resumen

Combina la minificación con gzip o Brotli en el servidor.`,

  "password-generator-length-and-symbols": `# Contraseñas seguras en 2026

La longitud importa más que la complejidad. **16 caracteres o más** con tipos variados son una buena base para las cuentas importantes.

## Aleatoria o frase de contraseña

- Las cadenas **aleatorias** resisten los intentos de adivinarlas.
- Las **frases de contraseña** (cuatro palabras al azar) pueden ser más fáciles de escribir.

## Herramienta

Usa el [generador de contraseñas](/tools/password-generator) en local en tu navegador.

## Resumen

Usa una contraseña distinta para cada sitio y un gestor de contraseñas.`,

  "regex-tester-debugging-patterns": `# Probar regex

Las expresiones regulares son potentes y fáciles de equivocar.

## Privacidad

Usa el [probador de regex](/tools/regex-tester) para que tus registros sensibles nunca salgan de tu equipo.

## Resumen

Prueba en local y luego pega el patrón final en tu código.`,

  "how-to-convert-png-to-jpg-online-free": `# Cómo convertir PNG a JPG online gratis

Convertir imágenes entre formatos es una de las tareas más comunes. Ya sea para conseguir un archivo más pequeño que enviar por correo, un formato que acepte un formulario web o simplemente unificar tu biblioteca de imágenes, pasar de PNG a JPG lleva segundos con la herramienta adecuada.

## PNG o JPG: ¿cuál usar?

**PNG** (Portable Network Graphics):
- Compresión sin pérdida: no se descarta ningún dato de los píxeles
- Admite transparencia (canal alfa)
- Ideal para logotipos, capturas, gráficos e ilustraciones
- Archivos más grandes que JPG en fotografías

**JPG** (JPEG):
- Compresión con pérdida: descarta datos para reducir el tamaño
- Sin transparencia
- Ideal para fotos e imágenes complejas y coloridas
- Suele ser entre un 60 y un 80 % más pequeño que PNG en fotos

**Cuándo convertir PNG → JPG**: cuando tu PNG es una foto o una imagen compleja y no necesitas transparencia. Reducirás mucho el tamaño sin diferencias visibles.

**Cuándo NO convertir**: si tu PNG tiene zonas transparentes o es un logotipo o un dibujo de líneas. JPG no admite transparencia y añadirá un fondo blanco (o de color). Además, la compresión con pérdida estropea los bordes nítidos de los gráficos.

## Cómo convertir PNG a JPG con ZapFile

1. Abre [el conversor de imágenes de ZapFile](/tools/convert-image)
2. Suelta tu archivo PNG en la zona de carga (o haz clic para elegirlo)
3. Selecciona **JPG** como formato de salida
4. Inicia la conversión
5. Descarga tu JPG

La conversión ocurre por completo en tu navegador: tu archivo nunca se sube a un servidor.

## Elegir la calidad adecuada

Al convertir a JPG, la calidad importa:

| Calidad | Tamaño | Uso |
|---------|-----------|----------|
| 90-100 % | Grande | Archivo, impresión profesional |
| 75-85 % | Medio | Web, correo, redes sociales |
| 50-70 % | Pequeño | Miniaturas, vistas previas |

Para la mayoría de usos, el 80 % es el punto ideal: archivos entre un 70 y un 80 % más pequeños que el PNG original sin pérdida visible en pantalla.

## Conversión por lotes

Si tienes muchos PNG, ZapFile admite el procesamiento por lotes. Sube varios archivos a la vez y descarga todos los JPG con un clic.

## Volver atrás: de JPG a PNG

Si más adelante necesitas la imagen en PNG (por ejemplo, para añadir transparencia), usa la misma herramienta y elige PNG como salida. La calidad perdida en la conversión PNG→JPG no se recupera, así que guarda tu PNG original si crees que lo vas a necesitar.

## Resumen

- Convierte PNG a JPG cuando necesites un archivo más pequeño y no haga falta transparencia
- Mantén PNG para logotipos, gráficos y todo lo que tenga fondo transparente
- Usa una calidad del 75 al 85 % en imágenes web
- [El conversor de imágenes de ZapFile](/tools/convert-image) hace la conversión al instante y en privado en tu navegador`,

  "how-to-add-watermark-to-image-online": `# Cómo añadir una marca de agua a una imagen online (gratis)

La marca de agua es la forma habitual de proteger fotos y gráficos del uso no autorizado. Seas fotógrafo, diseñador o creador de contenido, añadir una marca de agua disuade del robo mientras sigues compartiendo tu trabajo online.

## ¿Por qué poner marca de agua a tus imágenes?

- **Derechos de autor**: te identifica claramente como autor
- **Visibilidad de marca**: tu nombre o logotipo acompaña a la imagen cuando se comparte
- **Disuasión**: la mayoría de los bots que copian imágenes ignoran el contenido con marca de agua visible
- **Portafolio**: muestras tu trabajo sin entregar los archivos en resolución completa

## Cómo añadir una marca de agua con ZapFile

1. Abre [la herramienta de marca de agua de ZapFile](/tools/watermark-image)
2. Sube tu imagen (JPG, PNG o WebP)
3. Escribe el texto de la marca (tu nombre, tu web o un aviso de copyright)
4. Ajusta la posición, la opacidad, el tamaño y el color
5. Descarga el resultado

No necesitas cuenta. Tu imagen se procesa en local en tu navegador y nunca se envía a ningún servidor.

## Buenas prácticas

### Posición
Colocar la marca en el **centro** de la imagen la hace más difícil de recortar. La esquina inferior derecha queda más limpia, pero se elimina fácilmente recortando.

### Opacidad
Se recomienda una opacidad del **30 al 50 %**. Una marca totalmente opaca arruina la imagen; demasiado transparente, no se ve. Semitransparente se lee sin tapar del todo tu trabajo.

### Texto
Incluye:
- Tu nombre o el de tu estudio
- La dirección de tu web
- El símbolo © y el año: © 2026 TuNombre

### Color
El texto blanco con una sombra sutil funciona en la mayoría de las imágenes. Evita el negro: desaparece en las zonas oscuras. Elige un color que contraste con los tonos habituales de tus fotos.

## Marca de agua por lotes

Si necesitas marcar muchas imágenes con los mismos ajustes, ZapFile admite subir varias a la vez. Procesa toda tu sesión de una vez.

## Lo que una marca de agua no puede hacer

Las marcas de agua disuaden del robo casual, pero no son infalibles. Alguien decidido puede borrar una marca semitransparente. En imágenes valiosas, protege también tus derechos y entrega solo vistas previas en baja resolución hasta confirmar el pago.

## Resumen

- Pon marca de agua a tus fotos antes de compartirlas para proteger tu trabajo
- Un texto semitransparente en el centro ofrece la mejor protección
- [La herramienta de marca de agua de ZapFile](/tools/watermark-image) es gratis, privada y funciona en tu navegador`,

  "how-to-crop-image-online-free": `# Cómo recortar una imagen online gratis

Recortar es una de las ediciones de fotos más básicas. Ya sea para quitar bordes que distraen, componer un cuadrado perfecto para Instagram o sacar un banner 16:9 para la cabecera de una web, una buena herramienta online lo hace en segundos.

## Cómo recortar con ZapFile

1. Abre [la herramienta Recortar imagen de ZapFile](/tools/crop-image)
2. Sube tu foto (JPG, PNG o WebP)
3. Elige una proporción predefinida o arrastra los tiradores libremente
4. Descarga la imagen recortada

Todo ocurre en tu navegador: sin subidas y sin registro.

## Proporciones habituales y cuándo usarlas

| Proporción | Uso |
|-------|----------|
| 1:1 (cuadrado) | Publicaciones de Instagram, fotos de perfil |
| 16:9 | Miniaturas de YouTube, banners web, vídeo panorámico |
| 4:3 | Copia fotográfica clásica, presentaciones |
| 3:2 | Proporción estándar de réflex, copias 10×15 |
| 9:16 | Historias de Instagram, TikTok, Reels |
| 2:1 | Cabecera de X (Twitter), copias panorámicas |

## Consejos para recortar mejor

### Regla de los tercios
Divide el encuadre en una cuadrícula de 3×3. Coloca los ojos del sujeto (o el punto de interés) en una de las cuatro intersecciones en lugar de justo en el centro. Por eso la mayoría de las cámaras muestran una cuadrícula.

### Recorta hacia la acción
Quita el «espacio muerto», las zonas vacías sin interés. Los encuadres más cerrados resultan más dinámicos e intencionados.

### No recortes en exceso
Recortar reduce la resolución. Si partes de una imagen de 2000 px de ancho y te quedas con el 20 %, acabas con 400 px. Para la web suele bastar; para imprimir, cuidado.

### Centra las fotos de perfil
Las redes sociales recortan la foto de perfil en círculo. Asegúrate de que lo importante esté centrado antes de subirla.

## Recortar o redimensionar

**Recortar** cambia la composición eliminando partes de la imagen. Cambian las medidas, pero los píxeles restantes conservan su calidad.

**Redimensionar** amplía o reduce la imagen entera. No se elimina nada, pero la nitidez puede bajar si amplías mucho.

A menudo necesitas ambas cosas: primero recortar para la composición correcta y luego redimensionar al tamaño final.

## Resumen

- Usa proporciones predefinidas para recortar bien para cada plataforma
- Aplica la regla de los tercios para composiciones más atractivas
- [La herramienta de recorte de ZapFile](/tools/crop-image) es gratis y funciona por completo en tu navegador`,

  "image-to-pdf-converter-free-online": `# Convertir imagen a PDF: herramienta online gratis

Convertir una imagen a PDF es una necesidad frecuente: enviar una foto como documento formal, juntar varias imágenes en un solo archivo para el correo o cumplir con un sistema que solo acepta PDF. Con la herramienta adecuada, tarda segundos.

## Cómo convertir una imagen a PDF con ZapFile

1. Abre [la herramienta Imagen a PDF de ZapFile](/tools/image-to-pdf)
2. Sube una o varias imágenes (JPG, PNG o WebP)
3. Ordénalas si vas a combinar varias
4. Crea el PDF
5. Descarga tu PDF

Tus imágenes nunca salen del navegador: sin subidas a servidores y sin cuenta.

## Varias imágenes en un solo PDF

Si tienes un documento de varias páginas fotografiado en imágenes sueltas (un contrato escaneado, un montón de tiques, un álbum de fotos), puedes juntarlo todo en un PDF en un solo paso:

1. Sube todas las imágenes a la vez
2. Arrástralas para reordenarlas si hace falta
3. Convierte: cada imagen se convierte en una página del PDF

## Calidad de imagen en el PDF

ZapFile conserva las fotos JPEG tal cual siempre que puede y mantiene las imágenes PNG sin pérdida; WebP y AVIF se incrustan como JPEG de alta calidad. Para conseguir los PDF más nítidos:

- Parte de la versión de mayor resolución de tu imagen
- Usa PNG para capturas o gráficos con texto (sin pérdida)
- Usa JPG de alta calidad (80 % o más) para fotos

## ¿Cuándo convertir imágenes a PDF?

- **Adjuntos de correo**: los PDF se abren en cualquier dispositivo con el mismo formato
- **Documentos oficiales**: muchos formularios y portales exigen PDF
- **Compartir una serie de fotos**: un PDF es más fácil de compartir que una carpeta de imágenes
- **Diseños listos para imprimir**: el PDF es el formato preferido de las imprentas

## Al revés: de PDF a imágenes

Si necesitas lo contrario –sacar imágenes de un PDF–, usa [la herramienta PDF a imágenes de ZapFile](/tools/pdf-to-images). Convierte cada página en un PNG o JPG de alta calidad.

## Resumen

- Convierte imágenes sueltas o combina varias en un PDF
- La calidad se conserva: las fotos JPEG quedan tal cual y el PNG sigue sin pérdida
- [La herramienta Imagen a PDF de ZapFile](/tools/image-to-pdf) es gratis, privada y funciona en tu navegador`,

  "what-is-base64-encoding-and-how-to-use-it": `# Qué es la codificación Base64 y cómo usarla

Base64 aparece constantemente en el desarrollo web: imágenes incrustadas, tokens JWT, adjuntos de correo, respuestas de API. Entenderlo aclara muchas tareas.

## ¿Qué es Base64?

Base64 es un sistema que codifica datos binarios como texto. Representa los bytes con solo 64 caracteres ASCII imprimibles:

\`A–Z\`, \`a–z\`, \`0–9\`, \`+\`, \`/\` (y \`=\` como relleno)

El nombre «Base64» viene de esos 64 caracteres. Cada 3 bytes de datos binarios se convierten en 4 caracteres Base64.

## ¿Por qué existe Base64?

Muchos sistemas se diseñaron para manejar solo texto: el correo (SMTP), los atributos HTML, los campos JSON, las URL. Cuando hay que meter datos binarios (una imagen, un PDF, bytes en bruto) en un sistema de texto, hace falta una forma segura de representarlos como texto.

Base64 lo resuelve codificando cualquier contenido binario como una cadena de caracteres seguros e imprimibles que los analizadores de texto no malinterpretan.

## Usos habituales

### Incrustar imágenes en HTML/CSS
En lugar de enlazar a un archivo de imagen:
\`\`\`html
<img src="data:image/png;base64,iVBORw0KGgo..." />
\`\`\`
Es útil para iconos pequeños en exportaciones HTML de un solo archivo o en plantillas de correo donde los enlaces externos pueden estar bloqueados.

### JSON Web Tokens (JWT)
Un JWT tiene tres partes codificadas en Base64 y separadas por puntos:
\`Header.Payload.Signature\`

El encabezado y el contenido son objetos JSON codificados en Base64. Ojo: están codificados, no cifrados; cualquiera puede decodificarlos. Usa [el decodificador JWT de ZapFile](/tools/jwt-decoder) para ver el contenido de un token.

### Adjuntos de correo (MIME)
Los adjuntos de correo son archivos binarios codificados en Base64 dentro del protocolo de texto del correo. Tu cliente de correo se encarga de ello automáticamente.

### Respuestas de API
Algunas API devuelven datos binarios (imágenes, PDF) como cadenas Base64 dentro de respuestas JSON, ya que JSON no admite binarios de forma nativa.

### Autenticación HTTP Basic
La cabecera \`Authorization: Basic\` codifica \`usuario:contraseña\` en Base64. No es cifrado, solo codificación. Usa siempre HTTPS.

## Codificar y decodificar online

Usa [el codificador/decodificador Base64 de ZapFile](/tools/base64-encode) para:
- Codificar texto o archivos en Base64
- Decodificar Base64 a texto o a archivos descargables
- Previsualizar al instante data URL de imágenes

## ¿Base64 comprime los datos?

No, al contrario. Base64 aumenta el tamaño en torno a un 33 %. Tres bytes se convierten en cuatro caracteres. Sirve para la compatibilidad, no para comprimir.

## Base64 o Base64url

El Base64 estándar usa \`+\` y \`/\`, que tienen un significado especial en las URL. **Base64url** los sustituye por \`-\` y \`_\` para que el resultado sea seguro en parámetros de URL y tokens JWT.

## Resumen

- Base64 representa datos binarios como texto ASCII imprimible para sistemas basados en texto
- Es habitual en imágenes incrustadas, JWT, adjuntos de correo y respuestas de API
- Aumenta el tamaño un ~33 %: es para compatibilidad, no para comprimir
- Decodifica un JWT o una cadena Base64 al instante con [las herramientas de ZapFile](/tools)`,

  "how-to-create-favicon-for-website": `# Cómo crear un favicon para tu web (todos los tamaños)

El favicon es el pequeño icono que aparece en las pestañas, los marcadores y los accesos directos de la pantalla de inicio. Hacerlo bien exige generar varios tamaños y enlazarlos correctamente en el HTML, pero es sencillo cuando conoces los requisitos.

## ¿Qué es un favicon?

«Favicon» viene de «favorites icon». Originalmente era un icono de 16×16 píxeles para los marcadores de Internet Explorer. Los navegadores y dispositivos modernos piden muchos tamaños:

| Archivo | Tamaño | Uso |
|------|------|----------|
| favicon.ico | 16×16, 32×32 | Pestañas, barra de tareas de Windows |
| favicon-16x16.png | 16×16 | Iconos pequeños de pestaña |
| favicon-32x32.png | 32×32 | Pestañas estándar |
| apple-touch-icon.png | 180×180 | Acceso directo en iOS |
| android-chrome-192x192.png | 192×192 | Pantalla de inicio de Android |
| android-chrome-512x512.png | 512×512 | Pantalla de bienvenida de Android, PWA |

## Generar todos los tamaños con ZapFile

1. Abre [el generador de favicon de ZapFile](/tools/favicon-generator)
2. Sube una imagen cuadrada (mejor PNG, de al menos 512×512 píxeles)
3. Genera los tamaños
4. Descarga el ZIP con todos los tamaños y el archivo \`.ico\`

## Añadir los favicons a tu web

Añade estas etiquetas en la sección \`<head>\` de tu HTML:

\`\`\`html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
\`\`\`

Para aplicaciones web progresivas (PWA), añade también un archivo \`site.webmanifest\`:

\`\`\`json
{
  "name": "Your App",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
\`\`\`

## Diseñar un buen favicon

### Que sea sencillo
A 16×16 píxeles los logotipos complejos no se reconocen. Usa la inicial de tu marca, un icono simplificado o un bloque de color.

### Contraste alto
El favicon se ve sobre interfaces claras y oscuras. Prueba ambas. Un fondo liso del color de tu marca con un símbolo blanco funciona en los dos modos.

### Empieza en 512×512
Genera desde la fuente de mayor resolución. ZapFile reduce limpiamente desde 512 px, pero ampliar desde 16 px da resultados borrosos.

### Favicons SVG (navegadores modernos)
Los navegadores basados en Chromium admiten favicons SVG, que escalan perfectamente a cualquier tamaño. Añádelo junto a tus PNG/ICO:
\`\`\`html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
\`\`\`

## Errores frecuentes

- **Usar una imagen de origen de baja resolución**: empieza siempre con 512 px o más
- **Ofrecer solo \`.ico\`**: los dispositivos modernos necesitan los tamaños PNG; solo con ICO, iOS y Android se quedan sin un icono adecuado
- **Olvidar la caché**: tras cambiar el favicon, los navegadores guardan el antiguo con insistencia. Añade un parámetro de versión (\`favicon.ico?v=2\`) durante el desarrollo

## Resumen

- Los favicons necesitan varios tamaños para navegadores, iOS, Android y PWA
- Empieza con un PNG cuadrado de 512×512 y genera todos los tamaños de una vez
- [El generador de favicon de ZapFile](/tools/favicon-generator) crea todos los tamaños necesarios y el archivo ICO en segundos`,

  "how-to-convert-webp-to-jpg-or-png": `# Cómo convertir WebP a JPG o PNG online

WebP es un formato de imagen moderno de Google que genera archivos bastante más pequeños que JPG o PNG con la misma calidad. Pero no todas las aplicaciones lo aceptan: programas de escritorio antiguos, algunos servicios de impresión y ciertos CMS no lo admiten. Así puedes convertirlo rápido.

## Cómo convertir WebP a JPG o PNG con ZapFile

1. Abre [el conversor de imágenes de ZapFile](/tools/convert-image)
2. Sube tu archivo WebP
3. Selecciona **JPG** o **PNG** como formato de salida
4. Convierte y descarga

Sin subidas a servidores: la conversión se hace en tu navegador.

## ¿JPG o PNG?

Elige según lo que contenga la imagen WebP:

**Convierte WebP → JPG cuando:**
- La imagen es una foto o una escena compleja con muchos colores
- Necesitas el archivo más pequeño posible
- No necesitas transparencia

**Convierte WebP → PNG cuando:**
- La imagen tiene fondo transparente
- Es un logotipo, una captura o un gráfico con texto
- Necesitas calidad sin pérdida (no se descarta ningún dato)

## ¿Convertir WebP reduce la calidad?

**WebP → JPG**: implica una nueva compresión con pérdida. Habrá algo de pérdida adicional respecto al WebP original, sobre todo con calidades bajas. Usa un 85 % o más para minimizarla.

**WebP → PNG**: es una conversión sin pérdida. No se descarta ningún dato. El PNG reproduce fielmente cada píxel del WebP, aunque el archivo será más grande.

## Por qué las webs usan WebP

Las imágenes WebP suelen ser:
- Entre un 25 y un 35 % más pequeñas que JPG con la misma calidad
- Entre un 20 y un 30 % más pequeñas que PNG en contenido sin pérdida

Eso se nota en los tiempos de carga y en las Core Web Vitals. Si estás creando una web, WebP es la elección correcta para los navegadores modernos.

## Convertir varios WebP a la vez

ZapFile permite convertir varios archivos WebP a la vez. Sube tus archivos, elige el formato de destino y descarga todas las imágenes convertidas juntas.

## Resumen

- Convierte WebP a JPG para fotos que no necesitan transparencia
- Convierte WebP a PNG para gráficos, logotipos o cualquier cosa con zonas transparentes
- [El conversor de imágenes de ZapFile](/tools/convert-image) convierte lotes de WebP al instante en tu navegador`,

  "pdf-vs-word-which-format-to-use": `# PDF o Word: ¿qué formato deberías usar?

PDF y Word son los dos formatos de documento más usados en el trabajo, y elegir bien depende por completo de lo que vayas a hacer con el archivo. Aquí tienes una comparación clara.

## Usa PDF cuando…

### Quieres un formato fijo
Un PDF se ve igual en cualquier dispositivo, sistema operativo e impresora. Fuentes, márgenes y diseño quedan fijos. Un documento de Word, en cambio, puede descolocarse según la versión de Word, las fuentes instaladas y el tamaño de pantalla.

### Envías un documento final
Contratos, facturas, informes, currículos y propuestas deberían ir en PDF. Quien lo recibe puede verlo, imprimirlo y firmarlo sin modificar tu contenido por accidente.

### Vas a imprimir
PDF es el estándar de la impresión. La mayoría de las imprentas esperan PDF con fuentes incrustadas y sangrados bien definidos.

### Necesitas compatibilidad amplia
Cualquier sistema, navegador y móvil abre un PDF sin instalar nada. No todo el mundo tiene Microsoft Word.

### Necesitas firmas o campos de formulario
PDF admite de forma nativa formularios interactivos, firmas digitales y anotaciones. Word también tiene campos de formulario, pero la experiencia varía según la aplicación.

## Usa Word (.docx) cuando…

### Tú u otras personas lo vais a editar
Los documentos de Word están hechos para editarse. Si colaboráis en un borrador, pasa por varios revisores o rellenas una plantilla, Word es el formato correcto.

### Necesitas control de cambios y comentarios
El control de cambios y los comentarios de Word son mucho más completos que las anotaciones PDF para editar en equipo.

### Usas una plantilla
La mayoría de plantillas de empresa (membretes, informes, propuestas) se distribuyen en Word porque están pensadas para rellenarse.

## Convertir entre formatos

### Word → PDF
Usa «Guardar como PDF» en Microsoft Word o LibreOffice, o [la herramienta Word a PDF de ZapFile](/tools/word-to-pdf) si no tienes Word instalado. Se conservan las fuentes, las tablas y los saltos de página.

### PDF → imágenes
¿Necesitas una página PDF como imagen? Usa [la herramienta PDF a imágenes de ZapFile](/tools/pdf-to-images) para exportar cualquier página en PNG o JPG.

### PDF → Word
PDF no se diseñó para editarse, así que volver a Word es más difícil. [La herramienta PDF a Word de ZapFile](/tools/pdf-to-word) convierte los documentos normales en texto editable con títulos, listas y tablas, y mantiene el diseño exacto de las páginas diseñadas (folletos, ofertas). Revisa siempre el resultado en documentos complejos.

## Referencia rápida

| Tarea | Formato |
|------|-----|
| Informe final, factura, currículo | PDF |
| Borrador para revisar y editar | Word |
| Impresión en imprenta | PDF |
| Plantilla para que otros la rellenen | Word |
| Enviar a alguien sin Word | PDF |
| Contrato, documento legal | PDF |
| Borrador interno en curso | Word |

## Proteger archivos PDF

Si envías un PDF que no debe reenviarse ni imprimirse, usa [la herramienta Proteger PDF de ZapFile](/tools/pdf-encrypt) para añadir una contraseña y limitar los permisos.

## Unir varios PDF

Cuando reúnas formularios firmados o montes un informe a partir de varios PDF, usa [la herramienta Unir PDF de ZapFile](/tools/merge-pdf) para combinarlos en un solo documento.

## Resumen

- Usa PDF para documentos finales con formato que deban verse igual en todas partes
- Usa Word para documentos que haya que editar, trabajar en equipo o rellenar
- Convierte con la herramienta adecuada y revisa el resultado al pasar de PDF a Word`,
};

export default posts;
