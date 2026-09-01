"use client";

import { FolderPlus, Pencil, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Toast } from "@/components/toast";
import { apiFetch, ApiError } from "@/lib/api";
import { Category } from "@/lib/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>();
  const [editing, setEditing] = useState<Category>();
  const [toast, setToast] = useState<{
    message: string;
    kind: "success" | "error";
  }>();
  const load = useCallback(
    () => apiFetch<Category[]>("/categories").then(setCategories),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (!data.parentId) delete data.parentId;
    try {
      await apiFetch(editing ? `/categories/${editing.id}` : "/categories", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(data),
      });
      setToast({
        message: editing ? "Category updated." : "Category created.",
        kind: "success",
      });
      setEditing(undefined);
      event.currentTarget.reset();
      await load();
    } catch (cause) {
      setToast({
        message: cause instanceof ApiError ? cause.message : "Change failed",
        kind: "error",
      });
    }
  }
  async function remove(category: Category) {
    if (!window.confirm(`Remove “${category.name}”?`)) return;
    try {
      await apiFetch(`/categories/${category.id}`, { method: "DELETE" });
      await load();
    } catch (cause) {
      setToast({
        message:
          cause instanceof ApiError
            ? cause.message
            : "Could not remove category",
        kind: "error",
      });
    }
  }
  const flat =
    categories?.flatMap((category) => [
      category,
      ...(category.children || []),
    ]) || [];
  return (
    <AppShell
      roles={["LIBRARIAN", "ADMIN"]}
      title="Catalog categories"
      description="Maintain the subject structure used for discovery, recommendations and reports."
    >
      <div className="split-management">
        <form
          className="panel-form"
          onSubmit={submit}
          key={editing?.id || "new"}
        >
          <div>
            <span className="eyebrow">
              {editing ? "Edit category" : "Add to the taxonomy"}
            </span>
            <h2>{editing ? editing.name : "New category"}</h2>
          </div>
          <label className="form-field">
            <span>Name</span>
            <input required name="name" defaultValue={editing?.name || ""} />
          </label>
          <label className="form-field">
            <span>Slug</span>
            <input
              required
              name="slug"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              defaultValue={editing?.slug || ""}
              placeholder="computer-science"
            />
          </label>
          <label className="form-field">
            <span>Parent category (optional)</span>
            <select name="parentId" defaultValue={editing?.parentId || ""}>
              <option value="">Top level</option>
              {(categories || [])
                .filter((item) => item.id !== editing?.id)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
          <button className="button">
            <FolderPlus size={17} />{" "}
            {editing ? "Save changes" : "Create category"}
          </button>
          {editing && (
            <button
              type="button"
              className="button button-ghost"
              onClick={() => setEditing(undefined)}
            >
              Cancel
            </button>
          )}
        </form>
        <section>
          <div className="management-head">
            <div>
              <span className="eyebrow">Current structure</span>
              <h2>{flat.length} categories</h2>
            </div>
          </div>
          {!categories ? (
            <div className="inline-loading">
              <span className="spinner" />
            </div>
          ) : (
            <div className="category-list">
              {categories.map((category) => (
                <div key={category.id} className="category-group">
                  <CategoryRow
                    item={category}
                    onEdit={setEditing}
                    onRemove={remove}
                  />
                  {category.children?.map((child) => (
                    <CategoryRow
                      child
                      key={child.id}
                      item={child}
                      onEdit={setEditing}
                      onRemove={remove}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      {toast && <Toast {...toast} onClose={() => setToast(undefined)} />}
    </AppShell>
  );
}

function CategoryRow({
  item,
  child,
  onEdit,
  onRemove,
}: {
  item: Category;
  child?: boolean;
  onEdit(item: Category): void;
  onRemove(item: Category): void;
}) {
  return (
    <div className={`category-row ${child ? "category-child" : ""}`}>
      <span>
        <strong>{item.name}</strong>
        <small>
          /{item.slug} · {item._count?.resources || 0} resources
        </small>
      </span>
      <div>
        <button onClick={() => onEdit(item)}>
          <Pencil size={15} />
        </button>
        <button onClick={() => void onRemove(item)}>
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
