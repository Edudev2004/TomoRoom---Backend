// src/application/use-cases/LoginUserUseCase.ts
import { ILoginUserUseCase, LoginUserCommand } from '../ports/in/ILoginUserUseCase';
import { IUserRepository } from '../ports/out/IUserRepository';
import { User } from '../../domain/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class LoginUserUseCase implements ILoginUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(command: LoginUserCommand): Promise<{ token: string; user: User }> {
    // 1. Buscar al usuario por correo
    const user = await this.userRepository.findByEmail(command.email);
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    // 2. Verificar la contraseña
    const isMatch = await bcrypt.compare(command.passwordRaw, user.passwordHash);
    if (!isMatch) {
      throw new Error('Credenciales inválidas');
    }

    // 3. Generar JWT (JSON Web Token)
    const jwtSecret = process.env.JWT_SECRET || 'secret-development-key';
    const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '7d' });

    return { token, user };
  }
}
