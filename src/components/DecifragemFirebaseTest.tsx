import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { ref, set, onValue, remove } from 'firebase/database';

type Status = 'idle' | 'writing' | 'reading' | 'ok' | 'error';

export function DecifragemFirebaseTest() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [readValue, setReadValue] = useState<string | null>(null);

  async function runTest() {
    setStatus('writing');
    setMessage('');
    setReadValue(null);

    const testRef = ref(db, '_test/ping');

    try {
      await set(testRef, { value: 'pong', ts: Date.now() });
      setStatus('reading');

      onValue(testRef, (snapshot) => {
        const data = snapshot.val();
        if (data?.value === 'pong') {
          setReadValue(JSON.stringify(data, null, 2));
          setStatus('ok');
          remove(testRef);
        } else {
          setStatus('error');
          setMessage('Valor lido não bate com o esperado.');
        }
      }, { onlyOnce: true });
    } catch (e: any) {
      setStatus('error');
      setMessage(e.message ?? 'Erro desconhecido');
    }
  }

  const colors: Record<Status, string> = {
    idle: '#a8adbf',
    writing: '#facc15',
    reading: '#60a5fa',
    ok: '#4ade80',
    error: '#f87171',
  };

  const labels: Record<Status, string> = {
    idle: 'Aguardando teste',
    writing: 'Escrevendo no Realtime DB...',
    reading: 'Lendo de volta...',
    ok: 'Conexão OK!',
    error: 'Erro',
  };

  return (
    <div style={{
      maxWidth: 480,
      margin: '2rem auto',
      padding: '1.5rem',
      background: '#1a1f38',
      borderRadius: 12,
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#e8e9f2',
    }}>
      <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700 }}>
        Teste — Firebase Realtime Database
      </h2>

      <div style={{
        marginBottom: '1rem',
        padding: '0.75rem 1rem',
        background: '#0a0b12',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
      }}>
        <span style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: colors[status],
          flexShrink: 0,
        }} />
        <span style={{ color: colors[status], fontWeight: 600 }}>{labels[status]}</span>
      </div>

      {readValue && (
        <pre style={{
          margin: '0 0 1rem',
          padding: '0.75rem',
          background: '#0a0b12',
          borderRadius: 8,
          fontSize: '0.8rem',
          color: '#4ade80',
          overflowX: 'auto',
        }}>{readValue}</pre>
      )}

      {message && (
        <p style={{ margin: '0 0 1rem', color: '#f87171', fontSize: '0.875rem' }}>{message}</p>
      )}

      <button
        onClick={runTest}
        disabled={status === 'writing' || status === 'reading'}
        style={{
          padding: '0.6rem 1.2rem',
          background: 'linear-gradient(135deg,#9333ea,#7c3aed)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontWeight: 600,
          cursor: status === 'writing' || status === 'reading' ? 'not-allowed' : 'pointer',
          opacity: status === 'writing' || status === 'reading' ? 0.6 : 1,
        }}
      >
        Rodar teste
      </button>
    </div>
  );
}
