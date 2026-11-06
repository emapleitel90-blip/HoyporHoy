import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { NativeSelect } from '../components/ui/native-select';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Check, CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { api } from '../config/api';
const searchable = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error,setError]=useState('');
    const [busy,setBusy]=useState(false);
    const [query,setQuery]=useState('');
    const [onlyUnread,setOnlyUnread]=useState(false);
    const [caseFilter,setCaseFilter]=useState('');
    const [cursor,setCursor]=useState(null);
    const [nextCursor,setNextCursor]=useState(null);
    const [page,setPage]=useState(1);
    const terms=searchable(query.trim()).split(/\s+/).filter(Boolean);
    const cases=new Map(notifications.filter(n=>n.case?.id).map(n=>[n.case.id,n.case]));
    const filtered=notifications.filter(n=>(!onlyUnread||!n.isRead)&&(!caseFilter||n.case?.id===caseFilter)&&
        terms.every(term=>searchable([n.title,n.message,n.case?.caseNumber,n.case?.title].join(' ')).includes(term)));
    const hasFilters=!!query||onlyUnread||!!caseFilter;
    const generation=useRef(0);
    const invalidate=useCallback(()=>{++generation.current;},[]);

    const fetchNotifications = useCallback(async () => {
        const current=++generation.current;
        try {
            const token = localStorage.getItem('lyp_token');
            const { data } = await axios.get(api.notifications.list, {
                headers: { Authorization: `Bearer ${token}` },...(cursor?{params:{cursor}}:{})
            });
            if(!Array.isArray(data.notifications)||!Number.isSafeInteger(data.unread)||data.unread<0)throw new Error('Respuesta inválida');
            if(data.nextCursor!=null&&typeof data.nextCursor!=='string')throw new Error('Respuesta inválida');
            if(current===generation.current){setNotifications(data.notifications);setUnreadCount(data.unread);setNextCursor(data.nextCursor||null);setError('');}
        } catch (error) {
            if(current===generation.current)setError(error.response?.data?.message||'No se pudo actualizar la actividad. Reintentá con Actualizar actividad.');
        } finally {
            if(current===generation.current)setLoading(false);
        }
    },[cursor]);

    useEffect(() => {
        fetchNotifications();
        const timer=cursor?null:setInterval(fetchNotifications,30000);
        if(!cursor)window.addEventListener('focus',fetchNotifications);
        return()=>{invalidate();clearInterval(timer);window.removeEventListener('focus',fetchNotifications);};
    }, [fetchNotifications,invalidate,cursor]);
    const goToPage=(value,number)=>{
        invalidate();setNotifications([]);setNextCursor(null);setError('');setLoading(true);setCursor(value);setPage(number);
    };
    const refresh=()=>{if(cursor)goToPage(null,1);else fetchNotifications();};

    const handleMarkAsRead = async (id) => {
        if(busy)return;setBusy(true);
        try {
            const token = localStorage.getItem('lyp_token');
            await axios.put(api.notifications.markRead(id), {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchNotifications();window.dispatchEvent(new Event('notifications-updated'));
        } catch (error) {
            setError('No se pudo marcar como leída. Reintentá.');
        } finally {setBusy(false);}
    };

    const handleMarkAllAsRead = async () => {
        if(busy)return;setBusy(true);
        try {
            const token = localStorage.getItem('lyp_token');
            await axios.put(api.notifications.markAllRead, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchNotifications();window.dispatchEvent(new Event('notifications-updated'));
        } catch (error) {
            setError('No se pudieron marcar las notificaciones. Reintentá.');
        } finally {setBusy(false);}
    };

    const getIconColor = (type) => {
        switch (type) {
            case 'DEADLINE_ALERT': return 'text-status-yellow bg-yellow-100';
            case 'AUDIT_ALERT': return 'text-status-red bg-red-100';
            case 'EXPENSE': return 'text-status-green bg-green-100';
            default: return 'text-link bg-blue-100';
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center p-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-wrap gap-3 items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Actividad y notificaciones</h2>
                    <p className="text-sm text-muted-foreground mt-1">Tenés {unreadCount} notificaciones sin leer</p>
                </div>
                {unreadCount > 0 && !hasFilters && !cursor && (
                    <Button variant="legacy" size="legacy" disabled={busy} onClick={handleMarkAllAsRead} className="flex items-center gap-2 text-sm text-link hover:text-primary-dark font-medium transition-colors">
                        <CheckSquare className="w-4 h-4" /> Marcar todas como leídas
                    </Button>
                )}
            </div>
            <p className="text-sm text-secondary-foreground">Hasta 50 avisos por página de los expedientes a los que tenés acceso. Incluye cambios del expediente, archivos, vencimientos, gastos, tareas, revisiones, seguimientos, escritos, modelos, referencias jurídicas y honorarios. Los avisos recientes se actualizan cada 30 segundos y al volver a esta ventana.</p>
            <Button variant="legacy" size="legacy" disabled={busy} onClick={refresh} className="underline">Actualizar actividad</Button>
            <div className="flex flex-wrap items-center gap-4" aria-label="Páginas de actividad">
                <span>Página {page}</span>
                <Button variant="legacy" size="legacy" disabled={busy||!cursor} onClick={()=>goToPage(null,1)} className="underline disabled:opacity-50">Volver a los más recientes</Button>
                <Button variant="legacy" size="legacy" disabled={busy||!nextCursor} onClick={()=>goToPage(nextCursor,page+1)} className="underline disabled:opacity-50">Ver avisos más antiguos</Button>
            </div>
            {!!cursor&&<p className="text-sm text-secondary-foreground">Esta página conserva su posición. Actualizar actividad vuelve a los avisos recientes.</p>}
            {error&&<p role="alert" className="text-status-red">{error}</p>}
            {!!notifications.length&&<Card className="bg-card border rounded-xl p-4 grid gap-3 sm:grid-cols-2">
                <Label className="text-sm grid gap-1 min-w-0">Buscar actividad
                    <Input type="search" className="border rounded-lg p-2 min-w-0 w-full" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Cambio, autor, versión o expediente"/>
                </Label>
                <Label className="text-sm grid gap-1 min-w-0">Expediente de la actividad
                    <NativeSelect className="border rounded-lg p-2 min-w-0 w-full" value={caseFilter} onChange={event=>setCaseFilter(event.target.value)}>
                        <option value="">Todos los expedientes</option>
                        {caseFilter&&!cases.has(caseFilter)&&<option value={caseFilter}>Expediente seleccionado sin avisos recientes</option>}
                        {[...cases.values()].map(item=><option key={item.id} value={item.id}>{item.caseNumber} · {item.title}</option>)}
                    </NativeSelect>
                </Label>
                <Label className="text-sm flex items-center gap-2"><input type="checkbox" checked={onlyUnread} onChange={event=>setOnlyUnread(event.target.checked)}/>Solo sin leer</Label>
                <p role="status" className="text-sm text-secondary-foreground">{filtered.length} de {notifications.length} avisos cargados</p>
                {hasFilters&&<Button variant="legacy" size="legacy" type="button" className="underline text-left" onClick={()=>{setQuery('');setCaseFilter('');setOnlyUnread(false);}}>Limpiar filtros de actividad</Button>}
                <p className="text-xs text-muted-foreground sm:col-span-2">Los filtros buscan dentro de los avisos de esta página.</p>
            </Card>}

            <Card className="bg-card rounded-xl shadow-sm border border-border divide-y divide-border overflow-hidden">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p>{error?'La actividad no está disponible en este momento.':cursor?'No hay más avisos en esta página.':'No tenés notificaciones recientes.'}</p>
                    </div>
                ) : !filtered.length ? <p className="p-6 text-secondary-foreground">No hay avisos que coincidan con los filtros.</p> : (
                    filtered.map(n => (
                        <div key={n.id} className={`p-4 hover:bg-background transition-colors flex gap-4 ${n.isRead ? 'opacity-70' : 'bg-blue-50/30'}`}>
                            <div className="flex-shrink-0 mt-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getIconColor(n.type)}`}>
                                    <Bell className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between gap-4">
                                    <h4 className={`text-sm font-bold ${!n.isRead ? 'text-foreground' : 'text-foreground'}`}>{n.title}</h4>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(n.createdAt).toLocaleString('es-AR',{timeZone:'America/Argentina/Cordoba',hourCycle:'h23'})}</span>
                                </div>
                                <p className="text-sm text-secondary-foreground mt-1 mb-2">
                                    {n.message}
                                </p>
                                <div className="flex items-center gap-4 text-xs font-medium">
                                    {n.case && (
                                        <Link to={n.type==='IMPORT'?'/cases':`/cases/${n.case.id}`} className="text-link hover:underline">
                                            {n.type==='IMPORT'?'Ver expedientes':`Ir al Expediente: ${n.case.caseNumber}`}
                                        </Link>
                                    )}
                                    {!n.isRead && (
                                        <Button variant="legacy" size="legacy" disabled={busy} onClick={() => handleMarkAsRead(n.id)} className="text-muted-foreground hover:text-status-green flex items-center gap-1 transition-colors">
                                            <Check className="w-3 h-3" /> Marcar leída
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </Card>
        </div>
    );
};

export default Notifications;
