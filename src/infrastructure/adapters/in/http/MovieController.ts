import { FastifyRequest, FastifyReply } from 'fastify';
import { IMovieProvider } from '../../../../application/ports/out/IMovieProvider';

export class MovieController {
  constructor(private readonly movieProvider: IMovieProvider) {}

  async search(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { q } = request.query as { q: string };
      if (!q) {
        return reply.status(400).send({ success: false, message: 'El parámetro "q" es requerido.' });
      }

      const results = await this.movieProvider.search(q);
      return reply.send({ success: true, data: results });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async catalog(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { page = '1', type = 'movie', genre = '' } = request.query as { page?: string, type?: string, genre?: string };
      const pageNum = parseInt(page) || 1;

      const results = await this.movieProvider.getCatalog(pageNum, type, genre);
      return reply.send({ success: true, data: results });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getInfo(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { url, type = 'movie', provider } = request.query as { url: string, type?: string, provider?: string };
      if (!url) return reply.status(400).send({ success: false, message: 'Falta url' });
      const info = await this.movieProvider.getMovieInfo(url, type, provider);
      return reply.send({ success: true, data: info });
    } catch (error: any) {
      console.error("MovieController Info Error:", error);
      return reply.status(500).send({ success: false, message: 'Error al obtener info' });
    }
  }

  async getEpisode(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { url, season = '1', episode = '1', provider } = request.query as { url: string, season?: string, episode?: string, provider?: string };
      if (!url) return reply.status(400).send({ success: false, message: 'Falta url' });
      const links = await this.movieProvider.getEpisodeLinks(url, parseInt(season), parseInt(episode), provider);
      return reply.send({ success: true, data: links });
    } catch (error: any) {
      console.error("MovieController Episode Error:", error);
      return reply.status(500).send({ success: false, message: 'Error al obtener episodio' });
    }
  }

  async resolveStream(request: FastifyRequest, reply: FastifyReply) {
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
      
      const stream = await this.movieProvider.resolveStream(urls);
      return reply.send({ success: true, data: stream });
    } catch (error: any) {
      console.error("MovieController Resolve Error:", error);
      return reply.status(200).send({ success: false, message: 'Error al resolver' });
    }
  }
}
