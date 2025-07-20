import React, { useContext, useEffect, useLayoutEffect, useState } from 'react'
import UserCard from '../components/UserCard/UserCard'
import { getAllusers } from '../firebase';
import { AuthContext } from '../AuthContext';
import Loader from '../components/Loader/Loader';

export default function ListUsers() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const { currentUser } = useContext(AuthContext);
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    if (currentUser !== null) {
      if (currentUser.email === 'kkibetkkoir@gmail.com' || currentUser.email === 'arovanzgamez@gmail.com') {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
        window.history.back()
      }
    }
  }, [currentUser])

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  });

  const [isOnline] = useState(() => {
    return navigator.onLine
  })


  useEffect(() => {
    if (isAdmin) {
      getAllusers(setUsers, setLoading);
    }
  }, [isOnline, isAdmin]);


  useEffect(() => {
    loading && setTimeout(() => {
      setLoading(false);
    }, 2000);
  }, [loading]);

  return (
    <div className='list-users'>
      {
        loading && <Loader />
      }

      {
        users.length > 0 && users.map(user => {
          return <UserCard key={user.email} user={user} />
        })
      }
    </div>
  )
}
