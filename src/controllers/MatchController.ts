import { Match } from '../models/match'; // Ensure this import is present
import { Request, Response } from 'express';

const getPreProcessedMatches = async (req: Request, res: Response) => {
  try {
    const { store_id, influencer_id } = req.query;

    if (!store_id || !influencer_id) {
      return res.status(400).json({ message: 'store_id and influencer_id are required' });
    }

    const match = await Match.findOne({ store_id, influencer_id });

    if (!match) {
      return res.status(404).json({ message: 'No matches found for the given store and influencer' });
    }

    res.json({ matches: match.matches });
  } catch (error) {
    console.error('Error fetching pre-processed matches:', error);
    res.status(500).json({ message: 'Error fetching pre-processed matches' });
  }
};

export { getPreProcessedMatches };