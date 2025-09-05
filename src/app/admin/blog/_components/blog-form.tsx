"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addBlogPost, updateBlogPost } from "@/app/admin/blog/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormState = {
  message: string | null;
  fieldErrors: Record<string, string[] | undefined> | null;
};

const initialState: FormState = { message: null, fieldErrors: null };

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (isEditing ? "Updating..." : "Adding...") : (isEditing ? "Update Post" : "Add Post")}
    </Button>
  );
}

export default function BlogForm({
  initial,
  mode,
}: {
  initial?: { id?: number; title?: string; slug?: string; excerpt?: string | null; content?: string | null; published?: boolean };
  mode: "create" | "edit";
}) {
  const action = mode === "edit" ? updateBlogPost : addBlogPost;
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {mode === "edit" && initial?.id != null && (
        <input type="hidden" name="id" value={initial.id} />
      )}

      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={initial?.title || ""} required />
        {state.fieldErrors?.title && <p className="text-xs text-destructive">{state.fieldErrors.title.join(", ")}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={initial?.slug || ""} required />
        {state.fieldErrors?.slug && <p className="text-xs text-destructive">{state.fieldErrors.slug.join(", ")}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea id="excerpt" name="excerpt" defaultValue={initial?.excerpt || ""} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="content">Content</Label>
        <Textarea id="content" name="content" defaultValue={initial?.content || ""} rows={8} />
      </div>

      <div className="flex items-center gap-2">
        <input id="published" name="published" type="checkbox" defaultChecked={initial?.published ?? true} />
        <Label htmlFor="published">Published</Label>
      </div>

      <div className="pt-2">
        <SubmitButton isEditing={mode === "edit"} />
        {state.message && !state.fieldErrors && (
          <p className="mt-2 text-sm text-destructive">{state.message}</p>
        )}
      </div>
    </form>
  );
}
