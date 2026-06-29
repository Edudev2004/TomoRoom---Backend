// src/infrastructure/adapters/AnimeFlvAdapter.ts

import { IAnimeProvider, AnimeSearchResult } from '../../../application/ports/out/IAnimeProvider';

// Importamos el router multi-proveedor original de la cuarentena
const animeMultiService = require('../../vendor/anime1v-api/src/services/anime.service.js');
const animeAv1Service = require('../../vendor/anime1v-api/src/services/animeav1.service.js');

export class AnimeFlvAdapter implements IAnimeProvider {
  async search(query: string): Promise<AnimeSearchResult[]> {
    try {
      const response = await animeMultiService.searchAnime(query);
      return response.data.results.map((item: any) => ({
        id: item.slug || null,
        title: item.title,
        url: item.url,
        image: item.image,
        provider: item.provider
      }));
    } catch (error: any) {
      console.error("Error en AnimeFlvAdapter al buscar:", error);
      throw new Error(`No se pudo obtener datos: ${error.message}`);
    }
  }

  async getCatalog(page: number, genre?: string): Promise<AnimeSearchResult[]> {
    try {
      // Catalog usa animeav1 por defecto en la API original para un listado mas unificado
      const response = await animeAv1Service.getCatalog(page, genre);
      
      return response.data.results.map((item: any) => ({
        id: item.slug || null,
        title: item.title,
        url: item.url,
        image: item.image
      }));
    } catch (error: any) {
      console.error("Error en AnimeFlvAdapter al obtener catálogo:", error);
      throw new Error(`No se pudo obtener el catálogo de AnimeFLV: ${error.message}`);
    }
  }

  async getAnimeInfo(url: string): Promise<any> {
    try {
      const response = await animeMultiService.getAnimeInfo(url);
      return response.data;
    } catch (error: any) {
      throw new Error(`No se pudo obtener la información del anime: ${error.message}`);
    }
  }

  async getEpisodeLinks(url: string): Promise<any> {
    try {
      const response = await animeMultiService.getEpisodeLinks(url);
      return response.data;
    } catch (error: any) {
      throw new Error(`No se pudieron obtener los enlaces del episodio: ${error.message}`);
    }
  }

  async resolveStream(urls: string[]): Promise<any> {
    // Para no retrasar la carga y al no tener un resolver nativo disponible,
    // forzamos el fallo inmediato para que el frontend haga fallback al Iframe sin demoras.
    throw new Error('No se pudo obtener el enlace de streaming directo. Forzando Iframe.');
  }
}
