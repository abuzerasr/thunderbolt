import { useDrizzle } from '@/db/provider'
import { chatMessagesTable } from '@/db/tables'
import { convertDbChatMessageToUIMessage, convertUIMessageToDbChatMessage } from '@/lib/utils'
import { SaveMessagesFunction } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UIMessage } from 'ai'
import { eq } from 'drizzle-orm'
import { useParams } from 'react-router'
import Chat from './chat'

export default function ChatDetailPage() {
  const params = useParams()
  const { db } = useDrizzle()
  const queryClient = useQueryClient()

  const {
    data: messages,
    isLoading,
    isError,
  } = useQuery<UIMessage[], Error>({
    queryKey: ['chatMessages', params.chatThreadId],
    queryFn: async () => {
      const chatMessages = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.chatThreadId, params.chatThreadId!)).orderBy(chatMessagesTable.id)
      return chatMessages.map(convertDbChatMessageToUIMessage)
    },
    enabled: !!params.chatThreadId,
  })

  const addMessagesMutation = useMutation({
    mutationFn: async (messages: UIMessage[]) => {
      const dbChatMessages = messages.map((message) => convertUIMessageToDbChatMessage(message, params.chatThreadId!))

      return await db.insert(chatMessagesTable).values(dbChatMessages).onConflictDoNothing({
        target: chatMessagesTable.id,
      })
    },
    onSuccess: () => {
      // Invalidate and refetch messages after adding a new one
      queryClient.invalidateQueries({ queryKey: ['chatMessages', params.chatThreadId] })
    },
  })

  const saveMessages: SaveMessagesFunction = async ({ messages }) => {
    await addMessagesMutation.mutateAsync(messages)
  }

  return params.chatThreadId ? (
    <>
      <div className="h-full w-full">
        {isLoading ? (
          <div>Loading chat...</div>
        ) : isError ? (
          <div>Error loading chat</div>
        ) : messages ? (
          <Chat key={params.chatThreadId} id={params.chatThreadId} initialMessages={messages} saveMessages={saveMessages} />
        ) : (
          <div>Error loading chat</div>
        )}
      </div>
    </>
  ) : (
    <div>No chat thread ID</div>
  )
}
