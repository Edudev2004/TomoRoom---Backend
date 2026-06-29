import { IFriendRepository } from '../ports/out/IFriendRepository';
import { IUserRepository } from '../ports/out/IUserRepository';

export class ManageFriendsUseCase {
  constructor(
    private friendRepository: IFriendRepository,
    private userRepository: IUserRepository
  ) {}

  async searchUsers(query: string, currentUserId: string) {
    const users = await this.userRepository.searchUsers(query, currentUserId);
    
    // Enrich with friendship status
    const result = [];
    for (const user of users) {
      const friendship = await this.friendRepository.getFriendship(currentUserId, user.id);
      let status = 'none';
      if (friendship) {
        if (friendship.status === 'accepted') status = 'friends';
        else if (friendship.requesterId === currentUserId) status = 'request_sent';
        else status = 'request_received';
      }
      result.push({
        id: user.id,
        username: user.username,
        friendshipStatus: status
      });
    }
    return result;
  }

  async sendRequest(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) throw new Error("Cannot send request to yourself");
    
    const existing = await this.friendRepository.getFriendship(requesterId, addresseeId);
    if (existing) {
      throw new Error("Friendship or request already exists");
    }

    await this.friendRepository.sendRequest(requesterId, addresseeId);
  }

  async respondToRequest(requestId: string, currentUserId: string, action: 'accept' | 'reject') {
    // We need to fetch the friendship first to notify the requester
    const pendingReqs = await this.friendRepository.getPendingRequests(currentUserId);
    const targetReq = pendingReqs.find((r: any) => r.id === requestId);
    
    const status = action === 'accept' ? 'accepted' : 'rejected';
    await this.friendRepository.updateRequestStatus(requestId, status);

    return targetReq ? targetReq.userId : null;
  }

  async getPendingRequests(userId: string) {
    return this.friendRepository.getPendingRequests(userId);
  }

  async getSentRequests(userId: string) {
    return this.friendRepository.getSentRequests(userId);
  }

  async getFriendsList(userId: string) {
    return this.friendRepository.getFriends(userId);
  }

  async removeFriend(friendshipId: string, currentUserId: string) {
    // Optionally verify if the friendship belongs to currentUserId
    await this.friendRepository.removeFriend(friendshipId);
  }
}
