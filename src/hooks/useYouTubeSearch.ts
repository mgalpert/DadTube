import { useState } from 'react';
import { 
  searchVideosInTimeWindow, 
  getVideoDetails, 
  filterRareVideos,
  expandTimeWindow,
  apiStats
} from '@/lib/youtube';
import { 
  getRandomPastDate,
  createInitialTimeWindow,
  createTimeWindow,
  getWindowCenter,
  delay
} from '@/lib/utils';
import { Video, TimeWindow } from '@/types';
import {
  BUSY_PERIOD_THRESHOLD,
  MODERATE_PERIOD_THRESHOLD,
  CONTRACTION_FACTOR,
  MODERATE_EXPANSION_FACTOR,
  MIN_WINDOW_DURATION_MINUTES,
  STATUS_MESSAGE_DELAY_MS
} from '@/lib/constants';

export function useYouTubeSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentWindow, setCurrentWindow] = useState<TimeWindow | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expansionCount, setExpansionCount] = useState<number>(0);

  // Handle the next step in search expansion
  const handleNextSearchStep = async (
    nextWindow: TimeWindow, 
    nextStep: number
  ): Promise<void> => {
    // Update state
    setExpansionCount(nextStep - 1);
    
    // Small delay to show the expansion message
    await delay(STATUS_MESSAGE_DELAY_MS);
    setCurrentWindow(nextWindow);
    await searchWithExpansion(nextWindow, nextStep);
  };

  // Process search results adaptively based on video count
  const processAdaptiveSearch = async (
    videoIds: string[], 
    videoDetails: Video[], 
    timeWindow: TimeWindow, 
    currentStep: number
  ): Promise<void> => {
    let nextWindow: TimeWindow;
    const centerTime = getWindowCenter(timeWindow);
    const nextStep = currentStep + 1;
    
    // Adaptive window sizing based on video volume
    if (videoIds.length > BUSY_PERIOD_THRESHOLD) {
      // Very busy time period - contract slightly
      setStatusMessage(`Found ${videoDetails.length} videos in a busy period. Refining search...`);
      const newDuration = Math.max(timeWindow.durationMinutes * CONTRACTION_FACTOR, MIN_WINDOW_DURATION_MINUTES);
      nextWindow = createTimeWindow(centerTime, newDuration);
    } else if (videoIds.length > MODERATE_PERIOD_THRESHOLD) {
      // Moderately busy - expand slower
      setStatusMessage(`Found ${videoDetails.length} videos, but none are rare treasures yet. Expanding search moderately...`);
      nextWindow = expandTimeWindow(timeWindow, MODERATE_EXPANSION_FACTOR);
    } else {
      // Not many videos - expand more aggressively
      setStatusMessage(`Found ${videoDetails.length} videos, but none are rare treasures yet. Expanding search aggressively...`);
      nextWindow = expandTimeWindow(timeWindow);
    }
    
    await handleNextSearchStep(nextWindow, nextStep);
  };

  // Main search function with recursive expansion
  const searchWithExpansion = async (timeWindow: TimeWindow, currentStep: number = 1): Promise<void> => {
    setStatusMessage(`Step ${currentStep}: Scanning for videos in this ${timeWindow.durationMinutes} min window`);
    
    // Search for videos in the current window
    const videoIds = await searchVideosInTimeWindow(timeWindow);
    
    if (videoIds.length === 0) {
      // No videos found, keep expanding the time window
      const nextStep = currentStep + 1;
      
      // Calculate next window size for status message
      const newWindow = expandTimeWindow(timeWindow);
      const expansionFactor = Math.round(newWindow.durationMinutes / timeWindow.durationMinutes);
      
      setStatusMessage(`No videos found. Expanding search range ${expansionFactor}x to ${newWindow.durationMinutes} minutes...`);
      
      await handleNextSearchStep(newWindow, nextStep);
    } else {
      // Videos found, get their details
      setStatusMessage(`Found ${videoIds.length} videos! Analyzing view counts to find hidden gems...`);
      const videoDetails = await getVideoDetails(videoIds);
      
      // Filter for rare videos
      const rareVideos = filterRareVideos(videoDetails);
      
      if (rareVideos.length === 0) {
        // No rare videos found, use adaptive expansion
        await processAdaptiveSearch(videoIds, videoDetails, timeWindow, currentStep);
      } else {
        // Success! We found rare videos
        setVideos(rareVideos);
        setStatusMessage(null);
        setIsLoading(false);
      }
    }
  };

  // Start search from a random date
  const startSearch = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setStatusMessage(null);
    setVideos([]);
    setExpansionCount(0);
    
    // Reset API call stats
    apiStats.reset();
    
    try {
      // Get a random date and create initial window
      const randomDate = getRandomPastDate();
      const initialWindow = createInitialTimeWindow(randomDate);
      setCurrentWindow(initialWindow);
      
      // Start the search process with step 1
      await searchWithExpansion(initialWindow, 1);
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    videos,
    currentWindow,
    statusMessage,
    error,
    expansionCount,
    apiStats,
    startSearch
  };
}