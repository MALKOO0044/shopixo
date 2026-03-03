"use client";

import { useFormState } from "react-dom";
import { deleteBlogPost } from "@/app/admin/blog/actions";

type DeleteState = { error?: string | null; success?: boolean };

const initialState: DeleteState = { error: null, success: false };

export default function DeleteBlogPostButton({ postId }: { postId: number }) {
  const [state, formAction] = useFormState(deleteBlogPost, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("Are you sure you want to delete this post?")) {
          e.preventDefault();
        }
      }}
      className="inline-block"
    >
      <input type="hidden" name="id" value={postId} />
      <button type="submit" className="text-sm font-medium text-red-600 hover:underline">
        Delete
      </button>
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
