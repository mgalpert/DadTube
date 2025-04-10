import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';
import { VideoModel } from '@/lib/models/videoModel';
import { handleApiError } from '@/lib/api';
import logger from '@/lib/logger';

// Using a module-level variable for initialization tracking,
// but we'll also verify database connection on each request to be safe
let dbInitialized = false;

/**
 * Ensures the database is initialized and connected
 * Each API request will check this to ensure database availability
 */
async function ensureInitialized() {
  logger.debug('API route: Ensuring database is initialized');
  
  try {
    // We'll initialize on every first request in a process
    // This is safer than relying on a simple boolean since Next.js 
    // may run API routes in separate processes/instances
    if (!dbInitialized) {
      logger.debug('API route: Initializing database for first time in this process');
      await initDatabase();
      dbInitialized = true;
      logger.debug('API route: Database initialized successfully');
    } else {
      logger.debug('API route: Database was already initialized in this process');
      
      // Even though we initialized before, let's verify the connection
      // by performing a simple query - this catches cases where the 
      // database connection was lost between requests
      try {
        const testQuery = await VideoModel.testConnection();
        logger.debug('API route: Database connection verified', { testQuery });
      } catch (connectionError) {
        logger.warn('API route: Database connection test failed, re-initializing', connectionError);
        // Re-initialize if the test failed
        await initDatabase();
        logger.debug('API route: Database re-initialized successfully');
      }
    }
  } catch (error) {
    logger.error('API route: Failed to initialize database', error);
    throw error;
  }
}

/**
 * GET /api/saved-videos - Retrieve all saved videos
 */
export async function GET() {
  logger.debug('API route: GET /api/saved-videos called');
  try {
    await ensureInitialized();
    
    logger.debug('API route: Fetching all saved videos');
    const videos = await VideoModel.getAll();
    
    logger.debug('API route: Returning videos', { count: videos.length });
    return NextResponse.json({ videos });
  } catch (error) {
    logger.error('API route: Error in GET /api/saved-videos', error);
    const { error: errorMessage, status } = handleApiError(error, 'fetching saved videos');
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

/**
 * POST /api/saved-videos - Save a new video
 */
export async function POST(request: Request) {
  try {
    await ensureInitialized();
    
    const data = await request.json();
    const { video } = data;
    
    // Check if video already exists
    const exists = await VideoModel.exists(video.id);
    
    if (exists) {
      return NextResponse.json(
        { error: 'Video already saved' },
        { status: 409 }
      );
    }
    
    // Save the video
    await VideoModel.save(video);
    
    return NextResponse.json({ success: true, message: 'Video saved successfully' });
  } catch (error) {
    const { error: errorMessage, status } = handleApiError(error, 'saving video');
    return NextResponse.json({ error: errorMessage }, { status });
  }
}