import React, { useState } from 'react'
import './FaqItem.scss'
import { ArrowBackIos, ArrowDownwardRounded, ArrowForwardIos, ArrowUpwardRounded} from '@mui/icons-material';

export default function FaqItem({question, answer}) {
    const [isActive, setIsActive] = useState(false);
  const handleClick = () => {
    if(isActive){
        setIsActive(!isActive)
    } else {
        setIsActive(true);
    }
  }
  return (
	<div className={`faqItem ${isActive ? "active" : ""}`} onClick={handleClick}>
        <div>
            <h3>
			    {question}
		    </h3>
            {!isActive  ? <span className="icon"></span> : <span className="icon-opened" onClick={handleClick}/>}
        </div>
		<p>
			{answer}
		</p>
	</div>
  )
}