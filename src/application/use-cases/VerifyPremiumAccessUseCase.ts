// src/application/use-cases/VerifyPremiumAccessUseCase.ts
import { IVerifyPremiumAccessUseCase } from '../ports/in/IVerifyPremiumAccessUseCase';
import { ISubscriptionRepository } from '../ports/out/ISubscriptionRepository';

export class VerifyPremiumAccessUseCase implements IVerifyPremiumAccessUseCase {
  
  constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

  async execute(userId: string): Promise<boolean> {
    // 1. Verificamos si el usuario es dueño de una suscripción activa
    const ownerSub = await this.subscriptionRepository.findActiveByOwnerId(userId);
    if (ownerSub && ownerSub.isActive()) {
      return true;
    }

    // 2. Si no es dueño, verificamos si es miembro de la "chancha" de alguien más
    const memberSub = await this.subscriptionRepository.findActiveByMemberId(userId);
    if (memberSub && memberSub.isActive()) {
      return true;
    }

    // 3. Si no es ni dueño ni miembro, no tiene acceso premium
    return false;
  }
}
