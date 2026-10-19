const API_URL = 'https://api.green-api.com';

/**
 * Собирает URL метода API.
 * Формат: {apiUrl}/waInstance{idInstance}/{method}/{apiTokenInstance}
 */
function buildUrl({ idInstance, apiTokenInstance }, method) {
  return `${API_URL}/waInstance${idInstance}/${method}/${apiTokenInstance}`;
}

async function parseResponse(res) {
  const raw = await res.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }
  if (!res.ok) {
    const msg =
      (data && (data.message || data.description || data.reason)) ||
      res.statusText ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/**
 * Настройка инстанса для получения уведомлений через HTTP API.
 * webhookUrl должен быть пустым.
 */
export async function setSettings(credentials) {
  const res = await fetch(buildUrl(credentials, 'setSettings'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      webhookUrl: '',
      outgoingWebhook: 'yes',
      stateWebhook: 'yes',
      incomingWebhook: 'yes',
      // ВАЖНО: включаем уведомления о сообщениях, отправленных через API
      outgoingAPIMessageWebhook: 'yes',
      outgoingMessageWebhook: 'yes'
    })
  });
  return parseResponse(res);
}

/**
 * Проверка существования аккаунта по номеру телефона.
 * Возвращает { exist, chatId }.
 */
export async function checkAccount(credentials, phoneNumber) {
  const res = await fetch(buildUrl(credentials, 'checkAccount'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: Number(phoneNumber) })
  });
  return parseResponse(res);
}

/**
 * Отправка текстового сообщения.
 * POST /waInstance{idInstance}/sendMessage/{apiTokenInstance}
 */
export async function sendMessage(credentials, chatId, message) {
  const res = await fetch(buildUrl(credentials, 'sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message })
  });
  return parseResponse(res);
}

/**
 * Получение одного входящего уведомления из очереди.
 * GET /waInstance{idInstance}/receiveNotification/{apiTokenInstance}?receiveTimeout=5
 * Возвращает null, если очередь пуста.
 */
export async function receiveNotification(credentials, receiveTimeout = 5) {
  const url = `${buildUrl(credentials, 'receiveNotification')}?receiveTimeout=${receiveTimeout}`;
  const res = await fetch(url, { method: 'GET' });
  return parseResponse(res);
}

/**
 * Удаление уведомления из очереди.
 * DELETE /waInstance{idInstance}/deleteNotification/{apiTokenInstance}/{receiptId}
 */
export async function deleteNotification(credentials, receiptId) {
  const url = `${buildUrl(credentials, 'deleteNotification')}/${receiptId}`;
  const res = await fetch(url, { method: 'DELETE' });
  return parseResponse(res);
}

/**
 * Получение текущего состояния инстанса.
 */
export async function getStateInstance(credentials) {
  const res = await fetch(buildUrl(credentials, 'getStateInstance'), {
    method: 'GET'
  });
  return parseResponse(res);
}