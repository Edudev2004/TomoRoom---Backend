// src/application/use-cases/GetCatalogUseCase.ts

import { IAnimeProvider, AnimeSearchResult } from '../ports/out/IAnimeProvider';

export class GetCatalogUseCase {
  constructor(private readonly animeProvider: IAnimeProvider) {}

  async execute(page: number = 1, genre?: string): Promise<AnimeSearchResult[]> {
    return await this.animeProvider.getCatalog(page, genre);
  }
}
