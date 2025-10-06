import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom'; // Import Link for navigation

function Login({ setToken }) { // Accept setToken as a prop
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    
    const body = new FormData();
    body.append('username', username);
    body.append('password', password);

    try {
      const response = await axios.post('http://127.0.0.1:8001/users/login', body);
      
      const receivedToken = response.data.access_token;
      setToken(receivedToken); // This will log the user in
      
    } catch (error) {
      if (error.response) {
        setMessage(`Error: ${error.response.data.detail}`);
      } else {
        setMessage('Error: Could not connect to the server.');
      }
    }
  };

  return (
    <div className="card">
      <h1 className="logo">QuizSpark</h1>
      <p className="tagline">Welcome back!</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
      {message && <p style={{ marginTop: '1rem', color: '#ff6347' }}>{message}</p>}
      
      <p style={{ marginTop: '2rem', fontSize: '0.9rem' }}>
        Don't have an account? <Link to="/register">Register here</Link>
      </p>
    </div>
  );
}

export default Login;