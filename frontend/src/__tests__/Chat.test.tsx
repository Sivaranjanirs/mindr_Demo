import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

describe('Chat Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends and displays messages correctly', async () => {
    const user = userEvent.setup()
    
    // Mock successful SSE response
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ 
          done: false, 
          value: new TextEncoder().encode('data: {"token": "Hello"}\n\n') 
        })
        .mockResolvedValueOnce({ 
          done: false, 
          value: new TextEncoder().encode('data: {"token": " there"}\n\n') 
        })
        .mockResolvedValueOnce({ 
          done: false, 
          value: new TextEncoder().encode('data: [DONE]\n\n') 
        })
        .mockResolvedValue({ done: true })
    }
    
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    })
    global.fetch = mockFetch
    
    render(<App />)
    
    const input = screen.getByPlaceholderText('Ask me anything about wellness and health...')
    const sendButton = screen.getByText('Send')
    
    // Send a message
    await user.type(input, 'Hello, how are you?')
    await user.click(sendButton)
    
    // Should show user message
    await waitFor(() => {
      expect(screen.getByText('Hello, how are you?')).toBeInTheDocument()
    })
    
    // Should show AI response
    await waitFor(() => {
      expect(screen.getByText('Hello there')).toBeInTheDocument()
    })
  })

  it('displays bullets and sources correctly', async () => {
    const user = userEvent.setup()
    
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ 
          done: false, 
          value: new TextEncoder().encode('data: {"token": "Here"}\n\n') 
        })
        .mockResolvedValueOnce({ 
          done: false, 
          value: new TextEncoder().encode('data: {"token": " are tips"}\n\n') 
        })
        .mockResolvedValueOnce({ 
          done: false, 
          value: new TextEncoder().encode('data: {"bullets": ["Tip 1: Sleep well", "Tip 2: Exercise daily"]}\n\n') 
        })
        .mockResolvedValueOnce({ 
          done: false, 
          value: new TextEncoder().encode('data: {"sources": [{"name": "sleep-tips.md", "preview": "Sleep is important", "score": 0.9}]}\n\n') 
        })
        .mockResolvedValueOnce({ 
          done: false, 
          value: new TextEncoder().encode('data: [DONE]\n\n') 
        })
        .mockResolvedValue({ done: true })
    }
    
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    })
    global.fetch = mockFetch
    
    render(<App />)
    
    const input = screen.getByPlaceholderText('Ask me anything about wellness and health...')
    
    // Send a health-related message
    await user.type(input, 'Give me sleep tips')
    await user.click(screen.getByText('Send'))
    
    // Should show response text
    await waitFor(() => {
      expect(screen.getByText('Here are tips')).toBeInTheDocument()
    })
    
    // Should show bullets
    await waitFor(() => {
      expect(screen.getByText('Tip 1: Sleep well')).toBeInTheDocument()
      expect(screen.getByText('Tip 2: Exercise daily')).toBeInTheDocument()
    })
    
    // Should show "Try this week" button
    await waitFor(() => {
      expect(screen.getByText('Try this week')).toBeInTheDocument()
    })
    
    // Should show sources
    await waitFor(() => {
      expect(screen.getByText('📄 sleep-tips')).toBeInTheDocument()
    })
  })

  it('handles source clicks correctly', async () => {
    const user = userEvent.setup()
    
    // Mock alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ 
          done: false, 
          value: new TextEncoder().encode('data: {"sources": [{"name": "test.md", "preview": "Test content", "score": 0.9}]}\n\n') 
        })
        .mockResolvedValueOnce({ 
          done: false, 
          value: new TextEncoder().encode('data: [DONE]\n\n') 
        })
        .mockResolvedValue({ done: true })
    }
    
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    })
    global.fetch = mockFetch
    
    render(<App />)
    
    const input = screen.getByPlaceholderText('Ask me anything about wellness and health...')
    
    await user.type(input, 'Test')
    await user.click(screen.getByText('Send'))
    
    // Wait for source to appear and click it
    await waitFor(() => {
      expect(screen.getByText('📄 test')).toBeInTheDocument()
    })
    
    await user.click(screen.getByText('📄 test'))
    
    // Should show alert with source content
    expect(alertSpy).toHaveBeenCalledWith('test.md:\n\nTest content')
    
    alertSpy.mockRestore()
  })

  it('clears input after sending message', async () => {
    const user = userEvent.setup()
    
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: () => Promise.resolve({ done: true })
        })
      }
    })
    global.fetch = mockFetch
    
    render(<App />)
    
    const input = screen.getByPlaceholderText('Ask me anything about wellness and health...')
    
    // Type and send message
    await user.type(input, 'Test message')
    expect(input).toHaveValue('Test message')
    
    await user.click(screen.getByText('Send'))
    
    // Input should be cleared
    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('handles long messages correctly', async () => {
    const user = userEvent.setup()
    
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: () => Promise.resolve({ done: true })
        })
      }
    })
    global.fetch = mockFetch
    
    render(<App />)
    
    const input = screen.getByPlaceholderText('Ask me anything about wellness and health...')
    const longMessage = 'This is a very long message that tests the input handling with lots of text. '.repeat(10)
    
    // Type long message
    await user.type(input, longMessage)
    await user.click(screen.getByText('Send'))
    
    // Should handle long messages without issues
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: longMessage })
      })
    )
  })

  it('prevents sending empty messages', async () => {
    const user = userEvent.setup()
    
    const mockFetch = vi.fn()
    global.fetch = mockFetch
    
    render(<App />)
    
    const sendButton = screen.getByText('Send')
    
    // Try to send empty message
    await user.click(sendButton)
    
    // Should not make API call
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('shows typing indicator while processing', async () => {
    const user = userEvent.setup()
    
    // Mock fetch with delayed response
    const mockFetch = vi.fn().mockImplementation(() => 
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            body: {
              getReader: () => ({
                read: () => Promise.resolve({ done: true })
              })
            }
          })
        }, 100)
      })
    )
    global.fetch = mockFetch
    
    render(<App />)
    
    const input = screen.getByPlaceholderText('Ask me anything about wellness and health...')
    
    await user.type(input, 'Test')
    await user.click(screen.getByText('Send'))
    
    // Should show typing indicator
    expect(screen.getByText('🤖')).toBeInTheDocument()
    
    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText('Send')).toBeInTheDocument()
    })
  })

  it('maintains message history correctly', async () => {
    const user = userEvent.setup()
    
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: () => Promise.resolve({ done: true })
        })
      }
    })
    global.fetch = mockFetch
    
    render(<App />)
    
    const input = screen.getByPlaceholderText('Ask me anything about wellness and health...')
    
    // Send first message
    await user.type(input, 'First message')
    await user.click(screen.getByText('Send'))
    
    await waitFor(() => {
      expect(screen.getByText('First message')).toBeInTheDocument()
    })
    
    // Send second message
    await user.type(input, 'Second message')
    await user.click(screen.getByText('Send'))
    
    await waitFor(() => {
      expect(screen.getByText('Second message')).toBeInTheDocument()
    })
    
    // Both messages should be visible
    expect(screen.getByText('First message')).toBeInTheDocument()
    expect(screen.getByText('Second message')).toBeInTheDocument()
  })
})