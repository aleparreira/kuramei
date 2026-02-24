import { useState, useRef, useEffect, type KeyboardEvent, type FormEvent } from 'react';

const USER_ID = 'simulator-dev';

interface Message {
  id: number;
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function linkifyText(text: string): React.ReactNode[] {
  const parts = text.split(/(https?:\/\/\S+)/g);
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#0a7cff', wordBreak: 'break-all' }}
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 4 }}>
      <div
        style={{
          background: '#fff',
          borderRadius: '8px 8px 8px 0',
          padding: '10px 14px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.13)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#90979c',
              display: 'inline-block',
              animation: `typing-dot 1.2s infinite ${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: Date.now(), role: 'user', text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: USER_ID, message: text }),
      });

      const data = (await res.json()) as { text?: string; error?: string };
      const replyText = data.text ?? data.error ?? '(resposta vazia)';

      const agentMsg: Message = {
        id: Date.now() + 1,
        role: 'agent',
        text: replyText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      const agentMsg: Message = {
        id: Date.now() + 1,
        role: 'agent',
        text: `Erro de conexão: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage();
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #111b21; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        @keyframes typing-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          maxWidth: 420,
          margin: '0 auto',
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          background: '#ECE5DD',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#075E54',
            color: '#fff',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#128C7E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            🤖
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Kuramei ✦</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Assistente pessoal</div>
          </div>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                margin: 'auto',
                padding: 20,
                background: 'rgba(255,255,255,0.7)',
                borderRadius: 8,
                textAlign: 'center',
                color: '#667781',
                fontSize: 14,
              }}
            >
              Diga olá para o Kuramei
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  marginBottom: 2,
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    background: isUser ? '#DCF8C6' : '#fff',
                    borderRadius: isUser ? '8px 8px 0 8px' : '8px 8px 8px 0',
                    padding: '6px 10px 18px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.13)',
                    position: 'relative',
                    fontSize: 14,
                    color: '#111b21',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {linkifyText(msg.text)}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      right: isUser ? 8 : undefined,
                      left: isUser ? undefined : 8,
                      fontSize: 11,
                      color: '#667781',
                    }}
                  >
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}

          {loading && <TypingIndicator />}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 8px',
            background: '#f0f2f5',
            flexShrink: 0,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem"
            disabled={loading}
            style={{
              flex: 1,
              border: 'none',
              borderRadius: 24,
              padding: '10px 16px',
              fontSize: 15,
              background: '#fff',
              outline: 'none',
              color: '#111b21',
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 'none',
              background: '#075E54',
              color: '#fff',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              opacity: input.trim() && !loading ? 1 : 0.5,
              flexShrink: 0,
            }}
          >
            &#9654;
          </button>
        </form>
      </div>
    </>
  );
}
