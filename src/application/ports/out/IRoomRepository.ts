// src/application/ports/out/IRoomRepository.ts
import { Room } from '../../../domain/Room';

export interface IRoomRepository {
  // El contrato dice: "El repositorio debe saber guardar una Sala"
  save(room: Room): Promise<void>;
  // Y saber buscarla por ID
  findById(id: string): Promise<Room | null>;
}
