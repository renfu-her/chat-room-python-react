
import { User, Group } from './types';

// Password for all: user123
export const MOCK_PASSWORD = 'user123';

export const INITIAL_USERS: User[] = Array.from({ length: 20 }).map((_, i) => ({
  id: `user-${i + 1}`,
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  avatar: `https://picsum.photos/seed/${i + 1}/200`,
  status: Math.random() > 0.3 ? 'online' : 'offline',
}));

export const INITIAL_GROUPS: Group[] = [
  {
    id: 'group-1',
    name: 'Development Team',
    creatorId: 'user-1',
    members: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'],
    deniedMembers: [],
    lastMessage: 'Welcome to the dev group!',
  },
  {
    id: 'group-2',
    name: 'General Chat',
    creatorId: 'user-2',
    members: INITIAL_USERS.map(u => u.id),
    deniedMembers: [],
    lastMessage: 'Hello everyone!',
  }
];