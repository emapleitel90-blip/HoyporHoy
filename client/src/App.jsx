import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import CaseList from './pages/CaseList';
import StudioList from './pages/StudioList';
import CreateCase from './pages/CreateCase';
import ViewCase from './pages/ViewCase';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Help from './pages/Help';

const ProtectedRoute = () => {
    const { user, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    return user ? <Outlet /> : <Navigate to="/login" />;
};

function App() {
    return (
        <ToastProvider>
            <AuthProvider>
                <Router>
                    <Routes>
                        <Route path="/login" element={<Login />} />

                        <Route element={<ProtectedRoute />}>
                            <Route element={<Layout />}>
                                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/cases" element={<CaseList />} />
                                <Route path="/cases/new" element={<CreateCase />} />
                                <Route path="/cases/:id" element={<ViewCase />} />
                                <Route path="/cases/:id/edit" element={<CreateCase />} />
                                <Route path="/studios" element={<StudioList />} />
                                <Route path="/notifications" element={<Notifications />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/help" element={<Help />} />
                            </Route>
                        </Route>
                    </Routes>
                </Router>
            </AuthProvider>
        </ToastProvider>
    );
}

export default App;
