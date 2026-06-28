import { FastifyRequest, FastifyReply } from 'fastify';
import { SearchAnimeUseCase } from '../../../../application/use-cases/SearchAnimeUseCase';
import { GetCatalogUseCase } from '../../../../application/use-cases/GetCatalogUseCase';

export class AnimeController {
  constructor(
    private readonly searchAnimeUseCase: SearchAnimeUseCase,
    private readonly getCatalogUseCase: GetCatalogUseCase
  ) {}

  async search(req: FastifyRequest, res: FastifyReply) {
    try {
      const { query } = req.query as { query: string };
      
      if (!query) {
        return res.status(400).send({ error: "Debe proporcionar un parámetro 'query' en la URL" });
      }

      const results = await this.searchAnimeUseCase.execute(query);
      return res.status(200).send(results);
    } catch (error: any) {
      console.error("AnimeController Error:", error);
      return res.status(500).send({ error: error.message || "Error interno al buscar anime" });
    }
  }

  async catalog(req: FastifyRequest, res: FastifyReply) {
    try {
      const { page, genre } = req.query as { page?: string, genre?: string };
      const pageNum = page ? parseInt(page) : 1;

      const results = await this.getCatalogUseCase.execute(pageNum, genre);
      return res.status(200).send(results);
    } catch (error: any) {
      console.error("AnimeController Catalog Error:", error);
      return res.status(500).send({ error: error.message || "Error interno al obtener catálogo" });
    }
  }
}
