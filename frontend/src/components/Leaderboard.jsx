import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Leaderboard({ token }) { // Accept token as a prop
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuizzesWithSubmissions = async () => {
      try {
        // Step 1: Fetch all quizzes to get their titles
        const quizzesRes = await axios.get('http://127.0.0.1:8001/quizzes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const allQuizzes = quizzesRes.data;

        // Step 2: Fetch all submission events
        const eventsRes = await axios.get('http://127.0.0.1:8000/events');
        const completedEvents = eventsRes.data.filter(event => event.event_type === 'quiz_completed');
        
        // Step 3: Create a list of quizzes that actually have submissions
        const submittedQuizIds = new Set(completedEvents.map(event => event.payload.quizId));
        const quizzesWithSubmissions = allQuizzes.filter(quiz => submittedQuizIds.has(quiz.id));
        
        setQuizzes(quizzesWithSubmissions);
        
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuizzesWithSubmissions();
  }, [token]);

  const showLeaderboardForQuiz = async (quizId) => {
    setLoading(true);
    try {
      const response = await axios.get('http://127.0.0.1:8000/events');
      const quizSubmissions = response.data.filter(
        event => event.event_type === 'quiz_completed' && event.payload.quizId === quizId
      );
      
      // Get the highest score for each user for this specific quiz
      // ... (inside the showLeaderboardForQuiz function)

      // Get the highest score and earliest timestamp for each user for this specific quiz
      const userScores = quizSubmissions.reduce((acc, event) => {
        const userId = event.payload.userId;
        const score = event.payload.score;
        const timestamp = new Date(event.created_at); // Convert timestamp to Date object

        if (!acc[userId] || score > acc[userId].score || (score === acc[userId].score && timestamp < acc[userId].timestamp)) {
          acc[userId] = { userId, score, timestamp };
        }
        return acc;
      }, {});
      
      const sortedScores = Object.values(userScores).sort((a, b) => {
        // First, sort by score in descending order
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // If scores are equal, sort by timestamp in ascending order (earlier first)
        return a.timestamp - b.timestamp;
      });
      
      setLeaderboard(sortedScores);
      setSelectedQuiz(quizzes.find(q => q.id === quizId));

// ... (rest of the component)

    } catch(error) {
      console.error("Failed to fetch leaderboard", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <h2>Loading...</h2>;
  
  if (selectedQuiz) {
    return (
      <div>
        <h2>Leaderboard for {selectedQuiz.title}</h2>
        <button onClick={() => setSelectedQuiz(null)} className="back-btn">← Back to Quiz List</button>
        <ol className="leaderboard-list">
          {leaderboard.map((user, index) => (
            <li key={user.userId} className="leaderboard-item">
              <span className="rank">{index + 1}</span>
              <span className="username">{user.userId}</span>
              <span className="score">{user.score.toFixed(2)}%</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div>
      <h2>Select a Quiz to View its Leaderboard</h2>
      <div className="quiz-list">
        {quizzes.map(quiz => (
          <div key={quiz.id} className="quiz-item" onClick={() => showLeaderboardForQuiz(quiz.id)} style={{cursor: 'pointer'}}>
            <h3>{quiz.title}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Leaderboard;