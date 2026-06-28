// src/application/ports/in/ILoginUserUseCase.ts
import { User } from '../../../domain/User';

export interface LoginUserCommand {
  email: string;
  passwordRaw: string;
}

export interface ILoginUserUseCase {
  execute(command: LoginUserCommand): Promise<{ token: string; user: User }>;
}
