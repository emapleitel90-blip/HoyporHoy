import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';

export const NotificationBell = () => {
    const [unreadCount, setUnreadCount] = useState(0);
    const {user}=useAuth();
    useEffect(() => {
        let cancelled=false, pending=false, refreshQueued=false;
        setUnreadCount(0);
        const fetchNotifications = async () => {
        if(cancelled)return;
        if(pending){refreshQueued=true;return;}pending=true;
        try {
            const token = localStorage.getItem('lyp_token');
            if (!token) return;
            const { data } = await axios.get(api.notifications.list, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if(!Number.isSafeInteger(data.unread)||data.unread<0)throw new Error('Respuesta inválida');
            if(!cancelled)setUnreadCount(data.unread);
        } catch (error) {
            console.error('Error fetching notifications count:', error);
        } finally {
            pending=false;
            if(refreshQueued&&!cancelled){refreshQueued=false;fetchNotifications();}
        }
    };
        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 30000);
        window.addEventListener('focus',fetchNotifications);
        window.addEventListener('notifications-updated',fetchNotifications);
        return () => {cancelled=true;clearInterval(intervalId);window.removeEventListener('focus',fetchNotifications);window.removeEventListener('notifications-updated',fetchNotifications);};
    }, [user?.id]);

    return (
        <Link to="/notifications" aria-label={`Actividad y notificaciones: ${unreadCount} sin leer`} className="relative p-2 text-gray-500 hover:text-primary transition-colors cursor-pointer rounded-full hover:bg-gray-100">
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </Link>
    );
};
