// src/application/use-cases/RegisterUserUseCase.ts
import { IRegisterUserUseCase, RegisterUserCommand } from '../ports/in/IRegisterUserUseCase';
import { IUserRepository } from '../ports/out/IUserRepository';
import { User } from '../../domain/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export class RegisterUserUseCase implements IRegisterUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(command: RegisterUserCommand): Promise<{ token: string; user: User }> {
    // 1. Validar que el usuario no exista
    const existingUser = await this.userRepository.findByEmail(command.email);
    if (existingUser) {
      throw new Error('El correo ya está registrado');
    }

    // 2. Hashear la contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(command.passwordRaw, saltRounds);

    // 3. Crear Entidad
    const userId = crypto.randomUUID();
    const newUser = new User(
      userId,
      command.username,
      command.email,
      passwordHash,
      0, // tokens inician en 0
      new Date()
    );

    // 4. Guardar en Base de Datos
    await this.userRepository.save(newUser);

    // 5. Generar JWT (JSON Web Token)
    const jwtSecret = process.env.JWT_SECRET || 'secret-development-key';
    const token = jwt.sign({ id: newUser.id }, jwtSecret, { expiresIn: '7d' });

    return { token, user: newUser };
  }
}
