import { invoke } from '@tauri-apps/api/core'
import { tool } from 'ai'
import { z } from 'zod'
import { EmailMessage } from './ai'

export const toolset = {
  search: tool({
    description: "A tool for searching the user's inbox.",
    parameters: z.object({
      query: z.string().describe("The query to search the user's inbox with."),
      originalUserMessage: z.string().describe('The original user message that triggered this tool call.'),
    }),
    execute: async () => {
      const messages = await invoke<EmailMessage[]>('fetch_inbox_top', { count: 50 })
      console.log('messages', messages)
      return messages.map(
        (message) => `
          ID: ${message.id}
          Type: Message
          Subject: ${message.subject}
          Snippet: ${message.snippet}
          Body: ${message.clean_text}
        `
      )
    },
  }),
  answer: tool({
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
}
