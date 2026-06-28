// src/infrastructure/adapters/in/http/routes.ts
import { FastifyInstance } from 'fastify';
import { AuthController } from './AuthController';
import { RoomController } from './RoomController';
import { verifyJwt } from './middlewares/authMiddleware';

// Interfaces / Repositorios
import { UserRepository } from '../../out/database/UserRepository';
import { RoomRepository } from '../../out/database/RoomRepository';

// Casos de Uso
import { RegisterUserUseCase } from '../../../../application/use-cases/RegisterUserUseCase';
import { CreateRoomUseCase } from '../../../../application/use-cases/CreateRoomUseCase';

export async function setupRoutes(fastify: FastifyInstance) {
  
  // 1. Instanciamos los Ayudantes (Repositorios)
  const userRepository = new UserRepository();
  const roomRepository = new RoomRepository();

  // 2. Instanciamos los Chefs (Casos de Uso) pasándoles sus Ayudantes
  const registerUserUseCase = new RegisterUserUseCase(userRepository);
  const createRoomUseCase = new CreateRoomUseCase(roomRepository);

  // 3. Instanciamos los Meseros (Controladores) pasándoles los Chefs
  const authController = new AuthController(registerUserUseCase);
  const roomController = new RoomController(createRoomUseCase);

  // --- RUTAS PÚBLICAS ---
  fastify.post('/api/auth/register', (req, res) => authController.register(req, res));
  
  // --- RUTAS PRIVADAS (Requieren estar logueado) ---
  fastify.register(async function (privateRoutes) {
    // Añadimos el middleware de seguridad a todas las rutas de este bloque
    privateRoutes.addHook('preHandler', verifyJwt);

    // Al crear sala, le inyectamos el ID del usuario como hostId de forma segura
    privateRoutes.post('/api/rooms', (req, res) => {
      // Modificamos el body para asegurar que el hostId sea el del token, no uno falso
      if (!req.body) req.body = {};
      (req.body as any).hostId = req.user?.id;
      return roomController.create(req, res);
    });
  });
}
