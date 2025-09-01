import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Mock handlers for API calls
export const handlers = [
  // Mock health endpoint
  http.get('http://localhost:8000/health', () => {
    return HttpResponse.json({
      ok: true,
      snippets: 66,
      files: 24,
      timestamp: Date.now(),
      version: "1.0.0",
      status: "operational",
      ops_truth: {
        health: {
          ok: true,
          snippets: 66
        }
      },
      latency_report: "Retrieve 7ms p50 / 79ms p95; total 1352ms p50 / 1536ms p95.",
      request_count: 5
    })
  }),

  // Mock chat endpoint
  http.post('http://localhost:8000/chat', async ({ request }) => {
    const body = await request.json() as { message: string }
    
    // Mock SSE response
    const mockResponse = `data: {"token": "B"}

data: {"token": "ased"}

data: {"token": " on"}

data: {"token": " your"}

data: {"token": " question"}

data: {"token": " about"}

data: {"token": " '${body.message}'"}

data: {"bullets": ["Test bullet point 1", "Test bullet point 2"]}

data: {"sources": [{"name": "test-source.md", "preview": "Test source preview", "score": 0.9}]}

data: [DONE]
`
    
    return new HttpResponse(mockResponse, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }),
]

// Setup mock server
const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())