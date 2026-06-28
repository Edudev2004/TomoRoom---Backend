import { 
  pgTable, 
  uuid, 
  varchar, 
  integer, 
  timestamp, 
  pgEnum, 
  primaryKey, 
  text 
} from 'drizzle-orm/pg-core';

// Enums
export const planTypeEnum = pgEnum('plan_type', ['solo', 'duo', 'mancha']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'expired', 'canceled']);
export const roomRoleEnum = pgEnum('room_role', ['admin', 'member']);

// 1. Users
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  tokens: integer('tokens').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Subscriptions
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  planType: planTypeEnum('plan_type').notNull(),
  status: subscriptionStatusEnum('status').notNull(),
  inviteCode: varchar('invite_code', { length: 50 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
});

// 3. Subscription Members
export const subscriptionMembers = pgTable('subscription_members', {
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.subscriptionId, table.userId] })
  };
});

// 4. Rooms
export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  hostId: uuid('host_id').references(() => users.id).notNull(),
  inviteCode: varchar('invite_code', { length: 50 }).notNull().unique(),
  theme: varchar('theme', { length: 100 }).default('default').notNull(),
});

// 5. Room Participants
export const roomParticipants = pgTable('room_participants', {
  roomId: uuid('room_id').references(() => rooms.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  role: roomRoleEnum('role').notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.roomId, table.userId] })
  };
});

// 6. Room Notes
export const roomNotes = pgTable('room_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').references(() => rooms.id).notNull(),
  content: text('content'),
  lastUpdatedAt: timestamp('last_updated_at').defaultNow().notNull(),
});
