import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { RideChatMessage } from '../hooks/useRideChat';
import styles from './RideChatPanel.module.css';

interface RideChatPanelProps {
  messages: RideChatMessage[];
  myUserId: string;
  otherPartyName: string;
  sending: boolean;
  onSend: (body: string) => void;
  onClose: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export function RideChatPanel({ messages, myUserId, otherPartyName, sending, onSend, onClose }: RideChatPanelProps) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    onSend(draft);
    setDraft('');
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerText}>
            <strong>{otherPartyName}</strong>
            <span>ile mesajlaş</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Kapat">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className={styles.list} ref={listRef}>
          {messages.length === 0 && <p className={styles.empty}>Henüz mesaj yok. İlk mesajı gönder.</p>}
          {messages.map((m) => (
            <div key={m.id} className={[styles.bubbleRow, m.senderId === myUserId ? styles.mine : ''].join(' ')}>
              <div className={[styles.bubble, m.senderId === myUserId ? styles.bubbleMine : styles.bubbleTheirs].join(' ')}>
                {m.body}
                <span className={styles.time}>{formatTime(m.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>

        <form className={styles.inputRow} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            placeholder="Mesaj yaz..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
          <button className={styles.sendBtn} type="submit" disabled={sending || !draft.trim()} aria-label="Gönder">
            <i className="fa-solid fa-paper-plane" />
          </button>
        </form>
      </div>
    </div>
  );
}
