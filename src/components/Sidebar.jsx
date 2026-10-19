import { useState } from 'react';

export default function Sidebar({
  chats,
  activeChatId,
  onSelect,
  onCreate,
  onLogout,
  status,
  stateInstance,
  stateLabel,
  credentials,
  notice,
  onClearNotice
}) {
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!phone.trim() || busy) return;
    setBusy(true);
    try {
      await onCreate(phone);
      setPhone('');
    } finally {
      setBusy(false);
    }
  };

  const statusText =
    {
      online: 'Подключено',
      error: 'Ошибка соединения',
      idle: 'Ожидание'
    }[status] || 'Ожидание';

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div className="brand">
          <div className="brand__logo">M</div>
          <div className="brand__text">
            <div className="brand__name">MAX</div>
            <div className="brand__sub">GREEN-API</div>
          </div>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={onLogout}
          title="Выйти"
        >
          ⏻
        </button>
      </div>

      <form className="new-chat" onSubmit={submit}>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Номер получателя"
          inputMode="tel"
          disabled={busy}
        />
        <button
          type="submit"
          className="btn btn--accent"
          disabled={busy || !phone.trim()}
          title="Создать чат"
        >
          {busy ? '…' : '+'}
        </button>
      </form>

      {notice && (
        <div className="sidebar__notice" onClick={onClearNotice} role="alert">
          {notice}
        </div>
      )}

      <div className="chat-list">
        {chats.length === 0 && (
          <div className="chat-list__empty">
            Нет чатов. Введите номер телефона получателя и нажмите «+».
          </div>
        )}
        {chats.map((chat) => {
          const last = chat.messages[chat.messages.length - 1];
          const initials = chat.name.replace(/\D/g, '').slice(-2) || '??';
          return (
            <button
              key={chat.chatId}
              type="button"
              className={`chat-item ${
                chat.chatId === activeChatId ? 'chat-item--active' : ''
              }`}
              onClick={() => onSelect(chat.chatId)}
            >
              <div className="avatar">{initials}</div>
              <div className="chat-item__body">
                <div className="chat-item__title">{chat.name}</div>
                <div className="chat-item__preview">
                  {last ? last.text : 'Нет сообщений'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="sidebar__footer">
        <span className={`status-dot status-dot--${status}`} />
        <span className="sidebar__status">{statusText}</span>
        <span
          className={`sidebar__state ${
            stateInstance === 'authorized' ? 'is-ok' : 'is-warn'
          }`}
          title="Состояние инстанса"
        >
          {stateLabel || '—'}
        </span>
        <span className="sidebar__instance">ID: {credentials.idInstance}</span>
      </div>
    </aside>
  );
}