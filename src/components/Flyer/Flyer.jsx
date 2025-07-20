import { useContext, useEffect, useState } from 'react'
import './Flyer.scss'
import { NavLink } from 'react-router-dom'
import { PriceContext } from '../../PriceContext'
import { getWonTips } from '../../firebase'
import { TimelapseOutlined, Verified, ErrorTwoTone } from '@mui/icons-material'

export default function Flyer() {
  const { setPrice } = useContext(PriceContext)
  const [tips, setTips] = useState(null)
  const [isOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    getWonTips(12, setTips)
  }, [isOnline])

  const truncateText = (text, length) => {
    return text.length > length ? `${text.substring(0, length)}...` : text
  }

  return (
    <div className="flyer-glass">
      <div className="flyer-content">
        <h2 className="flyer-title">Expert Football Tips</h2>
        <p className="flyer-subtitle">Join our winning team today</p>
        <NavLink
          to="/pay"
          className="glass-btn primary"
          onClick={() => setPrice(3000)}
        >
          GET VIP ACCESS
        </NavLink>
      </div>

      <div className="winning-tips">
        <div className="scroller">
          {tips && tips.filter(tip => tip.won === 'won').map((tip) => (
            <div
              className={`tip-card ${tip.premium ? 'premium' : ''}`}
              key={tip.id}
            >
              <div className="teams">
                <span className="team">{truncateText(tip.home, 12)}</span>
                <span className="score">{tip.results}</span>
                <span className="team">{truncateText(tip.away, 12)}</span>
              </div>
              <div className="match-info">
                <span className="date">
                  <TimelapseOutlined className="icon" />
                  {tip.date}
                </span>
                <span className="odds">
                  {tip.odd}
                  <Verified className="icon won" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}