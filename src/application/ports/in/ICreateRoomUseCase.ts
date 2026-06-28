// src/application/ports/in/ICreateRoomUseCase.ts
import { Room } from '../../../domain/Room';

export interface CreateRoomCommand {
  name: string;
  hostId: string;
}

export interface ICreateRoomUseCase {
  execute(command: CreateRoomCommand): Promise<Room>;
}
