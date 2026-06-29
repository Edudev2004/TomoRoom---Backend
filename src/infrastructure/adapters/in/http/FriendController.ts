import { FastifyRequest, FastifyReply } from 'fastify';
import { ManageFriendsUseCase } from '../../../../application/use-cases/ManageFriendsUseCase';

export class FriendController {
  constructor(private manageFriendsUseCase: ManageFriendsUseCase) {}

  async searchUsers(req: FastifyRequest, res: FastifyReply) {
    try {
      const currentUserId = (req as any).user.id;
      const query = (req.query as any).q;
      if (!query) {
        return res.status(400).send({ success: false, error: 'Query parameter "q" is required' });
      }

      const users = await this.manageFriendsUseCase.searchUsers(query, currentUserId);
      return res.send({ success: true, data: users });
    } catch (error: any) {
      return res.status(500).send({ success: false, error: error.message });
    }
  }

  async sendRequest(req: FastifyRequest, res: FastifyReply) {
    try {
      const currentUserId = (req as any).user.id;
      const { addresseeId } = req.body as any;

      if (!addresseeId) {
        return res.status(400).send({ success: false, error: 'addresseeId is required' });
      }

      await this.manageFriendsUseCase.sendRequest(currentUserId, addresseeId);
      
      // Notificar al destinatario en tiempo real
      const io = (req.server as any).io;
      if (io) {
        io.to(addresseeId).emit('notification', {
          type: 'new_friend_request',
          message: 'Tienes una nueva solicitud de amistad'
        });
      }

      return res.send({ success: true, message: 'Friend request sent' });
    } catch (error: any) {
      return res.status(400).send({ success: false, error: error.message });
    }
  }

  async respondRequest(req: FastifyRequest, res: FastifyReply) {
    try {
      const currentUserId = (req as any).user.id;
      const { requestId, action } = req.body as any;

      if (!requestId || !action || !['accept', 'reject'].includes(action)) {
        return res.status(400).send({ success: false, error: 'Invalid parameters' });
      }

      // Notificar al usuario que envió la solicitud para que su UI se actualice
      const requesterId = await this.manageFriendsUseCase.respondToRequest(requestId, currentUserId, action);
      
      const io = (req.server as any).io;
      if (io) {
        // Notificar a mí mismo para actualizar
        io.to(currentUserId).emit('notification', {
          type: 'friend_request_responded',
          action
        });
        
        // Notificar a la otra persona
        if (requesterId) {
          io.to(requesterId).emit('notification', {
            type: 'friend_request_responded',
            message: action === 'accept' ? 'Han aceptado tu solicitud de amistad' : 'Solicitud rechazada',
            action
          });
        }
      }

      return res.send({ success: true, message: `Request ${action}ed` });
    } catch (error: any) {
      return res.status(400).send({ success: false, error: error.message });
    }
  }

  async getRequests(req: FastifyRequest, res: FastifyReply) {
    try {
      const currentUserId = (req as any).user.id;
      const incoming = await this.manageFriendsUseCase.getPendingRequests(currentUserId);
      const outgoing = await this.manageFriendsUseCase.getSentRequests(currentUserId);

      return res.send({ success: true, data: { incoming, outgoing } });
    } catch (error: any) {
      return res.status(500).send({ success: false, error: error.message });
    }
  }

  async getFriendsList(req: FastifyRequest, res: FastifyReply) {
    try {
      const currentUserId = (req as any).user.id;
      const friends = await this.manageFriendsUseCase.getFriendsList(currentUserId);
      
      // En un futuro aqui podriamos integrar la info de si están "online" con websockets
      return res.send({ success: true, data: friends });
    } catch (error: any) {
      return res.status(500).send({ success: false, error: error.message });
    }
  }

  async removeFriend(req: FastifyRequest, res: FastifyReply) {
    try {
      const currentUserId = (req as any).user.id;
      const { friendshipId } = req.params as any;

      if (!friendshipId) {
        return res.status(400).send({ success: false, error: 'friendshipId is required' });
      }

      // To notify the other user, we need their ID, but it's okay if we just notify ourselves for now,
      // or we can just send it to currentUserId to refresh.
      await this.manageFriendsUseCase.removeFriend(friendshipId, currentUserId);
      
      const io = (req.server as any).io;
      if (io) {
        io.to(currentUserId).emit('notification', {
          type: 'friend_removed',
          message: 'Amigo eliminado'
        });
        // Si tuviéramos el ID del amigo, también le notificaríamos. 
        // Como simplificación por ahora, la vista se actualiza al recargar o al navegar.
      }

      return res.send({ success: true, message: 'Amigo eliminado correctamente' });
    } catch (error: any) {
      return res.status(400).send({ success: false, error: error.message });
    }
  }
}
