import Bull from 'bull';
import { processInventoryJob } from '../workers/inventoryWorker';

const inventoryQueue = new Bull('inventoryQueue', {
  redis: { host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT || '6379'), password: process.env.REDIS_PASSWORD }
});

console.log(process.env.REDIS_HOST, process.env.REDIS_PORT, process.env.REDIS_PASSWORD);
console.log("Processing queue");
console.log(inventoryQueue);

inventoryQueue.process(processInventoryJob);

export default inventoryQueue;