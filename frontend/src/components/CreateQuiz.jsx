import React, { useState } from 'react';
import axios from 'axios';

function CreateQuiz({ token }) {
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(600); // Default to 10 minutes
  const [questions, setQuestions] = useState([{ question_text: '', options: { A: '', B: '', C: '', D: '' }, correct_answer: 'A' }]);
  const [message, setMessage] = useState('');

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    if (field === 'options') {
      const { optionKey, optionValue } = value;
      newQuestions[index].options[optionKey] = optionValue;
    } else {
      newQuestions[index][field] = value;
    }
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions([...questions, { question_text: '', options: { A: '', B: '', C: '', D: '' }, correct_answer: 'A' }]);
  };

  const removeQuestion = (index) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  const handleCreateQuiz = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const quizData = { title: quizTitle, description: quizDescription, time_limit_seconds: timeLimit, questions };
      
      await axios.post('http://127.0.0.1:8001/quizzes', quizData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage('Quiz created successfully!');
      setQuizTitle('');
      setQuizDescription('');
      setTimeLimit(600);
      setQuestions([{ question_text: '', options: { A: '', B: '', C: '', D: '' }, correct_answer: 'A' }]);

    } catch (error) {
      setMessage('Failed to create quiz.');
      console.error(error);
    }
  };

  return (
    <div>
      <h2>Create a New Quiz</h2>
      <form onSubmit={handleCreateQuiz} className="card" style={{ maxWidth: '800px', textAlign: 'left' }}>
        <div className="form-group">
          <label>Quiz Title</label>
          <input type="text" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Quiz Description</label>
          <input type="text" value={quizDescription} onChange={(e) => setQuizDescription(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Time Limit (in seconds)</label>
          <input type="number" value={timeLimit} onChange={(e) => setTimeLimit(parseInt(e.target.value, 10))} required />
        </div>

        <hr style={{ margin: '2rem 0' }} />

        {questions.map((q, index) => (
          <div key={index} className="question-editor">
            <h4>Question {index + 1}</h4>
            <div className="form-group">
              <label>Question Text</label>
              <input type="text" value={q.question_text} onChange={(e) => handleQuestionChange(index, 'question_text', e.target.value)} required />
            </div>
            {['A', 'B', 'C', 'D'].map(optionKey => (
              <div key={optionKey} className="form-group">
                <label>Option {optionKey}</label>
                <input type="text" value={q.options[optionKey]} onChange={(e) => handleQuestionChange(index, 'options', { optionKey, optionValue: e.target.value })} required />
              </div>
            ))}
            <div className="form-group">
              <label>Correct Answer</label>
              <select value={q.correct_answer} onChange={(e) => handleQuestionChange(index, 'correct_answer', e.target.value)}>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
            {questions.length > 1 && 
              <button type="button" onClick={() => removeQuestion(index)} className="remove-btn">Remove Question</button>
            }
          </div>
        ))}

        <button type="button" onClick={addQuestion} className="add-btn">Add Another Question</button>
        <button type="submit" style={{ marginTop: '2rem' }}>Save Quiz</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default CreateQuiz;