import React, { useLayoutEffect } from 'react'
import FaqItem from '../components/FaqItem/FaqItem';
import { faqs } from '../data';
import AppHelmet from '../components/AppHelmet';

export default function About() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  });

  const sections = [
    {
      title: "About Us",
      content: "Welcome to our football prediction platform, your ultimate destination for accurate match forecasts, insightful analysis, and real-time updates! Whether you're a football enthusiast, a seasoned bettor, or just curious about the beautiful game, our website offers something special for everyone."
    },
    {
      title: "For Football Fans",
      content: "Dive into a world of football predictions and analysis. From the Premier League to international tournaments, we provide forecasts backed by data and expert insights. Stay ahead of the game with our curated content, tailored to keep you informed and engaged throughout the season."
    },
    {
      title: "For Bettors and Analysts",
      content: "Gain access to detailed match predictions, player stats, and historical data to make informed decisions. Our platform is designed to empower you with the tools and insights you need to succeed, whether you're betting for fun or professionally analyzing the sport."
    },
    {
      title: "Stay Updated with Real-Time Insights",
      content: "Our platform delivers live updates, ensuring you're always informed about the latest match developments, team news, and performance metrics. Subscribe to our alerts and never miss a critical update during the season."
    },
    {
      title: "Our Mission",
      content: "We aim to revolutionize football predictions by combining cutting-edge technology, expert knowledge, and community-driven engagement. Join us today and become part of a thriving community that shares your passion for football and the excitement of the game. Let's predict, analyze, and celebrate football together!"
    }
  ];

  return (
    <div className='about-container'>
      <AppHelmet title={"About"} location={'/about'} />

      <div className="about-hero">
        <h1 className="hero-title">About MyTips</h1>
        <p className="hero-subtitle">Your trusted source for football predictions and insights</p>
      </div>

      <div className="about-sections">
        {sections.map((section, index) => (
          <div key={index} className="about-card">
            <h2 className="section-title">{section.title}</h2>
            <p className="section-content">{section.content}</p>
          </div>
        ))}
      </div>

      <div className="faqs-section">
        <div className="section-header">
          <h1 className="faq-title">Frequently Asked Questions</h1>
          <p className="faq-subtitle">Answers to common questions about our service</p>
        </div>

        <div className="faqs-grid">
          {faqs.map(faq => (
            <FaqItem
              key={faq.id}
              question={faq.question}
              answer={faq.answer}
            />
          ))}
        </div>
      </div>
    </div>
  )
}