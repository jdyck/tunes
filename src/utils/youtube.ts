// src/utils/youtube.ts

// Converts YouTube's ISO 8601 duration (e.g. "PT4M13S") to "m:ss"
export const formatYouTubeDuration = (isoDuration: string) => {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  const totalMinutes = hours * 60 + minutes;
  return `${totalMinutes}:${seconds.toString().padStart(2, "0")}`;
};

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
        duration: formatYouTubeDuration(video.contentDetails.duration),
      };
    } else {
      throw new Error("No video found for the given ID");
    }
  } catch (error) {
    console.error("Error fetching YouTube video data:", error);
    return null;
  }
};

// Topic-channel videos distributed by a label carry an auto-generated
// description in a semi-standard format (e.g. "Provided to YouTube by
// Columbia/Legacy\n\nTitle · Artist\n\nAlbum\n\n℗ ...\n\nReleased on: YYYY-MM-DD").
// This is not an official metadata field, so treat it as best-effort.
export const parseYouTubeMusicMetadata = (description: string) => {
  if (!description || !description.startsWith("Provided to YouTube by")) {
    return { album: null, releaseYear: null };
  }

  const blocks = description.split("\n\n").map((block) => block.trim());
  const albumBlock = blocks[2];
  const album =
    albumBlock &&
    !albumBlock.includes("\n") &&
    !albumBlock.startsWith("℗") &&
    !albumBlock.startsWith("Released on")
      ? albumBlock
      : null;

  const releaseMatch = description.match(
    /Released on:\s*(\d{4})-\d{2}-\d{2}/
  );
  const releaseYear = releaseMatch ? releaseMatch[1] : null;

  return { album, releaseYear };
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
