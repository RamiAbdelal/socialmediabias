import { MBFCLoader } from '../infrastructure/mbfc-loader';
import dotenv from 'dotenv';

dotenv.config();

async function loadMBFCData() {
  const loader = new MBFCLoader();
  
  try {
    console.log('Starting MBFC data load...');
    await loader.loadMBFCData();
    console.log('MBFC data loaded successfully!');
  } catch (error) {
    console.error('Failed to load MBFC data:', error);
    process.exit(1);
  } finally {
    await loader.close();
  }
}

loadMBFCData();
