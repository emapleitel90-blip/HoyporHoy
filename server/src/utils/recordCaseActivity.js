import { caseScope, participantScope } from './caseAccess.js';
import { AppError } from '../middleware/errorMiddleware.js';

// Called inside the business transaction: either the change and notices commit, or neither does.
export async function recordCaseActivity(tx, actorId, caseId, title, detail = '', exclude = [], type = 'ACTIVITY') {
    const actor = await tx.user.findFirst({where:{id:actorId,deletedAt:null}});
    if(!actor)throw new AppError('La cuenta ya no está activa',401);
    const item = await tx.case.findFirst({where:{id:caseId,...caseScope(actor)}});
    if(!item)throw new AppError('Expediente no disponible',404);
    const recipients = await tx.user.findMany({where:participantScope(item),select:{id:true}});
    const ids = new Set([...recipients.map(user=>user.id),actor.id]);
    for(const userId of ids) if(!exclude.includes(userId))await tx.notification.create({data:{userId,caseId,type,title,
        message:`${actor.name}${detail?' · '+detail:''}`}});
}
