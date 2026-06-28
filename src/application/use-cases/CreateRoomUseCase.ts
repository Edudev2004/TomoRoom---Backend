// src/application/use-cases/CreateRoomUseCase.ts
import { ICreateRoomUseCase, CreateRoomCommand } from '../ports/in/ICreateRoomUseCase';
import { IRoomRepository } from '../ports/out/IRoomRepository';
import { Room } from '../../domain/Room';
import crypto from 'crypto';

export class CreateRoomUseCase implements ICreateRoomUseCase {
  
  // El Chef necesita al Ayudante (Repositorio) para guardar la sala
  constructor(private readonly roomRepository: IRoomRepository) {}

  async execute(command: CreateRoomCommand): Promise<Room> {
    // 1. Reglas de negocio y lógica de creación
    const roomId = crypto.randomUUID(); // Generamos un UUID único
    
    // Generamos un código de invitación aleatorio (ej. 6 caracteres)
    const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase(); 
    
    // 2. Creamos la Entidad (El Ingrediente crudo)
    const newRoom = new Room(
      roomId,
      command.name,
      command.hostId,
      inviteCode,
      'default'
    );

    // 3. Le decimos al Ayudante que lo guarde en la Despensa (Supabase)
    await this.roomRepository.save(newRoom);

    // 4. Devolvemos la sala ya creada
    return newRoom;
  }
}
