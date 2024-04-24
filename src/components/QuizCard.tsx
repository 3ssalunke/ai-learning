"use client";
import { cn } from "@/lib/utils";
import { Chapter, Question } from "@prisma/client";
import React, { useCallback, useState } from "react";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

type Props = {
  chapter: Chapter & {
    questions: Question[];
  };
};

const QuizCard = ({ chapter }: Props) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionState, setQuestionState] = useState<
    Record<string, boolean | null>
  >({});

  const checkAnswer = useCallback(() => {
    const newQuestionState = { ...questionState };
    chapter.questions.map((question) => {
      const userAnswer = answers[question.id];
      if (!userAnswer) return;
      if (userAnswer === question.answer) {
        newQuestionState[question.id] = true;
      } else {
        newQuestionState[question.id] = false;
      }
      setQuestionState(newQuestionState);
    });
  }, [answers, questionState, chapter.questions]);

  return (
    <div className="flex-[1] mt-16 ml-8">
      <h1 className="text-2xl font-bold">Concept Check</h1>
      <div className="mt-2">
        {chapter.questions.map((question) => {
          const options = JSON.parse(question.options) as string[];
          return (
            <div
              key={question.id}
              className={cn("p-3 mt-4 border border-secondary rounded-lg", {
                "bg-green-700": questionState[question.id] === true,
                "bg-red-700": questionState[question.id] === false,
                "bg-secondary": questionState[question.id] === null,
              })}
            >
              <h1 className="text-lg font-semibold">{question.question}</h1>
              <div className="mt-2">
                <RadioGroup
                  onValueChange={(e) =>
                    setAnswers((prev) => {
                      return {
                        ...prev,
                        [question.id]: e,
                      };
                    })
                  }
                >
                  {options.map((option, index) => (
                    <div className="flex items-center space-x-2" key={index}>
                      <RadioGroupItem
                        value={option}
                        id={question.id + index.toString()}
                      />
                      <Label htmlFor={question.id + index.toString()}>
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          );
        })}
      </div>
      <Button className="w-full mt-2" size="lg" onClick={checkAnswer}>
        Check Answer
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
};

export default QuizCard;
