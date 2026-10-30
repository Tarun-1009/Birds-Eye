import { Router } from 'express';
import { getHealth } from '../controllers/api.controller.js';

const router = Router();

router.get('/health', getHealth);

export default router;

