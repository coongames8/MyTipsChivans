import { useEffect, useLayoutEffect, useState } from 'react';
import PostDetail from '../components/PostDetails/PostDetails';
import { Error, NetworkWifi1Bar, Verified } from '@mui/icons-material';
import { NavLink } from 'react-router-dom';
import { getTips } from '../firebase';
import Loader from '../components/Loader/Loader';
import AppHelmet from '../components/AppHelmet';

export default function Tips({ userData }) {
  const [loading, setLoading] = useState(true);
  const [tips, setTips] = useState([]);
  const [days, setDays] = useState(null);
  const [currentDate, setCurrentDate] = useState(null)
  const [tipsPerPage] = useState(25);
  const [active, setActive] = useState(null)
  const [category, setCategory] = useState('premium')
  const [isPremium, setIsPremium] = useState(false);

  const options = { year: 'numeric', month: 'long' };
  const date = new Date(); // current date
  const formattedDate = date.toLocaleDateString('en-US', options);

  function formatDate(dateString) {
    // Create a new Date object from the input string
    const date = new Date(dateString);
    // Format the date as mm/dd/yyyy
    return date.toLocaleDateString('en-US');
  }

  useEffect(() => {
    if (userData !== null) {
      if (userData.email === 'kkibetkkoir@gmail.com' || userData.email === 'arovanzgamez@gmail.com') {
        setIsPremium(true)
      } else {
        setIsPremium(userData.isPremium)
      }
    }
  }, [userData])


  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  });
  const [isOnline] = useState(() => {
    return navigator.onLine
  })


  useEffect(() => {
    getTips(tipsPerPage, setTips, setLoading, formatDate(currentDate));
  }, [isOnline, tipsPerPage, currentDate]);

  useEffect(() => {
    let dates = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      let date = new Date(today);
      date.setDate(date.getDate() - i);
      // Use local date methods instead of ISO string
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    setDays(dates.reverse());
  }, []);

  useEffect(() => {
    days && setCurrentDate(days[days.length - 1])
  }, [days]);

  useEffect(() => {
    if (tips.length > 0) {
      setActive(tips.filter((tip) => (category === 'free') ? (tip.premium === false) : (tip.premium === true))[0])
    }
  }, [tips]);

  useEffect(() => {
    loading && setTimeout(() => {
      setLoading(false);
    }, 2000);
  }, [loading]);

  const handleReload = () => {
    getTips(tipsPerPage, setTips, setLoading, formatDate(currentDate));
  }
  const returnDate = (dateString) => {
    const date = new Date(dateString);
    const options = { weekday: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const handleClick = async (tip) => {
    setActive(tip)
    document.querySelector(".post-detail").classList.add("active")
  };
  return (
    <div className="tips">
      <AppHelmet title={"MyTips"} location={'/'} />
      <div className='container'>
        <div className="filter-wrapper">
          <p>{formattedDate}</p>
          <select onChange={(e) => setCategory(e.target.value)} value={category}>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
          </select>
        </div>
        <div className="filter">
          {days && days.map((day) => (
            <button
              className={`btn-filter ${(currentDate === day) && 'active'}`}
              onClick={() => setCurrentDate(day)}
              key={days.indexOf(day)}
              aria-label={day}
            >
              <span>{returnDate(day).split(" ")[1].substring(0, 3)}</span>
              <span>{returnDate(day).split(" ")[0]}</span>
            </button>
          ))}
        </div>

        <div className="tips-grid">
          {(tips.length > 0) && tips
            .filter((tip) => (category === 'free') ? (tip.premium === false) : (tip.premium === true))
            .map(tip => (
              <div
                className="tip-card glass-card"
                key={tip.id}
                onClick={() => handleClick(tip)}
              >
                <div className="card-header">

                  <span className="matchup">
                    {(!isPremium && (tip.premium && (tip.date === formatDate(days[days.length - 1]))))
                      ? "Join VIP To View"
                      : `${tip.home} vs ${tip.away}`}
                  </span>
                </div>

                <div className="card-body">
                  <div className="card-row">
                    <span>
                      <span>Odds:</span>
                      <span className="pick">{tip.odd}</span>
                    </span>
                    <span>
                      <span>Tip:</span>
                      <span className="pick">{tip.pick}</span>
                    </span>
                  </div>
                  <div className="card-row result">

                    <span>
                      <span>kickoff:</span><span className="time">{tip.time}</span></span>
                    <span>
                      <span>Result:</span>
                      {tip.won === 'won' ? (
                        <span className="won pick">
                          <span>{tip.results}</span>
                          <Verified className="icon pick" />
                        </span>
                      ) : tip.status === "pending" ? (
                        <span className="pick">?-?</span>
                      ) : (
                        <span className="lost pick">
                          <span>{tip.results}</span>
                          <Error className="icon pick" />
                        </span>
                      )}
                    </span>

                  </div>
                </div>
              </div>
            ))
          }
        </div>

        <div className="wrapper">
          {(!isOnline && (tips.length === 0) && !loading) && (
            <div className='no-network'>
              <h1>Nothing Yet!</h1>
              <p>This could be a network issue. Check your internet and try again.</p>
              <NetworkWifi1Bar className='wifi' />
              <NavLink className="btn" onClick={handleReload}>Reload</NavLink>
            </div>
          )}

          {((!tips.length > 0) && loading) && <Loader />}
        </div>
      </div>

      {active && <PostDetail data={active} userData={userData} />}
    </div>
  )
}