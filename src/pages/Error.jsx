import React, { useLayoutEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import AppHelmet from '../components/AppHelmet';

export default function Error() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  });
  return (
    <div className='not-found'>
      <AppHelmet title={"Not Found"} location={window.location.pathname}/>
      <h1>404 ERROR!</h1>
      <h2>Page not found</h2>
      <div className="btn"  onClick={() =>{
        window.history.back();
      }}>Go back</div>
    </div>
  )
}
