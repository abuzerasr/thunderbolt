import { Message, ReasoningUIPart, SourceUIPart, TextUIPart, ToolInvocationUIPart } from '@ai-sdk/ui-utils'
import { InferSelectModel } from 'drizzle-orm'
import { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy'
import * as schema from './db/schema'
import { chatMessagesTable, chatThreadsTable, settingsTable } from './db/schema'
import Database from './lib/libsql'
import { Settings as SettingsType } from './types'

export type InitData = {
  db: SqliteRemoteDatabase<typeof schema>
  sqlite: Database
  settings: SettingsType
}

export type ChatMessagePart = TextUIPart | ReasoningUIPart | ToolInvocationUIPart | SourceUIPart
export type ChatMessageRole = 'data' | 'system' | 'user' | 'assistant'

export type SaveMessagesFunction = ({ id, messages }: { id: string; messages: Message[] }) => Promise<void>

export type AccountsSettings = {
  hostname: string
  port: number
  username: string
  password: string
}

export type ModelsSettings = {
  openai_api_key: string
}

export type Settings = {
  account?: AccountsSettings
  models?: ModelsSettings
}

export type DrizzleContextType = {
  db: SqliteRemoteDatabase<typeof schema>
  sqlite: Database
}

export type ChatMessage = InferSelectModel<typeof chatMessagesTable>
export type ChatThread = InferSelectModel<typeof chatThreadsTable>
export type Setting = InferSelectModel<typeof settingsTable>
