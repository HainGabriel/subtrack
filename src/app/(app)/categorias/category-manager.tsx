"use client";

import { useState, useTransition } from "react";
import { MoreVertical, Plus, Archive, ArchiveRestore, Pencil, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { resolveIcon } from "@/lib/icon-map";
import { archiveCategoryAction, unarchiveCategoryAction } from "@/lib/actions/category-actions";
import { CategoryFormDialog, type CategoryFormValue } from "./category-form-dialog";
import { DeleteCategoryDialog, type DeletableCategory } from "./delete-category-dialog";

export interface CategoryRow {
  id: string;
  name: string;
  color: string;
  icon: string;
  isSystem: boolean;
  archivedAt: string | null;
  subscriptionCount: number;
  budgetCount: number;
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryFormValue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeletableCategory | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const active = categories.filter((c) => !c.archivedAt);
  const archived = categories.filter((c) => c.archivedAt);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(category: CategoryRow) {
    setEditing({
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
    });
    setFormOpen(true);
  }

  function openDelete(category: CategoryRow) {
    setDeleteTarget({
      id: category.id,
      name: category.name,
      subscriptionCount: category.subscriptionCount,
      budgetCount: category.budgetCount,
    });
  }

  function toggleArchive(category: CategoryRow) {
    setPendingId(category.id);
    startTransition(async () => {
      const result = category.archivedAt
        ? await unarchiveCategoryAction(category.id)
        : await archiveCategoryAction(category.id);
      setPendingId(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(category.archivedAt ? "Categoría restaurada" : "Categoría archivada");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">Categorías</h1>
          <p className="text-muted-foreground text-sm">
            Organiza tus suscripciones por tipo de gasto.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Nueva categoría
        </Button>
      </div>

      {categories.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Tag />
            </EmptyMedia>
            <EmptyTitle>Sin categorías todavía</EmptyTitle>
            <EmptyDescription>
              Crea tu primera categoría para organizar tus gastos.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Nueva categoría
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <CategoryGrid
            categories={active}
            pendingId={pendingId}
            onEdit={openEdit}
            onDelete={openDelete}
            onToggleArchive={toggleArchive}
          />

          {archived.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-muted-foreground text-sm font-medium">Archivadas</h2>
              <CategoryGrid
                categories={archived}
                pendingId={pendingId}
                onEdit={openEdit}
                onDelete={openDelete}
                onToggleArchive={toggleArchive}
              />
            </div>
          )}
        </>
      )}

      <CategoryFormDialog open={formOpen} onOpenChange={setFormOpen} category={editing} />
      <DeleteCategoryDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        category={deleteTarget}
        otherCategories={categories
          .filter((c) => c.id !== deleteTarget?.id && !c.archivedAt)
          .map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}

function CategoryGrid({
  categories,
  pendingId,
  onEdit,
  onDelete,
  onToggleArchive,
}: {
  categories: CategoryRow[];
  pendingId: string | null;
  onEdit: (category: CategoryRow) => void;
  onDelete: (category: CategoryRow) => void;
  onToggleArchive: (category: CategoryRow) => void;
}) {
  if (categories.length === 0) {
    return <p className="text-muted-foreground text-sm">No hay categorías en este grupo.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => {
        const Icon = resolveIcon(category.icon);
        return (
          <Card key={category.id} className="flex-row items-center justify-between gap-3 px-4">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${category.color}22`, color: category.color }}
              >
                <Icon className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{category.name}</p>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary">
                    {category.subscriptionCount}{" "}
                    {category.subscriptionCount === 1 ? "suscripción" : "suscripciones"}
                  </Badge>
                  {category.isSystem && <Badge variant="outline">Predefinida</Badge>}
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={pendingId === category.id}
                  aria-label={`Acciones para ${category.name}`}
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(category)}>
                  <Pencil className="size-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onToggleArchive(category)}>
                  {category.archivedAt ? (
                    <>
                      <ArchiveRestore className="size-4" />
                      Restaurar
                    </>
                  ) : (
                    <>
                      <Archive className="size-4" />
                      Archivar
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => onDelete(category)}>
                  <Trash2 className="size-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Card>
        );
      })}
    </div>
  );
}
