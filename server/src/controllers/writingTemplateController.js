import prisma from '../utils/prismaClient.js';
import { caseScope, REVIEWER_ROLES } from '../utils/caseAccess.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { checkText } from './writingController.js';
const scopeFor = async (db, user, caseId) => {
    const item = await db.case.findFirst({where:{id:caseId,...caseScope(user)}});
    if (!item) throw new AppError('Expediente no disponible',404);
    return item.studioId ? 'studio:'+item.studioId : 'user:'+item.createdById;
};
const handle = fn => async (req,res,next) => {
    try { await fn(req,res); } catch(error) {
        if (['P2021','P2022'].includes(error.code)) return next(new AppError('La biblioteca requiere aplicar su migración',503));
        if (['P2002','P2034','P2028','P1008'].includes(error.code)) return next(new AppError('La biblioteca cambió. Actualizá antes de reintentar.',409));
        next(error);
    }
};
export const listWritingTemplates = handle(async(req,res) => {
    const scope=await scopeFor(prisma,req.user,req.params.caseId);
    res.json(await prisma.writingTemplate.findMany({where:{scope},orderBy:[{createdAt:'desc'},{id:'asc'}]}));
});
export const createWritingTemplate = handle(async(req,res) => {
    if (!req.body || Object.keys(req.body).some(key=>!['title','content','jurisdiction','fuero','kind','requestId'].includes(key))) throw new AppError('Datos del modelo inválidos',400);
    const data={};
    for (const [key,max] of [['title',200],['content',20000],['jurisdiction',120],['fuero',120],['kind',120]]) {
        data[key]=checkText(req.body[key],max,key).replace(/\r\n?/g,'\n');
        if (key!=='content') { data[key]=data[key].trim(); if(/[\r\n\t]/.test(data[key]))throw new AppError('Los datos del modelo deben ocupar una línea',400); }
    }
    const requestId=req.body.requestId;
    if(typeof requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))throw new AppError('Identificador de solicitud inválido',400);
    const result=await prisma.$transaction(async tx=>{
        const user=await tx.user.findFirst({where:{id:req.user.id,deletedAt:null}});
        if(!user)throw new AppError('La cuenta ya no está activa',401);
        if(!REVIEWER_ROLES.includes(user.role))throw new AppError('Solo abogados y administradores pueden incorporar modelos',403);
        const scope=await scopeFor(tx,user,req.params.caseId);
        const prior=await tx.writingTemplate.findUnique({where:{scope_requestId:{scope,requestId}}});
        if(prior){ if(Object.keys(data).some(key=>data[key]!==prior[key]))throw new AppError('La solicitud corresponde a otro modelo',409); return {created:false,item:prior}; }
        return {created:true,item:await tx.writingTemplate.create({data:{...data,scope,requestId,createdById:user.id,createdByName:user.name}})};
    });
    res.status(result.created?201:200).json(result.item);
});
