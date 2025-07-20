import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { BrowserRouter } from "react-router-dom";
import { AuthContextProvider } from "./AuthContext";
import './App.scss';
import './pages.scss';
import { PriceContextProvider } from './PriceContext.jsx';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthContextProvider>
    <PriceContextProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PriceContextProvider>
  </AuthContextProvider>
);
