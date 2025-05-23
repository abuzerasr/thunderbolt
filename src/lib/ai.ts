import { Model, SaveMessagesFunction, Setting } from '@/types'
import { createFireworks } from '@ai-sdk/fireworks'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { convertToModelMessages, LanguageModel, streamText, ToolInvocation, UIMessage, maxSteps, wrapLanguageModel, extractReasoningMiddleware } from 'ai'
import { createDeepInfra } from '@ai-sdk/deepinfra'

import z from 'zod'

export type ToolInvocationWithResult<T = object> = ToolInvocation & {
  result: T
}

const user = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
}

const p1 = `
    You are a helpful executive assistant.
    
    The current date and time is ${new Date().toISOString()}.
  
    The current user is ${user.first_name} ${user.last_name} (${user.email}).

    You can use the available tools to answer the user's question.
    
    If you are unable to answer the user's question based on the available information, just say so. Do not make up an answer.

    Respond to the user's question in a helpful, concise and friendly manner. Always reply to the user in plain text - do not reply in markdown or mention JSON or anything about tools
`

export const ollama = createOpenAI({
  baseURL: 'http://localhost:11434/v1',
  // compatibility: 'compatible',
  apiKey: 'ollama',
})

type AiFetchStreamingResponseOptions = {
  init: RequestInit
  saveMessages: SaveMessagesFunction
  model: Model
  settings: Setting[]
}

export const createModel = (modelConfig: Model): LanguageModel => {
  switch (modelConfig.provider) {
    case 'openai': {
      if (!modelConfig.apiKey) {
        throw new Error('No API key provided')
      }
      const openai = createOpenAI({
        apiKey: modelConfig.apiKey,
      })
      const model = openai(modelConfig.model)

      return model
    }
    case 'fireworks': {
      if (!modelConfig.apiKey) {
        throw new Error('No API key provided')
      }
      const fireworks = createFireworks({
        apiKey: modelConfig.apiKey,
      })

      const model = fireworks(modelConfig.model)

      return model as LanguageModel
    }
    case 'deepinfra': {
      if (!modelConfig.apiKey) {
        throw new Error('No API key provided')
      }
      const deepinfra = createDeepInfra({
        apiKey: modelConfig.apiKey,
      })

      // const model = deepinfra('meta-llama/Meta-Llama-3.1-70B-Instruct')
      const model = deepinfra(modelConfig.model)

      return model as LanguageModel
    }
    case 'openai_compatible': {
      if (!modelConfig.url) {
        throw new Error('No URL provided')
      }
      const openaiCompatible = createOpenAICompatible({
        name: 'custom',
        baseURL: modelConfig.url,
        apiKey: modelConfig.apiKey ?? undefined,
      })
      return openaiCompatible(modelConfig.model) as LanguageModel
    }
    default: {
      throw new Error(`Unsupported model provider: ${modelConfig.provider}`)
    }
  }
}

export const aiFetchStreamingResponse = async ({ init, saveMessages, model: modelConfig, settings }: AiFetchStreamingResponseOptions) => {
  try {
    const baseModel = await createModel(modelConfig)

    const wrappedModel = wrapLanguageModel({
      model: baseModel,
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    })

    const model = wrappedModel

    const options = init as RequestInit & { body: string }
    const body = JSON.parse(options.body)

    const { messages, chatId } = body as { messages: UIMessage[]; chatId: string }

    await saveMessages({
      id: chatId,
      messages,
    })

    console.log('Using model', modelConfig.provider, modelConfig.model)

    const result = streamText({
      // Currently llama is able to call the search tool, but it does not call the answer tool afterwards - need to debug why.
      // model: ollama('llama3.2:3b-instruct-q4_1', {
      //   structuredOutputs: true,
      // }),
      model,
      system: p1,
      messages: convertToModelMessages(messages),
      toolCallStreaming: true, // Causes issues because this results in incomplete result objects getting passed to React components. Experimentation to block rendering until the full objects are available is needed.
      tools: {
        getForecast: {
          description: 'Get the weather forecast.',
          parameters: z.object({
            // location: z.string().describe('The location to get the weather forecast for.').optional(),
          }),
          execute: async () => {
            try {
              let url = 'https://api.open-meteo.com/v1/forecast?hourly=temperature_2m,precipitation,cloud_cover'

              // Get location from settings if available
              const locationLat = settings.find((s) => s.key === 'location_lat')?.value
              const locationLng = settings.find((s) => s.key === 'location_lng')?.value

              if (locationLat && locationLng) {
                url = `${url}&latitude=${locationLat}&longitude=${locationLng}`
              } else {
                // Fallback to default coordinates if no settings found
                url = `${url}&latitude=52.52&longitude=13.41`
              }

              const response = await fetch(url)
              if (!response.ok) {
                throw new Error(`Weather API returned ${response.status}: ${response.statusText}`)
              }

              console.log('response', response)

              const forecast = await response.json()

              console.log('forecast', forecast)
              return forecast
            } catch (error) {
              console.error('Error fetching weather forecast:', error)
              throw new Error('Failed to get weather forecast')
            }
          },
        },
      },
      // continueUntil: hasToolCall('answer'),
      // continueUntil: maxSteps(5),

      toolChoice: 'required',
    })

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
    })
  } catch (error) {
    console.error('Error in aiFetchStreamingResponse:', error)
    throw error
  }
}
