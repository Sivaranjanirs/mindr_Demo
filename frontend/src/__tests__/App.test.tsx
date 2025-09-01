import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

// Mock fetch for SSE
global.fetch = vi.fn()

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the application with sidebar and chat view', async () => {
    render(<App />)
    
    // Check sidebar elements
    expect(screen.getByText('🧠 Mindr')).toBeInTheDocument()
    expect(screen.getByText('AI Wellness Coach')).toBeInTheDocument()
    expect(screen.getByText('Chat')).toBeInTheDocument()
    expect(screen.getByText('Health')).toBeInTheDocument()
    
    // Check chat interface
    expect(screen.getByText('Welcome to Mindr')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ask me anything about wellness and health...')).toBeInTheDocument()
  })

  it('switches between chat and health views', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    // Initially on chat view
    expect(screen.getByText('Welcome to Mindr')).toBeInTheDocument()
    
    // Click health button
    await user.click(screen.getByText('Health'))
    
    // Should show health view
    await waitFor(() => {
      expect(screen.getByText('System Health')).toBeInTheDocument()
    })
    
    // Click chat button to go back
    await user.click(screen.getByText('Chat'))
    
    // Should show chat view again
    await waitFor(() => {
      expect(screen.getByText('Welcome to Mindr')).toBeInTheDocument()
    })
  })

  it('handles sidebar actions', async () => {
    const user = userEvent.setup()
    
    // Mock window.confirm for clear action
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => {})
    
    render(<App />)
    
    // Test clear action
    await user.click(screen.getByText('Clear Chat'))
    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to clear the conversation?')
    expect(reloadSpy).toHaveBeenCalled()
    
    confirmSpy.mockRestore()
    reloadSpy.mockRestore()
  })

  it('displays suggestion buttons on empty chat', async () => {
    render(<App />)
    
    // Check suggestion buttons are present
    expect(screen.getByText('Sleep tips')).toBeInTheDocument()
    expect(screen.getByText('Healthy eating')).toBeInTheDocument()
    expect(screen.getByText('Exercise routines')).toBeInTheDocument()
    expect(screen.getByText('Stress relief')).toBeInTheDocument()
  })

  it('handles suggestion button clicks', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    const input = screen.getByPlaceholderText('Ask me anything about wellness and health...')
    
    // Click sleep tips suggestion
    await user.click(screen.getByText('Sleep tips'))
    
    // Input should be filled with suggestion
    expect(input).toHaveValue('Sleep tips')
  })

  it('validates input before sending', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    const sendButton = screen.getByText('Send')
    
    // Send button should be disabled when input is empty
    expect(sendButton).toBeDisabled()
    
    // Type something
    const input = screen.getByPlaceholderText('Ask me anything about wellness and health...')
    await user.type(input, 'Test message')
    
    // Send button should be enabled
    expect(sendButton).not.toBeDisabled()
  })

  it('shows typing indicator during message processing', async () => {
    const user = userEvent.setup()
    
    // Mock fetch to delay response
    const mockFetch = vi.fn().mockImplementation(() => 
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            body: {
              getReader: () => ({
                read: () => Promise.resolve({ done: true, value: undefined })
              })
            }
          })
        }, 100)
      })
    )
    global.fetch = mockFetch
    
    render(<App />)
    
    const input = screen.getByPlaceholderText('Ask me anything about wellness and health...')
    const sendButton = screen.getByText('Send')
    
    // Type and send message
    await user.type(input, 'Test message')
    await user.click(sendButton)
    
    // Should show typing indicator
    expect(screen.getByText('⏳ Thinking...')).toBeInTheDocument()
  })

  it('displays error state gracefully', async () => {
    const user = userEvent.setup()
    
    // Mock fetch to reject
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    global.fetch = mockFetch
    
    render(<App />)
    
    const input = screen.getByPlaceholderText('Ask me anything about wellness and health...')
    const sendButton = screen.getByText('Send')
    
    // Type and send message
    await user.type(input, 'Test message')
    await user.click(sendButton)
    
    // Should handle error gracefully (no crash)
    await waitFor(() => {
      expect(screen.getByText('Send')).toBeInTheDocument()
    })
  })

  it('handles Enter key for sending messages', async () => {
    const user = userEvent.setup()
    
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: () => Promise.resolve({ done: true, value: undefined })
        })
      }
    })
    global.fetch = mockFetch
    
    render(<App />)
    
    const input = screen.getByPlaceholderText('Ask me anything about wellness and health...')
    
    // Type message and press Enter
    await user.type(input, 'Test message{enter}')
    
    // Should trigger fetch
    expect(mockFetch).toHaveBeenCalled()
  })

  it('maintains professional styling and layout', () => {
    render(<App />)
    
    // Check that professional color scheme is applied
    const sidebar = screen.getByText('🧠 Mindr').closest('div')
    expect(sidebar).toHaveStyle({ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" })
    
    // Check layout structure
    expect(screen.getByText('Navigation')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
  })
})