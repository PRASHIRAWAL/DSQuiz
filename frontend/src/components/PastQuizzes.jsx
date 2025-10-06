import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AddQuestionForm = ({ quizId, token, onQuestionAdded }) => {
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState({ A: '', B: '', C: '', D: '' });
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const newQuestion = {
      question_text: questionText,
      options,
      correct_answer: correctAnswer
    };
    try {
      await axios.post(`http://127.0.0.1:8001/quizzes/${quizId}/questions`, newQuestion, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Question added successfully!');
      setTimeout(() => {
        onQuestionAdded();
      }, 1000);
    } catch (error) {
      setMessage('Failed to add question.');
      console.error("Failed to add question", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="question-editor" style={{marginTop: '2rem'}}>
      <h4>Add a New Question</h4>
      <div className="form-group">
        <label>Question Text</label>
        <input type="text" value={questionText} onChange={(e) => setQuestionText(e.target.value)} required />
      </div>
      {['A', 'B', 'C', 'D'].map(key => (
        <div className="form-group" key={key}>
          <label>Option {key}</label>
          <input type="text" value={options[key]} onChange={(e) => setOptions({...options, [key]: e.target.value})} required />
        </div>
      ))}
      <div className="form-group">
        <label>Correct Answer</label>
        <select value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)}>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
      </div>
      <button type="submit">Save Question</button>
      {message && <p>{message}</p>}
    </form>
  );
};


function PastQuizzes({ token }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [message, setMessage] = useState('');

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://127.0.0.1:8001/quizzes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuizzes(response.data);
    } catch (error) {
      console.error("Failed to fetch quizzes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, [token]);
  
  const handleUpdateQuiz = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const { id, ...quizData } = editingQuiz;
      await axios.put(`http://127.0.0.1:8001/quizzes/${id}`, quizData, {
          headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Quiz updated successfully!');
      setTimeout(() => {
        setEditingQuiz(null);
        fetchQuizzes();
        setMessage('');
      }, 1500);
    } catch (error) {
      setMessage('Failed to update quiz.');
      console.error(error);
    }
  };
  
  const handleFieldChange = (qIndex, field, value) => {
    const newQuestions = [...editingQuiz.questions];
    if (field === 'options') {
      const { optionKey, optionValue } = value;
      newQuestions[qIndex].options[optionKey] = optionValue;
    } else {
      newQuestions[qIndex][field] = value;
    }
    setEditingQuiz({ ...editingQuiz, questions: newQuestions });
  };

  const openEditModal = (quiz) => {
    setEditingQuiz(JSON.parse(JSON.stringify(quiz)));
    setShowAddQuestion(false);
  };

  if (loading) return <h2>Loading quizzes...</h2>;

  return (
    <div>
      <h2>Past Quizzes</h2>
      <div className="quiz-list">
        {quizzes.map((quiz) => (
          <div key={quiz.id} className="quiz-item">
            <div>
              <h3>{quiz.title}</h3>
              <p>{quiz.description}</p>
              <p><small>{quiz.questions.length} questions</small></p>
            </div>
            <button onClick={() => openEditModal(quiz)} className="edit-btn">View / Edit</button>
          </div>
        ))}
      </div>

      {editingQuiz && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <form onSubmit={handleUpdateQuiz}>
              <h2>Edit Quiz</h2>
              <div className="form-group">
                <label>Quiz Title</label>
                <input value={editingQuiz.title} onChange={(e) => setEditingQuiz({...editingQuiz, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Quiz Description</label>
                <textarea rows="3" value={editingQuiz.description} onChange={(e) => setEditingQuiz({...editingQuiz, description: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Time Limit (in seconds)</label>
                <input 
                  type="number" 
                  value={editingQuiz.time_limit_seconds} 
                  onChange={(e) => setEditingQuiz({...editingQuiz, time_limit_seconds: parseInt(e.target.value, 10)})} 
                />
              </div>
              <hr />

              {editingQuiz.questions.map((q, qIndex) => (
                <div key={qIndex} className="question-editor">
                  <h4>Question {qIndex + 1}</h4>
                  <div className="form-group">
                    <label>Question Text</label>
                    <input value={q.question_text} onChange={(e) => handleFieldChange(qIndex, 'question_text', e.target.value)} />
                  </div>
                  {['A', 'B', 'C', 'D'].map(optionKey => (
                    <div className="form-group" key={optionKey}>
                      <label>Option {optionKey}</label>
                      <input value={q.options[optionKey]} onChange={(e) => handleFieldChange(qIndex, 'options', { optionKey, optionValue: e.target.value })} />
                    </div>
                  ))}
                  <div className="form-group">
                    <label>Correct Answer</label>
                    <select value={q.correct_answer} onChange={(e) => handleFieldChange(qIndex, 'correct_answer', e.target.value)}>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                </div>
              ))}
              
              <div className="modal-actions">
                <button type="submit">Update Quiz</button>
                <button type="button" onClick={() => setEditingQuiz(null)} className="cancel-btn">Close</button>
              </div>
            </form>
            
            <hr />
            
            {showAddQuestion ? (
              <AddQuestionForm 
                quizId={editingQuiz.id} 
                token={token} 
                onQuestionAdded={() => {
                  setShowAddQuestion(false);
                  fetchQuizzes();
                  setEditingQuiz(null);
                }} 
              />
            ) : (
              <button type="button" onClick={() => setShowAddQuestion(true)} className="add-btn">
                Add New Question
              </button>
            )}
            {message && <p>{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default PastQuizzes;