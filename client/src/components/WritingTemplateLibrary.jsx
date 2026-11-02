import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { api } from '../config/api';
import { notifyActivityChanged } from '../utils/activityEvents';
const blank = {title:'',content:'',jurisdiction:'',fuero:'',kind:''};
const auth = () => ({headers:{Authorization:'Bearer '+localStorage.getItem('lyp_token')}});
const fieldValue = (values, key) => Object.hasOwn(values, key) ? values[key] : '';
export function WritingTemplateLibrary({caseId,canManage,disabled,onUse,sourceVersion}) {
    return <TemplateLibrary key={caseId} caseId={caseId} canManage={canManage} disabled={disabled} onUse={onUse} sourceVersion={sourceVersion}/>;
}
function TemplateLibrary({caseId,canManage,disabled,onUse,sourceVersion}) {
    const [open,setOpen]=useState(false),[items,setItems]=useState([]),[draft,setDraft]=useState(blank);
    const [error,setError]=useState(''),[busy,setBusy]=useState(false),[filter,setFilter]=useState('');
    const [selected,setSelected]=useState(null),[values,setValues]=useState({});
    const [confirmDiscard,setConfirmDiscard]=useState(false);
    const [loading,setLoading]=useState(false),[loadError,setLoadError]=useState(''),[loaded,setLoaded]=useState(false),[retry,setRetry]=useState(0);
    const requestId=useRef(null);
    const generation=useRef(0);
    const titleInput=useRef(null);
    const hasDraft=Object.values(draft).some(value=>value.length>0);
    const copyModel=item=>{
        if(disabled||busy||!canManage)return;
        if(hasDraft){setError('Ya hay un modelo en preparación. Guardalo o descartá el borrador antes de copiar otro.');return;}
        setDraft(Object.fromEntries(Object.keys(blank).map(key=>[key,item[key]||''])));
        requestId.current=null;setError('');
        titleInput.current?.focus();
    };
    useEffect(()=>{
        if(!open)return;
        let cancelled=false;
        const current=++generation.current;
        setLoading(true);setLoadError('');
        axios.get(api.writings.templates(caseId),auth()).then(({data})=>{
            if(!Array.isArray(data)||data.some(item=>!item||['id','title','content','jurisdiction','fuero','kind'].some(key=>typeof item[key]!=='string')))throw new Error();
            if(!cancelled&&current===generation.current){setItems(data);setLoaded(true);}
        }).catch(()=>{if(!cancelled&&current===generation.current)setLoadError('No se pudieron cargar los modelos. Podés reintentar sin perder lo escrito.');})
            .finally(()=>{if(!cancelled&&current===generation.current)setLoading(false);});
        return ()=>{cancelled=true;};
    },[caseId,open,retry]);
    const save=async event=>{
        event.preventDefault();if(busy||disabled||loading||!canManage)return;++generation.current;setBusy(true);setError('');
        try{
            requestId.current ||= crypto.randomUUID();
            const payload={...draft,title:draft.title.trim(),jurisdiction:draft.jurisdiction.trim(),fuero:draft.fuero.trim(),kind:draft.kind.trim(),content:draft.content.replace(/\r\n?/g,'\n'),requestId:requestId.current};
            const {data}=await axios.post(api.writings.templates(caseId),payload,auth());
            if(!data?.id||Object.keys(payload).some(key=>data[key]!==payload[key]))throw new Error();
            notifyActivityChanged();
            setItems(current=>[data,...current.filter(item=>item.id!==data.id)]);setDraft(blank);setConfirmDiscard(false);requestId.current=null;
        }catch(err){setError(err.response?.data?.message||'No se pudo confirmar el modelo. Conservamos los datos para reintentar.');}
        finally{setBusy(false);}
    };
    const fields=selected?[...new Set([...selected.content.matchAll(/\{\{([A-Za-z_][A-Za-z_0-9]*)\}\}/g)].map(match=>match[1]))]:[];
    const text=selected?.content.replace(/\{\{([A-Za-z_][A-Za-z_0-9]*)\}\}/g,(_,key)=>fieldValue(values,key))||'';
    const visibleItems=items.filter(item=>[item.title,item.jurisdiction,item.fuero,item.kind].join(' ').toLowerCase().includes(filter.trim().toLowerCase()));
    return <div className="border rounded p-3 space-y-3">
        <button type="button" className="underline" disabled={busy} onClick={()=>setOpen(value=>!value)}>{open?'Cerrar biblioteca de modelos':'Biblioteca de modelos del estudio'}</button>
        {canManage&&sourceVersion&&<button type="button" className="block underline" disabled={disabled||busy} onClick={()=>{
            setOpen(true);copyModel({title:sourceVersion.title,content:sourceVersion.content});
        }}>Crear modelo desde versión {sourceVersion.number} guardada</button>}
        {open&&<><p>Los modelos son textos de trabajo del estudio. Revisá su contenido y adecuación antes de guardar un escrito. Cada modelo guardado se conserva; para corregirlo, incorporá una copia nueva.</p>
            <label>Filtrar modelos<input className="block w-full border p-2" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Título, jurisdicción, fuero o tipo"/></label>
            {loading&&<p role="status">Cargando modelos…</p>}
            {loadError&&<div role="alert"><p>{loadError}</p><button type="button" className="underline" disabled={busy||loading} onClick={()=>setRetry(value=>value+1)}>Reintentar carga de modelos</button></div>}
            {loaded&&!loading&&!loadError&&!items.length&&<p>No hay modelos guardados.</p>}
            {!!items.length&&!visibleItems.length&&<p>No hay modelos que coincidan con el filtro.</p>}
            {visibleItems.map(item=><article key={item.id} className="border rounded p-3">
                <h3 className="font-semibold">{item.title}</h3><p>{item.jurisdiction} · {item.fuero} · {item.kind}</p><p>Autor: {item.createdByName}</p>
                <button type="button" className="underline" disabled={disabled||busy} onClick={()=>{setSelected(item);setValues({});}}>Preparar escrito desde {item.title}</button>
                {canManage&&<button type="button" className="block underline mt-2" disabled={disabled||busy} onClick={()=>copyModel(item)}>Copiar para corregir: {item.title}</button>}
            </article>)}
            {selected&&<div className="border rounded p-3 space-y-2"><h3>Preparar modelo: {selected.title}</h3>
                {fields.map(field=><label key={field} className="block">Valor para {field}<input className="block border p-2 w-full" maxLength={2000} value={fieldValue(values,field)} onChange={e=>setValues(current=>({...current,[field]:e.target.value}))}/></label>)}
                <pre className="whitespace-pre-wrap break-words font-serif">{text}</pre>
                <button type="button" disabled={disabled||busy||fields.some(field=>!fieldValue(values,field).trim())||text.length>20000} className="underline" onClick={()=>onUse({title:selected.title,content:text})}>Abrir como nuevo escrito</button>
                {text.length>20000&&<p role="alert">El texto completado supera los 20.000 caracteres. Acortá los valores.</p>}
            </div>}
            {canManage&&<form onSubmit={save} className="grid gap-2 border rounded p-3"><h3 className="font-semibold">Incorporar modelo</h3>
                <p>Podés escribir campos como {'{{cliente}}'} o {'{{objeto}}'}; al usar el modelo se pedirán sus valores.</p>
                <p>Una copia se guarda como un modelo nuevo. Cambiá el título para distinguirla del original.</p>
                <p>El modelo estará disponible en la biblioteca del estudio. Reemplazá los datos particulares del expediente por campos como {'{{cliente}}'} antes de guardarlo.</p>
                {Object.entries({title:'Título del modelo',jurisdiction:'Jurisdicción del modelo',fuero:'Fuero del modelo',kind:'Tipo de escrito del modelo',content:'Texto del modelo'}).map(([key,label])=><label key={key}>{label}{key==='content'?<textarea required rows={8} maxLength={20000} className="block w-full border p-2" value={draft[key]} disabled={busy||disabled} onChange={e=>{requestId.current=null;setDraft(current=>({...current,[key]:e.target.value}));}}/>:<input ref={key==='title'?titleInput:null} required maxLength={key==='title'?200:120} className="block w-full border p-2" value={draft[key]} disabled={busy||disabled} onChange={e=>{requestId.current=null;setDraft(current=>({...current,[key]:e.target.value}));}}/>}</label>)}
                <button disabled={busy||disabled||loading}>{busy?'Guardando modelo…':'Guardar modelo en biblioteca'}</button>
                {hasDraft&&!confirmDiscard&&<button type="button" disabled={busy||disabled} onClick={()=>setConfirmDiscard(true)}>Descartar borrador del modelo</button>}
                {hasDraft&&confirmDiscard&&<div className="border rounded p-3 space-y-2" role="group" aria-label="Confirmar descarte del borrador">
                    <p>Se perderán los cambios sin guardar de este modelo. Los modelos guardados se conservan.</p>
                    <button type="button" className="block underline" disabled={busy||disabled} onClick={()=>setConfirmDiscard(false)}>Seguir editando el modelo</button>
                    <button type="button" className="block underline text-red-700" disabled={busy||disabled} onClick={()=>{
                        setDraft(blank);setConfirmDiscard(false);requestId.current=null;setError('');
                    }}>Confirmar descarte del modelo</button>
                </div>}
            </form>}
            {error&&<p role="alert" className="text-red-700">{error}</p>}
        </>}
    </div>;
}
