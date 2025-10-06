import React, { useState } from 'react';
import CreateQuiz from './CreateQuiz';
import PastQuizzes from './PastQuizzes'; // Import the new component
import Submissions from './Submissions';
import Leaderboard from './Leaderboard';
import Analytics from './Analytics'; // Import the Analytics component

function AdminDashboard({ token, setToken }) {
  const [activeView, setActiveView] = useState('create');

  const handleLogout = () => {
    setToken(null);
  };

  const PlaceholderView = ({ title }) => (
    <div>
      <h2>{title}</h2>
      <p>This feature will be implemented soon.</p>
    </div>
  );

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <h1 className="sidebar-logo">QuizSpark</h1>
        <nav className="sidebar-nav">
          <a onClick={() => setActiveView('create')} className={activeView === 'create' ? 'active' : ''}>Create Quiz</a>
          <a onClick={() => setActiveView('history')} className={activeView === 'history' ? 'active' : ''}>Past Quizzes</a>
          <a onClick={() => setActiveView('submissions')} className={activeView === 'submissions' ? 'active' : ''}>Submissions</a>
          <a onClick={() => setActiveView('analytics')} className={activeView === 'analytics' ? 'active' : ''}>Analytics</a>
          <a onClick={() => setActiveView('leaderboard')} className={activeView === 'leaderboard' ? 'active' : ''}>Leaderboard</a>
        </nav>
        <button onClick={handleLogout} className="logout-btn-sidebar">Logout</button>
      </aside>
      
      <main className="main-content">
        {activeView === 'create' && <CreateQuiz token={token} />}
        {activeView === 'history' && <PastQuizzes token={token} />}
        {activeView === 'submissions' && <Submissions title="Recent Submissions" />}
        {activeView === 'analytics' && <Analytics token={token} />}
        {activeView === 'leaderboard' && <Leaderboard title="Top Scores" />}
      </main>
    </div>
  );
}

export default AdminDashboard;