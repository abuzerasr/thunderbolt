import type { LanguageModelV2Middleware, LanguageModelV2StreamPart } from '@ai-sdk/provider'
import type { TransformStreamDefaultController } from 'stream/web'

/**
 * Middleware that cleans up leftover legacy meta-tags (<tool_call>, <think>, <final_response>)
 * which some providers still emit alongside the modern sentinel-based tags.  It runs *after*
 * toolCallsMiddleware and extractReasoningMiddleware and therefore only needs to perform a
 * very small blacklist-style sanitisation:
 *
 * 1. Remove *entire* <tool_call> … </tool_call> sections (JSON + tags).  If a closing tag is
 *    never received we drop everything until the stream ends – the information is duplicated
 *    in the structured tool-call part already emitted by toolCallsMiddleware.
 * 2. Strip opening/closing <think> and <final_response> tags but keep their inner content.
 *
 * All other text – including Markdown or HTML formatting – is left untouched.
 */
export const stripTagsMiddleware: LanguageModelV2Middleware = {
  wrapStream: async ({ doStream }) => {
    const { stream, ...rest } = await doStream()

    let insideToolCall = false
    let pendingPrefix = '' // holds newline(s) that should prefix the next real text

    const transform = new TransformStream<LanguageModelV2StreamPart, LanguageModelV2StreamPart>({
      transform(
        chunk: LanguageModelV2StreamPart,
        controller: TransformStreamDefaultController<LanguageModelV2StreamPart>,
      ) {
        // Fast-path: non-text chunks are forwarded untouched
        if ((chunk as any).type !== 'text') {
          controller.enqueue(chunk)
          return
        }

        const originalText = (chunk as any).text as string
        if (typeof originalText !== 'string' || originalText.length === 0) {
          controller.enqueue(chunk)
          return
        }

        let text = ''
        let remaining = originalText

        while (remaining.length > 0) {
          if (insideToolCall) {
            // We're inside a dropped section – look for terminator
            const endTagMatch = remaining.match(/<\/tool_call\s*>/i)
            const jsonEndIdx = remaining.indexOf('}\n')
            const jsonEndIdxNoNewline = remaining.lastIndexOf('}')

            if (endTagMatch) {
              // Discard up to and including </tool_call>
              const cutIdx = (endTagMatch.index ?? 0) + endTagMatch[0].length
              remaining = remaining.slice(cutIdx)
              insideToolCall = false
              continue
            }
            if (jsonEndIdx !== -1 || jsonEndIdxNoNewline !== -1) {
              const cut = jsonEndIdx !== -1 ? jsonEndIdx + 1 : jsonEndIdxNoNewline + 1
              remaining = remaining.slice(cut)
              insideToolCall = false
              continue
            }
            // Still inside, discard rest of chunk
            remaining = ''
            break
          }

          // Not in tool_call – look for start tag
          const startTagMatch = remaining.match(/<tool_call\b[^>]*>/i)
          if (startTagMatch) {
            // Append text before tag to output
            text += remaining.slice(0, startTagMatch.index)
            // Enter drop mode and trim start tag
            remaining = remaining.slice((startTagMatch.index ?? 0) + startTagMatch[0].length)
            insideToolCall = true
            continue
          }

          // No more tool_call tags in this chunk; append remainder and exit loop
          text += remaining
          remaining = ''
        }

        // Replace simple wrapper tags with a newline so that Markdown structure
        // (e.g. headings or list items that follow immediately after) keeps
        // its required line breaks when the tags are stripped.
        text = text.replace(/<\/?think\b[^>]*>/gi, '\n').replace(/<\/?final_response\b[^>]*>/gi, '\n')

        // If nothing left after stripping, just drop unless it's a pure newline
        if (text.length === 0) return

        // Handle newline-only chunks: buffer them until we have real text.
        if (/^\s*\n\s*$/.test(text)) {
          pendingPrefix += text
          return
        }

        // Prepend any buffered prefix
        if (pendingPrefix) {
          text = pendingPrefix + text
          pendingPrefix = ''
        }

        controller.enqueue({ ...(chunk as any), text } as any)
      },

      flush(_controller: TransformStreamDefaultController<LanguageModelV2StreamPart>) {
        // If the stream ended while still inside a <tool_call> block we simply discard the buffer
        // because the structured tool-call part has already been delivered.
      },
    })

    return { stream: stream.pipeThrough(transform), ...rest }
  },

  wrapGenerate: async ({ doGenerate }) => doGenerate(),
}
