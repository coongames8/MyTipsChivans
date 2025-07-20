import { useEffect, useState } from 'react';
import './UserProfile.scss';
import { NavLink, useLocation } from 'react-router-dom';

export default function UserProfile({ data }) {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (location.state) {
      setUser(location.state)
    } else {
      setUser(data)
    }
  }, [location]);

  const transactions = [
    {
      id: 1,
      name: 'American Eagle',
      category: 'Clothes & Fashion',
      amount: '-39.99 USD',
      time: '4.27pm',
      card: '•••• 6890',
      refId: '3125-568911',
      iconStyle: { backgroundColor: '#f2dcbb' },
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
          <path
            d="M192,120h27.05573a8,8,0,0,0,7.15542-4.42229l18.40439-36.80878a8,8,0,0,0-3.18631-10.52366L192,40M64,120H36.94427a8,8,0,0,1-7.15542-4.42229L11.38446,78.76893a8,8,0,0,1,3.18631-10.52366L64,40M160,40a32,32,0,0,1-64,0H64V208a8,8,0,0,0,8,8H184a8,8,0,0,0,8-8V40Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="16"
          />
        </svg>
      ),
    },
    {
      id: 2,
      name: 'From Håvard Brynjulfsen',
      category: 'Gift',
      amount: '+50.00 USD',
      time: '8.14am',
      refId: '3125-568912',
      iconStyle: {},
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
          <rect x="32" y="80" width="192" height="48" rx="8" />
          <path d="M208,128v72a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V128" />
          <line x1="128" y1="80" x2="128" y2="208" />
        </svg>
      ),
    },
  ];

  return (
    <div className="user-profile">
      {user && <div className="user-header">
        <div className="uh-left">
          <div className="uh-image">
            <img src="https://i.imgur.com/Qv1WDJq.jpg" alt="Profile" />
            <div className="gradient"></div>
          </div>
        </div>
        <div className="user-links">
          <span><a>@{user.username}</a></span>
          <span>
            {
              user.isPremium ? <a>VIP</a> : <NavLink className="btn" to='/pay'>GET VIP</NavLink>
            }
            <NavLink to="/users-edit" className="btn" state={user}>Edit</NavLink>
          </span>

        </div>
      </div>}
      <section>
        <h2>Transaction History</h2>

        {/*{transactions.map(({} id, name, category, amount, time, card, refId, iconStyle, icon }) => (
          <details key={id}>
            <summary>
              <div>
                <span style={iconStyle}>{icon}</span>
                <h3>
                  <strong>{name}</strong>
                  <small>{category}</small>
                </h3>
                <span>{amount}</span>
              </div>
            </summary>
            <div>
              <dl>
                <div>
                  <dt>Time</dt>
                  <dd>{time}</dd>
                </div>
                {card && (
                  <div>
                    <dt>Card used</dt>
                    <dd>{card}</dd>
                  </div>
                )}
                <div>
                  <dt>Reference ID</dt>
                  <dd>{refId}</dd>
                </div>
              </dl>
            </div>
          </details>
        ))}*/}
        <h1>COMING SOON</h1>

      </section>
      <div className="explore"><NavLink to="/" className="btn">EXPLORE</NavLink></div>


    </div>
  );
}
