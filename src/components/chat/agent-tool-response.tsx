import { ToolInvocationUIPart } from '@ai-sdk/ui-utils'
import { Search } from 'lucide-react'
import { ChatMessagePreview } from './message-preview'
import { tools } from '@/lib/ai-tools'
export type AgentToolResponseProps = {
  part: ToolInvocationUIPart
}

export const AgentToolResponse = ({ part }: AgentToolResponseProps) => {
  const renderResults = (results: any[]) => {
    if (!results || !results.length) return null

    return (
      <div className="space-y-3 mt-3">
        {results.map((result, index) => {
          return <ChatMessagePreview key={index} imapId={result} />
        })}
      </div>
    )
  }

  return (
    <>
      {part.toolInvocation.toolName === 'answer' && part.toolInvocation.args?.text ? (
        <div className="space-y-3 rounded-lg overflow-hidden">
          <div className="p-4">{part.toolInvocation.args.text}</div>
          {renderResults(part.toolInvocation.args.results)}
        </div>
      ) : part.toolInvocation.toolName === 'search' && part.toolInvocation.args?.query ? (
        <div className="space-y-3">
          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg shadow-sm text-foreground dark:text-foreground/90 leading-relaxed flex items-center gap-2">
            <Search className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse" />
            <span className="italic">Searching for "{part.toolInvocation.args.query}"...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg shadow-sm text-foreground dark:text-foreground/90 leading-relaxed flex items-center gap-2">
            <Search className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse" />
            <span className="italic">{tools[part.toolInvocation.toolName as keyof typeof tools].verb}</span>
          </div>
        </div>
      )}
    </>
  )
}
