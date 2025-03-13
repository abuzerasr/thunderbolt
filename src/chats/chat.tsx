import ChatUI from '@/components/chat/chat-ui'
import { aiFetchStreamingResponse } from '@/lib/ai'
import { SaveMessagesFunction } from '@/types'
import { useChat } from '@ai-sdk/react'
import { Message } from 'ai'
import { v7 as uuidv7 } from 'uuid'
interface ChatProps {
  id: string
  apiKey: string
  initialMessages: Message[] | undefined
  maxSteps?: number
  saveMessages: SaveMessagesFunction
}

export default function Chat({ id, apiKey, initialMessages, maxSteps = 5, saveMessages }: ChatProps) {
  const chatHelpers = useChat({
    id,
    initialMessages,
    sendExtraMessageFields: true,

    // only send the last message to the server
    // experimental_prepareRequestBody({ messages, id }) {
    //   return { message: messages[messages.length - 1], id }
    // },

    generateId: uuidv7,

    fetch: (_requestInfoOrUrl: RequestInfo | URL, init?: RequestInit) => {
      if (!apiKey) {
        throw new Error('No API key found')
      }

      if (!init) {
        throw new Error('No init found')
      }

      return aiFetchStreamingResponse({
        apiKey,
        init,
        saveMessages,
      })
    },
    maxSteps,
  })

  return <ChatUI chatHelpers={chatHelpers} />
}
