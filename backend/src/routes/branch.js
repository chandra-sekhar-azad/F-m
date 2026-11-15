import express from 'express';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as catalogController from '../controllers/catalogController.js';
import { verifyAdmin } from '../middleware/auth.js';
import { createPostgresClient } from '../db/client.js';
import { branches } from '../db/schema.js';

const router = express.Router();
const withDb = async (work) => { const { db, client } = createPostgresClient(); try { return await work(db); } finally { await client.end({ timeout: 5 }); } };
router.get('/', async (req,res) => { try { const rows=await withDb((db)=>db.select().from(branches)); res.json(rows.map((b)=>({ id:b.id,name:b.name,address:b.address||'',phone:b.phone||'',mapLink:b.mapLink||'',bookingsEnabled:b.bookingsEnabled,halls:b.halls||[] }))); } catch { res.status(500).json({error:'Internal server error'}); } });
router.get('/:id', async (req,res) => { const [branch]=await withDb((db)=>db.select().from(branches).where(eq(branches.id,req.params.id))); if(!branch) return res.status(404).json({error:'Branch not found'}); res.json(branch); });
router.post('/', verifyAdmin, async (req,res) => { try { const id=`branch-${uuidv4()}`; const row={ id, name:req.body.name, address:req.body.address||null, phone:req.body.phone||null, mapLink:req.body.mapLink||null, capacity:Number(req.body.capacity)||null, amenities:req.body.amenities||[], bookingsEnabled:true, halls:[] }; await withDb((db)=>db.insert(branches).values(row)); res.status(201).json(row); } catch { res.status(500).json({error:'Failed to create branch'}); } });
router.put('/:id', verifyAdmin, async (req,res) => { try { const catalog=await catalogController.getCatalogForBranch(req.params.id); if(!catalog) return res.status(404).json({error:'Branch not found'}); Object.assign(catalog, req.body); await catalogController.saveCatalogForBranch(req.params.id,catalog); res.json({id:req.params.id,...req.body}); } catch { res.status(500).json({error:'Internal server error'}); } });
router.put('/:id/bookings-toggle', verifyAdmin, async (req,res) => { const { bookingsEnabled,hallId }=req.body; if(typeof bookingsEnabled!=='boolean') return res.status(400).json({error:'bookingsEnabled must be a boolean'}); try { const [branch]=await withDb((db)=>db.select().from(branches).where(eq(branches.id,req.params.id))); if(!branch) return res.status(404).json({error:'Branch not found'}); const halls=(branch.halls||[]).map((h)=>h.id===hallId?{...h,bookingsEnabled}:h); await withDb((db)=>db.update(branches).set(hallId?{halls,updatedAt:new Date()}:{bookingsEnabled,updatedAt:new Date()}).where(eq(branches.id,req.params.id))); res.json({id:req.params.id,hallId,bookingsEnabled}); } catch { res.status(500).json({error:'Internal server error'}); } });
export default router;
