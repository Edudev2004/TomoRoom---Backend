// src/infrastructure/adapters/out/database/SubscriptionRepository.ts
import { ISubscriptionRepository } from '../../../../application/ports/out/ISubscriptionRepository';
import { Subscription } from '../../../../domain/Subscription';
import { db } from './index';
import { subscriptions, subscriptionMembers } from './schema';
import { eq, and, gt } from 'drizzle-orm';

export class SubscriptionRepository implements ISubscriptionRepository {
  
  async findActiveByOwnerId(ownerId: string): Promise<Subscription | null> {
    const result = await db.select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.ownerId, ownerId),
          eq(subscriptions.status, 'active'),
          gt(subscriptions.expiresAt, new Date()) // Asegurarnos que no expiró
        )
      );

    if (result.length === 0) return null;
    const data = result[0];
    return new Subscription(data.id, data.ownerId, data.planType, data.status, data.inviteCode, data.expiresAt);
  }

  async findActiveByMemberId(userId: string): Promise<Subscription | null> {
    // Aquí hacemos un JOIN entre la tabla de miembros y la de suscripciones
    const result = await db.select({
        sub: subscriptions
      })
      .from(subscriptionMembers)
      .innerJoin(subscriptions, eq(subscriptionMembers.subscriptionId, subscriptions.id))
      .where(
        and(
          eq(subscriptionMembers.userId, userId),
          eq(subscriptions.status, 'active'),
          gt(subscriptions.expiresAt, new Date())
        )
      );

    if (result.length === 0) return null;
    const data = result[0].sub;
    return new Subscription(data.id, data.ownerId, data.planType, data.status, data.inviteCode, data.expiresAt);
  }
}
