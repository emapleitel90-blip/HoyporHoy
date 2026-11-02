import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { notifyActivityChanged } from '../utils/activityEvents';
vi.mock('../utils/activityEvents', () => ({ notifyActivityChanged: vi.fn() }));
import { TaskPanel } from '../components/TaskPanel';
import { api } from '../config/api';
vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock('../context/AuthContext', () => { const user = { id: 'reviewer', role: 'LAWYER', name: 'Revisora' }; return { useAuth: () => ({ user }) }; });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('espera el texto y aprueba la entrega seleccionada aunque exista una versión posterior', async () => {
    const task = { id: 'task', caseId: 'case', title: 'Revisar escrito', status: 'SUBMITTED', requiresWriting: true,
        assigneeId: 'junior', reviewerId: 'reviewer', assignee: {name:'Junior'}, reviewer: {name:'Revisora'},
        events: [{ id:'delivery', action:'SUBMITTED', writingVersionId:'v2', writingVersion:{id:'v2',writingId:'writing',number:2,title:'Escrito'},user:{name:'Junior'},createdAt:'2026-10-28T12:00:00Z' }] };
    let resolveVersion;
    axios.get.mockImplementation(url => url === api.tasks.byCase('case') ? Promise.resolve({data:[task]})
        : new Promise(resolve => { resolveVersion = resolve; }));
    axios.put.mockImplementation(async (url, body) => ({data:{...task,status:'APPROVED',events:[...task.events,{id:'review',requestId:body.requestId,action:'APPROVED',writingVersion:task.events[0].writingVersion,user:{name:'Revisora'},createdAt:'2026-10-28T12:01:00Z'}]}}));
    render(<TaskPanel caseItem={{id:'case',createdById:'reviewer'}} />);
    const approve = await screen.findByRole('button',{name:'Aprobar'});
    expect(approve.disabled).toBe(true);
    await act(async () => resolveVersion({data:{caseId:'case',currentVersion:3,selectedVersion:{id:'v2',title:'Escrito',number:2,content:'Texto entregado de la versión dos'}}}));
    await waitFor(() => expect(approve.disabled).toBe(false));
    fireEvent.click(approve);
    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(axios.put.mock.calls[0][1]).toMatchObject({submissionId:'delivery',decision:'APPROVED'});
    expect(axios.put.mock.calls[0][1].requestId).toMatch(/^[0-9a-f-]{36}$/);
    await screen.findByText('Escrito · versión 2 · Aprobada en esta entrega');
    expect(notifyActivityChanged).toHaveBeenCalledTimes(1);
});
