import { httpRouter } from "convex/server";
import {
  attachmentOptions,
  download,
  remove,
  upload,
  uploadOptions,
} from "./songFiles";

const http = httpRouter();

http.route({
  path: "/song-files",
  method: "POST",
  handler: upload,
});
http.route({
  path: "/song-files",
  method: "OPTIONS",
  handler: uploadOptions,
});
http.route({
  pathPrefix: "/song-files/",
  method: "GET",
  handler: download,
});
http.route({
  pathPrefix: "/song-files/",
  method: "DELETE",
  handler: remove,
});
http.route({
  pathPrefix: "/song-files/",
  method: "OPTIONS",
  handler: attachmentOptions,
});

export default http;
