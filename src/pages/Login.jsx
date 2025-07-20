// Login.jsx
import React, { useContext, useEffect, useLayoutEffect, useState } from 'react'
import { signInUser } from '../firebase';
import { AuthContext } from '../AuthContext';
import AppHelmet from '../components/AppHelmet';
import { NavLink } from 'react-router-dom'

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const { currentUser } = useContext(AuthContext);

    const handleSubmit = (e) => {
        e.preventDefault();
        signInUser(email, password, setError);
    }

    useEffect(() => {
        currentUser && window.history.back()
        error && setTimeout(() => {
            setError(null);
        }, 2000);
    }, [error, currentUser]);

    useLayoutEffect(() => {
        window.scrollTo(0, 0)
    });

    return (
        <div className='auth-container'>
            <AppHelmet title={"Login"} location={'/login'} />
            <div className="auth-glass">
                <div className="auth-header">
                    <h2>Welcome Back</h2>
                    <p>Sign in to access your account</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder='Email address'
                            required
                        />
                    </div>

                    <div className="form-group">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder='Password'
                            required
                        />
                    </div>

                    {error && <div className="auth-error">{error} - Please try again</div>}

                    <button type="submit" className="auth-btn">
                        LOGIN
                    </button>

                    <div className="auth-footer">
                        <span>Don't have an account?</span>
                        <NavLink to='/register' className="auth-link">Sign Up &raquo;</NavLink>
                    </div>
                </form>
            </div>
        </div>
    );
};