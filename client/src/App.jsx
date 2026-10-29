import React, { lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import RouteContent from './components/RouteContent';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const CaseList = lazy(() => import('./pages/CaseList'));
const StudioList = lazy(() => import('./pages/StudioList'));
const CreateCase = lazy(() => import('./pages/CreateCase'));
const ViewCase = lazy(() => import('./pages/ViewCase'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings = lazy(() => import('./pages/Settings'));
const Help = lazy(() => import('./pages/Help'));
const MyDay = lazy(() => import('./pages/MyDay'));

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
                              <Route element={<RouteContent />}>
                                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/mi-jornada" element={<MyDay />} />
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
                        </Route>
                    </Routes>
                </Router>
            </AuthProvider>
        </ToastProvider>
    );
}

export default App;
