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
// /extensions/<publisher>/<name>/<endpoint>.
// The publisher/name values here MUST match extension.json exactly.
const EXTENSION_API_PREFIX = '/extensions/my-org/dashboard-chatbot';

const API_BASE_URL =
  (typeof window !== 'undefined' &&
    (window as Window & { CHATBOT_API_URL?: string }).CHATBOT_API_URL) ||
  EXTENSION_API_PREFIX;

const ui = {
  color: {
    primary: '#111827',
    primarySoft: '#1f2937',
    surface: '#ffffff',
    surfaceMuted: '#f8fafc',
    border: '#e5e7eb',
    text: '#111827',
    textMuted: '#6b7280',
    textSubtle: '#9ca3af',
    white: '#ffffff',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#dc2626',
    dangerBg: '#fef2f2',
    assistantBubble: '#f3f4f6',
    disabled: '#d1d5db',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
  },
  shadow: {
    floating: '0 18px 50px rgba(15, 23, 42, 0.22)',
    button: '0 10px 24px rgba(15, 23, 42, 0.24)',
    soft: '0 4px 14px rgba(15, 23, 42, 0.08)',
  },
  font:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const styles: Record<string, React.CSSProperties> = {
  collapsedButton: {
    position: 'fixed',
    bottom: 20,
    right: 20,
    width: 52,
    height: 52,
    background: ui.color.primary,
    borderRadius: ui.radius.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: ui.shadow.button,
    zIndex: 9999,
    border: `1px solid ${ui.color.primarySoft}`,
    transition: 'transform 160ms ease, box-shadow 160ms ease',
  },

  panel: {
    position: 'fixed',
    bottom: 20,
    right: 20,
    width: 360,
    height: 520,
    background: ui.color.surface,
    borderRadius: ui.radius.lg,
    boxShadow: ui.shadow.floating,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: ui.font,
    zIndex: 9999,
    overflow: 'hidden',
    border: `1px solid ${ui.color.border}`,
  },

  header: {
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background:
      'linear-gradient(135deg, #111827 0%, #1f2937 55%, #374151 100%)',
    color: ui.color.white,
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },

  avatar: {
    width: 30,
    height: 30,
    borderRadius: ui.radius.full,
    background: 'rgba(255, 255, 255, 0.12)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  titleWrap: {
    minWidth: 0,
  },

  title: {
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.25,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  subtitle: {
    marginTop: 2,
    fontSize: 11,
    opacity: 0.72,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },

  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },

  messages: {
    flex: 1,
    overflow: 'auto',
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    background:
      'linear-gradient(180deg, #ffffff 0%, #ffffff 60%, #f8fafc 100%)',
  },

  emptyState: {
    margin: 'auto',
    width: '100%',
    textAlign: 'center',
    color: ui.color.textMuted,
    padding: '28px 18px',
    border: `1px dashed ${ui.color.border}`,
    borderRadius: ui.radius.lg,
    background: ui.color.surfaceMuted,
  },

  emptyIcon: {
    width: 34,
    height: 34,
    margin: '0 auto 10px',
    borderRadius: ui.radius.full,
    background: ui.color.primary,
    color: ui.color.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: ui.shadow.soft,
  },

  emptyTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: ui.color.text,
  },

  emptyText: {
    margin: '6px 0 0',
    fontSize: 12,
    lineHeight: 1.45,
  },

  inputBar: {
    padding: 12,
    borderTop: `1px solid ${ui.color.border}`,
    display: 'flex',
    gap: 8,
    background: ui.color.surface,
  },

  input: {
    flex: 1,
    minWidth: 0,
    padding: '10px 12px',
    border: `1px solid ${ui.color.border}`,
    borderRadius: ui.radius.full,
    fontSize: 13,
    outline: 'none',
    background: ui.color.surfaceMuted,
    color: ui.color.text,
  },

  sendButton: {
    width: 38,
    height: 38,
    border: 'none',
    borderRadius: ui.radius.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: ui.color.white,
    flexShrink: 0,
    transition: 'transform 120ms ease, background 120ms ease',
  },
};

// Superset's Flask-AppBuilder endpoints are CSRF-protected.
// The token is rendered into the host page as a <meta name="csrf-token"> tag
// or exposed on window.csrf_token. Fall back to csrf_access_token cookie.
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

function createMessage(
  role: Message['role'],
  content: string,
  error = false,
): Message {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    timestamp: new Date(),
    error,
  };
}

function getIconButtonStyle(): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: ui.radius.full,
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: ui.color.white,
    background: 'rgba(255, 255, 255, 0.12)',
    opacity: 0.92,
  };
}

function ChatIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 14.5a2.5 2.5 0 0 1-2.5 2.5H8l-5 4V5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5z" />
    </svg>
  );
}

function SendIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function CloseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function TrashIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 15h10l1-15" />
    </svg>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: ui.radius.full,
        background: active ? ui.color.warning : ui.color.success,
        boxShadow: `0 0 0 3px ${
          active ? 'rgba(245, 158, 11, 0.18)' : 'rgba(34, 197, 94, 0.18)'
        }`,
      }}
    />
  );
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      style={getIconButtonStyle()}
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>
        <ChatIcon size={15} />
      </div>

      <p style={styles.emptyTitle}>Ask about this dashboard</p>

      <p style={styles.emptyText}>
        Try “Show sales trends”, “What changed this month?”, or “Which product
        is performing best?”
      </p>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '86%',
        padding: '9px 12px',
        borderRadius: isUser
          ? '16px 16px 5px 16px'
          : '16px 16px 16px 5px',
        background: message.error
          ? ui.color.dangerBg
          : isUser
          ? ui.color.primary
          : ui.color.assistantBubble,
        color: isUser
          ? ui.color.white
          : message.error
          ? ui.color.danger
          : ui.color.text,
        fontSize: 13,
        lineHeight: 1.45,
        wordBreak: 'break-word',
        boxShadow: isUser ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      {message.content}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div
      style={{
        alignSelf: 'flex-start',
        padding: '10px 12px',
        background: ui.color.assistantBubble,
        borderRadius: '16px 16px 16px 5px',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
      }}
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          style={{
            width: 5,
            height: 5,
            borderRadius: ui.radius.full,
            background: ui.color.textSubtle,
            animation: `chatbotPulse 1.2s ease-in-out ${
              index * 0.16
            }s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function ChatbotUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canSend = input.trim().length > 0 && !isLoading;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  const sendMessage = async () => {
    const question = input.trim();

    if (!question || isLoading) return;

    setMessages((prev) => [...prev, createMessage('user', question)]);
    setInput('');
    setIsLoading(true);

    try {
      const csrfToken = getCsrfToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      const response = await fetch(`${API_BASE_URL}/ask`, {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // superset_core's RestApi.response() wraps payloads as { result: ... };
      // the older Blueprint scaffolding returned the answer at the top level,
      // so accept either shape to stay compatible with both runtimes.
      const raw = (await response.json()) as
        | ChatResponse
        | { result?: ChatResponse };

      const data: ChatResponse =
        'result' in raw && raw.result ? raw.result : (raw as ChatResponse);

      setMessages((prev) => [...prev, createMessage('assistant', data.answer)]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        createMessage(
          'assistant',
          error instanceof Error ? error.message : 'Failed to get response',
          true,
        ),
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    inputRef.current?.focus();
  };

  if (!isExpanded) {
    return (
      <button
        type="button"
        style={styles.collapsedButton}
        onClick={() => setIsExpanded(true)}
        title="Open dashboard assistant"
        aria-label="Open dashboard assistant"
      >
        <span style={{ color: ui.color.white, display: 'flex' }}>
          <ChatIcon size={16} />
        </span>
      </button>
    );
  }

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.avatar}>
            <ChatIcon size={14} />
          </div>

          <div style={styles.titleWrap}>
            <div style={styles.title}>Dashboard Assistant</div>
            <div style={styles.subtitle}>
              <StatusDot active={isLoading} />
              {isLoading ? 'Thinking…' : 'Ready to help'}
            </div>
          </div>
        </div>

        <div style={styles.headerActions}>
          <IconButton title="Clear chat" onClick={clearChat}>
            <TrashIcon />
          </IconButton>

          <IconButton title="Close" onClick={() => setIsExpanded(false)}>
            <CloseIcon />
          </IconButton>
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messages}>
        {messages.length === 0 && !isLoading && <EmptyState />}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={styles.inputBar}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setInput(e.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder="Ask a dashboard question..."
          disabled={isLoading}
          style={{
            ...styles.input,
            cursor: isLoading ? 'not-allowed' : 'text',
            opacity: isLoading ? 0.7 : 1,
          }}
        />

        <button
          type="button"
          onClick={sendMessage}
          disabled={!canSend}
          title="Send message"
          aria-label="Send message"
          style={{
            ...styles.sendButton,
            background: canSend ? ui.color.primary : ui.color.disabled,
            cursor: canSend ? 'pointer' : 'not-allowed',
          }}
        >
          <SendIcon size={14} />
        </button>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes chatbotPulse {
          0%, 100% {
            opacity: 0.35;
            transform: translateY(0) scale(0.88);
          }

          50% {
            opacity: 1;
            transform: translateY(-2px) scale(1);
          }
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
// load, plus a default-export activate function.
export default function activate(): void {
  mount();
}

if (typeof window !== 'undefined') {
  try {
    mount();
  } catch (err) {
    // Never throw from a Module Federation container — the host will swallow
    // the error but the console trace is useful during development.
    // eslint-disable-next-line no-console
    console.error('[dashboard-chatbot] mount failed', err);
  }
}