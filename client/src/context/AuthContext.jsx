import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../config/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing session in localStorage
        const storedUser = localStorage.getItem('lyp_user');
        const storedToken = localStorage.getItem('lyp_token');

        if (storedUser && storedToken) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                localStorage.removeItem('lyp_user');
                localStorage.removeItem('lyp_token');
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const response = await fetch(api.auth.login, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Credenciales inválidas');
            }

            const userData = {
                id: data._id,
                name: data.name,
                email: data.email,
                role: data.role,
                studioId: data.studioId,
            };

            // Persist session
            localStorage.setItem('lyp_user', JSON.stringify(userData));
            localStorage.setItem('lyp_token', data.token);

            setUser(userData);
            return userData;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = async () => {
        localStorage.removeItem('lyp_user');
        localStorage.removeItem('lyp_token');
        setUser(null);
    };

    // Helper to get the token for API calls
    const getToken = () => localStorage.getItem('lyp_token');

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, getToken }}>
            {children}
        </AuthContext.Provider>
    );
};
