import axios from 'axios';
import { Video, TimeWindow } from '@/types';
import { createTimeWindow, getWindowCenter } from './utils';
import { 
  YOUTUBE_API_URL, 
  RARE_VIEW_THRESHOLD,
  AGGRESSIVE_EXPANSION_FACTOR
} from './constants';

const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const MAX_RESULTS_PER_REQUEST = 50;
const MAX_IDS_PER_REQUEST = 50;

// Simple in-memory cache for API calls
const videoCache: Record<string, Video> = {};
const searchCache: Record<string, string[]> = {};

// API call stats for monitoring
export const apiStats = {
  searchApiCalls: 0,
  videoDetailApiCalls: 0,
  totalApiCalls: 0,
  cachedSearches: 0,
  cachedVideoDetails: 0,
  reset: () => {
    apiStats.searchApiCalls = 0;
    apiStats.videoDetailApiCalls = 0;
    apiStats.totalApiCalls = 0;
    apiStats.cachedSearches = 0;
    apiStats.cachedVideoDetails = 0;
  }
};

// Expand time window with given expansion factor
export function expandTimeWindow(window: TimeWindow, factor = AGGRESSIVE_EXPANSION_FACTOR): TimeWindow {
  const centerTime = getWindowCenter(window);
  const newDuration = window.durationMinutes * factor;
  return createTimeWindow(centerTime, newDuration);
}

// Generate cache key for a time window
function getSearchCacheKey(window: TimeWindow): string {
  return `${window.startDate.toISOString()}_${window.endDate.toISOString()}`;
}

// Get videos uploaded in a time window with caching
export async function searchVideosInTimeWindow(window: TimeWindow): Promise<string[]> {
  const cacheKey = getSearchCacheKey(window);
  
  // Check if we already have this search cached
  if (searchCache[cacheKey]) {
    console.log(`Using cached search results for ${cacheKey}`);
    apiStats.cachedSearches++;
    return searchCache[cacheKey];
  }
  
  try {
    // Increment API call stats
    apiStats.searchApiCalls++;
    apiStats.totalApiCalls++;
    
    const response = await axios.get(`${YOUTUBE_API_URL}/search`, {
      params: {
        part: 'snippet',
        maxResults: MAX_RESULTS_PER_REQUEST,
        type: 'video',
        publishedAfter: window.startDate.toISOString(),
        publishedBefore: window.endDate.toISOString(),
        key: API_KEY,
      },
    });
    
    const videoIds = response.data.items.map((item: any) => item.id.videoId);
    
    // Cache the results
    searchCache[cacheKey] = videoIds;
    
    return videoIds;
  } catch (error) {
    console.error('Error searching videos:', error);
    return [];
  }
}

// Get detailed information for multiple videos with batching and caching
export async function getVideoDetails(videoIds: string[]): Promise<Video[]> {
  if (!videoIds.length) return [];
  
  // Filter out video IDs that are already cached
  const uncachedIds = videoIds.filter(id => !videoCache[id]);
  
  // If all videos are cached, return from cache
  if (uncachedIds.length === 0) {
    apiStats.cachedVideoDetails += videoIds.length;
    return videoIds.map(id => videoCache[id]);
  }
  
  // Split IDs into batches of MAX_IDS_PER_REQUEST
  const batches = [];
  for (let i = 0; i < uncachedIds.length; i += MAX_IDS_PER_REQUEST) {
    batches.push(uncachedIds.slice(i, i + MAX_IDS_PER_REQUEST));
  }
  
  try {
    // Process all batches in parallel
    const batchPromises = batches.map(async (batchIds) => {
      // Increment API call stats
      apiStats.videoDetailApiCalls++;
      apiStats.totalApiCalls++;
      
      const response = await axios.get(`${YOUTUBE_API_URL}/videos`, {
        params: {
          part: 'snippet,statistics,contentDetails',
          id: batchIds.join(','),
          key: API_KEY,
        },
      });
      
      return response.data.items || [];
    });
    
    const batchResults = await Promise.all(batchPromises);
    const allItems = batchResults.flat();
    
    // Process and cache results
    allItems.forEach((item: any) => {
      const video: Video = {
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.medium.url,
        publishedAt: item.snippet.publishedAt,
        viewCount: parseInt(item.statistics.viewCount, 10),
        channelTitle: item.snippet.channelTitle,
      };
      
      // Cache the video details
      videoCache[item.id] = video;
    });
    
    // Return all videos (including previously cached ones)
    return videoIds.map(id => videoCache[id]).filter(Boolean);
  } catch (error) {
    console.error('Error getting video details:', error);
    return videoIds.map(id => videoCache[id]).filter(Boolean); // Return any cached videos we have
  }
}

// Find videos with less than the rare view threshold
export function filterRareVideos(videos: Video[]): Video[] {
  return videos.filter(video => video.viewCount < RARE_VIEW_THRESHOLD);
}