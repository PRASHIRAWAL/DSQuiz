import React, { useState, useEffect } from 'react';
import axios from 'axios';

function QuizPlayer({ quiz, onFinish, token }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [showScore, setShowScore] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(quiz.time_limit_seconds);

  useEffect(() => {
    if (showScore) return;

    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timer);
          calculateScoreAndSubmit();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showScore]);

  const getUserIdFromToken = (jwtToken) => {
    try {
      return JSON.parse(atob(jwtToken.split('.')[1])).sub;
    } catch (e) { return null; }
  };

  const handleSubmitScore = async (finalScore) => {
    const userId = getUserIdFromToken(token);
    if (!userId) {
      console.error("Could not get user ID from token");
      return;
    }
    const submissionData = {
      userId: userId,
      answers: userAnswers,
      score: finalScore
    };
    try {
      await axios.post(`http://127.0.0.1:8001/quizzes/${quiz.id}/submit`, submissionData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Score submitted successfully!");
    } catch (error) {
      console.error("Failed to submit score:", error);
    }
  };

  const calculateScoreAndSubmit = () => {
    let correctCount = 0;
    quiz.questions.forEach(q => {
      if (userAnswers[q.id] === q.correct_answer) {
        correctCount++;
      }
    });
    const percentage = (correctCount / quiz.questions.length) * 100;
    setScore(percentage);
    handleSubmitScore(percentage);
    setShowScore(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      calculateScoreAndSubmit();
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="card">
        <h2>Error</h2>
        <p>This quiz has no questions.</p>
        <button onClick={onFinish}>Back to Dashboard</button>
      </div>
    );
  }
  
  const currentQuestion = quiz.questions[currentQuestionIndex];
  
  if (showScore) {
    return (
      <div className="quiz-player-container">
        <h2>Quiz Complete!</h2>
        <p className="tagline">Your final score is: {score.toFixed(2)}%</p>
        <button onClick={onFinish}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="quiz-player-container">
      <div className="quiz-header">
        <h2>{quiz.title}</h2>
        <div className="timer">Time Left: {formatTime(timeLeft)}</div>
      </div>
      <h4>Question {currentQuestionIndex + 1}/{quiz.questions.length}</h4>
      <p className="question-text">{currentQuestion.question_text}</p>
      
      <div className="options-list">
        {Object.entries(currentQuestion.options).map(([key, value]) => (
          <button
            key={key}
            className={`option-btn ${userAnswers[currentQuestion.id] === key ? 'selected' : ''}`}
            onClick={() => setUserAnswers({ ...userAnswers, [currentQuestion.id]: key })}
          >
            {key}: {value}
          </button>
        ))}
      </div>
      
      <button 
        onClick={handleNextQuestion} 
        disabled={!userAnswers[currentQuestion.id]}
        className="next-finish-btn"
      >
        {currentQuestionIndex < quiz.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
      </button>
    </div>
  );
}

export default QuizPlayer;