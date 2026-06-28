// src/domain/Subscription.ts

export class Subscription {
  constructor(
    public readonly id: string,
    public ownerId: string,
    public planType: 'solo' | 'duo' | 'mancha',
    public status: 'active' | 'expired' | 'canceled',
    public inviteCode: string,
    public expiresAt: Date
  ) {}

  isActive(): boolean {
    return this.status === 'active' && this.expiresAt > new Date();
  }
}
