import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Analytics({ token }) {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const eventsRes = await axios.get('http://127.0.0.1:8000/events');
        const quizzesRes = await axios.get('http://127.0.0.1:8001/quizzes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const completedEvents = eventsRes.data.filter(e => e.event_type === 'quiz_completed');
        const quizzes = quizzesRes.data;

        const quizStats = completedEvents.reduce((acc, event) => {
          const { quizId, score } = event.payload;
          if (!acc[quizId]) {
            acc[quizId] = { totalScore: 0, count: 0 };
          }
          acc[quizId].totalScore += score;
          acc[quizId].count++;
          return acc;
        }, {});
        
        const labels = [];
        const dataPoints = [];

        for (const quizId in quizStats) {
          const quiz = quizzes.find(q => q.id === quizId);
          labels.push(quiz ? quiz.title : quizId);
          dataPoints.push(quizStats[quizId].totalScore / quizStats[quizId].count);
        }

        setChartData({
          labels,
          datasets: [{
            label: 'Average Score (%)',
            data: dataPoints,
            backgroundColor: 'rgba(52, 211, 153, 0.6)',
            borderColor: 'rgba(52, 211, 153, 1)',
            borderWidth: 1,
          }],
        });

      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (loading) return <h2>Loading analytics...</h2>;

  return (
    <div>
      <h2>Quiz Performance</h2>
      <div className="chart-container">
        {chartData ? <Bar data={chartData} /> : <p>No data to display.</p>}
      </div>
    </div>
  );
}

export default Analytics;