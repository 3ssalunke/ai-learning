"use server";

import { Input } from "@/components/CreateCourseForm";
import { getAuthSession } from "./auth";
import { checkSubscription } from "./subscription";
import { getQuestionsFromTranscript, strictOutput } from "./gpt";
import getUnsplashImage from "./unsplash";
import { prisma } from "./db";
import { getTranscipt, searchYoutube } from "./youtube";

export async function createChapters({ title, units }: Input) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return { error: "unauthorized" };
    }
    const isPro = await checkSubscription();
    if (session.user.credits <= 0 && !isPro) {
      return { error: "no credits" };
    }

    type OutputUnits = {
      title: string;
      chapters: {
        youtube_search_query: string;
        chapter_title: string;
      }[];
    }[];
    let outputUnits: OutputUnits = await strictOutput(
      "You are an AI capable of curating course content, coming up with relevant chapter titles, and finding relevant youtube videos for each chapter",
      units.map(
        (unit) =>
          `It is your job to create a course about ${title}. The user has requested to create chapters for unit ${unit}. Then, for each chapter, provide a detailed youtube search query that can be used to find an informative educational video for each chapter. Each query should give an educational informative course in youtube.`
      ),
      {
        title: "title of the unit",
        chapters:
          "an array of chapters, each chapter should have a youtube_search_query and a chapter_title key in the JSON object",
      }
    );
    const imageSearchTerm = await strictOutput(
      "you are an AI capable of finding the most relevant image for a course",
      `Please provide a good image search term for the title of a course about ${title}. This search term will be fed intot the unsplash API, so make sure it is a good search term that will return good results`,
      {
        image_search_term: "a good term for the title of the course",
      }
    );
    const courseImage = await getUnsplashImage(
      imageSearchTerm.imaage_search_term
    );
    const course = await prisma.course.create({
      data: {
        name: title,
        image: courseImage,
      },
    });
    for (const unit of outputUnits) {
      const title = unit.title;
      const prismaUnit = await prisma.unit.create({
        data: {
          name: title,
          courseId: course.id,
        },
      });
      await prisma.chapter.createMany({
        data: unit.chapters.map((chapter: any) => {
          return {
            name: chapter.chapter_title,
            youtubeSearchQuery: chapter.youtube_search_query,
            unitId: prismaUnit.id,
          };
        }),
      });
    }
    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        credits: {
          decrement: 1,
        },
      },
    });
    return { courseId: course.id };
  } catch (error) {
    console.error("error creating chapter", error);
    throw new Error("error creating chapter");
  }
}

export async function getInfo(chapterId: string) {
  if (!chapterId) {
    return { success: false, error: "invalid chapter id" };
  }
  try {
    const chapter = await prisma.chapter.findUnique({
      where: {
        id: chapterId,
      },
    });
    if (!chapter) {
      return { success: false, error: "chapter not found" };
    }
    const videoId = await searchYoutube(chapter.youtubeSearchQuery);
    let transcript = await getTranscipt(videoId);
    let maxlength = 500;
    transcript = transcript.split(" ").slice(0, maxlength).join(" ");

    const { summary } = await strictOutput(
      "You are an AI capable of summarising a youtube transcript",
      "summarise in 250 words or less and do not talk of the sponsors or anything unrelated to the main topic, also do not introduce what the summary is about.\n" +
        transcript,
      {
        summary: "summary of the transcript",
      }
    );

    const questions = await getQuestionsFromTranscript(summary, chapter.name);
    await prisma.question.createMany({
      data: questions.map((question) => {
        let options = [
          question.answer,
          question.option1,
          question.option2,
          question.question,
        ];
        options = options.sort(() => Math.random() - 0.5);
        return {
          question: question.question,
          answer: question.answer,
          options: JSON.stringify(options),
          chapterId: chapter.id,
        };
      }),
    });

    await prisma.chapter.update({
      where: { id: chapter.id },
      data: {
        videoId: videoId,
        summary: summary,
      },
    });
    return { success: true };
  } catch (error) {
    console.error("error getting chapter info", error);
    throw new Error("error getting chapter");
  }
}
