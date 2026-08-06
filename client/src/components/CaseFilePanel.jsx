import React, { useState } from 'react';
import { File, Upload, Trash2, ExternalLink, Paperclip } from 'lucide-react';
import axios from 'axios';
import { api } from '../config/api';
import { useToast } from '../context/ToastContext';

export const CaseFilePanel = ({ caseId, studioId, initialFiles = [] }) => {
    const { showToast } = useToast();
    const [files, setFiles] = useState(initialFiles);
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const token = localStorage.getItem('token');
            // Mocking the upload URL since the backend doesn't handle multipart yet
            const mockUrl = `https://storage.lyp.com/cases/${caseId}/${encodeURIComponent(file.name)}`;
            
            const { data } = await axios.post(api.cases.addFile(caseId), {
                name: file.name,
                url: mockUrl
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setFiles(prev => [...prev, data]);
            showToast('Archivo registrado correctamente', 'success');
        } catch (err) {
            console.error('Error al registrar archivo:', err);
            showToast('No se pudo registrar el archivo', 'error');
        } finally {
            setUploading(false);
            e.target.value = null;
        }
    };

    const handleDeleteFile = async (fileId) => {
        if (!window.confirm('¿Está seguro de eliminar este archivo?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(api.cases.deleteFile(fileId), {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFiles(prev => prev.filter(f => f.id !== fileId));
            showToast('Archivo eliminado', 'success');
        } catch (err) {
            console.error('Error al eliminar archivo:', err);
            showToast('No se pudo eliminar el archivo', 'error');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-primary" />
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">Documentación y Archivos</h3>
                        <p className="text-[10px] text-gray-500 font-medium mt-0.5">Soporta Excel, PDF, Imágenes y Word</p>
                    </div>
                </div>
                <label className="cursor-pointer bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-light transition-colors flex items-center gap-2">
                    {uploading ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Upload className="w-3 h-3" />
                    )}
                    Subir Archivo
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
            </div>
            
            <div className="p-6">
                {files.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <File className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm font-medium">No hay archivos adjuntos</p>
                        <p className="text-xs mt-1">Sube Excel (.xlsx), PDFs, o imágenes relevantes para este expediente.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {files.map(file => (
                            <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-primary/30 transition-all bg-slate-50/50 group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-white rounded-lg border border-gray-100 group-hover:border-primary/20 transition-colors">
                                        <File className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-sm font-semibold text-gray-900 truncate" title={file.name}>{file.name}</p>
                                        <p className="text-[10px] text-gray-400">{new Date(file.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <a 
                                        href={file.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-white rounded-md transition-all"
                                        title="Ver archivo"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                    <button 
                                        onClick={() => handleDeleteFile(file.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-md transition-all"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
