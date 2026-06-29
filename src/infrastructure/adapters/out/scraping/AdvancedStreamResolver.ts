import axios from 'axios';

export class AdvancedStreamResolver {
  private readonly flareSolverrUrl = 'http://localhost:8191/v1';

  async resolve(urls: string[]): Promise<any> {
    const resolvePromises = urls.map(async (url) => {
      try {
        console.log(`[AdvancedResolver] Intentando resolver: ${url}`);
        
        // Capa 1: Resolutores Rápidos (Regex para servidores conocidos)
        let directUrl = await this.tryFastResolve(url);
        
        // Capa 2: Scraping Profundo con FlareSolverr para Iframes protegidos (Ej. AnimeAV1)
        if (!directUrl) {
          console.log(`[AdvancedResolver] Usando FlareSolverr para: ${url}`);
          directUrl = await this.tryDeepResolve(url);
        }

        if (directUrl) {
          let server = "unknown";
          if (url.includes("voe")) server = "voe";
          else if (url.includes("tape")) server = "streamtape";
          else if (url.includes("wish") || url.includes("playnix") || url.includes("awish")) server = "streamwish";
          else if (url.includes("animeav1")) server = "animeav1";

          return {
            success: true,
            server,
            mediaType: directUrl.includes(".m3u8") ? "hls" : "mp4",
            streamUrl: directUrl,
            resolvedFrom: url
          };
        }
      } catch (err: any) {
        console.warn(`[AdvancedResolver] Fallo en ${url}: ${err.message}`);
      }
      throw new Error(`No se pudo resolver ${url}`);
    });

    try {
      return await Promise.any(resolvePromises);
    } catch (err) {
      throw new Error("No se pudo obtener el enlace de streaming directo en ningún servidor");
    }
  }

  private async tryFastResolve(url: string): Promise<string | null> {
    // Si es un enlace directo a m3u8 o mp4 (raro pero posible)
    if (url.includes('.mp4') || url.includes('.m3u8')) return url;

    try {
      // Re-usamos temporalmente el resolver nativo de anime1v-api para servidores fáciles
      // Solo si es un servidor que sabemos que no usa cloudflare estricto.
      if (url.includes('voe') || url.includes('tape') || url.includes('wish')) {
        const { resolveEmbedUrl } = require('../../../vendor/anime1v-api/src/utils/resolvers');
        return await resolveEmbedUrl(url);
      }
    } catch (e) {
      console.warn("Fast resolve falló, pasando a Deep Resolve...");
    }
    return null;
  }

  private async tryDeepResolve(url: string): Promise<string | null> {
    const puppeteer = require('puppeteer');
    console.log(`[DeepResolve] Iniciando navegador Puppeteer para extraer video de: ${url}`);
    
    let browser;
    try {
      browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
      });
      const page = await browser.newPage();
      
      let foundUrl: string | null = null;
      
      // Habilitar interceptación de red para cazar el .m3u8 o .mp4
      await page.setRequestInterception(true);
      page.on('request', (req: any) => {
        const reqUrl = req.url();
        
        // Ignorar anuncios o trackers
        if (req.resourceType() === 'image' || req.resourceType() === 'stylesheet' || req.resourceType() === 'font') {
          req.abort();
          return;
        }

        // Cazar el archivo de streaming real
        const resourceType = req.resourceType();
        if (reqUrl.includes('.m3u8') || reqUrl.includes('.mp4')) {
          // Filtrar falsos positivos de trackers de analytics
          if (!reqUrl.includes('preview') && !reqUrl.includes('ads') && !reqUrl.includes('yandex') && !reqUrl.includes('google-analytics')) {
            console.log(`[DeepResolve] ¡Enlace de video atrapado en la red!: ${reqUrl}`);
            foundUrl = reqUrl;
          }
        }
        
        // A veces el recurso es de tipo 'media' o 'fetch' y contiene el video
        if (!foundUrl && resourceType === 'media') {
            console.log(`[DeepResolve] ¡Enlace MEDIA atrapado!: ${reqUrl}`);
            foundUrl = reqUrl;
        }

        req.continue();
      });

      // Navegar a la página
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      
      // Si la página usa JWPlayer y no hizo la petición automática de red, intentar extraerlo de la configuración de JS
      if (!foundUrl) {
        try {
          foundUrl = await page.evaluate(() => {
            if ((window as any).jwplayer) {
              const playlist = (window as any).jwplayer().getPlaylist();
              if (playlist && playlist.length > 0 && playlist[0].file) {
                return playlist[0].file;
              }
            }
            return null;
          });
          if (foundUrl) console.log(`[DeepResolve] Enlace extraído de JWPlayer config: ${foundUrl}`);
        } catch (e) {}
      }
      
      // Si el video necesita que le den click para iniciar y cargar la red
      if (!foundUrl) {
        try {
          // Intentar darle play simulando un click en el centro de la pantalla
          await page.mouse.click(400, 300);
          await new Promise(r => setTimeout(r, 2000)); // Esperar a que la petición de red dispare
        } catch(e) {}
      }

      await browser.close();
      return foundUrl;
      
    } catch (error: any) {
      console.error("[DeepResolve] Error con Puppeteer:", error.message);
      if (browser) await browser.close();
    }
    return null;
  }
}
