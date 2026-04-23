import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  error?: boolean;
}

interface ChatResponse {
  answer: string;
  next_step?: string;
}

// API base URL - can be configured via window global or defaults to same-origin
const API_BASE_URL = (typeof window !== 'undefined' && (window as Window & { CHATBOT_API_URL?: string }).CHATBOT_API_URL) || '';

function ChatbotUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev: Message[]) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ChatResponse = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
      };
      setMessages((prev: Message[]) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Failed to get response',
        timestamp: new Date(),
        error: true,
      };
      setMessages((prev: Message[]) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    inputRef.current?.focus();
  };

  const containerStyle: React.CSSProperties = isExpanded
    ? {
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 380,
        height: 500,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        zIndex: 9999,
      }
    : {
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 60,
        height: 60,
        background: '#000',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        zIndex: 9999,
      };

  if (!isExpanded) {
    return (
      <div
        style={containerStyle}
        onClick={() => setIsExpanded(true)}
        title="Open Chat"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e8e8e8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#000',
          borderRadius: '12px 12px 0 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isLoading ? '#faad14' : '#52c41a',
            }}
          />
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
            Dashboard Assistant
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={clearChat}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 12,
              opacity: 0.8,
            }}
            title="Clear chat"
          >
            Clear
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
            }}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#888',
              padding: '40px 20px',
              fontSize: 14,
            }}
          >
            <p>👋 Hi! Ask me anything about your dashboard data.</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>
              Examples: "Show sales trends", "What’s the top product?"
            </p>
          </div>
        )}

        {messages.map((msg: Message) => (
          <div
            key={msg.id}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.error ? '#fff2f0' : msg.role === 'user' ? '#000' : '#f5f5f5',
              color: msg.role === 'user' ? '#fff' : msg.error ? '#cf1322' : '#333',
              fontSize: 13,
              lineHeight: 1.5,
              wordBreak: 'break-word',
            }}
          >
            {msg.content}
          </div>
        ))}

        {isLoading && (
          <div
            style={{
              alignSelf: 'flex-start',
              padding: '10px 14px',
              background: '#f5f5f5',
              borderRadius: '16px 16px 16px 4px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#999',
                animation: 'pulse 1.4s ease-in-out infinite',
              }}
            />
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#999',
                animation: 'pulse 1.4s ease-in-out 0.2s infinite',
              }}
            />
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#999',
                animation: 'pulse 1.4s ease-in-out 0.4s infinite',
              }}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #e8e8e8',
          display: 'flex',
          gap: 8,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '1px solid #d9d9d9',
            borderRadius: 20,
            fontSize: 13,
            outline: 'none',
            background: isLoading ? '#f5f5f5' : '#fff',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          style={{
            padding: '10px 16px',
            background: !input.trim() || isLoading ? '#d9d9d9' : '#000',
            color: '#fff',
            border: 'none',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 500,
            cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          Send
        </button>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export function mount(el: HTMLElement) {
  const root = createRoot(el);
  root.render(<ChatbotUI />);
}
