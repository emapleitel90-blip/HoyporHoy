import { createHash } from 'node:crypto';
import { caseScope } from './caseAccess.js';

const actions = { CREATED: 'Tarea creada', STARTED: 'Tarea iniciada', PROGRESS_RECORDED: 'Avance registrado',
    SUBMITTED: 'Escrito o tarea entregada', REVISION_REQUESTED: 'Correcciones solicitadas', APPROVED: 'Entrega aprobada' };
const followActions = { CREATED: 'Seguimiento creado', UPDATED: 'Seguimiento actualizado', RECEIVE: 'Documento recibido',
    VERIFY: 'Documento verificado', REQUEST_REVISION: 'Corrección documental solicitada', COMPLETE: 'Compromiso cumplido', REOPEN: 'Seguimiento reabierto' };

// Materialize existing immutable events per reader: deterministic IDs preserve read state.
export async function syncActivityNotifications(db, user) {
    const scope = caseScope(user), events = [];
    const recent = { orderBy: [{createdAt:'desc'},{id:'asc'}], take:50 };
    const [tasks, follows, versions, payments, reversals, amendments, receipts] = await Promise.all([
        db.taskEvent.findMany({...recent, where:{task:{case:scope}}, include:{user:{select:{name:true}},task:{select:{caseId:true,title:true}},writingVersion:{select:{number:true}}}}),
        db.followUpEvent.findMany({...recent, where:{followUp:{case:scope}}, include:{user:{select:{name:true}},followUp:{select:{caseId:true,title:true}}}}),
        db.writingVersion.findMany({...recent, where:{writing:{case:scope}}, select:{id:true,createdAt:true,createdByName:true,number:true,title:true,writing:{select:{caseId:true}}}}),
        db.feePayment.findMany({...recent,where:{installment:{agreement:{case:scope}}},include:{installment:{select:{agreement:{select:{caseId:true}}}}}}),
        db.feePaymentReversal.findMany({...recent,where:{payment:{installment:{agreement:{case:scope}}}},include:{payment:{select:{installment:{select:{agreement:{select:{caseId:true}}}}}}}}),
        db.feeAgreementAmendment.findMany({...recent,where:{agreement:{case:scope}},include:{agreement:{select:{caseId:true}}}}),
        db.feePaymentReceipt.findMany({...recent,where:{payment:{installment:{agreement:{case:scope}}}},include:{payment:{select:{installment:{select:{agreement:{select:{caseId:true}}}}}}}}),
    ]);
    const add=(kind,item,caseId,title,message)=>events.push({id:createHash('sha256').update(`${user.id}:${kind}:${item.id}`).digest('hex'),
        userId:user.id,caseId,type:'ACTIVITY',title,message,createdAt:item.createdAt});
    for(const e of tasks)add('task',e,e.task.caseId,actions[e.action]||'Tarea actualizada',`${e.user.name} · ${e.task.title}${e.writingVersion?` · versión ${e.writingVersion.number}`:''}`);
    for(const e of follows)add('follow',e,e.followUp.caseId,followActions[e.action]||'Seguimiento actualizado',`${e.user.name} · ${e.followUp.title}`);
    for(const e of versions)add('writing',e,e.writing.caseId,'Versión de escrito guardada',`${e.createdByName} · ${e.title} · versión ${e.number}`);
    const people=payments.length?await db.user.findMany({where:{id:{in:[...new Set(payments.map(p=>p.registeredById))]}},select:{id:true,name:true}}):[];
    for(const e of payments)add('payment',e,e.installment.agreement.caseId,'Pago registrado',`${people.find(p=>p.id===e.registeredById)?.name||'Integrante del estudio'} · ${(e.amountCents/100).toLocaleString('es-AR',{style:'currency',currency:'ARS'})}`);
    for(const e of reversals)add('reversal',e,e.payment.installment.agreement.caseId,'Pago anulado',e.registeredByName);
    for(const e of amendments)add('amendment',e,e.agreement.caseId,'Acuerdo de honorarios modificado',`${e.registeredByName} · versión ${e.version}`);
    for(const e of receipts)add('receipt',e,e.payment.installment.agreement.caseId,'Comprobante de pago incorporado',`${e.uploadedByName} · comprobante ${e.sequence}`);
    const newest=events.sort((a,b)=>b.createdAt-a.createdAt||a.id.localeCompare(b.id)).slice(0,50);
    const existing=await db.notification.findMany({where:{id:{in:newest.map(e=>e.id)}},select:{id:true}});
    const known=new Set(existing.map(e=>e.id));
    for(const event of newest) if(!known.has(event.id))await db.notification.upsert({where:{id:event.id},create:event,update:{}});
}
