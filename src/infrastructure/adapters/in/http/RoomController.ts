// src/infrastructure/adapters/in/http/RoomController.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { ICreateRoomUseCase } from '../../../../application/ports/in/ICreateRoomUseCase';

export class RoomController {
  // El controlador RECIBE el Caso de Uso a través del constructor (Inyección de Dependencias)
  constructor(private readonly createRoomUseCase: ICreateRoomUseCase) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { name, hostId } = request.body as { name: string; hostId: string };
      
      // El controlador NO tiene lógica de negocio. Solo delega al Caso de Uso.
      const room = await this.createRoomUseCase.execute({ name, hostId });

      return reply.status(201).send({
        success: true,
        data: room,
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
}
