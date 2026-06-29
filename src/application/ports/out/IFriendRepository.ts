export interface IFriendRepository {
  sendRequest(requesterId: string, addresseeId: string): Promise<void>;
  updateRequestStatus(requestId: string, status: 'accepted' | 'rejected'): Promise<void>;
  getPendingRequests(userId: string): Promise<any[]>;
  getSentRequests(userId: string): Promise<any[]>;
  getFriends(userId: string): Promise<any[]>;
  getFriendship(userId1: string, userId2: string): Promise<any | null>;
  removeFriend(friendshipId: string): Promise<void>;
}
