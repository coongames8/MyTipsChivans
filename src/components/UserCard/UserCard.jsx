import React from "react";
import "./UserCard.scss";
import backgroundImage from '../../assets/l1.jpg';
import backgroundImage2 from '../../assets/l3.jpg';
import backgroundImage3 from '../../assets/l4.jpg';
import { NavLink } from "react-router-dom";
import { Email, EmailOutlined } from "@mui/icons-material";

const UserCard = ({user}) => {

  function formatDate(dateString) {
    const date = new Date(dateString);
    let day = date.getDate();
    
    // Append the suffix for the day (st, nd, rd, th)
    const suffix = (day) => {
        if (day > 3 && day < 21) return 'th'; // 11th to 13th are special
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    };
    
    const formattedDate = `${day}${suffix(day)} ${date.toLocaleString('en-GB', { month: 'long', year: 'numeric' })}`;
    return formattedDate;
}
  return (  
  <NavLink className="card"  to={`/users/${user.username ? "@" + user.username : user.email}`} state={user}>
    <div className="cover-bg"  style={{
      background: `#fff url(${user.isPremium ? backgroundImage3 : backgroundImage2}) center no-repeat`,
    }}></div>
    <div className="user-info-wrap">
      <img src={user.isPremium ? backgroundImage : backgroundImage2} alt="" className="user-photo" />
      <div className="user-info">
        <div className="user-name">{user.subscription ? user.subscription : " Free"} Plan</div>
        <p className="user-title">@{user.username}</p>
      </div>
    </div>
    <div className="user-bio">
      <div className="data"><EmailOutlined className="mail"/> {user.email}</div>
      {user.subDate && <>
        <div className="data">{user.subscription}</div>
        <div className="data">{formatDate(user.subDate)}</div>
      </>}
      </div>
  </NavLink>
)};

export default UserCard;
