import React, { useState, useRef } from 'react';
import { readImportRows } from '../utils/importRows';
import { UploadCloud, X, FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { api } from '../config/api';
import { useToast } from '../context/ToastContext';

export const DataImportModal = ({ isOpen, onClose, onImportSuccess }) => {
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [step, setStep] = useState(1);
    const fileInputRef = useRef(null);
    const loadVersion = useRef(0);
    const requestId = useRef(null);
    const submitting = useRef(false);
    const { showToast } = useToast();

    if (!isOpen) return null;

    const handleFileChange = async (e) => {
        if(loading)return;
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;
        e.target.value = '';

        const fileExt = selectedFile.name.split('.').pop().toLowerCase();
        const version = ++loadVersion.current;
        requestId.current=null;
        setPreviewData([]);
        setStep(1);
        if (!['csv', 'xlsx', 'xls'].includes(fileExt)) {
            showToast('Formato no soportado. Por favor sube un CSV o Excel.', 'warning');
            setFile(null);
            setParsing(false);
            return;
        }
        setFile(selectedFile);
        setParsing(true);
        try {
            const rows = await readImportRows(selectedFile);
            if (version !== loadVersion.current) return;
            setPreviewData(rows);
            setStep(2);
        } catch (error) {
            if (version !== loadVersion.current) return;
            setFile(null);
            showToast(error.message, 'error');
        } finally {
            if (version === loadVersion.current) setParsing(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileChange({ target: { files: e.dataTransfer.files } });
        }
    };

    const confirmImport = async () => {
        if (loading || submitting.current || !previewData || previewData.length === 0) return;
        submitting.current=true;
        setLoading(true);

        try {
            // Map common column names from Spanish to the schema properties
            const mappedCases = previewData.map(row => {
                return {
                    title: row['Título'] || row['Titulo'] || row['title'] || row['Caso'] || null,
                    clientName: row['Cliente'] || row['Nombre'] || row['clientName'] || row['Consultante'] || null,
                    description: row['Descripción'] || row['Descripcion'] || row['description'] || row['Hechos'] || null,
                    fuero: row['Fuero'] || row['fuero'] || row['Rama'] || null,
                    status: row['Estado'] || row['status'] || 'OPEN'
                };
            }).filter(c => c.title || c.clientName); // Keep only rows with at least title or clientName

            if (mappedCases.length === 0) {
                showToast('No se encontraron columnas válidas (Título, Cliente, etc.)', 'warning');
                setLoading(false);
                return;
            }

            const token = localStorage.getItem('lyp_token');
            requestId.current ||= crypto.randomUUID();
            const res = await axios.post(api.cases.import, { cases: mappedCases,requestId:requestId.current }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if(res.data?.requestId!==requestId.current||res.data?.count!==mappedCases.length)throw new Error('No se pudo confirmar la importación. Conservamos la vista previa para reintentar.');

            showToast(res.data.message, 'success');
            onImportSuccess();
            closeModal();
        } catch (error) {
            showToast(error.response?.data?.message || 'No se pudo confirmar la importación. Conservamos la vista previa: reintentá sin volver a elegir el archivo.', 'error');
        } finally {
            submitting.current=false;
            setLoading(false);
        }
    };

    const closeModal = () => {
        requestId.current=null;
        loadVersion.current++;
        setParsing(false);
        setFile(null);
        setPreviewData([]);
        setStep(1);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Importación White-Glove</h2>
                        <p className="text-sm text-gray-500 mt-1">Sube tu Excel o CSV para importar casos masivamente.</p>
                    </div>
                    <button onClick={closeModal} disabled={loading} aria-label="Cerrar importación" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8">
                    {step === 1 && (
                        <div 
                            className="border-2 border-dashed border-primary/30 rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-primary/5 transition-colors group"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <UploadCloud className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Haz clic o arrastra tu archivo aquí</h3>
                            <p className="text-sm text-gray-500 max-w-sm mb-6">
                                Soporta formatos <b>.CSV, .XLSX, .XLS</b>.<br/>
                                Asegúrate de incluir columnas como &quot;Título&quot;, &quot;Cliente&quot; o &quot;Fuero&quot;.
                            </p>
                            <button className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium shadow-sm shadow-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all">
                                {parsing ? 'Leyendo archivo...' : 'Seleccionar Archivo'}
                            </button>
                            <input 
                                type="file" 
                                aria-label="Archivo para importar"
                                ref={fileInputRef} 
                                className="hidden" 
                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                                onChange={handleFileChange}
                            />
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-fade-in">
                            <div className="flex items-center gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    <FileSpreadsheet className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800">{file?.name}</h4>
                                    <p className="text-sm text-gray-600">{previewData.length} filas detectadas</p>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-6 max-h-48 overflow-y-auto">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Previsualización (Primeras 3 filas)</p>
                                <div className="space-y-2">
                                    {previewData.slice(0, 3).map((row, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-lg border border-gray-100 text-sm text-gray-700 flex flex-wrap gap-x-4 gap-y-2">
                                            {Object.entries(row).slice(0, 4).map(([k, v]) => (
                                                <span key={k} className="flex items-center gap-1">
                                                    <span className="font-medium text-gray-400">{k}:</span>
                                                    <span className="truncate max-w-[150px]">{String(v)}</span>
                                                </span>
                                            ))}
                                            {Object.keys(row).length > 4 && <span className="text-gray-400 italic">...</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 justify-end mt-8">
                                <button 
                                    onClick={() => setStep(1)} 
                                    className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                                    disabled={loading}
                                >
                                    Cambiar archivo
                                </button>
                                <button 
                                    onClick={confirmImport} 
                                    className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium shadow-sm shadow-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-70 disabled:hover:translate-y-0"
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                    {loading ? 'Importando...' : 'Confirmar e Importar'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
