// src/utils/youtube.ts
export const fetchYouTubeVideoData = async (
  videoId: string,
  apiKey: string
) => {
  const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails,statistics&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const video = data.items[0];
      return {
        title: video.snippet.title,
        description: video.snippet.description,
        channelTitle: video.snippet.channelTitle,
        thumbnails: video.snippet.thumbnails,
        viewCount: video.statistics.viewCount,
        publishedAt: video.snippet.publishedAt,
      };
    } else {
      throw new Error("No video found for the given ID");
    }
  } catch (error) {
    console.error("Error fetching YouTube video data:", error);
    return null;
  }
};

// Helper to extract video ID from a YouTube URL
export const extractYouTubeID = (url: string) => {
  const match = url.match(
    /(?:youtube\.com\/(?:embed\/|v\/|.*v=)|youtu\.be\/)([\w-]{11})/
  );
  return match ? match[1] : null;
};
