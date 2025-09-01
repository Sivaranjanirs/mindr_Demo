import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

describe('Health Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays health metrics correctly', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    // Navigate to health view
    await user.click(screen.getByText('Health'))
    
    // Should show health dashboard
    await waitFor(() => {
      expect(screen.getByText('System Health')).toBeInTheDocument()
    })
    
    // Should show loading initially, then metrics
    await waitFor(() => {
      expect(screen.getByText('OPERATIONAL')).toBeInTheDocument()
      expect(screen.getByText('Snippets: 66')).toBeInTheDocument()
      expect(screen.getByText('Files: 24')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', async () => {
    const user = userEvent.setup()
    
    // Mock delayed response
    const mockFetch = vi.fn().mockImplementation(() => 
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: () => Promise.resolve({
              ok: true,
              snippets: 66,
              files: 24,
              timestamp: Date.now(),
              version: "1.0.0",
              status: "operational",
              ops_truth: { health: { ok: true, snippets: 66 } },
              latency_report: "Test latency report",
              request_count: 5
            })
          })
        }, 100)
      })
    )
    global.fetch = mockFetch
    
    render(<App />)
    
    // Navigate to health view
    await user.click(screen.getByText('Health'))
    
    // Should show loading state
    expect(screen.getByText('Loading health metrics...')).toBeInTheDocument()
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('OPERATIONAL')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup()
    
    // Mock failed response
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    global.fetch = mockFetch
    
    render(<App />)
    
    // Navigate to health view
    await user.click(screen.getByText('Health'))
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch health data')).toBeInTheDocument()
    })
  })

  it('refreshes data every 5 seconds', async () => {
    const user = userEvent.setup()
    
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ok: true,
        snippets: 66,
        files: 24,
        timestamp: Date.now(),
        version: "1.0.0",
        status: "operational",
        ops_truth: { health: { ok: true, snippets: 66 } },
        latency_report: "Test latency report",
        request_count: 5
      })
    })
    global.fetch = mockFetch
    
    // Mock timers
    vi.useFakeTimers()
    
    render(<App />)
    
    // Navigate to health view
    await user.click(screen.getByText('Health'))
    
    // Initial call
    expect(mockFetch).toHaveBeenCalledTimes(1)
    
    // Fast-forward 5 seconds
    vi.advanceTimersByTime(5000)
    
    // Should make another call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
    
    vi.useRealTimers()
  })

  it('displays ops truth and latency report', async () => {
    const user = userEvent.setup()
    
    const mockHealthData = {
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
      latency_report: "Retrieve 7ms p50 / 79ms p95; total 1352ms p50 / 1536ms p95",
      request_count: 5
    }
    
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHealthData)
    })
    global.fetch = mockFetch
    
    render(<App />)
    
    // Navigate to health view
    await user.click(screen.getByText('Health'))
    
    // Should show ops truth section
    await waitFor(() => {
      expect(screen.getByText('📊 Ops Truth')).toBeInTheDocument()
      expect(screen.getByText('Health: {"ok":true,"snippets":66}')).toBeInTheDocument()
    })
    
    // Should show latency report section
    expect(screen.getByText('⚡ Latency Report')).toBeInTheDocument()
    expect(screen.getByText('Retrieve 7ms p50 / 79ms p95; total 1352ms p50 / 1536ms p95')).toBeInTheDocument()
    expect(screen.getByText('Based on 5 requests')).toBeInTheDocument()
  })

  it('shows correct status indicator for healthy system', async () => {
    const user = userEvent.setup()
    
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ok: true,
        snippets: 66,
        files: 24,
        timestamp: Date.now(),
        version: "1.0.0",
        status: "operational",
        ops_truth: { health: { ok: true, snippets: 66 } },
        latency_report: "Test latency report",
        request_count: 5
      })
    })
    global.fetch = mockFetch
    
    render(<App />)
    
    await user.click(screen.getByText('Health'))
    
    // Should show green checkmark for healthy system
    await waitFor(() => {
      expect(screen.getByText('✅')).toBeInTheDocument()
      expect(screen.getByText('OPERATIONAL')).toBeInTheDocument()
    })
  })

  it('shows correct status indicator for unhealthy system', async () => {
    const user = userEvent.setup()
    
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ok: false,
        snippets: 0,
        files: 0,
        timestamp: Date.now(),
        version: "1.0.0",
        status: "error",
        ops_truth: { health: { ok: false, snippets: 0 } },
        latency_report: "No data",
        request_count: 0
      })
    })
    global.fetch = mockFetch
    
    render(<App />)
    
    await user.click(screen.getByText('Health'))
    
    // Should show red X for unhealthy system
    await waitFor(() => {
      expect(screen.getByText('❌')).toBeInTheDocument()
      expect(screen.getByText('ERROR')).toBeInTheDocument()
    })
  })

  it('displays system info correctly', async () => {
    const user = userEvent.setup()
    
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ok: true,
        snippets: 42,
        files: 18,
        timestamp: 1640995200, // Fixed timestamp for testing
        version: "2.0.0",
        status: "operational",
        ops_truth: { health: { ok: true, snippets: 42 } },
        latency_report: "Test report",
        request_count: 10
      })
    })
    global.fetch = mockFetch
    
    render(<App />)
    
    await user.click(screen.getByText('Health'))
    
    // Should show system info
    await waitFor(() => {
      expect(screen.getByText('🔧 System Info')).toBeInTheDocument()
      expect(screen.getByText('Snippets: 42')).toBeInTheDocument()
      expect(screen.getByText('Files: 18')).toBeInTheDocument()
      expect(screen.getByText('Version: 2.0.0')).toBeInTheDocument()
    })
  })

  it('maintains consistent styling with chat view', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    // Check chat view styling
    expect(screen.getByText('🧠 Mindr')).toBeInTheDocument()
    
    // Navigate to health view
    await user.click(screen.getByText('Health'))
    
    // Should maintain same professional styling
    await waitFor(() => {
      expect(screen.getByText('System Health')).toBeInTheDocument()
    })
    
    // Should have consistent layout width
    const healthContainer = screen.getByText('System Health').closest('div')
    expect(healthContainer).toHaveStyle({ 
      background: 'rgb(248, 250, 252)' // Should match professional background
    })
  })

  it('cleans up intervals on unmount', async () => {
    const user = userEvent.setup()
    
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    
    render(<App />)
    
    // Navigate to health view to start interval
    await user.click(screen.getByText('Health'))
    
    // Navigate away to trigger cleanup
    await user.click(screen.getByText('Chat'))
    
    // Should clean up interval
    expect(clearIntervalSpy).toHaveBeenCalled()
    
    clearIntervalSpy.mockRestore()
  })
})