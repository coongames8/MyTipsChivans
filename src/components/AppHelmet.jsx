import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function AppHelmet({ title, location }) {
  const canonicalUrl = `${location.origin}${location.pathname}`;

  return (
    <Helmet>
      <meta charSet="utf-8" />
      <title>{title} | MyTips - Fixed VIP Football Tips, Insights and News</title>
      <link rel="canonical" href={canonicalUrl} />
      <meta
        name="description"
        content="Get all the latest ✓Fixed VIP Tips ✓Football Predictions, ✓Latest Football Betting Odds and livescores, results & fixtures for all leagues and competitions, including the Premier League, Championship and across the world."
      />
      {/* Open Graph tags for social media */}
      <meta property="og:title" content={title} />
      <meta
        property="og:description"
        content="Get all the latest ✓Fixed VIP Tips ✓Football Predictions, ✓Latest Football Betting Odds and livescores, results & fixtures for all leagues and competitions, including the Premier League, Championship and across the world."
      />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="/logo512.png" />
    </Helmet>
  );
}
