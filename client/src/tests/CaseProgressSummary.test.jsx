import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import axios from 'axios';
import { CaseProgressSummary } from '../components/CaseProgressSummary';
vi.mock('axios',()=>({default:{get:vi.fn()}}));
afterEach(()=>{cleanup();vi.resetAllMocks();});
it('distingue archivos, requisitos y compromisos y muestra el saldo autorizado',async()=>{
    axios.get.mockResolvedValueOnce({data:[{caseId:'case',kind:'DOCUMENT',status:'RECEIVED'},{caseId:'case',kind:'COMMITMENT',status:'PENDING'}]})
        .mockResolvedValueOnce({data:{caseId:'case',balanceCents:12500000}});
    render(<CaseProgressSummary caseId="case" files={[{id:'file'}]}/>);
    await screen.findByText('1 requisito documental sin verificar');
    expect(screen.getByText('1 documento recibido para revisar')).toBeTruthy();
    expect(screen.getByText('1 compromiso pendiente · 0 bloqueos pendientes')).toBeTruthy();
    expect(screen.getByText(/125.000/)).toBeTruthy();
    expect(screen.getByRole('link',{name:'Ir al seguimiento'}).getAttribute('href')).toBe('#case-follow-ups');
});
it('no confunde fallos con ausencia de requisitos o saldo cero y permite reintentar',async()=>{
    axios.get.mockRejectedValueOnce(new Error()).mockResolvedValueOnce({data:null})
        .mockResolvedValueOnce({data:[]}).mockResolvedValueOnce({data:{caseId:'case',balanceCents:0}});
    render(<CaseProgressSummary caseId="case"/>);
    await screen.findByRole('alert');
    expect(screen.queryByText('Sin requisitos documentales registrados')).toBeNull();
    expect(screen.getByText('Sin acuerdo registrado')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Actualizar resumen'}));
    await screen.findByText('Sin requisitos documentales registrados');
    expect(screen.getByText(/Saldo por cobrar:.*0,00/)).toBeTruthy();
});
it('descarta respuestas tardías de otro expediente',async()=>{
    let finish;
    axios.get.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;})).mockResolvedValueOnce({data:{caseId:'old',balanceCents:900}})
        .mockResolvedValueOnce({data:[]}).mockResolvedValueOnce({data:null});
    const {rerender}=render(<CaseProgressSummary caseId="old"/>);
    rerender(<CaseProgressSummary caseId="new"/>);
    await screen.findByText('Sin acuerdo registrado');
    await act(async()=>finish({data:[{caseId:'old',kind:'DOCUMENT',status:'RECEIVED'}]}));
    expect(screen.queryByText('1 documento recibido para revisar')).toBeNull();
    expect(screen.getByText('Sin requisitos documentales registrados')).toBeTruthy();
});
