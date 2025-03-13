import { Attachment, Message } from 'ai'
import { sql } from 'drizzle-orm'
import { customType, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const float32Array = customType<{
  data: number[]
  config: { dimensions: number }
  configRequired: true
  driverData: Buffer
}>({
  dataType(config) {
    return `F32_BLOB(${config.dimensions})`
  },
  fromDriver(value: Buffer) {
    return Array.from(new Float32Array(value.buffer))
  },
  toDriver(value: number[]) {
    return sql`vector32(${JSON.stringify(value)})`
  },
})

// Example of how to use the float32Array custom type for embeddings
// export const settings = sqliteTable('example', {
//   id: integer('id').primaryKey().unique(),
//   value: text('value'),
//   updated_at: text('updated_at').default('CURRENT_TIMESTAMP'),
//   // embedding: sqliteVector('embedding', 3),
//   embedding: float32Array('embedding', { dimensions: 3 }),
// })

export const settingsTable = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }),
  updated_at: text().default(sql`(CURRENT_DATE)`),
})

export const chatThreadsTable = sqliteTable('chat_threads', {
  id: text('id').primaryKey().notNull().unique(),
  title: text('title'),
})

export const chatMessagesTable = sqliteTable('chat_messages', {
  id: text('id').primaryKey().notNull().unique(),
  // createdat can be derived from uuid v7 id
  content: text('content').notNull(),
  attachments: text('attachments', { mode: 'json' }).$type<Attachment[]>(),
  role: text('role').notNull().$type<Message['role']>(),
  annotations: text('annotations', { mode: 'json' }).$type<Message['annotations']>(),
  parts: text('parts', { mode: 'json' }).$type<Message['parts']>(),
  chat_thread_id: text('chat_thread_id')
    .notNull()
    .references(() => chatThreadsTable.id),
})
