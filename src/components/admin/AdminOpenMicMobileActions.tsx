import React from "react";
import { CheckSquare, Trash2, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
  visible: boolean;
  selectionMode: boolean;
  selectedCount: number;
  totalCount: number;
  canUndo: boolean;
  onUndo: () => void;
  onEnterSelection: () => void;
  onExitSelection: () => void;
  onToggleSelectAll: () => void;
  onDeleteSelected: () => Promise<void>;
};

/**
 * Mobile-only bottom action bar for Open Mic list.
 * Sits above the AdminMobileTabBar.
 */
export function AdminOpenMicMobileActions({
  visible,
  selectionMode,
  selectedCount,
  totalCount,
  canUndo,
  onUndo,
  onEnterSelection,
  onExitSelection,
  onToggleSelectAll,
  onDeleteSelected,
}: Props) {
  if (!visible) return null;

  return (
    <div className="fixed left-0 right-0 z-40 bottom-16 md:hidden">
      <div className="mx-auto max-w-md px-3 pb-3">
        <div className="bg-card/98 backdrop-blur-xl border border-border rounded-xl shadow-lg">
          <div className="flex items-center gap-2 p-2">
            {!selectionMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={onEnterSelection}
                  disabled={totalCount === 0}
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Seleziona
                </Button>
                {canUndo && (
                  <Button variant="outline" size="sm" className="flex-1" onClick={onUndo}>
                    <Undo2 className="w-4 h-4 mr-2" />
                    Annulla
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" className="flex-1" onClick={onToggleSelectAll} disabled={totalCount === 0}>
                  {selectedCount === totalCount ? "Nessuno" : "Tutti"}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-destructive text-destructive"
                      disabled={selectedCount === 0}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Elimina ({selectedCount})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Elimina selezionate</AlertDialogTitle>
                      <AlertDialogDescription>
                        Vuoi eliminare {selectedCount} prenotazioni selezionate? L’azione è irreversibile.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={onDeleteSelected}
                      >
                        Elimina
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="outline" size="sm" onClick={onExitSelection} className="shrink-0">
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
