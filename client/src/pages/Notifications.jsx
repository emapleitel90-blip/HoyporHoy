import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { api } from '../config/api';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('lyp_token');
            const { data } = await axios.get(api.notifications.list, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(data.notifications);
            setUnreadCount(data.unread);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleMarkAsRead = async (id) => {
        try {
            const token = localStorage.getItem('lyp_token');
            await axios.put(api.notifications.markRead(id), {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchNotifications();
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const token = localStorage.getItem('lyp_token');
            await axios.put(api.notifications.markAllRead, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchNotifications();
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const getIconColor = (type) => {
        switch (type) {
            case 'DEADLINE_ALERT': return 'text-yellow-600 bg-yellow-100';
            case 'AUDIT_ALERT': return 'text-red-600 bg-red-100';
            case 'EXPENSE': return 'text-green-600 bg-green-100';
            default: return 'text-blue-600 bg-blue-100';
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center p-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Tus Notificaciones</h2>
                    <p className="text-sm text-gray-500 mt-1">Tenés {unreadCount} notificaciones sin leer</p>
                </div>
                {unreadCount > 0 && (
                    <button onClick={handleMarkAllAsRead} className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark font-medium transition-colors">
                        <CheckSquare className="w-4 h-4" /> Marcar todas como leídas
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p>No tenés notificaciones recientes.</p>
                    </div>
                ) : (
                    notifications.map(n => (
                        <div key={n.id} className={`p-4 hover:bg-gray-50 transition-colors flex gap-4 ${n.isRead ? 'opacity-70' : 'bg-blue-50/30'}`}>
                            <div className="flex-shrink-0 mt-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getIconColor(n.type)}`}>
                                    <Bell className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between gap-4">
                                    <h4 className={`text-sm font-bold ${!n.isRead ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</h4>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">{new Date(n.createdAt).toLocaleString('es-AR')}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1 mb-2">
                                    {n.message}
                                </p>
                                <div className="flex items-center gap-4 text-xs font-medium">
                                    {n.case && (
                                        <Link to={`/cases/${n.case.id}`} className="text-primary hover:underline">
                                            Ir al Expediente: {n.case.caseNumber}
                                        </Link>
                                    )}
                                    {!n.isRead && (
                                        <button onClick={() => handleMarkAsRead(n.id)} className="text-gray-500 hover:text-green-600 flex items-center gap-1 transition-colors">
                                            <Check className="w-3 h-3" /> Marcar leída
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Notifications;
