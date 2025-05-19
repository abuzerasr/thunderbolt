import { ParsedEmail } from '@/types'
import { invoke } from '@tauri-apps/api/core'
import { tool } from 'ai'
import { z } from 'zod'
import { getMessageIdFromParsedEmail, getSubjectFromParsedEmail } from './utils'

export const tools = {
  getForecast: {
    verb: 'Checking the weather...',
    tool: tool({
      description: 'Get the weather forecast for a specific location.',
      parameters: z.object({
        location: z.string().describe('The location to get the weather forecast for.'),
      }),
      execute: async ({ location }: { location: string }) => {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m,precipitation,cloud_cover`)
        const forecast = await response.json()
        return forecast
      },
    }),
  },
  searchInbox: {
    verb: 'Searching the inbox...',
    tool: tool({
      description: "A tool for searching the user's inbox.",
      parameters: z.object({
        query: z.string().describe("The query to search the user's inbox with."),
        originalUserMessage: z.string().describe('The original user message that triggered this tool call.'),
      }),
      execute: async () => {
        const messages = await invoke<ParsedEmail[]>('fetch_inbox', { mailbox: 'INBOX', count: 3 })
        console.log('messages', messages)
        return messages.map(
          (message) => `
            Type: Message
            Message ID: ${getMessageIdFromParsedEmail(message)}
            Subject: ${getSubjectFromParsedEmail(message)}
            Body: ${message.clean_text}
          `
        )
      },
    }),
  },
  listMailboxes: {
    verb: 'Listing mailboxes...',
    tool: tool({
      description: "List all mailboxes in the user's inbox.",
      parameters: z.object({}),
      execute: async () => {
        const mailboxes = await invoke<Record<string, number>>('list_mailboxes')

        return Object.entries(mailboxes).map(
          ([name, count]) => `
          Mailbox: ${name}
          Count: ${count}
        `
        )
      },
    }),
  },
  answer: {
    verb: 'Answering the user...',
    tool: tool({
      description: 'Provide your final response to the user.',
      parameters: z.object({
        text: z.string().describe('The verbal response to the user. Do not list anything here.'),
        results: z.array(z.string()),
      }),
      // Important: Do NOT have an execute function otherwise it will call this tool multiple times.
      // But: it is helpful for debugging :)
      // execute: async ({ text, results }) => {
      //   console.log('answer', text, results)
      // },
    }),
  },
}

export const toolset = Object.entries(tools).reduce(
  (acc, [key, value]) => ({
    ...acc,
    [key]: value.tool,
  }),
  {} as Record<keyof typeof tools, (typeof tools)[keyof typeof tools]['tool']>
)
