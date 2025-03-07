import { useChat } from '@ai-sdk/solid'
import { A } from '@solidjs/router'
import { Settings } from 'lucide-solid'
import { Button } from './components/button'
import ChatUI from './components/chat/ChatUI'
import { Sidebar } from './components/sidebar'
import { aiFetchStreamingResponse } from './lib/ai'

export default function Home() {
  const chatHelpers = useChat({
    fetch: aiFetchStreamingResponse,
    maxSteps: 5,
  })

  // console.log('messages', chatHelpers.messages())

  return (
    <>
      <Sidebar>
        <Button as={A} href="/settings/accounts" variant="outline">
          <Settings class="size-4" />
          Settings
        </Button>
      </Sidebar>
      <div class="h-full w-full">
        <ChatUI chatHelpers={chatHelpers} />
      </div>
    </>
  )
}
