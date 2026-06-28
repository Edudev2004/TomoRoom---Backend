// src/infrastructure/adapters/in/http/AuthController.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { IRegisterUserUseCase, RegisterUserCommand } from '../../../../application/ports/in/IRegisterUserUseCase';
import { ILoginUserUseCase, LoginUserCommand } from '../../../../application/ports/in/ILoginUserUseCase';

export class AuthController {
  constructor(
    private readonly registerUserUseCase: IRegisterUserUseCase,
    private readonly loginUserUseCase: ILoginUserUseCase
  ) {}

  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const command = request.body as RegisterUserCommand;
      
      const result = await this.registerUserUseCase.execute(command);

      return reply.status(201).send({
        success: true,
        token: result.token,
        user: {
          id: result.user.id,
          username: result.user.username,
        }
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        message: error instanceof Error ? error.message : 'Error al registrar',
      });
    }
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const command = request.body as LoginUserCommand;
      
      const result = await this.loginUserUseCase.execute(command);

      return reply.status(200).send({
        success: true,
        token: result.token,
        user: {
          id: result.user.id,
          username: result.user.username,
        }
      });
    } catch (error) {
      return reply.status(401).send({
        success: false,
        message: error instanceof Error ? error.message : 'Error al iniciar sesión',
      });
    }
  }
}
