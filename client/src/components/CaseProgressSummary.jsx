import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { api } from '../config/api';

export const CaseProgressSummary = ({caseId,files=[]}) => <Progress key={caseId} caseId={caseId} files={files}/>;
function Progress({caseId,files}) {
    const [reload,setReload]=useState(0);
    const [docs,setDocs]=useState({status:'loading'});
    const [fees,setFees]=useState({status:'loading'});
    useEffect(()=>{
        let cancelled=false;const controller=new AbortController();
        const options={headers:{Authorization:'Bearer '+localStorage.getItem('lyp_token')},signal:controller.signal,timeout:15000};
        setDocs({status:'loading'});setFees({status:'loading'});
        const documents=axios.get(api.followUps.byCase(caseId),options).then(({data})=>{
            if(!Array.isArray(data)||data.some(item=>item.caseId!==caseId||!['DOCUMENT','COMMITMENT','BLOCKER'].includes(item.kind)||!['PENDING','RECEIVED','REVISION_REQUESTED','VERIFIED','COMPLETED'].includes(item.status)))throw new Error();
            return data;
        });
        const agreement=axios.get(api.fees.byCase(caseId),options).then(({data})=>{
            if(data!==null&&(data?.caseId!==caseId||!Number.isSafeInteger(data.balanceCents)||data.balanceCents<0))throw new Error();
            return data;
        });
        Promise.allSettled([documents,agreement]).then(([d,f])=>{
            if(cancelled)return;
            setDocs(d.status==='fulfilled'?{status:'ready',data:d.value}:{status:'error'});
            setFees(f.status==='fulfilled'?{status:'ready',data:f.value}:{status:'error'});
        });
        const refresh=()=>setReload(value=>value+1);
        const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);
        return()=>{cancelled=true;controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh);};
    },[caseId,reload]);
    const documents=docs.data?.filter(item=>item.kind==='DOCUMENT')||[];
    const pending=documents.filter(item=>item.status!=='VERIFIED');
    const received=documents.filter(item=>item.status==='RECEIVED').length;
    const commitments=docs.data?.filter(item=>item.kind==='COMMITMENT'&&item.status!=='COMPLETED').length||0;
    const blockers=docs.data?.filter(item=>item.kind==='BLOCKER'&&item.status!=='COMPLETED').length||0;
    return <section className="bg-white rounded-xl border p-5 space-y-3" aria-label="Resumen del expediente">
        <div className="flex flex-wrap justify-between gap-3"><h3 className="font-semibold">Documentación y cobranza · resumen</h3>
            <button type="button" className="underline text-sm" disabled={docs.status==='loading'||fees.status==='loading'} onClick={()=>setReload(value=>value+1)}>Actualizar resumen</button></div>
        <p className="text-xs text-gray-500">Se consulta al abrir, cada 30 segundos y al volver a esta ventana.</p>
        <div className="grid gap-4 sm:grid-cols-3">
            <div><h4 className="font-medium">Archivos</h4><p>{files.length} {files.length===1?'archivo registrado':'archivos registrados'}</p><a href="#case-files" className="underline text-indigo-700">Ir a archivos</a><p className="text-xs text-gray-500">Un archivo cargado no equivale a un documento verificado.</p></div>
            <div><h4 className="font-medium">Documentación y cliente</h4>
                {docs.status==='loading'?<p role="status">Consultando seguimiento…</p>:docs.status==='error'?<p role="alert">No se pudo confirmar el seguimiento.</p>:<>
                    <p>{!documents.length?'Sin requisitos documentales registrados':!pending.length?'Todos los requisitos documentales verificados':pending.length===1?'1 requisito documental sin verificar':`${pending.length} requisitos documentales sin verificar`}</p>
                    {!!received&&<p>{received===1?'1 documento recibido para revisar':`${received} documentos recibidos para revisar`}</p>}
                    <p>{commitments} {commitments===1?'compromiso pendiente':'compromisos pendientes'} · {blockers} {blockers===1?'bloqueo pendiente':'bloqueos pendientes'}</p>
                </>}
                <a href="#case-follow-ups" className="underline text-indigo-700">Ir al seguimiento</a>
            </div>
            <div><h4 className="font-medium">Honorarios</h4>
                {fees.status==='loading'?<p role="status">Consultando saldo…</p>:fees.status==='error'?<p role="alert">No se pudo confirmar el saldo.</p>:fees.data===null?<p>Sin acuerdo registrado</p>:<p>Saldo por cobrar: {new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(fees.data.balanceCents/100)}</p>}
                <a href="#case-fees" className="underline text-indigo-700">Ir a honorarios</a>
            </div>
        </div>
    </section>;
}
