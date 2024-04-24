"use client";

import React from "react";
import { Form, FormControl, FormField, FormItem, FormLabel } from "./ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { createChaptersSchema } from "@/library/course";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { PlusIcon, Trash } from "lucide-react";
import { useToast } from "./ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import { createChapters } from "@/lib/server-actions";
import { useRouter } from "next/navigation";

type Props = {};

export type Input = z.infer<typeof createChaptersSchema>;

const CreateCourseForm = ({}: Props) => {
  const { toast } = useToast();
  const router = useRouter();

  const { mutate: createChaptersMutation, isPending } = useMutation({
    mutationFn: (input: Input) => {
      return createChapters(input);
    },
  });

  const form = useForm<Input>({
    resolver: zodResolver(createChaptersSchema),
    defaultValues: {
      title: "",
      units: ["", "", ""],
    },
  });

  function onSubmit(data: Input) {
    if (data.units.some((unit) => unit === "")) {
      toast({
        title: "Error",
        description: "Please fill all the units",
        variant: "destructive",
      });
      return;
    }
    createChaptersMutation(data, {
      onSuccess: (result) => {
        toast({
          title: "Success",
          description: "Course created succesfully",
        });
        if (result?.courseId) router.push(`/create/${result.courseId}`);
      },
      onError: (error) => {
        console.error(error);
        toast({
          title: "Error",
          description: "Something went wrong",
          variant: "destructive",
        });
      },
    });
  }

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 w-full">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="flex flex-col items-start w-full sm:items-center sm:flex-row">
                <FormLabel className="flex-[1] text-xl">Title</FormLabel>
                <FormControl className="flex-[6]">
                  <Input
                    placeholder="Enter the main topic of the course"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <AnimatePresence>
            {form.watch("units").map((_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{
                  opacity: { duration: 0.2 },
                  height: { duration: 0.2 },
                }}
              >
                <FormField
                  key={index}
                  control={form.control}
                  name={`units.${index}`}
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-start w-full sm:items-center sm:flex-row">
                      <FormLabel className="flex-[1] text-xl">
                        Unit {index + 1}
                      </FormLabel>
                      <FormControl className="flex-[6]">
                        <Input
                          placeholder="Enter subtopic of the course"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="flex items-center justify-center mt-4">
            <Separator className="flex-[1]" />
            <div className="mx-4">
              <Button
                type="button"
                variant="secondary"
                className="font-semibold"
              >
                Add Unit
                <PlusIcon className="w-4 h-4 ml-2 text-green-500" />
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="font-semibold ml-2"
              >
                Remove Unit
                <Trash className="w-4 h-4 ml-2 text-red-500" />
              </Button>
            </div>
            <Separator className="flex-[1]" />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full mt-6"
            disabled={isPending}
          >
            Let&apos;s Go!
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default CreateCourseForm;
