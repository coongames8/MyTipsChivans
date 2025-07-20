// Register.jsx
import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import { AuthContext } from '../AuthContext';
import AppHelmet from '../components/AppHelmet';
import { registerUser } from '../firebase';
import { NavLink } from 'react-router-dom';

const Register = () => {
    const { currentUser } = useContext(AuthContext);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleRegister = async (e) => {
        e.preventDefault();
        registerUser(username, email, password, setSuccess, setError);
    }

    useEffect(() => {
        currentUser && window.history.back()
        error && setTimeout(() => {
            setError(null);
        }, 2000);
        success && setTimeout(() => {
            setSuccess(null);
            setEmail('');
        }, 2000);
    }, [error, success, currentUser]);

    useLayoutEffect(() => {
        window.scrollTo(0, 0)
    });

    return (
        <div className='auth-container'>
            <AppHelmet title={"Register"} location={'/register'} />
            <div className="auth-glass">
                <div className="auth-header">
                    <h2>Create Account</h2>
                    <p>Join our community today</p>
                </div>

                <form onSubmit={handleRegister} className="auth-form">
                    <div className="form-group">
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder='Email address'
                            required
                        />
                    </div>

                    <div className="form-group">
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder='Username'
                            required
                        />
                    </div>

                    <div className="form-group">
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder='Password'
                            required
                        />
                    </div>

                    {error && <div className="auth-error">{error}</div>}
                    {success && <div className="auth-success">{success}</div>}

                    <button type="submit" className="auth-btn">
                        REGISTER
                    </button>

                    <div className="auth-footer">
                        <span>Already have an account?</span>
                        <NavLink to='/login' className="auth-link">Login &raquo;</NavLink>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Register;