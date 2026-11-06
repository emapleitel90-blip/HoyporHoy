import { Card } from './ui/card';
import { Label } from './ui/label';
import { Button } from './ui/button';
import React, { useEffect, useRef, useState } from 'react';
import { File, Upload, Trash2, Download, ExternalLink, Paperclip } from 'lucide-react';
import axios from 'axios';
import { api } from '../config/api';
import { notifyActivityChanged } from '../utils/activityEvents';
import { useToast } from '../context/ToastContext';
import { isPrivateFile, errorMessage, downloadCaseFile } from '../utils/caseFiles';

const EMPTY_FILES = [];
const legacyLink = file => {
    if (isPrivateFile(file)) return null;
    try {
        const url = new URL(file.url);
        return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && url.hostname !== 'storage.lyp.com' ? url.href : null;
    } catch { return null; }
};
export const CaseFilePanel = ({ caseId, initialFiles = EMPTY_FILES, onFilesChange }) => {
    const { showToast } = useToast();
    const [files, setFiles] = useState(initialFiles);
    const [uploading, setUploading] = useState(false);
    const [downloadingId, setDownloadingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const latestFiles = useRef(initialFiles);
    const activeCase = useRef(caseId);

    useEffect(() => { activeCase.current = caseId; latestFiles.current = initialFiles; setFiles(initialFiles); }, [caseId, initialFiles]);
    const updateFiles = nextFiles => {
        latestFiles.current = nextFiles;
        setFiles(nextFiles);
        onFilesChange?.(nextFiles);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) {
            showToast('El archivo supera el límite de 20 MB', 'error');
            e.target.value = '';
            return;
        }

        setUploading(true);
        try {
            const token = localStorage.getItem('lyp_token');
            const payload = new FormData();
            payload.append('file', file);
            const { data } = await axios.post(api.cases.addFile(caseId), payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            notifyActivityChanged();
            if (activeCase.current !== caseId) return;
            updateFiles([...latestFiles.current, data]);
            showToast('Archivo guardado correctamente', 'success');
        } catch (err) {
            showToast(await errorMessage(err, 'No se pudo guardar el archivo'), 'error');
        } finally {
            setUploading(false);
            e.target.value = null;
        }
    };

    const handleDownload = async (file) => {
        setDownloadingId(file.id);
        try {
            await downloadCaseFile(file);
        } catch (err) {
            showToast(await errorMessage(err, 'No se pudo descargar el archivo'), 'error');
        } finally { setDownloadingId(null); }
    };

    const handleDeleteFile = async (fileId) => {
        if (!window.confirm('¿Está seguro de eliminar este archivo?')) return;

        setDeletingId(fileId);
        try {
            const token = localStorage.getItem('lyp_token');
            const { data } = await axios.delete(api.cases.deleteFile(fileId), {
                headers: { Authorization: `Bearer ${token}` }
            });
            notifyActivityChanged();
            if (activeCase.current !== caseId) return;
            updateFiles(latestFiles.current.filter(file => file.id !== fileId));
            showToast(data.message || 'Archivo eliminado', data.cleanupPending ? 'warning' : 'success');
        } catch (err) {
            showToast(await errorMessage(err, 'No se pudo eliminar el archivo'), 'error');
        } finally { setDeletingId(null); }
    };

    return (
        <Card id="case-files" className="bg-card rounded-xl shadow-sm border border-border overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-border bg-background flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-link" />
                    <div>
                        <h3 className="text-base font-semibold text-foreground">Documentación y Archivos</h3>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">PDF, Word, Excel, PNG, JPG y WebP · Hasta 20 MB por archivo</p>
                    </div>
                </div>
                <Label className="cursor-pointer bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-light transition-colors flex items-center gap-2">
                    {uploading ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Upload className="w-3 h-3" />
                    )}
                    Subir Archivo
                    <input type="file" aria-label="Subir archivo al expediente" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </Label>
            </div>

            <div className="p-6">
                {files.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <File className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm font-medium">No hay archivos adjuntos</p>
                        <p className="text-xs mt-1">Sube Excel (.xlsx), PDFs, o imágenes relevantes para este expediente.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-live="polite">
                        {files.map(file => (
                            <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 transition-all bg-background/50 group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <Card className="p-2 bg-card rounded-lg border border-border group-hover:border-primary/20 transition-colors">
                                        <File className="w-4 h-4 text-link" />
                                    </Card>
                                    <div className="truncate">
                                        <p className="text-sm font-semibold text-foreground truncate" title={file.name}>{file.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{new Date(file.createdAt).toLocaleDateString()}</p>
                                        {!isPrivateFile(file) && <p className="text-xs text-status-amber">{legacyLink(file) ? 'Enlace anterior; carga privada sin verificar' : 'Registro anterior sin archivo disponible'}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {isPrivateFile(file) ? <Button variant="legacy" size="legacy"
                                        type="button"
                                        onClick={() => handleDownload(file)}
                                        disabled={!!downloadingId || deletingId === file.id}
                                        className="p-1.5 text-muted-foreground hover:text-link hover:bg-card rounded-md disabled:opacity-40"
                                        aria-label={`Descargar ${file.name}`}
                                        title="Descargar archivo"
                                    ><Download className="w-4 h-4" /></Button> : legacyLink(file) && <a
                                        href={legacyLink(file)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 text-muted-foreground hover:text-link hover:bg-card rounded-md transition-all"
                                        title="Abrir enlace anterior"
                                        aria-label={`Abrir enlace anterior de ${file.name}`}
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>}
                                    <Button variant="legacy" size="legacy"
                                        onClick={() => handleDeleteFile(file.id)}
                                        disabled={!!deletingId || downloadingId === file.id}
                                        className="p-1.5 text-muted-foreground hover:text-status-red hover:bg-card rounded-md transition-all"
                                        title="Eliminar"
                                        aria-label={`Eliminar ${file.name}`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
};
