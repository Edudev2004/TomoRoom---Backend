// src/infrastructure/adapters/in/websockets/RoomSocket.ts
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { db } from '../../out/database/index';
import { rooms, users } from '../../out/database/schema';
import { eq } from 'drizzle-orm';

interface RoomMember {
  id: string;
  name: string;
  avatar: string;
  role: 'host' | 'member';
  socketId: string;
}

const activeRooms = new Map<string, RoomMember[]>();
const activeReadyChecks = new Map<string, Set<string>>();

export class RoomSocket {
  constructor(private readonly io: Server) {
    this.setupMiddleware();
    this.setupEvents();
  }

  private setupMiddleware() {
    // Este "Guardián" protege las conexiones WebSocket
    this.io.use((socket, next) => {
      // El cliente debe enviar el token en la configuración inicial del socket
      const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
      
      if (!token) {
        return next(new Error('Autenticación denegada: Token no provisto'));
      }

      try {
        const cleanToken = token.replace('Bearer ', '');
        const secret = process.env.JWT_SECRET || 'secret-development-key';
        
        // Verificamos si es un usuario válido
        const decoded = jwt.verify(cleanToken, secret) as { id: string };
        
        // Guardamos su ID directamente en su conexión de Socket
        (socket as any).userId = decoded.id;
        next();
      } catch (err) {
        next(new Error('Token inválido'));
      }
    });
  }

  private setupEvents() {
    this.io.on('connection', (socket: Socket) => {
      const userId = (socket as any).userId;
      console.log(`[Socket] Usuario ${userId} conectado (ID: ${socket.id})`);
      
      // Unirse a su propia sala personal para recibir notificaciones (ej: solicitudes de amistad)
      socket.join(userId);

      // Evento 1: Entrar a una sala de visualización
      socket.on('join_room', async (roomId: string) => {
        socket.join(roomId);
        console.log(`[Socket] Usuario ${userId} se unió a la sala ${roomId}`);
        
        try {
          // Obtener datos del usuario
          const userResult = await db.select().from(users).where(eq(users.id, userId));
          const username = userResult.length > 0 ? userResult[0].username : 'Anon';
          
          // Obtener host de la sala
          const roomResult = await db.select().from(rooms).where(eq(rooms.id, roomId));
          const hostId = roomResult.length > 0 ? roomResult[0].hostId : null;
          
          const role = hostId === userId ? 'host' : 'member';
          
          const newMember: RoomMember = {
            id: userId,
            name: username,
            avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + username, // Avatar dinámico
            role,
            socketId: socket.id
          };

          const roomMembers = activeRooms.get(roomId) || [];
          // Remover si ya estaba (para evitar duplicados si recarga)
          const filtered = roomMembers.filter(m => m.id !== userId);
          filtered.push(newMember);
          activeRooms.set(roomId, filtered);

          // Enviar lista actualizada a toda la sala
          this.io.to(roomId).emit('room_users_update', activeRooms.get(roomId));

        } catch (error) {
          console.error("Error fetching user/room on join:", error);
        }
      });

      // Evento 1.5: Expulsar de sala
      socket.on('kick_user', (data: { roomId: string, targetId: string }) => {
        const roomMembers = activeRooms.get(data.roomId) || [];
        const kicker = roomMembers.find(m => m.id === userId);
        
        if (kicker && kicker.role === 'host') {
          // Enviar evento de expulsión directo al target
          this.io.to(data.targetId).emit('kicked_from_room');
          
          // Actualizar memoria
          const filtered = roomMembers.filter(m => m.id !== data.targetId);
          activeRooms.set(data.roomId, filtered);
          
          // Notificar nueva lista
          this.io.to(data.roomId).emit('room_users_update', activeRooms.get(data.roomId));
        }
      });

      // Evento 2: Sincronizar Video (Play, Pause, Seek)
      socket.on('sync_video', (data: { roomId: string, action: string, time: number }) => {
        // Retransmitimos la orden a todos en la sala EXCEPTO al que la envió
        socket.to(data.roomId).emit('video_synced', data);
      });

      // Evento 2.5: Cambiar Video
      socket.on('change_video', (data: { roomId: string, videoData: any }) => {
        socket.to(data.roomId).emit('video_changed', data.videoData);
      });

      // --- READY CHECK ---
      socket.on('initiate_ready_check', (roomId: string) => {
        // Inicializar el set de listos para esta sala
        activeReadyChecks.set(roomId, new Set());
        this.io.to(roomId).emit('ready_check_started');
      });

      socket.on('member_ready', (roomId: string) => {
        const readySet = activeReadyChecks.get(roomId);
        if (readySet) {
          readySet.add(userId);
          const roomMembers = activeRooms.get(roomId) || [];
          
          // Emitir actualización de cuántos faltan
          this.io.to(roomId).emit('ready_check_update', { 
            readyCount: readySet.size, 
            totalCount: roomMembers.length 
          });

          // Si todos están listos
          if (readySet.size >= roomMembers.length) {
            this.io.to(roomId).emit('ready_check_complete');
            activeReadyChecks.delete(roomId);
          }
        }
      });
      // -------------------

      // Evento 3: Chat
      socket.on('chat_message', (data: { roomId: string, message: string }) => {
        const roomMembers = activeRooms.get(data.roomId) || [];
        const sender = roomMembers.find(m => m.id === userId);
        
        if (sender) {
          this.io.to(data.roomId).emit('new_message', {
            userId,
            sender: sender.name,
            avatar: sender.avatar,
            role: sender.role,
            message: data.message,
            timestamp: new Date()
          });
        }
      });

      // Evento 4: Invitar a Sala
      socket.on('invite_to_room', (data: { friendId: string, roomId: string, roomName: string, hostName: string }) => {
        // Relay the invitation to the friend's personal room
        this.io.to(data.friendId).emit('room_invite', {
          roomId: data.roomId,
          roomName: data.roomName,
          hostName: data.hostName || 'Un amigo'
        });
      });

      socket.on('disconnect', () => {
        console.log(`[Socket] Usuario ${userId} desconectado`);
        // Eliminar de todas las salas a las que estaba unido en memoria
        activeRooms.forEach((members, roomId) => {
          if (members.find(m => m.id === userId)) {
            const filtered = members.filter(m => m.id !== userId);
            activeRooms.set(roomId, filtered);
            this.io.to(roomId).emit('room_users_update', filtered);
          }
        });
      });
    });
  }
}
