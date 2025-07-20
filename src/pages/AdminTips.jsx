import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../AuthContext';
import Loader from '../components/Loader/Loader';
import { addTip } from '../firebase';
import AppHelmet from '../components/AppHelmet';

export default function AdminTips() {
    const [home, setHome] = useState('');
    const [away, setAway] = useState('');
    const [odd, setOdd] = useState('');
    const [pick, setPick] = useState('');
    const [status, setStatus] = useState('');
    const [time, setTime] = useState('');
    const [won, setWon] = useState('');
    const [premium, setPremium] = useState(false);
    const [results, setResults] = useState('');
    const { currentUser } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);


    const handleSubmit = (e) => {
        e.preventDefault()
        const d = new Date(time);
        // Format the date as "M/D/YYYY"
        const date = new Intl.DateTimeFormat('en-US').format(d);

        // Format the time as "HH:MM"
        const timeOnly = d.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        addTip({ home, away, date, odd, pick, status, time: timeOnly, won, premium, results }, setError, setLoading);
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
            <h1>Add Tip</h1>
            {!loading && <form onSubmit={handleSubmit}>
                <div className="input-container vertical">
                    <label htmlFor="home">Home Team</label>
                    <input type="text" placeholder='home' id='home' value={home} onChange={(e) => setHome(e.target.value)} required />
                </div>
                <div className="input-container vertical">
                    <label htmlFor="away">Away Team</label>
                    <input type="text" placeholder='away' id='away' value={away} onChange={(e) => setAway(e.target.value)} required />
                </div>
                <div className="input-container">
                    <label htmlFor="odds">Odds</label>
                    <input type="text" placeholder='odds' id='odds' value={odd} onChange={(e) => setOdd(e.target.value)} required />
                </div>
                <div className="input-container">
                    <label htmlFor="pick">Pick</label>
                    <input type="text" placeholder='pick' id='pick' value={pick} onChange={(e) => setPick(e.target.value.toUpperCase())} required />
                </div>
                <div className="input-container">
                    <label htmlFor="status">Status: </label>
                    <input type="text" placeholder='finished/pending/live' id='status' value={status} onChange={(e) => setStatus(e.target.value.toLowerCase())} required />
                </div>
                <div className="input-container">
                    <label htmlFor="time">Date/Time: </label>
                    <input type="datetime-local" id='time' value={time} onChange={(e) => setTime(e.target.value)} required />
                </div>
                <div className="input-container">
                    <label htmlFor="results">Results</label>
                    <input type="text" placeholder='results' id='results' value={results} onChange={(e) => setResults(e.target.value)} />
                </div>
                <div className="input-container">
                    <label htmlFor="won">Is won</label>
                    <input type="text" placeholder='won/pending/lost' id='won' value={won} onChange={(e) => setWon(e.target.value.toLowerCase())} required />
                </div>
                <div className="input-container">
                    <label htmlFor="premium">Is premium</label>
                    <input type="checkbox" placeholder='premium' id='premium' onChange={(e) => setPremium(e.target.checked)} checked={premium} />
                </div>
                <button type="submit" className='btn' title='Submit' aria-label="add">Add</button>
            </form>}

            {
                loading && <Loader />
            }
        </div>
    )
}
