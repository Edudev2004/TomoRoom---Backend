// src/infrastructure/adapters/in/http/routes.ts
import { FastifyInstance } from 'fastify';
import { AuthController } from './AuthController';
import { RoomController } from './RoomController';
import { AnimeController } from './AnimeController';
import { MovieController } from './MovieController';
import { FriendController } from './FriendController';
import { verifyJwt } from './middlewares/authMiddleware';

import { UserRepository } from '../../out/database/UserRepository';
import { RoomRepository } from '../../out/database/RoomRepository';
import { FriendRepository } from '../../out/database/FriendRepository';
import { AnimeFlvAdapter } from '../../out/AnimeFlvAdapter';
import { PeliApiAdapter } from '../../out/PeliApiAdapter';

// Casos de Uso
import { RegisterUserUseCase } from '../../../../application/use-cases/RegisterUserUseCase';
import { LoginUserUseCase } from '../../../../application/use-cases/LoginUserUseCase';
import { CreateRoomUseCase } from '../../../../application/use-cases/CreateRoomUseCase';
import { GetUserRoomsUseCase } from '../../../../application/use-cases/GetUserRoomsUseCase';
import { SearchAnimeUseCase } from '../../../../application/use-cases/SearchAnimeUseCase';
import { GetCatalogUseCase } from '../../../../application/use-cases/GetCatalogUseCase';
import { ManageFriendsUseCase } from '../../../../application/use-cases/ManageFriendsUseCase';

export async function setupRoutes(fastify: FastifyInstance) {
  
  // 1. Instanciamos los Ayudantes (Repositorios)
  const userRepository = new UserRepository();
  const roomRepository = new RoomRepository();
  const friendRepository = new FriendRepository();
  const animeProvider = new AnimeFlvAdapter();
  const movieProvider = new PeliApiAdapter();

  // 2. Instanciamos los Chefs (Casos de Uso) pasándoles sus Ayudantes
  const registerUserUseCase = new RegisterUserUseCase(userRepository);
  const loginUserUseCase = new LoginUserUseCase(userRepository);
  const createRoomUseCase = new CreateRoomUseCase(roomRepository);
  const getUserRoomsUseCase = new GetUserRoomsUseCase(roomRepository);
  const searchAnimeUseCase = new SearchAnimeUseCase(animeProvider);
  const getCatalogUseCase = new GetCatalogUseCase(animeProvider);
  const manageFriendsUseCase = new ManageFriendsUseCase(friendRepository, userRepository);

  // 3. Instanciamos los Meseros (Controladores) pasándoles los Chefs
  const authController = new AuthController(registerUserUseCase, loginUserUseCase);
  const roomController = new RoomController(createRoomUseCase, getUserRoomsUseCase);
  const animeController = new AnimeController(searchAnimeUseCase, getCatalogUseCase);
  const movieController = new MovieController(movieProvider);
  const friendController = new FriendController(manageFriendsUseCase);

  // --- RUTAS PÚBLICAS ---
  fastify.post('/api/auth/register', async (req, res) => {
    return authController.register(req, res);
  });
  
  fastify.post('/api/auth/login', async (req, res) => {
    return authController.login(req, res);
  });

  // --- RUTAS PRIVADAS (Requieren estar logueado) ---
  fastify.register(async function (privateRoutes) {
    // Añadimos el middleware de seguridad a todas las rutas de este bloque
    privateRoutes.addHook('preHandler', verifyJwt);

    // Rutas de Salas
    privateRoutes.get('/api/rooms/me', async (req, res) => {
      return roomController.listMyRooms(req, res);
    });

    privateRoutes.get('/api/rooms/active', async (req, res) => {
      return roomController.listActiveRooms(req, res);
    });

    privateRoutes.post('/api/rooms', async (req, res) => {
      if (!req.body) req.body = {};
      (req.body as any).hostId = req.user?.id;
      return roomController.create(req, res);
    });

    // Rutas de Anime
    privateRoutes.get('/api/anime/search', async (req, res) => { return animeController.search(req, res); });
    privateRoutes.get('/api/anime/catalog', async (req, res) => { return animeController.catalog(req, res); });
    privateRoutes.get('/api/anime/info', async (req, res) => { return animeController.info(req, res); });
    privateRoutes.get('/api/anime/episode', async (req, res) => { return animeController.episode(req, res); });
    privateRoutes.get('/api/anime/resolve', async (req, res) => { return animeController.resolve(req, res); });

    // Rutas de Películas / Series
    privateRoutes.get('/api/movies/search', async (req, res) => { return movieController.search(req, res); });
    privateRoutes.get('/api/movies/catalog', async (req, res) => { return movieController.catalog(req, res); });
    privateRoutes.get('/api/movies/info', async (req, res) => { return movieController.getInfo(req, res); });
    privateRoutes.get('/api/movies/episode', async (req, res) => { return movieController.getEpisode(req, res); });
    privateRoutes.get('/api/movies/resolve', async (req, res) => { return movieController.resolveStream(req, res); });

    // Rutas de Amigos
    privateRoutes.get('/api/friends/search', async (req, res) => { return friendController.searchUsers(req, res); });
    privateRoutes.post('/api/friends/request', async (req, res) => { return friendController.sendRequest(req, res); });
    privateRoutes.post('/api/friends/respond', async (req, res) => { return friendController.respondRequest(req, res); });
    privateRoutes.get('/api/friends/requests', async (req, res) => { return friendController.getRequests(req, res); });
    privateRoutes.get('/api/friends', async (req, res) => { return friendController.getFriendsList(req, res); });
    privateRoutes.delete('/api/friends/:friendshipId', async (req, res) => { return friendController.removeFriend(req, res); });
  });
}
