import { IFriendRepository } from '../../../../application/ports/out/IFriendRepository';
import { db } from './index';
import { friendships, users } from './schema';
import { eq, or, and } from 'drizzle-orm';

export class FriendRepository implements IFriendRepository {
  
  async sendRequest(requesterId: string, addresseeId: string): Promise<void> {
    await db.insert(friendships).values({
      requesterId,
      addresseeId,
      status: 'pending'
    });
  }

  async updateRequestStatus(requestId: string, status: 'accepted' | 'rejected'): Promise<void> {
    await db.update(friendships)
      .set({ status })
      .where(eq(friendships.id, requestId));
  }

  async getPendingRequests(userId: string): Promise<any[]> {
    const result = await db
      .select({
        id: friendships.id,
        requesterId: friendships.requesterId,
        username: users.username,
        createdAt: friendships.createdAt
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.requesterId, users.id))
      .where(
        and(
          eq(friendships.addresseeId, userId),
          eq(friendships.status, 'pending')
        )
      );
    return result.map(r => ({
      id: r.id,
      userId: r.requesterId,
      username: r.username,
      createdAt: r.createdAt
    }));
  }

  async getSentRequests(userId: string): Promise<any[]> {
    const result = await db
      .select({
        id: friendships.id,
        addresseeId: friendships.addresseeId,
        username: users.username,
        createdAt: friendships.createdAt
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.addresseeId, users.id))
      .where(
        and(
          eq(friendships.requesterId, userId),
          eq(friendships.status, 'pending')
        )
      );
    return result.map(r => ({
      id: r.id,
      userId: r.addresseeId,
      username: r.username,
      createdAt: r.createdAt
    }));
  }

  async getFriends(userId: string): Promise<any[]> {
    const asRequester = await db
      .select({
        friendshipId: friendships.id,
        friendId: users.id,
        username: users.username,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.addresseeId, users.id))
      .where(
        and(
          eq(friendships.requesterId, userId),
          eq(friendships.status, 'accepted')
        )
      );

    const asAddressee = await db
      .select({
        friendshipId: friendships.id,
        friendId: users.id,
        username: users.username,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.requesterId, users.id))
      .where(
        and(
          eq(friendships.addresseeId, userId),
          eq(friendships.status, 'accepted')
        )
      );

    return [...asRequester, ...asAddressee];
  }

  async getFriendship(userId1: string, userId2: string): Promise<any | null> {
    const result = await db.select().from(friendships).where(
      or(
        and(eq(friendships.requesterId, userId1), eq(friendships.addresseeId, userId2)),
        and(eq(friendships.requesterId, userId2), eq(friendships.addresseeId, userId1))
      )
    );
    return result.length > 0 ? result[0] : null;
  }

  async removeFriend(friendshipId: string): Promise<void> {
    await db.delete(friendships).where(eq(friendships.id, friendshipId));
  }
}
