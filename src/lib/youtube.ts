import axios from "axios";
import { YoutubeTranscript } from "youtube-transcript";

export async function searchYoutube(searchQuery: string) {
  searchQuery = encodeURIComponent(searchQuery);
  const { data } = await axios.get(
    `https://www.googleapis.com/youtube/v3/search?key=${process.env.YOUTUBE_API_KEY}&q=${searchQuery}&videoDuration=medium&videoEmbeddable=true&type=video&maxResults=5`
  );
  if (!data || data.items[0] === undefined) {
    throw new Error("youtube failed");
  }

  return data.items[0].id.videoId;
}

export async function getTranscipt(videoId: string) {
  try {
    const transcriptArr = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: "en",
      country: "EN",
    });
    let transcript = "";
    for (let t of transcriptArr) {
      transcript += t.text + " ";
    }
    return transcript.replaceAll("\n", "");
  } catch (error) {
    console.log("error occured getting video transcript", error);
    throw new Error("error occured getting video transcript");
  }
}
