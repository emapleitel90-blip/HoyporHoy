import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { api } from '../config/api';
import { notifyActivityChanged } from '../utils/activityEvents';
import { DollarSign, Plus, Download, Paperclip } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { downloadCaseFile, errorMessage } from '../utils/caseFiles';

const blankForm = () => ({ description: '', amount: '', type: 'OTROS', receipt: null });
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('lyp_token')}` });

export const ExpensePanel = ({ caseId, onReceiptSaved }) => {
    const [expenses, setExpenses] = useState([]);
    const total = expenses.reduce((sum, item) => sum + item.amount, 0);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [formData, setFormData] = useState(blankForm);
    const [error, setError] = useState(null);
    const [receiptBusy, setReceiptBusy] = useState(null);
    const [downloading, setDownloading] = useState(null);
    const loadVersion = useRef(0);
    const actionVersion = useRef(0);
    const receiptInput = useRef(null);
    const { showToast } = useToast();
    const busy = uploading || receiptBusy !== null;

    const fetchExpenses = useCallback(async () => {
        const version = ++loadVersion.current;
        setError(null);
        try {
            const { data } = await axios.get(api.expenses.byCase(caseId), {
                headers: headers(),
            });
            if (!Array.isArray(data.expenses)) throw new Error('Respuesta de gastos inválida');
            if (version === loadVersion.current) setExpenses(data.expenses);
        } catch (error) {
            if (version === loadVersion.current) setError('No se pudieron cargar los gastos. Intentá de nuevo.');
        } finally {
            if (version === loadVersion.current) setLoading(false);
        }
    }, [caseId]);

    useEffect(() => {
        const currentLoad = loadVersion, currentAction = actionVersion;
        currentAction.current++;
        setExpenses([]); setLoading(true); setFormData(blankForm());
        setUploading(false); setReceiptBusy(null); setProgress(0); setDownloading(null);
        if (receiptInput.current) receiptInput.current.value = '';
        if (caseId) fetchExpenses();
        return () => { currentLoad.current++; currentAction.current++; };
    }, [caseId, fetchExpenses]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (busy) return;
        if (formData.receipt?.size > 20 * 1024 * 1024) {
            showToast('El comprobante supera el límite de 20 MB', 'error');
            return;
        }
        const version = ++actionVersion.current;
        try {
            setUploading(true);
            setProgress(0);
            const payload = new FormData();
            for (const field of ['description', 'amount', 'type']) payload.append(field, formData[field]);
            if (formData.receipt) payload.append('file', formData.receipt);
            const { data } = await axios.post(api.expenses.create(caseId), payload, {
                headers: headers(),
                onUploadProgress: event => {
                    if (version === actionVersion.current && event.total) setProgress(Math.round(event.loaded * 100 / event.total));
                },
            });
            notifyActivityChanged();
            if (version !== actionVersion.current) return;
            setExpenses(previous => [data, ...previous]);
            setFormData(blankForm());
            if (receiptInput.current) receiptInput.current.value = '';
            if (data.receipt) onReceiptSaved?.(data.receipt);
            showToast('Gasto guardado correctamente', 'success');
        } catch (err) {
            if (version === actionVersion.current) showToast(await errorMessage(err, 'No se pudo guardar el gasto'), 'error');
        } finally {
            if (version === actionVersion.current) { setUploading(false); setProgress(0); }
        }
    };

    const attachReceipt = async (event, expense) => {
        const file = event.target.files[0];
        event.target.value = '';
        if (!file || busy) return;
        if (file.size > 20 * 1024 * 1024) { showToast('El comprobante supera el límite de 20 MB', 'error'); return; }
        const version = ++actionVersion.current;
        setReceiptBusy(expense.id);
        try {
            const payload = new FormData();
            payload.append('file', file); payload.append('version', expense.updatedAt);
            const { data } = await axios.post(api.expenses.receipt(expense.id), payload, { headers: headers() });
            notifyActivityChanged();
            if (version !== actionVersion.current) return;
            setExpenses(previous => previous.map(item => item.id === data.id ? data : item));
            onReceiptSaved?.(data.receipt);
            showToast('Comprobante guardado correctamente', 'success');
        } catch (err) {
            if (version === actionVersion.current) {
                showToast(await errorMessage(err, 'No se pudo guardar el comprobante'), 'error');
                if (err.response?.status === 409) fetchExpenses();
            }
        } finally { if (version === actionVersion.current) setReceiptBusy(null); }
    };

    const downloadReceipt = async expense => {
        setDownloading(expense.id);
        try { await downloadCaseFile(expense.receipt); }
        catch (err) { showToast(await errorMessage(err, 'No se pudo descargar el comprobante'), 'error'); }
        finally { setDownloading(null); }
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
                    Total: {error ? 'No disponible' : `$${total.toLocaleString('es-AR')}`}
                </div>
            </div>
            <div className="p-6">
                {error && <div role="alert" className="mb-4 text-red-700">{error} <button onClick={() => { setLoading(true); fetchExpenses(); }} className="underline">Reintentar</button></div>}
                <form onSubmit={handleAdd}>
                <fieldset disabled={busy || !!error} className="flex gap-2 mb-4 flex-wrap">
                    <input 
                        type="text" 
                        placeholder="Descripción" 
                        aria-label="Descripción del gasto"
                        className="flex-1 border-gray-300 rounded-lg text-sm min-w-[200px]"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        required
                    />
                    <input 
                        type="number" 
                        placeholder="Monto" 
                        aria-label="Monto del gasto"
                        className="w-32 border-gray-300 rounded-lg text-sm"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        required
                        min="0.01"
                        step="0.01"
                    />
                    <select 
                        aria-label="Tipo de gasto"
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
                        {formData.receipt ? formData.receipt.name : 'Adjuntar'}
                        <input 
                            type="file" 
                            ref={receiptInput}
                            aria-label="Comprobante del nuevo gasto"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                            className="hidden" 
                            onChange={(e) => setFormData({...formData, receipt: e.target.files[0]})}
                        />
                    </label>

                    <button 
                        type="submit" 
                        disabled={uploading}
                        className={`bg-primary text-white px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-1 ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-dark'}`}
                    >
                        <Plus className="w-4 h-4"/> {uploading ? `Guardando${progress ? ` (${progress}%)` : ''}...` : 'Añadir'}
                    </button>
                </fieldset>
                </form>
                <p className="text-xs text-gray-500 mb-4">Comprobantes de hasta 20 MB. El archivo se guarda al confirmar el gasto y se descarga con sesión.</p>

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
                                    <td colSpan="6" className="px-4 py-4 text-center text-gray-400 italic">{error ? 'Los gastos no están disponibles.' : 'No hay gastos registrados.'}</td>
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
                                            {e.receiptStatus === 'AVAILABLE' && e.receipt ? (
                                                <button
                                                    onClick={() => downloadReceipt(e)}
                                                    disabled={downloading === e.id}
                                                    aria-label={`Descargar comprobante de ${e.description}`}
                                                    className="text-primary hover:text-primary-dark transition-colors inline-block"
                                                    title={e.receipt.name}
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-500">{e.receiptStatus === 'MISSING' ? 'Archivo no disponible' : e.receiptUrl ? 'Comprobante anterior sin archivo verificable' : 'Sin comprobante'}</span>
                                            )}
                                            <label className="block text-xs text-primary cursor-pointer mt-1">
                                                {receiptBusy === e.id ? 'Guardando...' : e.receiptStatus === 'AVAILABLE' ? 'Reemplazar' : 'Cargar comprobante'}
                                                <input type="file" className="hidden" aria-label={`Cargar comprobante de ${e.description}`}
                                                    disabled={busy || !!error} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                                                    onChange={event => attachReceipt(event, e)} />
                                            </label>
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
