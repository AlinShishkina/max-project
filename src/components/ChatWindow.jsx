import { useEffect, useRef, useState } from 'react';

export default function ChatWindow({ chat, onSend }) {
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages.length, chat.chatId]);

  useEffect(() => {
    // Автоувеличение высоты textarea
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
  }, [text]);

  const submit = (e) => {
    e?.preventDefault();
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const initials = chat.name.replace(/\D/g, '').slice(-2) || '??';

  return (
    <section className="chat">
      <header className="chat__header">
        <div className="avatar avatar--lg">{initials}</div>
        <div className="chat__info">
          <div className="chat__title">{chat.name}</div>
          <div className="chat__sub">{chat.chatId}</div>
        </div>
      </header>

      <div className="messages" ref={listRef}>
        {chat.messages.length === 0 && (
          <div className="messages__empty">Напишите первое сообщение</div>
        )}

        {chat.messages.map((m) => (
          <div
            key={m.id}
            className={`msg ${m.outgoing ? 'msg--out' : 'msg--in'}`}
          >
            <div className="msg__bubble">
              <div className="msg__text">{m.text}</div>
              <div className="msg__meta">
                <span>{formatTime(m.timestamp)}</span>
                {m.outgoing && (
                  <span
                    className={`msg__check ${
                      m.error ? 'msg__check--err' : ''
                    }`}
                  >
                    {m.pending ? '⏳' : m.error ? '⚠' : '✓'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <form className="composer" onSubmit={submit}>
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Напишите сообщение..."
          rows={1}
          maxLength={4000}
        />
        <button
          type="submit"
          className="btn btn--send"
          disabled={!text.trim()}
          title="Отправить"
        >
          ➤
        </button>
      </form>
    </section>
  );
}