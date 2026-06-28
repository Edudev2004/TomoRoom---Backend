// src/application/ports/in/IVerifyPremiumAccessUseCase.ts

export interface IVerifyPremiumAccessUseCase {
  execute(userId: string): Promise<boolean>;
}
