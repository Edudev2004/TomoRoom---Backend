// src/domain/User.ts

export class User {
  constructor(
    public readonly id: string,
    public username: string,
    public email: string,
    public passwordHash: string,
    public tokens: number = 0,
    public readonly createdAt: Date
  ) {}

  addTokens(amount: number) {
    if (amount > 0) {
      this.tokens += amount;
    }
  }
}
