import React, { useContext, useEffect, useState } from 'react'
import './PostDetails.scss';
import Profile from '../../assets/vip.jpg';
import Logo from '../../assets/logo.png';
import { Close, ErrorTwoTone, Verified } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { PriceContext } from '../../PriceContext';
import { AuthContext } from '../../AuthContext';

export default function PostDetail({ data, userData }) {
  const { setPrice } = useContext(PriceContext);
  const { currentUser } = useContext(AuthContext);
  const [isPremium, setIsPremium] = useState(false);
  var x = window.matchMedia("(min-width: 576px)");
  const [isAdmin, setIsAdmin] = useState(null);

  const handleClick = () => {
    document.querySelector(".post-detail").classList.remove("active");
  }

  useEffect(() => {
    if (currentUser !== null) {
      if (currentUser.email === 'kkibetkkoir@gmail.com' || currentUser.email === 'arovanzgamez@gmail.com') {
        setIsAdmin(true);
        setIsPremium(true);
      } else {
        setIsAdmin(false);
        setIsPremium(userData.isPremium);
      }
    }
  }, [currentUser]);

  function formatDate() {
    const date = new Date();
    return date.toLocaleDateString('en-US');
  }

  return (
    <div className={`post-detail glass-panel ${x.matches && "active"}`}>
      <Close className='close-icon' onClick={handleClick} />

      <div className="detail-header">
        <div className="avatar-container">
          <img
            src={data.premium ? Profile : Logo}
            alt={data.premium ? "VIP Member" : "Standard Member"}
            className="avatar"
          />
          {data.premium && <div className="premium-badge">VIP</div>}
        </div>
        <div className="match-info">
          <h3 className="match-date">{data.date}</h3>
          <p className="match-time">{data.time}</p>
          <div className="odds-chip">
            <span>ODDS: {data.odd}</span>
          </div>
        </div>
      </div>

      <div className="match-details">
        <div className="team-row">
          <span className="team-name">
            {(data.premium && !isPremium && data.date === formatDate())
              ? "Join VIP To View"
              : data.home}
          </span>
          <span className="team-score">
            {data.results ? data.results.split('-')[0] : "?"}
          </span>
        </div>

        <div className="divider"></div>

        <div className="team-row">
          <span className="team-name">
            {(data.premium && !isPremium && data.date === formatDate())
              ? "Join VIP To View"
              : data.away}
          </span>
          <span className="team-score">
            {data.results ? data.results.split('-')[1] : "?"}
          </span>
        </div>
      </div>

      <div className="prediction-section">
        <div className="prediction-chip">
          <Verified className="prediction-icon" />
          <span>{data.pick}</span>
        </div>
      </div>

      <div className="action-buttons">
        {(data.premium && !isPremium) && (
          <Link
            to={'/pay'}
            className='glass-btn premium-btn'
            onClick={() => setPrice(200)}
          >
            GET VIP ACCESS
          </Link>
        )}

        {isAdmin && (
          <Link
            to={'/edit'}
            className='glass-btn edit-btn'
            state={data}
          >
            EDIT PREDICTION
          </Link>
        )}
      </div>
    </div>
  )
}
