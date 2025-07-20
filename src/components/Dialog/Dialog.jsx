import React from 'react';
import './Dialog.scss';
import { NavLink } from 'react-router-dom';
import { Done, Error } from '@mui/icons-material';

export default function Dialog({text, title, isError}) {
  return (
    <div className='dialog'>
        <div className="top">
            {isError ? <Error className='error'/> : <Done className='success'/>}
            <h2 className={`sub-heading  ${isError ? "error" : "success"}`}>{title}</h2>
            <p className='heading'>{text}</p>
        </div>
        <NavLink type="button" className={"btn"}>OK</NavLink>
    </div>
  )
}
