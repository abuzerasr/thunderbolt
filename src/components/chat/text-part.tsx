import { type TextUIPart } from 'ai'
import { StreamingMarkdown } from './streaming-markdown'

interface TextPartProps {
  part: TextUIPart
  isStreaming: boolean
}

export const TextPart = ({ part, isStreaming }: TextPartProps) => {
  return (
    <div className="p-4 rounded-md mr-auto w-full my-2">
      <StreamingMarkdown
        content={(part as any).text || ''}
        isStreaming={isStreaming}
        className="text-secondary-foreground leading-relaxed"
      />
    </div>
  )
}
