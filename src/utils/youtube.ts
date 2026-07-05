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

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  isMusic: boolean;
}

export const searchYouTubeVideos = async (
  query: string,
  apiKey: string
): Promise<YouTubeSearchResult[]> => {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(
    query
  )}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.items) {
      return [];
    }

    return data.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.default?.url ?? "",
      isMusic: item.snippet.channelTitle.endsWith(" - Topic"),
    }));
  } catch (error) {
    console.error("Error searching YouTube videos:", error);
    return [];
  }
};

export const extractYouTubeID = (url: string) => {
  const match = url.match(
    /(?:youtube\.com\/(?:embed\/|v\/|.*v=)|youtu\.be\/)([\w-]{11})/
  );
  return match ? match[1] : null;
};
