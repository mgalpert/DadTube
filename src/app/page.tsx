'use client';

import { useState } from 'react';
import { useYouTubeSearch } from '@/hooks/useYouTubeSearch';
import { useSavedVideos } from '@/hooks/useSavedVideos';
import { Video, SearchType } from '@/types';
import SearchStatus from '@/components/SearchStatus';
import ApiStatsDisplay from '@/components/ApiStatsDisplay';
import VideoGrid from '@/components/VideoGrid';
import VideoPlayer from '@/components/VideoPlayer';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import EmptyState from '@/components/ui/EmptyState';

// Type for app modes
type AppMode = 'savedVideos' | 'search';

export default function Home() {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [appMode, setAppMode] = useState<AppMode>('savedVideos');
  
  // YouTube search hook
  const { 
    isLoading: isSearchLoading, 
    videos: searchResults, 
    currentWindow, 
    statusMessage, 
    error: searchError,
    viewStats,
    apiStats,
    searchType,
    startSearch,
    changeSearchType
  } = useYouTubeSearch();
  
  // Saved videos hook
  const {
    savedVideos,
    isLoading: isSavedVideosLoading,
    error: savedVideosError,
    saveVideo,
    removeVideo,
    isVideoSaved,
  } = useSavedVideos();

  const handleVideoClick = (videoId: string) => {
    setSelectedVideoId(videoId);
  };

  const handleClosePlayer = () => {
    setSelectedVideoId(null);
  };

  const handleStartSearch = () => {
    setSelectedVideoId(null);
    setAppMode('search');
    startSearch(searchType);
  };

  const handleBackToSaved = () => {
    setAppMode('savedVideos');
  };

  // Determine if we found videos in search mode
  const hasFoundVideos = appMode === 'search' && !isSearchLoading && searchResults.length > 0;
  
  // Determine if we're in search mode with no results yet
  const isSearchModeNoResults = appMode === 'search' && (!hasFoundVideos || isSearchLoading);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Navigation Bar */}
      <nav className="bg-gray-900 text-white shadow-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">GrailTube</h1>
              <p className="ml-4 text-sm hidden md:block text-gray-300">
                Discover rare YouTube videos with &lt;10 views
              </p>
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex space-x-1">
              <button
                onClick={handleBackToSaved}
                className={`px-4 py-2 rounded-md transition-all duration-200 flex items-center space-x-1 font-medium shadow-sm ${
                  appMode === 'savedVideos'
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span>Saved Videos</span>
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="relative group">
                  <select
                    value={searchType}
                    onChange={(e) => changeSearchType(e.target.value as SearchType)}
                    disabled={isSearchLoading}
                    className="appearance-none bg-gray-800 text-white text-sm rounded-md px-3 py-2 pr-8 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all cursor-pointer hover:bg-gray-700"
                  >
                    <option value={SearchType.RandomTime}>Random Time</option>
                    <option value={SearchType.Unedited}>Unedited</option>
                  </select>
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                <button
                  onClick={handleStartSearch}
                  disabled={isSearchLoading}
                  className={`px-4 py-2 rounded-md transition-all duration-200 flex items-center space-x-1 font-medium shadow-sm ${
                    appMode === 'search'
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                  } ${isSearchLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSearchLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span>Find Videos</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Show search status during loading */}
        {isSearchModeNoResults && (
          <SearchStatus
            isLoading={isSearchLoading}
            videos={searchResults}
            currentWindow={currentWindow}
            statusMessage={statusMessage}
            error={searchError}
            viewStats={viewStats}
            searchType={searchType}
          />
        )}

        {/* Show search results */}
        {hasFoundVideos && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center">
              <span>Recently Discovered Videos</span>
              <span className={`ml-3 text-xs px-2 py-1 rounded-full font-medium inline-flex items-center ${
                searchType === SearchType.RandomTime 
                  ? 'bg-indigo-100 text-indigo-800' 
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {searchType === SearchType.RandomTime ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Random Time
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                    Unedited Videos
                  </>
                )}
              </span>
            </h2>
            <VideoGrid 
              videos={searchResults} 
              onVideoClick={handleVideoClick} 
              onSaveVideo={saveVideo}
              isVideoSaved={isVideoSaved}
              showSaveButtons={true}
            />
            
            {/* Search results count */}
            <div className="mt-4 text-sm text-gray-500">
              Found {searchResults.length} videos with less than 10 views
            </div>
          </div>
        )}

        {/* Show saved videos */}
        {appMode === 'savedVideos' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Community Saved Videos</h2>
            {isSavedVideosLoading ? (
              <LoadingIndicator message="Loading saved videos..." />
            ) : savedVideosError ? (
              <ErrorDisplay message={savedVideosError} />
            ) : savedVideos.length === 0 ? (
              <EmptyState message="No videos have been saved yet. Click &quot;Find Videos&quot; to discover rare gems!" />
            ) : (
              <VideoGrid 
                videos={savedVideos} 
                onVideoClick={handleVideoClick}
                onRemoveVideo={removeVideo}
                isVideoSaved={() => true}
                showSaveButtons={true}
                isSavedVideosView={true}
              />
            )}
          </div>
        )}

        {/* API Stats Display - only show in search mode */}
        {appMode === 'search' && (apiStats.totalApiCalls > 0 || apiStats.cachedSearches > 0 || apiStats.cachedVideoDetails > 0) && (
          <div className="mt-8 bg-gray-100 p-4 rounded-lg">
            <h3 className="text-sm font-semibold mb-2 text-gray-700">API Statistics</h3>
            <ApiStatsDisplay 
              searchApiCalls={apiStats.searchApiCalls}
              videoDetailApiCalls={apiStats.videoDetailApiCalls}
              totalApiCalls={apiStats.totalApiCalls}
              cachedSearches={apiStats.cachedSearches}
              cachedVideoDetails={apiStats.cachedVideoDetails}
            />
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-4">
        <div className="container mx-auto px-4 text-center text-sm">
          <p>GrailTube - Discover rare YouTube videos with less than 10 views</p>
        </div>
      </footer>

      {/* Video player modal */}
      {selectedVideoId && (
        <VideoPlayer videoId={selectedVideoId} onClose={handleClosePlayer} />
      )}
    </div>
  );
}