import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
// Superset 6.x ships React 17 as its host runtime and only shares the base
// `react-dom` module via Module Federation (not the `react-dom/client`
// subpath). React 17's react-dom has no `createRoot`, so importing from
// `react-dom/client` resolves to `undefined` at runtime and blows up the
// extension with `TypeError: (0 , s.H) is not a function`. Use the legacy
// `ReactDOM.render` API which is present on the shared singleton.
import * as ReactDOM from 'react-dom';

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

// Superset mounts extension backends at
// /extensions/<publisher>/<name>/<endpoint> (see superset_core's @api
// decorator, which derives the prefix from the extension manifest). The
// publisher/name values here MUST match extension.json exactly. A different
// deployment can override the prefix via window.CHATBOT_API_URL, e.g. when
// routing to a mock server during local dev.
const EXTENSION_API_PREFIX = '/extensions/my-org/dashboard-chatbot';
const API_BASE_URL =
  (typeof window !== 'undefined' &&
    (window as Window & { CHATBOT_API_URL?: string }).CHATBOT_API_URL) ||
  EXTENSION_API_PREFIX;

// Superset's Flask-AppBuilder endpoints are CSRF-protected. The token is
// rendered into the host page as a <meta name="csrf-token"> tag (Superset 6.x)
// or exposed on window.csrf_token. Fall back to reading the csrf_access_token
// cookie as a last resort.
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const meta = document.querySelector('meta[name="csrf-token"]');
  const metaToken = meta?.getAttribute('content');
  if (metaToken) return metaToken;
  const winToken = (window as Window & { csrf_token?: string }).csrf_token;
  if (winToken) return winToken;
  const cookieMatch = document.cookie.match(
    /(?:^|; )csrf_access_token=([^;]+)/,
  );
  return cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
}

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
      const csrfToken = getCsrfToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) headers['X-CSRFToken'] = csrfToken;

      const response = await fetch(`${API_BASE_URL}/ask`, {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // superset_core's RestApi.response() wraps payloads as {result: ...};
      // the older Blueprint scaffolding returned the answer at the top level,
      // so accept either shape to stay compatible with both runtimes.
      const raw = (await response.json()) as
        | ChatResponse
        | { result?: ChatResponse };
      const data: ChatResponse =
        'result' in raw && raw.result ? raw.result : (raw as ChatResponse);

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
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="1"
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
              borderRadius:
                msg.role === 'user'
                  ? '16px 16px 4px 16px'
                  : '16px 16px 16px 4px',
              background: msg.error
                ? '#fff2f0'
                : msg.role === 'user'
                ? '#000'
                : '#f5f5f5',
              color:
                msg.role === 'user' ? '#fff' : msg.error ? '#cf1322' : '#333',
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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setInput(e.target.value)
          }
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
            background:
              !input.trim() || isLoading ? '#d9d9d9' : '#000',
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

// Idempotent mount: append a floating root once, re-use it across re-activations.
const MOUNT_ID = 'my-org-dashboard-chatbot-root';

export function mount(target?: HTMLElement): void {
  if (typeof document === 'undefined') return;
  let el = target ?? document.getElementById(MOUNT_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = MOUNT_ID;
    document.body.appendChild(el);
  }
  ReactDOM.render(<ChatbotUI />, el);
}

// Superset's ExtensionsLoader calls `container.get('./index')` then invokes
// the returned factory with zero arguments. Calling factory() resolves the
// module; any registration must happen either as a module-level side effect
// or by re-invoking the default export. We expose both: top-level mount on
// load (side-effect registration), plus a default-export activate function
// so loaders that call `mod.default()` behave identically.
export default function activate(): void {
  mount();
}

if (typeof window !== 'undefined') {
  // Run registration at import time so Module Federation's factory() call
  // (which just executes the module body) wires up the UI without needing
  // the host to invoke a specific API method.
  try {
    mount();
  } catch (err) {
    // Never throw from a Module Federation container — the host will swallow
    // the error but the console trace is useful during development.
    // eslint-disable-next-line no-console
    console.error('[dashboard-chatbot] mount failed', err);
  }
}
