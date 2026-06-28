# CONTEXTO GENERAL DEL PROYECTO
El proyecto es el desarrollo de una WebApp que funciona como un "tercer lugar digital" (similar a un Discord ligero). El objetivo es que parejas y grupos de amigos puedan crear salas privadas para chatear, jugar minijuegos, usar un bloc de notas colaborativo y consumir contenido (anime, películas y música) sincronizados en tiempo real.

## STACK TECNOLÓGICO Y ESTRATEGIA
- Backend: Node.js, Express.
- Tiempo Real: WebSockets (Socket.io) para chat y sincronización de estado / WebRTC (conexiones P2P) para aligerar la carga del servidor en minijuegos (ej. trazos de dibujo).
- Base de Datos: PostgreSQL o MySQL.
- IA: Integración con la API de Gemini para procesar el texto del bloc de notas colaborativo y exportarlo a PDF.
- Hosting: Frontend en Vercel, Backend en un VPS (ej. DigitalOcean/Vultr) ubicado en EE.UU. (para evitar bloqueos regionales de operadoras de internet a sitios de streaming).

## ARQUITECTURA Y PATRONES
El backend utilizará Arquitectura Hexagonal (Puertos y Adaptadores) bajo una estructura de Monolito Modular, dividiendo rígidamente el código en tres capas:
1. Dominio (/domain): Entidades puras y lógicas de negocio (Room, User, SubscriptionGroup).
2. Aplicación (/application): Casos de uso y definición de Puertos (Interfaces).
3. Infraestructura (/infrastructure): Bases de datos, Controladores HTTP/WebSockets y Adaptadores.

## MANEJO DE LIBRERÍAS DE TERCEROS Y SCRAPING (REGLA DE CUARENTENA)
La aplicación no almacena video, sino que extrae enlaces directos (.mp4, .m3u8, audio) mediante web scraping (ej. AnimeFLV para animes, extractores de YouTube para música sin anuncios). Se integrarán repositorios públicos de GitHub para esto bajo las siguientes reglas estrictas:
- El código clonado o scripts de scraping de terceros vivirán aislados en una subcarpeta de cuarentena (`/src/infrastructure/vendor/`).
- El "Core" de la aplicación jamás interactuará con este código directamente.
- Se crearán "Adaptadores" en `/src/infrastructure/adapters/`. Estos adaptadores serán los únicos archivos autorizados para entrar a la carpeta "vendor", ejecutar los scrapers, y mapear la respuesta sucia a un objeto estructurado que el Core de la aplicación pueda entender.
- La reproducción de video se hace enviando el enlace extraído a los clientes y sincronizando el timestamp vía WebSockets. No se hace captura de pantalla para evitar pantallas negras por DRM.

## MODELO DE NEGOCIO Y FUNCIONALIDADES CLAVE
- Freemium: Acceso gratuito con calidad 720p, publicidad estática no invasiva y uso limitado de funciones IA.
- Sistema de Suscripciones ("Plan Amigos"): Un modelo de base de datos donde un usuario administrador paga una suscripción grupal y vincula los IDs de sus amigos invitados a ese "espacio". Toda la sala hereda los beneficios premium (1080p, sin anuncios, catálogo completo de películas) si al menos un miembro con el pase está presente.

## CONSIDERACIONES TÉCNICAS Y RIESGOS (A VIGILAR A FUTURO)
Dado que la prioridad absoluta del proyecto es mantener el **consumo de RAM al mínimo** en el VPS, se deben tener en cuenta las siguientes advertencias detectadas durante el desarrollo:

1. **Uso de Puppeteer en Scrapers de Terceros:**
   - **Riesgo:** El código heredado en cuarentena (ej. `animeflv.service.js`) utiliza `puppeteer` (una instancia de navegador Chrome/Chromium invisible) como método de respaldo para evadir protecciones como Cloudflare. 
   - **Impacto:** Ejecutar instancias de Chromium consume cientos de megabytes de RAM. Múltiples peticiones simultáneas que activen este mecanismo *tirarán* un VPS pequeño (1GB - 2GB RAM).
   - **Acción sugerida:** Monitorear los picos de memoria del VPS. Si ocurren caídas, se deberá deshabilitar el fallback de Puppeteer y manejar el error de Cloudflare elegantemente, o delegar ese trabajo pesado a un servicio externo / API Serverless.

2. **Gestión de node_modules en la Cuarentena:**
   - **Estrategia:** La API de scraping (código alienígena) conservará su propia carpeta `node_modules` interna. Node.js resolverá estas dependencias de forma aislada, evitando ensuciar el `package.json` principal de TomoRoom.
   - **Acción:** No ejecutar comandos de actualización global que rompan las versiones específicas que el scraper necesita para funcionar.