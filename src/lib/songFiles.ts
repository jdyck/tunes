const getConvexSiteUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!configuredUrl) throw new Error("Convex is not configured.");

  const url = new URL(configuredUrl);
  if (!url.hostname.endsWith(".convex.cloud")) {
    throw new Error("Convex file delivery is not configured for this deployment.");
  }
  url.hostname = `${url.hostname.slice(0, -".convex.cloud".length)}.convex.site`;
  return url;
};

const songFilesUrl = (path = "/song-files") => {
  const url = getConvexSiteUrl();
  url.pathname = path;
  url.search = "";
  return url;
};

const responseMessage = async (response: Response, fallback: string) => {
  const text = (await response.text()).trim();
  return text || fallback;
};

export const uploadSongFile = ({
  songId,
  file,
  token,
  onProgress,
}: {
  songId: string;
  file: File;
  token: string;
  onProgress: (percent: number) => void;
}) => {
  const url = songFilesUrl();
  url.searchParams.set("songId", songId);

  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", url.toString());
    request.setRequestHeader("Authorization", `Bearer ${token}`);
    request.setRequestHeader("Content-Type", file.type);
    request.setRequestHeader(
      "X-Song-File-Name",
      encodeURIComponent(file.name),
    );
    request.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      reject(new Error(request.responseText.trim() || "Could not upload the file."));
    });
    request.addEventListener("error", () => {
      reject(new Error("Could not reach the file upload service."));
    });
    request.send(file);
  });
};

const authorizedFetch = async (
  path: string,
  token: string,
  init: RequestInit = {},
) => {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(songFilesUrl(path), {
    ...init,
    headers,
  });
  if (!response.ok) {
    throw new Error(await responseMessage(response, "Could not access the file."));
  }
  return response;
};

export const fetchSongFileBlob = async (songFileId: string, token: string) => {
  const response = await authorizedFetch(
    `/song-files/${encodeURIComponent(songFileId)}`,
    token,
  );
  return response.blob();
};

export const deleteSongFile = async (songFileId: string, token: string) => {
  await authorizedFetch(`/song-files/${encodeURIComponent(songFileId)}`, token, {
    method: "DELETE",
  });
};
