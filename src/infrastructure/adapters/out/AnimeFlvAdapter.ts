// src/infrastructure/adapters/AnimeFlvAdapter.ts

import { IAnimeProvider, AnimeSearchResult } from '../../../application/ports/out/IAnimeProvider';

// Importamos el código alienígena (JavaScript puro) desde la cuarentena
// Usamos require porque probablemente el vendor usa CommonJS (module.exports)
const animeFlvService = require('../../vendor/anime1v-api/src/services/animeflv.service.js');

export class AnimeFlvAdapter implements IAnimeProvider {
  async search(query: string): Promise<AnimeSearchResult[]> {
    try {
      // Llamamos a la función de la API de terceros
      const response = await animeFlvService.searchAnime(query);
      
      // Mapeamos los datos sucios (response.data.results) a nuestra interfaz limpia (AnimeSearchResult)
      return response.data.results.map((item: any) => ({
        id: item.slug || null,
        title: item.title,
        url: item.url,
        image: item.image
      }));
    } catch (error: any) {
      console.error("Error en AnimeFlvAdapter al buscar:", error);
      throw new Error(`No se pudo obtener datos de AnimeFLV: ${error.message}`);
    }
  }

  async getCatalog(page: number, genre?: string): Promise<AnimeSearchResult[]> {
    try {
      const response = await animeFlvService.getCatalog(page, genre);
      
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
}
