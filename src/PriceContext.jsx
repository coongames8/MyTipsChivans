import { createContext, useState } from "react";

export const PriceContext = createContext();

export const PriceContextProvider = ({ children }) => {
  const [price, setPrice] = useState(800);


  return (
    <PriceContext.Provider value={{ price, setPrice }}>
      {children}
    </PriceContext.Provider>
  );
};