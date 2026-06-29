// src/infrastructure/adapters/out/database/UserRepository.ts
import { IUserRepository } from '../../../../application/ports/out/IUserRepository';
import { User } from '../../../../domain/User';
import { db } from './index';
import { users } from './schema';
import { eq, like, and, ne } from 'drizzle-orm';

export class UserRepository implements IUserRepository {
  async save(user: User): Promise<void> {
    await db.insert(users).values({
      id: user.id,
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      tokens: user.tokens,
      createdAt: user.createdAt,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.email, email));
    if (result.length === 0) return null;
    const data = result[0];
    return new User(data.id, data.username, data.email, data.passwordHash, data.tokens, data.createdAt);
  }

  async findById(id: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id));
    if (result.length === 0) return null;
    const data = result[0];
    return new User(data.id, data.username, data.email, data.passwordHash, data.tokens, data.createdAt);
  }

  async searchUsers(query: string, excludeId?: string): Promise<User[]> {
    let conditions = like(users.username, `%${query}%`);
    if (excludeId) {
      conditions = and(conditions, ne(users.id, excludeId)) as any;
    }
    const result = await db.select().from(users).where(conditions);
    return result.map(data => new User(data.id, data.username, data.email, data.passwordHash, data.tokens, data.createdAt));
  }
}
