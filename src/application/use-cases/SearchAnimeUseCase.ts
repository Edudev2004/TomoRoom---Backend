// src/application/use-cases/SearchAnimeUseCase.ts

import { IAnimeProvider, AnimeSearchResult } from '../ports/out/IAnimeProvider';

export class SearchAnimeUseCase {
  constructor(private readonly animeProvider: IAnimeProvider) {}

  async execute(query: string): Promise<AnimeSearchResult[]> {
    if (!query || query.trim().length === 0) {
      throw new Error("El término de búsqueda no puede estar vacío");
    }

    return await this.animeProvider.search(query);
  }
}
