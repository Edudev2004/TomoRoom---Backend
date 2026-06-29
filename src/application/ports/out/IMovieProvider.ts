export interface MovieSearchResult {
  id: string | null;
  title: string;
  url: string;
  image: string;
  type: string;
  provider: string;
}

export interface IMovieProvider {
  search(query: string): Promise<MovieSearchResult[]>;
  getCatalog(page: number, type?: string, genre?: string): Promise<MovieSearchResult[]>;
  getMovieInfo(url: string, type?: string, provider?: string): Promise<any>;
  getEpisodeLinks(url: string, season?: number, episode?: number, provider?: string): Promise<any>;
  resolveStream(urls: string[]): Promise<any>;
}
