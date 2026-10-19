import { useCallback, useEffect, useRef, useState } from 'react';
import LoginForm from './components/LoginForm';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import * as api from './api/greenApi';

const CREDS_KEY = 'greenapi_credentials';

const STATE_LABELS = {
  authorized: 'Авторизован',
  notAuthorized: 'Не авторизован',
  blocked: 'Заблокирован',
  starting: 'Запускается',
  pendingPassword: 'Нужен 2FA-пароль',
  suspended: 'Ограничен'
};

export default function App() {
  const [credentials, setCredentials] = useState(() => {
    try {
      const raw = localStorage.getItem(CREDS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | online | error
  const [stateInstance, setStateInstance] = useState('');
  const [notice, setNotice] = useState('');


  const stopRef = useRef(false);
  const processedRef = useRef(new Set());

  useEffect(() => {
    if (credentials) {
      localStorage.setItem(CREDS_KEY, JSON.stringify(credentials));
    } else {
      localStorage.removeItem(CREDS_KEY);
    }
  }, [credentials]);

  useEffect(() => {
    if (!credentials) return undefined;

    api
      .setSettings(credentials)
      .catch((e) => console.warn('setSettings error:', e.message));

    api
      .getStateInstance(credentials)
      .then((r) => {
        if (r?.stateInstance) setStateInstance(r.stateInstance);
      })
      .catch((e) => console.warn('getStateInstance error:', e.message));

    return undefined;
  }, [credentials]);

  useEffect(() => {
    if (!credentials) return undefined;

    stopRef.current = false;
    processedRef.current = new Set();
    let sleepTimer = null;

    const sleep = (ms) =>
      new Promise((resolve) => {
        sleepTimer = setTimeout(resolve, ms);
      });

    const appendMessage = (chatId, msg, isOutgoingFromApi = false) => {
      setChats((prev) => {
        const existingChat = prev.find((c) => c.chatId === chatId);
        
        if (existingChat) {
          // проверяем, нет ли уже такого сообщения
          const isDuplicate = existingChat.messages.some((m) => m.id === msg.id);
          
          if (isDuplicate) {
            return prev.map((c) =>
              c.chatId === chatId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === msg.id ? { ...m, pending: false } : m
                    )
                  }
                : c
            );
          }

          return prev.map((c) =>
            c.chatId === chatId
              ? { ...c, messages: [...c.messages, msg] }
              : c
          );
        }
        
        // если чата еще нет в списке, создаем его
        return [
          ...prev,
          {
            chatId,
            name: '+' + chatId.replace(/\D/g, ''),
            messages: [msg]
          }
        ];
      });
    };

    const handleNotification = async (notification) => {
      const { receiptId, body } = notification;
      if (!body) {
        await api.deleteNotification(credentials, receiptId);
        return;
      }

      if (processedRef.current.has(receiptId)) {
        await api.deleteNotification(credentials, receiptId);
        return;
      }
      processedRef.current.add(receiptId);

      const type = body.typeWebhook;

      // входящие сообщения
      if (type === 'incomingMessageReceived') {
        if (body.messageData?.typeMessage === 'textMessage') {
          const chatId = body.senderData?.chatId;
          const text = body.messageData?.textMessageData?.textMessage;
          if (chatId && text) {
            appendMessage(chatId, {
              id: body.idMessage || `in-${receiptId}`,
              text,
              outgoing: false,
              timestamp: body.timestamp || Math.floor(Date.now() / 1000)
            });
          }
        }
      } 
      // исходящие сообщения 
      else if (type === 'outgoingAPIMessageReceived' || type === 'outgoingMessageReceived') {
        if (body.messageData?.typeMessage === 'textMessage') {
          const chatId = body.senderData?.chatId;
          const text = body.messageData?.textMessageData?.textMessage;
          if (chatId && text) {
            appendMessage(chatId, {
              id: body.idMessage || `out-${receiptId}`,
              text,
              outgoing: true,
              pending: false,
              timestamp: body.timestamp || Math.floor(Date.now() / 1000)
            }, true);
          }
        }
      } 
      // изменение статуса инстанса
      else if (type === 'stateInstanceChanged') {
        setStateInstance(body.stateInstance || '');
      }

      await api.deleteNotification(credentials, receiptId);
    };

    const loop = async () => {
      while (!stopRef.current) {
        try {
          const notification = await api.receiveNotification(credentials, 5);
          if (stopRef.current) break;

          setStatus('online');

          if (!notification) continue;

          await handleNotification(notification);
        } catch (err) {
          if (stopRef.current) break;
          console.error('Ошибка получения уведомления:', err.message);
          setStatus('error');
          await sleep(3000);
        }
      }
    };

    setStatus('online');
    loop();

    return () => {
      stopRef.current = true;
      if (sleepTimer) clearTimeout(sleepTimer);
    };
  }, [credentials]);

  const handleLogin = useCallback((creds) => {
    setChats([]);
    setActiveChatId(null);
    setNotice('');
    setCredentials(creds);
  }, []);

  const handleLogout = useCallback(() => {
    setCredentials(null);
    setChats([]);
    setActiveChatId(null);
    setStatus('idle');
    setStateInstance('');
    setNotice('');
  }, []);

  // создание чата
  const handleCreateChat = useCallback(
    async (input) => {
      if (!credentials) return;

      const trimmed = String(input || '').trim();
      if (!trimmed) return;

      setNotice('');

      try {
        let chatId;
        let displayName;

        if (trimmed.includes('@')) {
          chatId = trimmed;
          displayName = '+' + trimmed.split('@')[0].replace(/\D/g, '');
        } else {
          const digits = trimmed.replace(/\D/g, '');
          if (!digits) return;

          const account = await api.checkAccount(credentials, digits);
          if (!account?.exist) {
            setNotice('На этом номере не зарегистрирован аккаунт MAX');
            return;
          }
          chatId = account.chatId;
          displayName = '+' + digits;
        }

        setChats((prev) =>
          prev.find((c) => c.chatId === chatId)
            ? prev
            : [...prev, { chatId, name: displayName, messages: [] }]
        );
        setActiveChatId(chatId);
      } catch (err) {
        console.error('checkAccount error:', err.message);
        setNotice('Ошибка проверки аккаунта: ' + err.message);
      }
    },
    [credentials]
  );

  const handleSend = useCallback(
    async (text) => {
      if (!credentials || !activeChatId) return;
      const chatId = activeChatId;
      const tempId = `local-${Date.now()}`;
      const now = Math.floor(Date.now() / 1000);

      setChats((prev) =>
        prev.map((c) =>
          c.chatId === chatId
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  {
                    id: tempId,
                    text,
                    outgoing: true,
                    timestamp: now,
                    pending: true
                  }
                ]
              }
            : c
        )
      );

      try {
        const res = await api.sendMessage(credentials, chatId, text);

        setChats((prev) =>
          prev.map((c) =>
            c.chatId === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === tempId
                      ? { ...m, id: res.idMessage || tempId, pending: false }
                      : m
                  )
                }
              : c
          )
        );
      } catch (err) {
        console.error('Ошибка отправки:', err.message);
        setChats((prev) =>
          prev.map((c) =>
            c.chatId === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === tempId
                      ? { ...m, pending: false, error: true }
                      : m
                  )
                }
              : c
          )
        );
      }
    },
    [credentials, activeChatId]
  );

  if (!credentials) {
    return <LoginForm onSubmit={handleLogin} />;
  }

  const activeChat = chats.find((c) => c.chatId === activeChatId) || null;

  return (
    <div className="app">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelect={setActiveChatId}
        onCreate={handleCreateChat}
        onLogout={handleLogout}
        status={status}
        stateInstance={stateInstance}
        stateLabel={STATE_LABELS[stateInstance] || stateInstance}
        credentials={credentials}
        notice={notice}
        onClearNotice={() => setNotice('')}
      />
      {activeChat ? (
        <ChatWindow chat={activeChat} onSend={handleSend} />
      ) : (
        <div className="empty-state">
          <div className="empty-state__logo">M</div>
          <div className="empty-state__title">Выберите чат</div>
          <div className="empty-state__sub">
            или создайте новый, введя номер телефона слева
          </div>
        </div>
      )}
    </div>
  );
}