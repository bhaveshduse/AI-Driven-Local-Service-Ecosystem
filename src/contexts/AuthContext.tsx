import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ... (Interface definitions for User, RegisterData, AuthContextType remain the same) ...
interface User {
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'vendor' | 'admin';
}

interface RegisterData {
    name: string;
    email: string;
    password: string;
    phone: string;
    role: 'customer' | 'vendor' | 'admin';
    businessName?: string;
    serviceCategories?: string[];
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // --- EFFECT: Load state on mount ---
    useEffect(() => {
        // The dashboard (for regular users) is protected by 'token'. 
        // AdminDashboard is protected by 'admin_token', which is loaded implicitly there.
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }

        // 💡 CRITICAL: Load admin token if available for admin-specific pages
        const adminToken = localStorage.getItem('admin_token');
        if (adminToken && !storedToken) {
            setToken(adminToken);
        }

        setIsLoading(false);
    }, []);

    const handleError = async (response: Response, defaultMsg: string) => {
        let message = defaultMsg;
        try {
            const error = await response.json();
            message = error.error || message;
        } catch {
            // ignore non-JSON
        }
        throw new Error(message);
    };

    // --- LOGIN FUNCTION (Where the fix is applied) ---
    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) await handleError(response, 'Login failed');

            const data = await response.json();
            
            // Assuming your backend returns data.user which includes data.user.role
            const loggedInUser: User = data.user; 
            const newToken: string = data.token;

            setUser(loggedInUser);
            setToken(newToken);

            // 🛑 FIX START: Conditional token saving for Admin
            if (loggedInUser.role === 'admin') {
                // Save token using the key expected by AdminDashboard.tsx
                localStorage.setItem('admin_token', newToken);
                
                // Clear the generic token/user state to ensure only the admin dashboard relies on it
                // (Optional, but safer for segregation)
                localStorage.removeItem('token');
                localStorage.removeItem('user'); 
                
            } else {
                // Save tokens for regular users (customer/vendor) using the generic keys
                localStorage.setItem('token', newToken);
                localStorage.setItem('user', JSON.stringify(loggedInUser));
                
                // Remove admin token to prevent cross-role access (if it somehow existed)
                localStorage.removeItem('admin_token');
            }
            // 🛑 FIX END

        } finally {
            setIsLoading(false);
        }
    };

    const register = async (userData: RegisterData) => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });

            if (!response.ok) await handleError(response, 'Registration failed');

            const data = await response.json();
            const registeredUser: User = data.user;
            const newToken: string = data.token;
            
            setUser(registeredUser);
            setToken(newToken);

            // For simplicity, registration for non-admin uses the generic keys
            localStorage.setItem('token', newToken);
            localStorage.setItem('user', JSON.stringify(registeredUser));
            
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        // Clear all possible stored tokens/users
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('admin_token'); // Make sure the admin token is cleared!
    };

    const value: AuthContextType = {
        user,
        token,
        login,
        register,
        logout,
        isLoading,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};