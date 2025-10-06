import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ProfilePage({ token, onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8001/users/me/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(response.data);
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  if (loading) {
    return <h2>Loading profile...</h2>;
  }

  if (!profile) {
    return <h2>Could not load profile.</h2>;
  }

  return (
    <div className="card" style={{ maxWidth: '600px' }}>
      <h1 className="logo">{profile.username}'s Profile</h1>
      <div className="profile-stats">
        <div className="stat-item">
          <h3>Quizzes Taken</h3>
          <p>{profile.quizzes_taken}</p>
        </div>
        <div className="stat-item">
          <h3>Average Score</h3>
          <p>{profile.average_score.toFixed(2)}%</p>
        </div>
      </div>
      
      <h3>Achievements</h3>
      <div className="achievements-list">
        {profile.achievements.length > 0 ? (
          profile.achievements.map((ach, index) => (
            <span key={index} className="achievement-badge">{ach}</span>
          ))
        ) : (
          <p>No achievements yet. Keep playing!</p>
        )}
      </div>
      
      <button onClick={onBack} style={{ marginTop: '2rem' }}>Back to Dashboard</button>
    </div>
  );
}

export default ProfilePage;