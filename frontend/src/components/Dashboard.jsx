import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QuizPlayer from './QuizPlayer';
import ProfilePage from './ProfilePage';

function Dashboard({ token, setToken }) {
  const [view, setView] = useState('dashboard'); // 'dashboard' or 'profile'
  const [quizzes, setQuizzes] = useState([]);
  const [username, setUsername] = useState('');
  const [playingQuiz, setPlayingQuiz] = useState(null);

    useEffect(() => {
    const getUsernameFromToken = (jwtToken) => {
      try {
        return JSON.parse(atob(jwtToken.split('.')[1])).sub;
      } catch (e) {
        console.error("Failed to decode token:", e);
        return null;
      }
    };
    
    setUsername(getUsernameFromToken(token));

    const fetchQuizzes = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8001/quizzes', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setQuizzes(response.data);
      } catch (error) {
        console.error("Failed to fetch quizzes:", error);
      }
    };

    if (token) {
      fetchQuizzes();
    }
  }, [token]);


  const handleLogout = () => setToken(null);

  if (playingQuiz) {
    return <QuizPlayer quiz={playingQuiz} onFinish={() => setPlayingQuiz(null)} token={token} />;
  }

  if (view === 'profile') {
    return <ProfilePage token={token} onBack={() => setView('dashboard')} />;
  }

  return (
    <div className="card" style={{ maxWidth: '600px' }}>
      <div className="dashboard-header">
        <h1 className="logo" style={{ marginBottom: '0.5rem' }}>Welcome, {username}!</h1>
        <a onClick={() => setView('profile')} className="profile-link">View Profile</a>
      </div>
      <p className="tagline">Here are the available quizzes.</p>
      
      {/* Quiz list rendering */}
      <div className="quiz-list">
        {quizzes.map((quiz) => (
          <div key={quiz.id} className="quiz-item">
            <div>
              <h3>{quiz.title}</h3>
              <p>{quiz.description}</p>
            </div>
            {quiz.questions.length > 0 ? (
              <button onClick={() => setPlayingQuiz(quiz)} className="start-quiz-btn">Start Quiz</button>
            ) : (
              <p><small>No questions yet</small></p>
            )}
          </div>
        ))}
      </div>

      <button onClick={handleLogout} className="logout-btn">Logout</button>
    </div>
  );
}

export default Dashboard;