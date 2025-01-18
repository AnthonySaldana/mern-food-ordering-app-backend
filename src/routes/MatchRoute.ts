import { getPreProcessedMatches } from '../controllers/MatchController';
import express from 'express';

const router = express.Router();

router.get('/pre-processed-matches', getPreProcessedMatches);

export default router;