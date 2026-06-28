// src/infrastructure/adapters/in/http/routes.ts
import { FastifyInstance } from 'fastify';
import { AuthController } from './AuthController';
import { RoomController } from './RoomController';
import { AnimeController } from './AnimeController';
import { verifyJwt } from './middlewares/authMiddleware';

// Interfaces / Repositorios
import { UserRepository } from '../../out/database/UserRepository';
import { RoomRepository } from '../../out/database/RoomRepository';
import { AnimeFlvAdapter } from '../../out/AnimeFlvAdapter';

// Casos de Uso
import { RegisterUserUseCase } from '../../../../application/use-cases/RegisterUserUseCase';
import { LoginUserUseCase } from '../../../../application/use-cases/LoginUserUseCase';
import { CreateRoomUseCase } from '../../../../application/use-cases/CreateRoomUseCase';
import { SearchAnimeUseCase } from '../../../../application/use-cases/SearchAnimeUseCase';
import { GetCatalogUseCase } from '../../../../application/use-cases/GetCatalogUseCase';

export async function setupRoutes(fastify: FastifyInstance) {
  
  // 1. Instanciamos los Ayudantes (Repositorios)
  const userRepository = new UserRepository();
  const roomRepository = new RoomRepository();
  const animeProvider = new AnimeFlvAdapter();

  // 2. Instanciamos los Chefs (Casos de Uso) pasándoles sus Ayudantes
  const registerUserUseCase = new RegisterUserUseCase(userRepository);
  const loginUserUseCase = new LoginUserUseCase(userRepository);
  const createRoomUseCase = new CreateRoomUseCase(roomRepository);
  const searchAnimeUseCase = new SearchAnimeUseCase(animeProvider);
  const getCatalogUseCase = new GetCatalogUseCase(animeProvider);

  // 3. Instanciamos los Meseros (Controladores) pasándoles los Chefs
  const authController = new AuthController(registerUserUseCase, loginUserUseCase);
  const roomController = new RoomController(createRoomUseCase);
  const animeController = new AnimeController(searchAnimeUseCase, getCatalogUseCase);

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

    // Al crear sala, le inyectamos el ID del usuario como hostId de forma segura
    privateRoutes.post('/api/rooms', async (req, res) => {
      // Modificamos el body para asegurar que el hostId sea el del token, no uno falso
      if (!req.body) req.body = {};
      (req.body as any).hostId = req.user?.id;
      return roomController.create(req, res);
    });

    // Rutas de Anime (Scraping)
    privateRoutes.get('/api/anime/search', async (req, res) => {
      return animeController.search(req, res);
    });

    privateRoutes.get('/api/anime/catalog', async (req, res) => {
      return animeController.catalog(req, res);
    });
  });
}

