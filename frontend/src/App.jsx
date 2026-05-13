import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useVoice } from './hooks/useVoice';
import TaskList from './components/TaskList';
import VoiceOrb from './components/VoiceOrb';
import Auth from './components/Auth';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('Click the orb to start');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const messagesEndRef = useRef(null);

  // Check token on load
  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.id) setUser(data);
          else { localStorage.removeItem('token'); setToken(null); }
        })
        .catch(() => { localStorage.removeItem('token'); setToken(null); });
    }
  }, [token]);

  // Fetch tasks when logged in
  useEffect(() => {
    if (user) {
      fetch(`${API_BASE}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => setTasks(Array.isArray(data) ? data : []))
        .catch(() => addMessage('system', 'Could not connect to server.'));
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogin = (data) => {
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setTasks([]);
    setMessages([]);
    setHistory([]);
  };

  const addMessage = (role, text) => {
    setMessages(prev => [...prev, { role, text, id: Date.now() }]);
  };

  const handleTranscript = useCallback(async (text) => {
    if (!text || isProcessing) return;
    addMessage('user', text);
    setIsProcessing(true);
    setStatus('Thinking...');

    try {
      if (pendingDelete) {
        const yes = /\b(yes|yeah|yep|correct|do it|confirm|sure)\b/i.test(text);
        const no = /\b(no|nope|cancel|stop|nevermind)\b/i.test(text);
        if (yes) {
          await fetch(`${API_BASE}/tasks/${pendingDelete.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          const updated = await fetch(`${API_BASE}/tasks`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(r => r.json());
          setTasks(updated);
          const reply = `Done. Deleted "${pendingDelete.title}".`;
          addMessage('assistant', reply);
          speak(reply);
          setPendingDelete(null);
          setIsProcessing(false);
          return;
        } else if (no) {
          setPendingDelete(null);
          const reply = "No problem, keeping it.";
          addMessage('assistant', reply);
          speak(reply);
          setIsProcessing(false);
          return;
        }
        setPendingDelete(null);
      }

      let response;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ transcript: text, history, tasks }),
          });
          if (response.ok) break;
          throw new Error('Server error');
        } catch {
          if (attempt < 3) {
            setStatus(`Server waking up... retrying (${attempt}/3)`);
            await new Promise(r => setTimeout(r, 4000));
          } else {
            throw new Error('Server unavailable');
          }
        }
      }

      const data = await response.json();

      if (data.tasks) setTasks(data.tasks);
      if (data.userMessage && data.assistantMessage) {
        setHistory(prev => [...prev, data.userMessage, data.assistantMessage].slice(-20));
      }
      if (data.action === 'delete' && data.payload?.needs_confirmation) {
        const task = tasks.find(t => t.id === data.payload.id);
        setPendingDelete(task || { id: data.payload.id, title: 'that task' });
      }

      const reply = data.reply || "Done.";
      addMessage('assistant', reply);
      speak(reply);

    } catch (err) {
      const errMsg = "Server is not responding. Please try again in a moment.";
      addMessage('system', errMsg);
      speak(errMsg);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, history, tasks, pendingDelete, token]);

  const handleInterrupt = useCallback(() => {
    setIsProcessing(false);
  }, []);

  const { isListening, isSpeaking, transcript, error, startListening, stopListening, speak } = useVoice({
    onTranscript: handleTranscript,
    onInterrupt: handleInterrupt,
  });

  useEffect(() => {
    if (isListening) setStatus('Listening...');
    else if (isSpeaking) setStatus('Speaking...');
    else if (isProcessing) setStatus('Thinking...');
    else setStatus('Click the orb to speak');
  }, [isListening, isSpeaking, isProcessing]);

  const toggleListening = () => {
    if (isSpeaking) window.speechSynthesis.cancel();
    if (isListening) stopListening();
    else startListening();
  };

  if (!user) return <Auth onLogin={handleLogin} apiBase={API_BASE} />;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">VoiceTask</span>
          </div>
          <p className="sidebar-subtitle">Voice-controlled tasks</p>
          <div className="user-info">
            <span className="user-name">👤 {user.name}</span>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
        <TaskList tasks={tasks} />
      </aside>

      <main className="main">
        <div className="chat-area">
          {messages.length === 0 && (
            <div className="welcome">
              <h1>Ready to listen</h1>
              <p>Try saying something like:</p>
              <ul>
                <li>"Create a task for team sync at 10 AM"</li>
                <li>"What are my tasks today?"</li>
                <li>"Move the meeting to tomorrow"</li>
                <li>"Delete the gym task"</li>
              </ul>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`message message-${msg.role}`}>
              <span className="message-label">
                {msg.role === 'user' ? '🎤 You' : msg.role === 'assistant' ? '◈ Assistant' : '⚠ System'}
              </span>
              <p>{msg.text}</p>
            </div>
          ))}
          {transcript && (
            <div className="message message-interim">
              <span className="message-label">🎤 You</span>
              <p>{transcript}...</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="voice-panel">
          {error && <p className="error-msg">{error}</p>}
          <p className="status-text">{status}</p>
          <VoiceOrb
            isListening={isListening}
            isSpeaking={isSpeaking}
            onClick={toggleListening}
            disabled={isProcessing && !isListening && !isSpeaking}
          />
          {pendingDelete && (
            <div className="confirm-banner">
              ⚠ Delete <strong>"{pendingDelete.title}"</strong>? Say <em>yes</em> or <em>no</em>.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}