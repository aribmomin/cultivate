import express from 'express';
import { getCrops } from '../controllers/farmController.js';

const router = express.Router();

// GET /api/crops - Public access to canonical crop catalog
router.get('/', getCrops);

export default router;

