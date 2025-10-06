import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Submissions({ token }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/events');
        const completedEvents = response.data.filter(event => event.event_type === 'quiz_completed');
        setSubmissions(completedEvents);
      } catch (error) {
        console.error("Failed to fetch submissions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [token]);

  if (loading) {
    return <h2>Loading submissions...</h2>;
  }

  return (
    <div>
      <h2>Recent Submissions</h2>
      <table className="submissions-table">
        <thead>
          <tr>
            <th>User ID</th>
            <th>Quiz ID</th>
            <th>Score</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {submissions.length > 0 ? (
            submissions.map((sub) => (
              <tr key={sub.id}>
                <td>{sub.payload.userId}</td>
                <td>{sub.payload.quizId}</td>
                <td>{sub.payload.score.toFixed(2)}%</td>
                <td>{new Date(sub.created_at).toLocaleString()}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4">No submissions found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Submissions;