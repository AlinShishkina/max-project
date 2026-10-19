import { useState } from 'react';

export default function LoginForm({ onSubmit }) {
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setApiTokenInstance] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const id = idInstance.trim();
    const token = apiTokenInstance.trim();

    if (!id || !token) {
      setError('Заполните оба поля');
      return;
    }
    if (!/^\d+$/.test(id)) {
      setError('idInstance должен содержать только цифры');
      return;
    }
    setError('');
    onSubmit({ idInstance: id, apiTokenInstance: token });
  };

  return (
    <div className="login">
      <form className="login__card" onSubmit={submit}>
        <div className="login__logo">M</div>
        <h1 className="login__title">Вход в MAX</h1>
        <p className="login__sub">Введите учётные данные инстанса GREEN-API</p>

        <label className="field">
          <span>idInstance</span>
          <input
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value)}
            placeholder="3100000000"
            autoComplete="off"
            inputMode="numeric"
          />
        </label>

        <label className="field">
          <span>apiTokenInstance</span>
          <input
            value={apiTokenInstance}
            onChange={(e) => setApiTokenInstance(e.target.value)}
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
            type="password"
            autoComplete="off"
          />
        </label>

        {error && <div className="login__error">{error}</div>}

        <button type="submit" className="btn btn--accent btn--block">
          Войти
        </button>

        <p className="login__hint">
          Данные можно получить в личном кабинете{' '}
          <a
            href="https://console.green-api.com"
            target="_blank"
            rel="noreferrer"
          >
            console.green-api.com
          </a>
        </p>
      </form>
    </div>
  );
}