import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard'; // Import the admin dash
import './App.css';

// Helper function to decode JWT
const decodeToken = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

function App() {
  const [token, setToken] = useState(null);

  if (token) {
    const userData = decodeToken(token);
    const isAdmin = userData && userData.role === 'admin';

    return (
      <div className="App">
        {isAdmin ? (
          <AdminDashboard token={token} setToken={setToken} />
        ) : (
          <Dashboard token={token} setToken={setToken} />
        )}
      </div>
    );
  }

  // If no token, show login/register pages
  return (
    <div className="App">
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login setToken={setToken} />} />
        <Route path="/" element={<Login setToken={setToken} />} />
      </Routes>
    </div>
  );
}

export default App;