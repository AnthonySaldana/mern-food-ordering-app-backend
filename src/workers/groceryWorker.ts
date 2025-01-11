import Bull from 'bull';
import { Request, Response } from 'express';
import { processFitbiteJob } from './fitbiteWorker';

const fitbiteQueue = new Bull('fitbiteQueue',  {
    redis: { host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT || '6379'), password: process.env.REDIS_PASSWORD }
  });

fitbiteQueue.process(processFitbiteJob);

const getFitbiteInventory = async (req: Request, res: Response) => {
  try {
    const { store_id, influencer_id, items } = req.body;

    if (!store_id || !influencer_id || !items) {
      return res.status(400).json({ message: 'store_id, influencer_id, and items are required' });
    }

    console.log(store_id, influencer_id, items, 'store_id, influencer_id, and items');

    // Enqueue the job
    await fitbiteQueue.add({ store_id, influencer_id, items });

    res.json({ message: 'Job enqueued successfully' });
  } catch (error) {
    console.error('Error enqueuing job:', error);
    res.status(500).json({ message: 'Error enqueuing job' });
  }
};

export { getFitbiteInventory };