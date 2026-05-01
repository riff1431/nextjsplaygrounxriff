"use client";

import React, { createContext, useContext } from 'react';
import { useSuga4U } from './useSuga4U';

type Suga4UContextType = ReturnType<typeof useSuga4U>;

const Suga4UContext = createContext<Suga4UContextType | null>(null);

export const Suga4UProvider = ({ 
    children, 
    roomId, 
    sessionId 
}: { 
    children: React.ReactNode;
    roomId: string | null;
    sessionId?: string | null;
}) => {
    const value = useSuga4U(roomId, sessionId);
    
    return (
        <Suga4UContext.Provider value={value}>
            {children}
        </Suga4UContext.Provider>
    );
};

export const useSuga4UContext = () => {
    const context = useContext(Suga4UContext);
    if (!context) {
        throw new Error("useSuga4UContext must be used within a Suga4UProvider");
    }
    return context;
};
