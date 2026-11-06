import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { NativeSelect } from './ui/native-select';
import { Label } from './ui/label';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from './ui/table';
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

    if (loading) return <div className="p-4 text-center text-muted-foreground">Cargando gastos...</div>;

    return (
        <Card className="bg-card rounded-xl shadow-sm border border-border overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-border bg-background flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-link" />
                    <h3 className="text-base font-semibold text-foreground">Gastos del Expediente</h3>
                </div>
                <div className="font-bold text-foreground">
                    Total: {error ? 'No disponible' : `$${total.toLocaleString('es-AR')}`}
                </div>
            </div>
            <div className="p-6">
                {error && <div role="alert" className="mb-4 text-status-red">{error} <Button variant="legacy" size="legacy" onClick={() => { setLoading(true); fetchExpenses(); }} className="underline">Reintentar</Button></div>}
                <form onSubmit={handleAdd}>
                <fieldset disabled={busy || !!error} className="flex gap-2 mb-4 flex-wrap">
                    <Input
                        type="text"
                        placeholder="Descripción"
                        aria-label="Descripción del gasto"
                        className="flex-1 border-border rounded-lg text-sm min-w-[200px]"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        required
                    />
                    <Input
                        type="number"
                        placeholder="Monto"
                        aria-label="Monto del gasto"
                        className="w-32 border-border rounded-lg text-sm"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        required
                        min="0.01"
                        step="0.01"
                    />
                    <NativeSelect
                        aria-label="Tipo de gasto"
                        className="w-40 border-border rounded-lg text-sm"
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                    >
                        <option value="TASA_JUSTICIA">Tasa de Justicia</option>
                        <option value="PERITOS">Peritos</option>
                        <option value="MOVILIDAD">Movilidad</option>
                        <option value="HONORARIOS">Honorarios</option>
                        <option value="OTROS">Otros</option>
                    </NativeSelect>

                    <Label className="flex items-center gap-1 cursor-pointer px-3 py-2 border border-border rounded-lg text-sm text-secondary-foreground hover:bg-background transition-colors">
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
                    </Label>

                    <Button variant="legacy" size="legacy"
                        type="submit"
                        disabled={uploading}
                        className={`bg-primary text-white px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-1 ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-dark'}`}
                    >
                        <Plus className="w-4 h-4"/> {uploading ? `Guardando${progress ? ` (${progress}%)` : ''}...` : 'Añadir'}
                    </Button>
                </fieldset>
                </form>
                <p className="text-xs text-muted-foreground mb-4">Comprobantes de hasta 20 MB. El archivo se guarda al confirmar el gasto y se descarga con sesión.</p>

                <div className="overflow-x-auto">
                    <Table className="min-w-full divide-y divide-border text-sm cursor-default">
                        <TableHeader className="bg-background">
                            <TableRow>
                                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fecha</TableHead>
                                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Descripción</TableHead>
                                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Tipo</TableHead>
                                <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Monto</TableHead>
                                <TableHead className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Estado</TableHead>
                                <TableHead className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Doc</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-card divide-y divide-border">
                            {expenses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan="6" className="px-4 py-4 text-center text-muted-foreground italic">{error ? 'Los gastos no están disponibles.' : 'No hay gastos registrados.'}</TableCell>
                                </TableRow>
                            ) : (
                                expenses.map(e => (
                                    <TableRow key={e.id} className="hover:bg-background transition-colors">
                                        <TableCell className="px-4 py-3 whitespace-nowrap text-muted-foreground">{new Date(e.createdAt).toLocaleDateString('es-AR')}</TableCell>
                                        <TableCell className="px-4 py-3 font-medium text-foreground">{e.description}</TableCell>
                                        <TableCell className="px-4 py-3 text-muted-foreground">
                                            <span className="px-2 py-1 bg-muted rounded text-xs">{e.type}</span>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-right font-bold text-foreground">${e.amount.toLocaleString('es-AR')}</TableCell>
                                        <TableCell className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${e.status === 'PENDING' ? 'bg-yellow-100 text-status-yellow' : 'bg-green-100 text-status-green'}`}>
                                                {e.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-center">
                                            {e.receiptStatus === 'AVAILABLE' && e.receipt ? (
                                                <Button variant="legacy" size="legacy"
                                                    onClick={() => downloadReceipt(e)}
                                                    disabled={downloading === e.id}
                                                    aria-label={`Descargar comprobante de ${e.description}`}
                                                    className="text-link hover:text-primary-dark transition-colors inline-block"
                                                    title={e.receipt.name}
                                                >
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">{e.receiptStatus === 'MISSING' ? 'Archivo no disponible' : e.receiptUrl ? 'Comprobante anterior sin archivo verificable' : 'Sin comprobante'}</span>
                                            )}
                                            <Label className="block text-xs text-link cursor-pointer mt-1">
                                                {receiptBusy === e.id ? 'Guardando...' : e.receiptStatus === 'AVAILABLE' ? 'Reemplazar' : 'Cargar comprobante'}
                                                <input type="file" className="hidden" aria-label={`Cargar comprobante de ${e.description}`}
                                                    disabled={busy || !!error} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                                                    onChange={event => attachReceipt(event, e)} />
                                            </Label>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </Card>
    );
};
