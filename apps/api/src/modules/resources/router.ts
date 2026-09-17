import { Router } from 'express';
import { z } from 'zod';
import { resources } from '@uni-nexus/shared';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireWorkspace, authorize } from '../../middleware/auth.js';
import { definition, cleanRow } from './repository.js';
import { identifier } from './validation.js';
import { list,detail,save } from './service.js';
import { dashboardRouter } from '../dashboard/router.js';
import { costingRouter } from '../costing/router.js';
import { workflowsRouter } from '../workflows/router.js';
import { filesRouter } from '../files/router.js';
import { audit } from '../../services/audit.js';

export const domainRouter=Router();
domainRouter.use(requireAuth,requireWorkspace);
domainRouter.get('/meta',(_req,res)=>{res.json({data:resources});});
domainRouter.use('/dashboard',dashboardRouter);
domainRouter.use('/costs',costingRouter);
domainRouter.use('/files',filesRouter);
domainRouter.use(workflowsRouter);
domainRouter.post('/notifications/read-all',async(req,res)=>{
  const result=await prisma.notifications.updateMany({where:{workspace_id:req.workspace!.id,recipient_user_id:req.auth!.userId,read_at:null},data:{read_at:new Date()}});
  res.json({data:{updated:result.count}});
});
domainRouter.patch('/notifications/:id',async(req,res)=>{
  z.object({read_at:z.string().optional()}).strict().parse(req.body);
  const id=BigInt(identifier.parse(req.params.id));
  const context={workspaceId:req.workspace!.id,userId:req.auth!.userId};
  const row=await prisma.$transaction(async tx=>{
    const previous=await detail(definition('notifications'),id,context,tx);
    const record=await tx.notifications.update({where:{id},data:{read_at:new Date()}});
    await audit(tx,context,'READ','notifications',id,previous,record);
    return record;
  });
  res.json({data:cleanRow(row)});
});
domainRouter.get('/:resource',async(req,res,next)=>{
  const resource=definition(String(req.params.resource));
  authorize(resource.permission==='audit'||resource.permission==='settings'?resource.permission:'read')(req,res,async error=>{
    if(error){next(error);return;}
    try{res.json(await list(resource,req.query,{workspaceId:req.workspace!.id,userId:req.auth!.userId}));}catch(error){next(error);}
  });
});
domainRouter.get('/:resource/:id',async(req,res,next)=>{
  const resource=definition(String(req.params.resource));
  authorize(resource.permission==='audit'||resource.permission==='settings'?resource.permission:'read')(req,res,async error=>{
    if(error){next(error);return;}
    try{const row=await detail(resource,BigInt(identifier.parse(req.params.id)),{workspaceId:req.workspace!.id,userId:req.auth!.userId});res.json({data:cleanRow(row)});}catch(error){next(error);}
  });
});
for(const method of ['post','patch'] as const){
  domainRouter[method](method==='post'?'/:resource':'/:resource/:id',async(req,res,next)=>{
    const resource=definition(String(req.params.resource));
    authorize(resource.permission)(req,res,async error=>{
      if(error){next(error);return;}
      try{
        const row=await save(resource,req.body,{workspaceId:req.workspace!.id,userId:req.auth!.userId},method==='patch'?BigInt(identifier.parse('id' in req.params ? req.params.id : undefined)):undefined);
        res.status(method==='post'?201:200).json({data:row});
      }catch(error){next(error);}
    });
  });
}
