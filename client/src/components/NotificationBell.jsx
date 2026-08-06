import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { api } from '../config/api';

export const NotificationBell = () => {
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const { data } = await axios.get(api.notifications.list, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnreadCount(data.unread);
        } catch (error) {
            console.error('Error fetching notifications count:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 5 minutes (for simple real-time aspect)
        const intervalId = setInterval(fetchNotifications, 5 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, []);

    return (
        <Link to="/notifications" className="relative p-2 text-gray-500 hover:text-primary transition-colors cursor-pointer rounded-full hover:bg-gray-100">
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full border border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </Link>
    );
};
