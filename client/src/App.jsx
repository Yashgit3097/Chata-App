import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io('https://chata-app-cb2w.onrender.com');

function App() {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typingUser, setTypingUser] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(null);
  const [tempUsername, setTempUsername] = useState('');
  const [tempRoom, setTempRoom] = useState('');
  const messagesEndRef = useRef(null);

  // Load token and chat history on startup
  useEffect(() => {
    const savedToken = localStorage.getItem('chatToken');
    const savedUsername = localStorage.getItem('chatUsername');
    const savedRoom = localStorage.getItem('chatRoom');
    const savedMessages = JSON.parse(localStorage.getItem('chatMessages'));

    if (savedToken && savedUsername && savedRoom) {
      setToken(savedToken);
      setUsername(savedUsername);
      setRoom(savedRoom);
      setMessages(savedMessages || []);
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      socket.emit('join_room', room, username);

      socket.on('receive_message', (data) => {
        setMessages((prev) => {
          const updated = [...prev, { ...data, seen: true }];
          localStorage.setItem('chatMessages', JSON.stringify(updated));
          return updated;
        });
        setTypingUser('');
      });

      socket.on('typing', (user) => {
        if (user !== username) {
          setTypingUser(user);
        }
      });

      socket.on('stop_typing', () => {
        setTypingUser('');
      });

      return () => {
        socket.off('receive_message');
        socket.off('typing');
        socket.off('stop_typing');
      };
    }
  }, [isLoggedIn, room, username]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = () => {
    if (input.trim() === '') return;
    const message = {
      username,
      text: input,
      time: new Date().toLocaleTimeString(),
      room
    };
    socket.emit('send_message', message);
    setInput('');
    socket.emit('stop_typing');
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    if (e.target.value.length > 0) {
      socket.emit('typing', username);
    } else {
      socket.emit('stop_typing');
    }
  };

  const handleEnterChat = () => {
    if (tempUsername.trim() === '' || tempRoom.trim() === '') return;
    const newToken = generateToken();
    setToken(newToken);
    setUsername(tempUsername.trim());
    setRoom(tempRoom.trim());
    setIsLoggedIn(true);
    localStorage.setItem('chatToken', newToken);
    localStorage.setItem('chatUsername', tempUsername.trim());
    localStorage.setItem('chatRoom', tempRoom.trim());
    localStorage.setItem('chatMessages', JSON.stringify([]));
  };

  const generateToken = () => {
    return Math.random().toString(36).substr(2);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setRoom('');
    setMessages([]);
    setToken(null);
    localStorage.removeItem('chatToken');
    localStorage.removeItem('chatUsername');
    localStorage.removeItem('chatRoom');
    localStorage.removeItem('chatMessages');
  };

  if (!isLoggedIn) {
    return (
      <div className="app">
        <div className="username-screen">
          <h2>Join Chat Room</h2>
          <input
            type="text"
            placeholder="Enter your name..."
            value={tempUsername}
            onChange={(e) => setTempUsername(e.target.value)}
          />
          <input
            type="text"
            placeholder="Enter room code..."
            value={tempRoom}
            onChange={(e) => setTempRoom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEnterChat()}
          />
          <button onClick={handleEnterChat}>Join</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h2>Room: {room}</h2>
        <button className="logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
      <div className="messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message ${msg.username === username
              ? 'own'
              : msg.username === 'System'
                ? 'system'
                : 'other'
              }`}
          >
            <div className="meta">
              {msg.username !== 'System' && `${msg.username} • ${msg.time}`}
            </div>
            <div>{msg.text}</div>
            {msg.username === username && (
              <div className="seen">{msg.seen ? 'Seen ✓' : 'Sent...'}</div>
            )}
          </div>
        ))}
        {typingUser && (
          <div className="typing">{typingUser} is typing...</div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="input-container">
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={handleTyping}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="send" onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}

export default App;
