import Fastify from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({
  logger: false // Lo apagamos para que no ensucie la consola con JSONs
});

import cors from '@fastify/cors';

// Registrar CORS para permitir peticiones desde el frontend (Vite en puerto 5173)
fastify.register(cors, {
  origin: '*', // En producción cambiaremos esto por el dominio real
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

import { RoomSocket } from './infrastructure/adapters/in/websockets/RoomSocket';

// Registrar Socket.io como plugin de Fastify
fastify.register(fastifyPlugin(async (fastify) => {
  const io = new Server(fastify.server, {
    cors: {
      origin: '*', // Se ajustará para Vercel luego
      methods: ['GET', 'POST']
    }
  });

  fastify.decorate('io', io);

  // Le pasamos el control a nuestro Adaptador Hexagonal de WebSockets
  new RoomSocket(io);
}));

import { setupRoutes } from './infrastructure/adapters/in/http/routes';

// Registrar Rutas HTTP (Pilar 2)
fastify.register(setupRoutes);

const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    
    console.log(`\n========================================`);
    console.log(`Backend - TomoRoom Iniciado correctamente!`);
    console.log(`Escuchando en http://localhost:${port}`);
    console.log(`========================================\n`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Cierre elegante para evitar que el puerto 3000 se quede pegado con Nodemon
['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\nApagando servidor (${signal})...`);
    await fastify.close();
    process.exit(0);
  });
});

start();
