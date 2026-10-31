import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Notifications from '../pages/Notifications';
vi.mock('axios',()=>({default:{get:vi.fn(),put:vi.fn()}}));
afterEach(()=>{cleanup();vi.resetAllMocks();});
const notice={id:'notice',title:'Entrega aprobada',message:'Abogada · Escrito · versión 1',createdAt:'2026-10-29T21:00:00Z',isRead:false,case:{id:'case',caseNumber:'DEMO'}};
it('muestra autor y versión, enlaza el expediente y confirma la lectura con el servidor',async()=>{
    axios.get.mockResolvedValueOnce({data:{notifications:[notice],unread:1}}).mockResolvedValue({data:{notifications:[{...notice,isRead:true}],unread:0}});
    axios.put.mockResolvedValue({});
    render(<MemoryRouter><Notifications/></MemoryRouter>);
    await screen.findByText(notice.message);
    expect(screen.getByRole('link',{name:'Ir al Expediente: DEMO'}).getAttribute('href')).toBe('/cases/case');
    expect(screen.getByText(/18:00/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Marcar leída',exact:true}));
    await waitFor(()=>expect(screen.queryByRole('button',{name:'Marcar leída',exact:true})).toBeNull());
    expect(axios.put).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Tenés 0 notificaciones sin leer')).toBeTruthy();
});
it('informa el error y permite recuperar la actividad sin mostrar un vacío ficticio',async()=>{
    axios.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({data:{notifications:[notice],unread:1}});
    render(<MemoryRouter><Notifications/></MemoryRouter>);
    await screen.findByRole('alert');
    expect(screen.queryByText('No tenés notificaciones recientes.')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Actualizar actividad'}));
    await screen.findByText(notice.message);
    expect(screen.queryByRole('alert')).toBeNull();
});
it('combina texto sin acentos, expediente y no leídas sin alterar avisos ocultos',async()=>{
    const second={...notice,id:'second',title:'Archivo incorporado',message:'María · Córdoba',isRead:true,case:{id:'other',caseNumber:'OTRO',title:'Segundo expediente'}};
    axios.get.mockResolvedValueOnce({data:{notifications:[notice,second],unread:1}}).mockResolvedValue({data:{notifications:[{...notice,isRead:true},second],unread:0}});
    axios.put.mockResolvedValue({});
    render(<MemoryRouter><Notifications/></MemoryRouter>);
    await screen.findByText('2 de 2 avisos cargados');
    fireEvent.change(screen.getByLabelText('Buscar actividad'),{target:{value:'MARIA CORDOBA'}});
    expect(screen.getByText('1 de 2 avisos cargados')).toBeTruthy();
    expect(screen.queryByText(notice.message)).toBeNull();
    fireEvent.change(screen.getByLabelText('Expediente de la actividad'),{target:{value:'case'}});
    expect(screen.getByText('No hay avisos que coincidan con los filtros.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Limpiar filtros de actividad'}));
    fireEvent.click(screen.getByLabelText('Solo sin leer'));
    expect(screen.queryByRole('button',{name:'Marcar todas como leídas'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Marcar leída',exact:true}));
    await screen.findByText('0 de 2 avisos cargados');
    expect(screen.getByLabelText('Solo sin leer').checked).toBe(true);
    fireEvent.click(screen.getByRole('button',{name:'Limpiar filtros de actividad'}));
    expect(screen.getByText(second.message)).toBeTruthy();
    expect(screen.getByText(notice.message)).toBeTruthy();
    expect(axios.put).toHaveBeenCalledTimes(1);
});
it('consulta páginas antiguas con cursor y permite volver a los avisos recientes',async()=>{
    const older={...notice,id:'older',title:'Cambio anterior',message:'Actividad anterior'};
    axios.get.mockResolvedValueOnce({data:{notifications:[notice],unread:2,nextCursor:'cursor-one'}})
        .mockResolvedValueOnce({data:{notifications:[older],unread:2,nextCursor:null}})
        .mockResolvedValueOnce({data:{notifications:[notice],unread:2,nextCursor:'cursor-one'}});
    render(<MemoryRouter><Notifications/></MemoryRouter>);
    await screen.findByText(notice.message);
    fireEvent.click(screen.getByRole('button',{name:'Ver avisos más antiguos'}));
    await screen.findByText(older.message);
    expect(screen.getByText('Página 2')).toBeTruthy();
    expect(axios.get.mock.calls[1][1].params).toEqual({cursor:'cursor-one'});
    expect(screen.queryByText(notice.message)).toBeNull();
    expect(screen.queryByRole('button',{name:'Marcar todas como leídas'})).toBeNull();
    expect(screen.getByRole('button',{name:'Ver avisos más antiguos'}).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button',{name:'Volver a los más recientes'}));
    await screen.findByText(notice.message);
    expect(screen.getByText('Página 1')).toBeTruthy();
    expect(axios.put).not.toHaveBeenCalled();
});
it('no presenta datos de la página previa si falla la siguiente y permite volver a recientes',async()=>{
    axios.get.mockResolvedValueOnce({data:{notifications:[notice],unread:1,nextCursor:'cursor-one'}})
        .mockRejectedValueOnce({response:{data:{message:'Esta página ya no está disponible.'}}})
        .mockResolvedValueOnce({data:{notifications:[notice],unread:1,nextCursor:null}});
    render(<MemoryRouter><Notifications/></MemoryRouter>);
    await screen.findByText(notice.message);
    fireEvent.click(screen.getByRole('button',{name:'Ver avisos más antiguos'}));
    await screen.findByRole('alert');
    expect(screen.queryByText(notice.message)).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Volver a los más recientes'}));
    await screen.findByText(notice.message);
    expect(screen.queryByRole('alert')).toBeNull();
});
it('ofrece abrir la lista de expedientes desde un aviso de importación',async()=>{
    axios.get.mockResolvedValue({data:{notifications:[{...notice,type:'IMPORT',title:'Importación de expedientes completada',message:'Abogada · 2 expedientes incorporados'}],unread:1}});
    render(<MemoryRouter><Notifications/></MemoryRouter>);
    expect((await screen.findByRole('link',{name:'Ver expedientes'})).getAttribute('href')).toBe('/cases');
    expect(screen.queryByRole('link',{name:'Ir al Expediente: DEMO'})).toBeNull();
});
