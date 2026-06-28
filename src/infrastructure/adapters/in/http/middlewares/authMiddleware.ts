// src/infrastructure/adapters/in/http/middlewares/authMiddleware.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

// Extendemos el Request de Fastify para guardar el ID del usuario
declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string };
  }
}

export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ success: false, message: 'No autorizado, token faltante' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'secret-development-key';

    const decoded = jwt.verify(token, secret) as { id: string };
    
    // Inyectamos el usuario en el request para que el Controlador pueda saber quién es
    request.user = { id: decoded.id };
  } catch (error) {
    return reply.status(401).send({ success: false, message: 'Token inválido o expirado' });
  }
}
