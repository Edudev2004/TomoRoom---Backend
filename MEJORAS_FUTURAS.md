# Mejoras Futuras y Optimizaciones (TomoRoom)

Este documento registra las optimizaciones técnicas que se deben aplicar en el futuro antes de lanzar a producción masiva.

## 1. Seguridad: Migrar JWT a Cookies HttpOnly
Actualmente, el token JWT se entrega al Frontend en formato JSON y se almacena en el `localStorage`.
**El problema:** Si la web sufre un ataque XSS (inyección de JavaScript malicioso), el atacante podría leer el `localStorage` y robar los tokens de los usuarios.

**La solución a implementar:**
* En el backend (Fastify), instalar el plugin `@fastify/cookie`.
* En el endpoint `/api/auth/login` y `/api/auth/register`, en lugar de hacer `res.send({ token })`, configurar la respuesta como:
  ```javascript
  res.cookie('token', jwt, { 
    httpOnly: true, 
    secure: true, 
    sameSite: 'none' 
  });
  ```
* En el frontend (Axios/Fetch y Socket.io), habilitar la configuración `withCredentials: true` para que el navegador envíe la cookie automáticamente en cada petición sin que el código JavaScript tenga acceso a leerla.

## 2. Optimización de Memoria: Scraper de Anime (Puppeteer/Cheerio)
*(Referencia a la optimización de RAM discutida anteriormente)*
* Evitar mantener instancias completas de navegadores (Puppeteer) abiertas constantemente.
* Transicionar a scrapers basados en peticiones HTTP puras (`axios` + `cheerio`) siempre que sea posible, ya que consumen una fracción de la memoria y CPU en comparación con un navegador headless.
* Implementar caché (Redis o en memoria) para los enlaces de video extraídos, de modo que si varios usuarios de distintas salas solicitan el mismo episodio de anime, el backend no vuelva a hacer scraping, ahorrando ancho de banda y RAM del VPS.
