import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { api } from '../config/api';
import { DollarSign, Plus, FileText, ExternalLink, Paperclip } from 'lucide-react';
import { uploadLegalDocument } from '../utils/firebaseUpload';

export const ExpensePanel = ({ caseId, studioId }) => {
    const [expenses, setExpenses] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [formData, setFormData] = useState({ description: '', amount: '', type: 'OTROS', receipt: null });

    const fetchExpenses = async () => {
        try {
            const token = localStorage.getItem('lyp_token');
            const { data } = await axios.get(api.expenses.byCase(caseId), {
                headers: { Authorization: `Bearer ${token}` }
            });
            setExpenses(data.expenses);
            setTotal(data.total);
        } catch (error) {
            console.error('Error fetching expenses', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (caseId) fetchExpenses();
    }, [caseId]);

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            setUploading(true);
            let receiptUrl = null;

            // 1. Si hay archivo, subir a Firebase
            if (formData.receipt) {
                receiptUrl = await uploadLegalDocument(
                    formData.receipt,
                    studioId,
                    caseId,
                    (p) => setProgress(Math.round(p))
                );
            }

            // 2. Crear gasto en la base de datos
            const token = localStorage.getItem('lyp_token');
            await axios.post(api.expenses.create(caseId), {
                ...formData,
                receiptUrl
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setFormData({ description: '', amount: '', type: 'OTROS', receipt: null });
            setProgress(0);
            fetchExpenses();
        } catch (err) {
            console.error('Add expense error', err);
            alert('Error al agregar gasto');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="p-4 text-center text-gray-500">Cargando gastos...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <h3 className="text-base font-semibold text-gray-900">Gastos del Expediente</h3>
                </div>
                <div className="font-bold text-gray-800">
                    Total: ${total.toLocaleString('es-AR')}
                </div>
            </div>
            <div className="p-6">
                <form onSubmit={handleAdd} className="flex gap-2 mb-4 flex-wrap">
                    <input 
                        type="text" 
                        placeholder="Descripción" 
                        className="flex-1 border-gray-300 rounded-lg text-sm min-w-[200px]"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        required
                    />
                    <input 
                        type="number" 
                        placeholder="Monto" 
                        className="w-32 border-gray-300 rounded-lg text-sm"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        required
                        min="1"
                    />
                    <select 
                        className="w-40 border-gray-300 rounded-lg text-sm"
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                    >
                        <option value="TASA_JUSTICIA">Tasa de Justicia</option>
                        <option value="PERITOS">Peritos</option>
                        <option value="MOVILIDAD">Movilidad</option>
                        <option value="HONORARIOS">Honorarios</option>
                        <option value="OTROS">Otros</option>
                    </select>

                    <label className="flex items-center gap-1 cursor-pointer px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                        <Paperclip className="w-4 h-4" />
                        {formData.receipt ? "Comprobante listo" : "Adjuntar"}
                        <input 
                            type="file" 
                            className="hidden" 
                            onChange={(e) => setFormData({...formData, receipt: e.target.files[0]})}
                        />
                    </label>

                    <button 
                        type="submit" 
                        disabled={uploading}
                        className={`bg-primary text-white px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-1 ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-dark'}`}
                    >
                        <Plus className="w-4 h-4"/> {uploading ? `Subiendo ${progress}%` : 'Añadir'}
                    </button>
                </form>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm cursor-default">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Doc</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {expenses.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-4 py-4 text-center text-gray-400 italic">No hay gastos registrados.</td>
                                </tr>
                            ) : (
                                expenses.map(e => (
                                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">{new Date(e.createdAt).toLocaleDateString('es-AR')}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{e.description}</td>
                                        <td className="px-4 py-3 text-gray-500">
                                            <span className="px-2 py-1 bg-gray-100 rounded text-xs">{e.type}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-700">${e.amount.toLocaleString('es-AR')}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${e.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                {e.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {e.receiptUrl ? (
                                                <a 
                                                    href={e.receiptUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:text-primary-dark transition-colors inline-block"
                                                    title="Ver comprobante"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            ) : (
                                                <span className="text-gray-300">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
