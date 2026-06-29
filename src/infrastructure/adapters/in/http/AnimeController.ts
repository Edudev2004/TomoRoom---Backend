import { FastifyRequest, FastifyReply } from 'fastify';
import { SearchAnimeUseCase } from '../../../../application/use-cases/SearchAnimeUseCase';
import { GetCatalogUseCase } from '../../../../application/use-cases/GetCatalogUseCase';

export class AnimeController {
  constructor(
    private readonly searchAnimeUseCase: SearchAnimeUseCase,
    private readonly getCatalogUseCase: GetCatalogUseCase
  ) {}

  async search(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { query } = request.query as { query: string };
      if (!query) {
        return reply.status(400).send({ success: false, message: 'El parámetro "query" es requerido.' });
      }

      const results = await this.searchAnimeUseCase.execute(query);
      return reply.send(results);
    } catch (error) {
      return reply.status(500).send({ success: false, message: 'Error al buscar anime.' });
    }
  }

  async catalog(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { page = '1', genre } = request.query as { page?: string; genre?: string };
      const pageNum = parseInt(page) || 1;

      const results = await this.getCatalogUseCase.execute(pageNum, genre);
      return reply.send(results);
    } catch (error) {
      return reply.status(500).send({ success: false, message: 'Error al obtener catálogo.' });
    }
  }

  async info(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { url } = request.query as { url: string };
      if (!url) return reply.status(400).send({ success: false, message: 'Falta url' });
      // Inyección rápida para usar el adapter directo en el controlador temporalmente (lo ideal es un Caso de Uso)
      const adapter = (this.searchAnimeUseCase as any).animeProvider; 
      const info = await adapter.getAnimeInfo(url);
      return reply.send({ success: true, data: info });
    } catch (error) {
      console.error("AnimeController Info Error:", error);
      return reply.status(500).send({ success: false, message: 'Error al obtener info' });
    }
  }

  async episode(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { url } = request.query as { url: string };
      if (!url) return reply.status(400).send({ success: false, message: 'Falta url' });
      const adapter = (this.searchAnimeUseCase as any).animeProvider; 
      const links = await adapter.getEpisodeLinks(url);
      return reply.send({ success: true, data: links });
    } catch (error) {
      console.error("AnimeController Episode Error:", error);
      return reply.status(500).send({ success: false, message: 'Error al obtener episodio' });
    }
  }

  async resolve(request: FastifyRequest, reply: FastifyReply) {
    try {
      let urls: string[] = [];
      const query = request.query as any;
      if (query.urls) {
        urls = JSON.parse(query.urls);
        if (!Array.isArray(urls)) urls = [urls];
      } else if (query.url) {
        urls = [query.url];
      }
      if (!urls.length) return reply.status(400).send({ success: false, message: 'Falta urls' });
      
      const adapter = (this.searchAnimeUseCase as any).animeProvider; 
      const stream = await adapter.resolveStream(urls);
      return reply.send(stream);
    } catch (error) {
      console.error("AnimeController Resolve Error:", error);
      // Return 200 so the frontend can read {success: false} and fallback gracefully to Iframe
      return reply.status(200).send({ success: false, message: 'Error al resolver' });
    }
  }
}
