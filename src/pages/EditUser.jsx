import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../AuthContext';
import Loader from '../components/Loader/Loader';
import { db, getUser, updateTip } from '../firebase';
import AppHelmet from '../components/AppHelmet';
import { useLocation } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';

export default function EditUser({ setUserData }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const { currentUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [subscription, setSubscription] = useState("");
  const [subDate, setSubDate] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(null);


  useEffect(() => {
    if (currentUser !== null) {
      if (currentUser.email === 'kkibetkkoir@gmail.com' || currentUser.email === 'arovanzgamez@gmail.com') {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
      }
    }
  }, [currentUser])

  function toDateTimeLocal(dateString) {
    const date = new Date(dateString);

    // Extract components
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    // Format as YYYY-MM-DDTHH:mm
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  useEffect(() => {
    if (user) {
      setEmail(user.email)
      setUsername(user.username)
      setIsPremium(user.isPremium)
      user.subscription ? setSubscription(user.subscription) : setSubscription("Free")
      user.subDate && setSubDate(toDateTimeLocal(user.subDate))
    }
  }, [user]);


  useEffect(() => {
    setUser(location.state)
  }, [location]);

  const handleSubmit = (e) => {
    e.preventDefault()

    if (isAdmin) {
      const usercollref = doc(db, 'users', user.email)
      updateDoc(usercollref, {
        isPremium,
        subscription: subscription === "Free" ? "" : subscription,
        subDate
      }).then(response => {
        getUser(user.email, setUserData)
      }).catch(error => {
        alert(error.message)
      })
    } else {
      const usercollref = doc(db, 'users', user.email)
      updateDoc(usercollref, {
        username
      }).then(response => {
        alert("user updated")
      }).catch(error => {
        alert(error.message)
      })
    }
  }

  useEffect(() => {
    error && setTimeout(() => {
      setError(null);
    }, 2000);
  }, [error]);

  useEffect(() => {
    !currentUser && window.history.back();
  }, [currentUser]);


  return (
    <div className='admin-tips'>
      <AppHelmet title={"Add Tip"} location={'/admin/tips'} />
      <h1>Update User</h1>
      {loading && <Loader />}
      {!loading && <form onSubmit={handleSubmit}>
        <div className="input-container">
          <label htmlFor="username">Username: </label>
          <input type="text" placeholder='@someone' id='username' value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="input-container">
          <label htmlFor="email">Email:</label>
          <input type="text" placeholder='example@gmail.com' id='email' value={email} onChange={(e) => setEmail(e.target.value)} readOnly />
        </div>
        <div className="input-container">
          <label htmlFor="subscription">Subscription:</label>
          <input type="text" placeholder='subscription' id='subscription' value={subscription} onChange={(e) => setSubscription(e.target.value)} readOnly={!isAdmin} />
        </div>
        {<div className="input-container">
          <label htmlFor="subDate">Subscribed On: </label>
          <input type="datetime-local" id='subDate' value={subDate} onChange={(e) => setSubDate(e.target.value)} readOnly={!isAdmin} />
        </div>}
        <div className="input-container">
          <label htmlFor="premium">Is premium</label>
          <input type="checkbox" placeholder='premium' id='premium' onChange={(e) => setIsPremium(e.target.checked)} checked={isPremium} readOnly={!isAdmin} />
        </div>

        <span style={{
          width: "100%",
          display: "flex",
          alignItems: "items",
          justifyContent: "space-evenly"
        }}>
          <button type="submit" className='btn' title='Submit' aria-label="add">Update</button>
          <span className="btn" onClick={() => window.history.back()}>DONE</span>
        </span>
      </form>}
      {
        loading && <Loader />
      }
    </div>
  )
}
