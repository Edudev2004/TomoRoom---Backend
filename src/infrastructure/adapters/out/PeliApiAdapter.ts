import { IMovieProvider, MovieSearchResult } from '../../../application/ports/out/IMovieProvider';

const pelisplusService = require('../../vendor/peliapi/src/services/pelisplus.service');
const repelishdService = require('../../vendor/peliapi/src/services/repelishd.service');
const cuevanaService = require('../../vendor/peliapi/src/services/cuevana.service');
const stremioService = require('../../vendor/peliapi/src/services/stremio.service');
const { resolveEmbedUrl } = require('../../vendor/peliapi/src/utils/resolvers');

export class PeliApiAdapter implements IMovieProvider {
  async search(query: string): Promise<MovieSearchResult[]> {
    let data: any[] = [];
    let source = "aggregate";

    try {
      console.log(`[MOVIE SEARCH] Buscando '${query}' en Stremio, PelisPlus, RePelisHD y Cuevana3...`);
      
      // Buscar en los 3 proveedores originales en paralelo
      const [ppData, rpData, cvData] = await Promise.all([
        pelisplusService.searchContent(query).catch((err: any) => { console.log(`[SEARCH] Error en proveedor pelisplus`); return []; }),
        repelishdService.searchContent(query).catch((err: any) => { console.log(`[SEARCH] Error en proveedor repelishd`); return []; }),
        cuevanaService.searchContent(query).catch((err: any) => { console.log(`[SEARCH] Error en proveedor cuevana3`); return []; })
      ]);

      const stMapped: any[] = []; // Desactivado
      const ppMapped = (ppData || []).map((item: any) => ({ ...item, provider: "pelisplus" }));
      const rpMapped = (rpData || []).map((item: any) => ({ ...item, provider: "repelishd" }));
      const cvMapped = (cvData || []).map((item: any) => ({ ...item, provider: "cuevana3" }));
      
      console.log(`[MOVIE SEARCH] Resultados obtenidos -> Cuevana3: ${cvMapped.length}, PelisPlus: ${ppMapped.length}, RePelisHD: ${rpMapped.length}`);

      // DESACTIVADO TEMPORALMENTE (Falta trabajar para conseguir fuentes en Latino)
      // const stSeriesTitles = new Set(stMapped.filter((i: any) => i.type === 'series').map((i: any) => i.title.toLowerCase().trim()));
      // const rpFiltered = rpMapped.filter((i: any) => !stSeriesTitles.has(i.title.toLowerCase().trim()));
      // const combined = [...rpFiltered, ...stMapped, ...cvMapped, ...ppMapped];

      // Prioridad actual: RePelisHD (Latino)
      const combined = [...rpMapped, ...cvMapped, ...ppMapped];
      
      // Deduplicate by title
      const uniqueTitles = new Set();
      data = [];
      for (const item of combined) {
        const titleLower = item.title.toLowerCase().trim();
        if (!uniqueTitles.has(titleLower)) {
          uniqueTitles.add(titleLower);
          data.push(item);
        }
      }
      
      console.log(`[MOVIE SEARCH] Total de resultados únicos tras deduplicación: ${data.length}`);
    } catch (error: any) {
      console.error("Error en PeliApiAdapter al buscar:", error);
    }

    return data.map((item: any) => ({
      id: item.url || item.slug, // Use URL or Slug
      title: item.title,
      url: item.url || item.slug,
      image: item.image || item.poster || '',
      type: item.type || 'movie',
      provider: item.provider
    }));
  }

  async getCatalog(page: number, type: string = 'movie', genre: string = ''): Promise<MovieSearchResult[]> {
    try {
      const response = await pelisplusService.getCatalog(type, genre, page);
      const items = response?.items || [];
      return items.map((item: any) => ({
        id: item.url || item.slug,
        title: item.title,
        url: item.url || item.slug,
        image: item.image || item.poster || '',
        type: item.type || type,
        provider: 'pelisplus'
      }));
    } catch (error: any) {
      console.error("Error en PeliApiAdapter getCatalog:", error);
      return [];
    }
  }

  async getMovieInfo(url: string, type: string = 'movie', explicitProvider?: string): Promise<any> {
    let provider = explicitProvider || 'stremio';
    if (!explicitProvider) {
      if (url.includes('tt') || !url.includes('/')) { // tmdb/imdb id
        provider = 'stremio';
      } else if (url.includes('/') && !url.includes('pelicula/') && !url.includes('serie/')) {
        provider = 'cuevana3';
      } else if (url.includes('-online-espanol')) {
        provider = 'repelishd';
      }
    }

    const slug = url.split("/").filter(Boolean).pop()?.replace(".html", "") || url;

    let data;
    try {
      if (provider === 'stremio') {
        data = await stremioService.getContentInfo(slug, type);
      } else if (provider === 'cuevana3') {
        data = await cuevanaService.getContentInfo(slug, type);
      } else if (provider === 'repelishd') {
        data = await repelishdService.getContentInfo(slug, type);
      } else {
        data = await pelisplusService.getContentInfo(slug, type);
      }
    } catch (e) {
      console.error(`Error info from ${provider}:`, e);
      throw new Error(`Failed to get info for ${url}`);
    }

    if (data) {
        data.provider = provider;
    }
    return data;
  }

  async getEpisodeLinks(url: string, season: number = 1, episode: number = 1, explicitProvider?: string): Promise<any> {
    let provider = explicitProvider || 'stremio';
    if (!explicitProvider) {
      if (url.includes('tt') || !url.includes('/')) {
        provider = 'stremio';
      } else if (url.includes('/') && !url.includes('pelicula/') && !url.includes('serie/')) {
          provider = 'cuevana3';
      } else if (url.includes('-online-espanol')) {
          provider = 'repelishd';
      }
    }

    const slug = url.split("/").filter(Boolean).pop()?.replace(".html", "") || url;

    let data;
    try {
      if (provider === 'stremio') {
        data = [
          {
            server: 'VidSrc',
            title: 'VidSrc HD',
            url: `https://vidsrc.me/embed/tv?imdb=${slug}&season=${season}&episode=${episode}`
          }
        ];
      } else if (provider === 'cuevana3') {
        data = await cuevanaService.getEpisodeServers(slug, season, episode);
      } else if (provider === 'repelishd') {
        data = await repelishdService.getEpisodeServers(slug, season, episode);
      } else {
        data = await pelisplusService.getEpisodeServers(slug, season, episode);
      }
    } catch (e) {
      console.error(`Error servers from ${provider}:`, e);
      throw new Error(`Failed to get servers for ${url}`);
    }
    return data;
  }

  async resolveStream(urls: string[]): Promise<any> {
    for (const url of urls) {
      try {
        const directUrl = await resolveEmbedUrl(url, null);
        if (directUrl) {
          return { streamUrl: directUrl };
        }
      } catch (err) {
        continue;
      }
    }
    return null;
  }
}
