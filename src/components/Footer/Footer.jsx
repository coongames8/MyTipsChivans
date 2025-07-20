import { ArrowUpward, Facebook, Telegram, WhatsApp, X, Instagram } from '@mui/icons-material';
import React, { useEffect, useState } from 'react';
import './Footer.scss';
import { Link, NavLink } from 'react-router-dom';
import { socialLinks } from '../../data';

const Footer = ({ user }) => {
    const [isAdmin, setIsAdmin] = useState(null);
    const [showScroll, setShowScroll] = useState(false);

    const handleScroll = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const checkScrollTop = () => {
        if (!showScroll && window.pageYOffset > 400) {
            setShowScroll(true);
        } else if (showScroll && window.pageYOffset <= 400) {
            setShowScroll(false);
        }
    };

    useEffect(() => {
        window.addEventListener('scroll', checkScrollTop);
        return () => window.removeEventListener('scroll', checkScrollTop);
    }, [showScroll]);

    useEffect(() => {
        if (user !== null) {
            setIsAdmin(user.email === 'kkibetkkoir@gmail.com' || user.email === 'arovanzgamez@gmail.com');
        }
    }, [user]);

    return (
        <footer className="footer-glass">
            <div className="footer-content">
                <div className="social-section">
                    <h3 className="social-title">Connect With Us</h3>
                    <div className="social-links">
                        <Link to={socialLinks.telegramChannel} target="_blank" className="social-icon" aria-label="Telegram">
                            <Telegram />
                        </Link>
                        <Link to={socialLinks.whatsappChannel} target="_blank" className="social-icon" aria-label="WhatsApp">
                            <WhatsApp />
                        </Link>
                        <Link to={socialLinks.facebookPage} target="_blank" className="social-icon" aria-label="Facebook">
                            <Facebook />
                        </Link>
                        <Link to={socialLinks.xPage} target="_blank" className="social-icon" aria-label="Twitter">
                            <X />
                        </Link>
                        <Link to={socialLinks.instagramPage} target="_blank" className="social-icon" aria-label="Instagram">
                            <Instagram />
                        </Link>
                    </div>
                </div>

                <div className="footer-divider"></div>

                <div className="footer-links">
                    <p className="copyright">&copy; MyTips {new Date().getFullYear()}</p>
                    <NavLink to="/about#faq" className="footer-link">FAQ</NavLink>
                    {isAdmin && <NavLink to="/admin/tips" className="footer-link">ADD TIP</NavLink>}
                </div>
            </div>

            <button
                className={`scroll-top ${showScroll ? 'visible' : ''}`}
                onClick={handleScroll}
                aria-label="Scroll to top"
            >
                <ArrowUpward />
            </button>
        </footer>
    );
};

export default Footer;