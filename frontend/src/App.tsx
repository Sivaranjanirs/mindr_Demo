import { useRef, useState, useEffect } from "react";

// Professional color palette
const professionalColors = {
  primary: "#2563EB",        // Professional blue
  secondary: "#1E40AF",      // Darker blue
  accent: "#F1F5F9",         // Light gray
  background: "#F8FAFC",     // Very light gray
  surface: "#FFFFFF",        // Pure white
  text: "#0F172A",           // Dark slate
  textLight: "#64748B",      // Medium slate
  textMuted: "#94A3B8",      // Light slate
  success: "#10B981",        // Professional green
  warning: "#F59E0B",        // Professional amber
  error: "#EF4444",          // Professional red
  border: "#E2E8F0",         // Border gray
  sidebarBg: "#1E293B",      // Dark sidebar
  sidebarText: "#F1F5F9",    // Light sidebar text
  gradient: "linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)",
  cardShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)"
};

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onClear: () => void;
  onReindex: () => void;
  isReindexing: boolean;
}

function Sidebar({ currentView, onNavigate, onClear, onReindex, isReindexing }: SidebarProps) {
  const menuItems = [
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'health', label: 'Health', icon: '⚡' },
  ];

  const actions = [
    { id: 'clear', label: 'Clear Chat', icon: '🗑️', action: onClear },
    { id: 'reindex', label: 'Reindex', icon: '🔄', action: onReindex, loading: isReindexing },
  ];

  return (
    <div style={{
      width: "240px",
      height: "100vh",
      background: professionalColors.sidebarBg,
      borderRight: `1px solid ${professionalColors.border}`,
      display: "flex",
      flexDirection: "column",
      position: "fixed",
      left: 0,
      top: 0,
      zIndex: 1000
    }}>
      {/* Logo/Header */}
      <div style={{
        padding: "24px 20px",
        borderBottom: `1px solid rgba(255, 255, 255, 0.1)`
      }}>
        <h1 style={{
          color: professionalColors.sidebarText,
          fontSize: "1.5rem",
          fontWeight: "600",
          margin: 0,
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          🧠 Mindr
        </h1>
        <p style={{
          color: professionalColors.textMuted,
          fontSize: "0.875rem",
          margin: "4px 0 0 0"
        }}>
          AI Wellness Coach
        </p>
      </div>

      {/* Navigation */}
      <div style={{ padding: "16px 0", flex: 1 }}>
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{
            color: professionalColors.textMuted,
            fontSize: "0.75rem",
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            margin: "0 0 8px 20px"
          }}>
            Navigation
          </h3>
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                width: "100%",
                padding: "12px 20px",
                background: currentView === item.id ? "rgba(37, 99, 235, 0.2)" : "transparent",
                color: currentView === item.id ? professionalColors.primary : professionalColors.sidebarText,
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "0.875rem",
                fontWeight: "500",
                transition: "all 0.2s ease",
                borderLeft: currentView === item.id ? `3px solid ${professionalColors.primary}` : "3px solid transparent"
              }}
              onMouseEnter={(e) => {
                if (currentView !== item.id) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (currentView !== item.id) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <span style={{ fontSize: "1rem" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div>
          <h3 style={{
            color: professionalColors.textMuted,
            fontSize: "0.75rem",
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            margin: "0 0 8px 20px"
          }}>
            Actions
          </h3>
          {actions.map(action => (
            <button
              key={action.id}
              onClick={action.action}
              disabled={action.loading}
              style={{
                width: "100%",
                padding: "12px 20px",
                background: "transparent",
                color: action.loading ? professionalColors.textMuted : professionalColors.sidebarText,
                border: "none",
                textAlign: "left",
                cursor: action.loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "0.875rem",
                fontWeight: "500",
                transition: "all 0.2s ease",
                opacity: action.loading ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!action.loading) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!action.loading) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <span style={{ fontSize: "1rem" }}>{action.icon}</span>
              {action.loading ? "Processing..." : action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "16px 20px",
        borderTop: `1px solid rgba(255, 255, 255, 0.1)`,
        fontSize: "0.75rem",
        color: professionalColors.textMuted,
        lineHeight: "1.4"
      }}>
        <div>Educational purposes only</div>
        <div>Not medical advice</div>
      </div>
    </div>
  );
}

function Health() {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch("http://localhost:8000/health");
        const data = await response.json();
        setHealthData(data);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch health data");
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      background: professionalColors.background,
      minHeight: "100vh",
      padding: "24px",
      display: "flex",
      justifyContent: "center"
    }}>
      <div style={{ maxWidth: "900px", width: "100%", minWidth: "0" }}>
        <div style={{ 
          background: professionalColors.surface,
          borderRadius: "8px",
          padding: "24px",
          boxShadow: professionalColors.cardShadow,
          border: `1px solid ${professionalColors.border}`,
          width: "100%",
          minWidth: "0"
        }}>
          <h1 style={{ 
            fontSize: "1.875rem",
            fontWeight: "600",
            color: professionalColors.text,
            margin: "0 0 24px 0",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span style={{ color: professionalColors.primary }}>⚡</span>
            System Health
          </h1>

          {loading && (
            <div style={{ textAlign: "center", color: professionalColors.textLight }}>
              Loading health metrics...
            </div>
          )}

          {error && (
            <div style={{ 
              background: "rgba(239, 68, 68, 0.1)",
              color: professionalColors.error,
              padding: "16px",
              borderRadius: "6px",
              border: `1px solid ${professionalColors.error}`,
              textAlign: "center"
            }}>
              {error}
            </div>
          )}

          {healthData && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Status Overview */}
              <div style={{
                background: healthData.ok ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${healthData.ok ? professionalColors.success : professionalColors.error}`,
                borderRadius: "6px",
                padding: "16px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>
                  {healthData.ok ? "✅" : "❌"}
                </div>
                <div style={{ 
                  fontSize: "1rem", 
                  fontWeight: "600",
                  color: healthData.ok ? professionalColors.success : professionalColors.error
                }}>
                  {healthData.status.toUpperCase()}
                </div>
              </div>

              {/* Ops Truth */}
              <div style={{
                background: professionalColors.surface,
                borderRadius: "6px",
                padding: "16px",
                border: `1px solid ${professionalColors.border}`
              }}>
                <h3 style={{ 
                  color: professionalColors.text, 
                  margin: "0 0 12px 0",
                  fontSize: "1rem",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <span style={{ color: professionalColors.primary }}>📊</span>
                  Ops Truth
                </h3>
                <div style={{ 
                  padding: "8px 12px",
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontSize: "0.875rem",
                  color: professionalColors.text,
                  background: professionalColors.accent,
                  borderRadius: "4px",
                  border: `1px solid ${professionalColors.border}`
                }}>
                  Health: {JSON.stringify(healthData.ops_truth?.health)}
                </div>
              </div>

              {/* Latency Report */}
              <div style={{
                background: professionalColors.surface,
                borderRadius: "6px",
                padding: "16px",
                border: `1px solid ${professionalColors.border}`
              }}>
                <h3 style={{ 
                  color: professionalColors.text, 
                  margin: "0 0 12px 0",
                  fontSize: "1rem",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <span style={{ color: professionalColors.primary }}>⚡</span>
                  Latency Report
                </h3>
                <div style={{ 
                  padding: "8px 12px",
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontSize: "0.875rem",
                  wordBreak: "break-all",
                  color: professionalColors.text,
                  background: professionalColors.accent,
                  borderRadius: "4px",
                  border: `1px solid ${professionalColors.border}`
                }}>
                  {healthData.latency_report}
                </div>
                <div style={{ 
                  marginTop: "8px",
                  fontSize: "0.875rem",
                  color: professionalColors.textMuted
                }}>
                  Based on {healthData.request_count} requests
                </div>
              </div>

              {/* System Info */}
              <div style={{
                background: professionalColors.surface,
                borderRadius: "6px",
                padding: "16px",
                border: `1px solid ${professionalColors.border}`
              }}>
                <h3 style={{ 
                  color: professionalColors.text, 
                  margin: "0 0 12px 0",
                  fontSize: "1rem",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <span style={{ color: professionalColors.primary }}>🔧</span>
                  System Info
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.875rem" }}>
                  <div>
                    <strong>Snippets:</strong> {healthData.snippets}
                  </div>
                  <div>
                    <strong>Files:</strong> {healthData.files}
                  </div>
                  <div>
                    <strong>Version:</strong> {healthData.version}
                  </div>
                  <div>
                    <strong>Timestamp:</strong> {new Date(healthData.timestamp * 1000).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chat() {
  type Source = { name: string; preview: string; score: number };
  type Msg = { role: "user" | "assistant"; text: string; sources?: Source[]; bullets?: string[] };
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  async function send() {
    const user = input.trim();
    if (!user) return;

    const userMsg = { role: "user" as const, text: user };
    const assistantMsg = { role: "assistant" as const, text: "" };
    setMsgs(m => [...m, userMsg, assistantMsg]);
    setInput("");
    setIsTyping(true);

    controllerRef.current?.abort();
    controllerRef.current = new AbortController();

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: user }),
        signal: controllerRef.current.signal
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let eventEnd;
        while ((eventEnd = buffer.indexOf('\n\n')) !== -1) {
          const event = buffer.slice(0, eventEnd);
          buffer = buffer.slice(eventEnd + 2);

          // Skip heartbeat comments (lines starting with ':')
          if (event.startsWith(':')) {
            continue;
          }

          if (event.startsWith('data: ')) {
            const payload = event.slice(6);
            
            if (payload === '[DONE]') {
              setIsTyping(false);
              reader.releaseLock();
              return;
            }
            try {
              const obj = JSON.parse(payload);

              if (obj.token !== undefined) {
                fullText += obj.token;
                setMsgs(m => {
                  const copy = [...m];
                  const last = copy[copy.length - 1];
                  if (last?.role === "assistant") {
                    last.text = fullText;
                  }
                  return copy;
                });
              } else if (obj.sources !== undefined) {
                setMsgs(m => {
                  const copy = [...m];
                  const last = copy[copy.length - 1];
                  if (last?.role === "assistant") last.sources = obj.sources;
                  return copy;
                });
              } else if (obj.bullets !== undefined) {
                setMsgs(m => {
                  const copy = [...m];
                  const last = copy[copy.length - 1];
                  if (last?.role === "assistant") last.bullets = obj.bullets;
                  return copy;
                });
              }
            } catch (e) {
              console.warn("Failed to parse SSE payload:", payload, e);
            }
          }
        }
      }
    } catch (error) {
      // Don't log aborted requests as errors - they're intentional user actions
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("Stream stopped by user");
      } else {
        console.error("Stream error:", error);
      }
      setIsTyping(false);
    }
  }

  // Reindex and clear functions are handled by the parent component

  return (
    <div style={{ 
      background: professionalColors.background,
      minHeight: "100vh",
      padding: "24px",
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      display: "flex",
      justifyContent: "center"
    }}>
      <div style={{ maxWidth: "900px", width: "100%", minWidth: "0" }}>
        {/* Main Chat Area */}
        <div style={{ 
          background: professionalColors.surface,
          borderRadius: "8px",
          border: `1px solid ${professionalColors.border}`,
          boxShadow: professionalColors.cardShadow,
          height: "calc(100vh - 48px)",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          minWidth: "0"
        }}>
          {/* Header */}
          <div style={{
            padding: "16px 24px",
            borderBottom: `1px solid ${professionalColors.border}`,
            background: professionalColors.surface
          }}>
            <h1 style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              color: professionalColors.text,
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span style={{ color: professionalColors.primary }}>🧠</span>
              Mindr AI Assistant
            </h1>
          </div>

          {/* Messages Container */}
          <div style={{ 
            flex: 1,
            padding: "24px",
            overflow: "auto",
            background: professionalColors.accent,
            width: "100%",
            minWidth: "0"
          }}>
            {msgs.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "60px 20px",
                color: professionalColors.textLight
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🌱</div>
                <h3 style={{ 
                  fontSize: "1.25rem", 
                  fontWeight: "600", 
                  margin: "0 0 8px 0",
                  color: professionalColors.text
                }}>Welcome to Mindr</h3>
                <p style={{ fontSize: "1rem", lineHeight: "1.6", margin: "0 0 24px 0" }}>
                  Your AI wellness companion. Ask me about sleep, nutrition, exercise, stress management, or any health-related topics.
                </p>
                <div style={{ 
                  display: "flex", 
                  gap: "8px", 
                  justifyContent: "center", 
                  flexWrap: "wrap"
                }}>
                  {["Sleep tips", "Healthy eating", "Exercise routines", "Stress relief"].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(suggestion)}
                      style={{
                        padding: "8px 16px",
                        background: professionalColors.surface,
                        border: `1px solid ${professionalColors.border}`,
                        borderRadius: "20px",
                        color: professionalColors.text,
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        transition: "all 0.2s ease"
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = professionalColors.primary;
                        e.currentTarget.style.color = "white";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = professionalColors.surface;
                        e.currentTarget.style.color = professionalColors.text;
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              msgs.map((m, i) => (
                <div key={i} style={{ marginBottom: "24px" }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                    marginBottom: "8px"
                  }}>
                    <div style={{ 
                      maxWidth: "80%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      background: m.role === "user" 
                        ? professionalColors.primary
                        : professionalColors.surface,
                      color: m.role === "user" ? "white" : professionalColors.text,
                      boxShadow: professionalColors.cardShadow,
                      border: m.role === "assistant" ? `1px solid ${professionalColors.border}` : "none"
                    }}>
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        marginBottom: m.text ? "8px" : "0",
                        fontSize: "0.875rem",
                        fontWeight: "600"
                      }}>
                        <span style={{ marginRight: "6px" }}>
                          {m.role === "user" ? "👤" : "🤖"}
                        </span>
                        {m.role === "user" ? "You" : "Mindr"}
                      </div>
                      {m.text && (
                        <div style={{ 
                          whiteSpace: "pre-wrap",
                          lineHeight: "1.6",
                          fontSize: "0.875rem"
                        }}>
                          {m.text}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bullets */}
                  {m.role === "assistant" && m.bullets?.length ? (
                    <div style={{ 
                      marginTop: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px"
                    }}>
                      {m.bullets.map((bullet, idx) => (
                        <div key={idx} style={{ 
                          display: "flex", 
                          alignItems: "flex-start",
                          padding: "12px 16px",
                          background: professionalColors.surface,
                          borderRadius: "6px",
                          boxShadow: professionalColors.cardShadow,
                          border: `1px solid ${professionalColors.border}`
                        }}>
                          <span style={{ 
                            fontSize: "1rem",
                            marginRight: "8px",
                            color: professionalColors.primary,
                            fontWeight: "bold"
                          }}>
                            •
                          </span>
                          <span style={{ 
                            fontSize: "0.875rem",
                            lineHeight: "1.5",
                            color: professionalColors.text
                          }}>
                            {bullet}
                          </span>
                        </div>
                      ))}
                      {/* Try this week button */}
                      <div style={{
                        textAlign: "center",
                        marginTop: "8px"
                      }}>
                        <button style={{
                          background: professionalColors.primary,
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          padding: "8px 16px",
                          fontSize: "0.875rem",
                          fontWeight: "500",
                          cursor: "pointer",
                          transition: "background-color 0.2s ease"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = professionalColors.secondary;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = professionalColors.primary;
                        }}>
                          Try this week
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Sources */}
                  {m.role === "assistant" && m.sources?.length ? (
                    <div style={{ 
                      marginTop: "8px", 
                      display: "flex", 
                      gap: "6px", 
                      flexWrap: "wrap",
                      justifyContent: "flex-start"
                    }}>
                      {m.sources.map((source, idx) => (
                        <button key={idx}
                          onClick={() => {
                            const sourceName = typeof source === 'string' ? source : source.name;
                            if (typeof source === 'object' && source.preview) {
                              alert(`${sourceName}:\n\n${source.preview}`);
                            }
                          }}
                          style={{ 
                            fontSize: "0.75rem",
                            padding: "4px 8px",
                            background: professionalColors.accent,
                            color: professionalColors.textLight,
                            border: `1px solid ${professionalColors.border}`,
                            borderRadius: "12px",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = professionalColors.primary;
                            e.currentTarget.style.color = "white";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = professionalColors.accent;
                            e.currentTarget.style.color = professionalColors.textLight;
                          }}>
                          📄 {typeof source === 'string' ? source : source.name.replace('.md', '')}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
            
            {/* Typing indicator */}
            {isTyping && (
              <div style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 16px",
                background: professionalColors.surface,
                borderRadius: "8px",
                marginBottom: "16px",
                border: `1px solid ${professionalColors.border}`
              }}>
                <span style={{ fontSize: "1rem", marginRight: "8px" }}>🤖</span>
                <span style={{ fontWeight: "600", fontSize: "0.875rem", marginRight: "12px" }}>Mindr</span>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: professionalColors.primary,
                      animation: `pulse 1.5s ease-in-out infinite ${i * 0.2}s`
                    }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div style={{ 
            padding: "16px 24px",
            borderTop: `1px solid ${professionalColors.border}`,
            background: professionalColors.surface
          }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <input 
                value={input} 
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && send()}
                placeholder="Ask me anything about wellness and health..."
                style={{ 
                  flex: 1,
                  padding: "12px 16px",
                  fontSize: "0.875rem",
                  border: `1px solid ${professionalColors.border}`,
                  borderRadius: "6px",
                  background: professionalColors.surface,
                  color: professionalColors.text,
                  outline: "none",
                  transition: "border-color 0.2s ease"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = professionalColors.primary;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = professionalColors.border;
                }}
              />
              {isTyping ? (
                <button 
                  onClick={() => {
                    controllerRef.current?.abort();
                    setIsTyping(false);
                  }}
                  style={{ 
                    padding: "12px 24px",
                    background: professionalColors.error,
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "500",
                    fontSize: "0.875rem",
                    transition: "background-color 0.2s ease"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#DC2626"; // Darker red
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = professionalColors.error;
                  }}
                >
                  ⏹️ Stop
                </button>
              ) : (
                <button 
                  onClick={send}
                  disabled={!input.trim()}
                  style={{ 
                    padding: "12px 24px",
                    background: !input.trim() ? professionalColors.textMuted : professionalColors.primary,
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: !input.trim() ? "not-allowed" : "pointer",
                    fontWeight: "500",
                    fontSize: "0.875rem",
                    transition: "background-color 0.2s ease"
                  }}
                  onMouseOver={(e) => {
                    if (input.trim()) {
                      e.currentTarget.style.backgroundColor = professionalColors.secondary;
                    }
                  }}
                  onMouseOut={(e) => {
                    if (input.trim()) {
                      e.currentTarget.style.backgroundColor = professionalColors.primary;
                    }
                  }}
                >
                  Send
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState('chat');
  const [isReindexing, setIsReindexing] = useState(false);

  const handleClear = () => {
    if (confirm("Are you sure you want to clear the conversation?")) {
      window.location.reload();
    }
  };

  const handleReindex = async () => {
    setIsReindexing(true);
    
    const endpoints = [
      "http://localhost:8000/reindex",
      "http://localhost:8000/api/reindex", 
      "http://localhost:8000/admin/reindex"
    ];
    
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });
        
        if (res.ok) {
          alert("Reindexing completed successfully!");
          setIsReindexing(false);
          return;
        } else if (res.status !== 404) {
          const responseText = await res.text();
          alert(`Reindexing failed (${res.status}): ${responseText}`);
          setIsReindexing(false);
          return;
        }
      } catch (error) {
        console.error(`Error with ${endpoint}:`, error);
      }
    }
    
    alert("Reindex endpoint not found. Check backend implementation.");
    setIsReindexing(false);
  };

  return (
    <div style={{ 
      display: "flex", 
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      background: professionalColors.background,
      minHeight: "100vh"
    }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
      `}</style>

      <Sidebar 
        currentView={currentView}
        onNavigate={setCurrentView}
        onClear={handleClear}
        onReindex={handleReindex}
        isReindexing={isReindexing}
      />
      
      <div style={{ 
        marginLeft: "240px", 
        flex: 1, 
        width: "calc(100vw - 240px)",
        maxWidth: "calc(100vw - 240px)",
        overflow: "hidden"
      }}>
        {currentView === 'chat' && <Chat />}
        {currentView === 'health' && <Health />}
      </div>
    </div>
  );
}