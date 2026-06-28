// src/application/ports/in/IRegisterUserUseCase.ts
import { User } from '../../../domain/User';

export interface RegisterUserCommand {
  username: string;
  email: string;
  passwordRaw: string;
}

export interface IRegisterUserUseCase {
  execute(command: RegisterUserCommand): Promise<{ token: string; user: User }>;
}
