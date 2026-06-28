// src/application/ports/out/ISubscriptionRepository.ts
import { Subscription } from '../../../domain/Subscription';

export interface ISubscriptionRepository {
  // Busca si el usuario es dueño de una suscripción activa
  findActiveByOwnerId(ownerId: string): Promise<Subscription | null>;
  
  // Busca si el usuario es miembro (invitado) de alguna suscripción activa
  findActiveByMemberId(userId: string): Promise<Subscription | null>;
}
