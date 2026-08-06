import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { api } from '../config/api';
import { Clock, Plus, CheckCircle, Circle } from 'lucide-react';

export const DeadlinePanel = ({ caseId }) => {
    const [deadlines, setDeadlines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTitle, setNewTitle] = useState('');
    const [newDate, setNewDate] = useState('');

    const fetchDeadlines = async () => {
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.get(api.deadlines.byCase(caseId), {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDeadlines(data);
        } catch (error) {
            console.error('Error fetching deadlines', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (caseId) fetchDeadlines();
    }, [caseId]);

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(api.deadlines.create(caseId), {
                title: newTitle,
                dueDate: newDate,
            }, { headers: { Authorization: `Bearer ${token}` } });
            setNewTitle('');
            setNewDate('');
            fetchDeadlines();
        } catch (err) {
            console.error('Add deadline error', err);
            alert('Error al agregar plazo');
        }
    };

    const toggleStatus = async (deadline) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(api.deadlines.update(deadline.id), {
                isCompleted: !deadline.isCompleted,
            }, { headers: { Authorization: `Bearer ${token}` } });
            fetchDeadlines();
        } catch (err) {
            console.error('Update deadline error', err);
        }
    };

    if (loading) return <div className="p-4 text-center text-gray-500">Cargando plazos...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <h3 className="text-base font-semibold text-gray-900">Agenda de Vencimientos</h3>
                </div>
            </div>
            <div className="p-6">
                <form onSubmit={handleAdd} className="flex gap-2 mb-4">
                    <input 
                        type="text" 
                        placeholder="Descripción del plazo..." 
                        className="flex-1 border-gray-300 rounded-lg text-sm"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        required
                    />
                    <input 
                        type="date" 
                        className="border-gray-300 rounded-lg text-sm"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        required
                    />
                    <button type="submit" className="bg-primary text-white p-2 text-sm rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-1">
                        <Plus className="w-4 h-4"/> Añadir
                    </button>
                </form>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {deadlines.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No hay plazos registrados.</p>
                    ) : (
                        deadlines.map(d => (
                            <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => toggleStatus(d)} className="text-gray-400 hover:text-primary transition-colors cursor-pointer">
                                        {d.isCompleted ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-gray-400" />}
                                    </button>
                                    <div>
                                        <p className={`text-sm font-medium ${d.isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                            {d.title}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Vence: {new Date(d.dueDate).toLocaleDateString('es-AR')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
