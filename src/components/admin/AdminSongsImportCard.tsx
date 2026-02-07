import React, { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, AlertTriangle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImportDuplicatesDialog } from "./ImportDuplicatesDialog";

interface Duplicate {
  titolo: string;
  artista: string;
  duplicateOf: string;
}

interface ImportResult {
  success: boolean;
  imported?: number;
  errors?: number;
  total?: number;
  totalRaw?: number;
  errorDetails?: string[];
  count?: number;
  uniqueCount?: number;
  duplicatesCount?: number;
  duplicates?: Duplicate[];
  preview?: Array<{ titolo: string; artista: string }>;
}

export const AdminSongsImportCard: React.FC = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showDuplicatesDialog, setShowDuplicatesDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------------- FILE SELECT ---------------- */
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);
    setIsParsing(true);

    try {
      const content = await file.text();
      setCsvContent(content);

      // Preview parse
      const { data, error } = await supabase.functions.invoke("import-songs", {
        body: { csvContent: content, action: "parse" },
      });

      if (error) throw error;

      setResult(data);
      toast.success(`File analizzato: ${data.uniqueCount} canzoni uniche pronte`);
    } catch (err: any) {
      console.error("Parse error:", err);
      toast.error("Errore nella lettura del file");
      setResult({ success: false, errors: 1, errorDetails: [err.message] });
    } finally {
      setIsParsing(false);
    }
  };

  /* ---------------- IMPORT ---------------- */
  const handleImport = async () => {
    if (!csvContent) {
      toast.error("Nessun file selezionato");
      return;
    }

    setIsImporting(true);
    setProgress(10);

    try {
      setProgress(30);
      const { data, error } = await supabase.functions.invoke("import-songs", {
        body: { csvContent, action: "import" },
      });

      setProgress(90);
      if (error) throw error;

      setResult(data);
      setProgress(100);

      if (data.imported > 0) {
        toast.success(`🎉 Importate ${data.imported} canzoni con successo!`);
      }
      if (data.errors && data.errors > 0) {
        toast.warning(`${data.errors} errori durante l'import`);
      }
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error("Errore durante l'importazione");
      setResult({ success: false, errors: 1, errorDetails: [err.message] });
    } finally {
      setIsImporting(false);
    }
  };

  /* ---------------- RESET ---------------- */
  const resetImport = () => {
    setCsvContent(null);
    setFileName(null);
    setResult(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Upload className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Importa Canzoni da CSV</CardTitle>
            <CardDescription className="text-xs">
              Formato: colonna A = Titolo, B = Artista, C = Testo (multilinea)
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* File input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
          id="csv-upload"
        />
        {!fileName ? (
          <label
            htmlFor="csv-upload"
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
          >
            <FileText className="w-8 h-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Clicca per selezionare un file CSV</span>
          </label>
        ) : (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">{fileName}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={resetImport}>
              Cambia
            </Button>
          </div>
        )}

        {/* Parsing indicator */}
        {isParsing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Analisi del file in corso...
          </div>
        )}

        {/* Preview */}
        {result?.preview && !result.imported && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-primary">
              ✓ {result.uniqueCount} canzoni uniche pronte per l'importazione
            </p>

            {/* Duplicates warning */}
            {result.duplicatesCount && result.duplicatesCount > 0 && (
              <div
                className="flex items-center justify-between p-3 bg-accent/10 border border-accent/30 rounded-lg cursor-pointer hover:bg-accent/20 transition-colors"
                onClick={() => setShowDuplicatesDialog(true)}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-accent" />
                  <span className="text-sm">{result.duplicatesCount} duplicati trovati nel CSV</span>
                </div>
                <span className="text-xs text-muted-foreground">Clicca per vedere →</span>
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p>Anteprima:</p>
              {result.preview.map((song, i) => (
                <p key={i} className="pl-2">
                  • {song.titolo} – {song.artista}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Progress */}
        {isImporting && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">Importazione in corso... {progress}%</p>
          </div>
        )}

        {/* Import result */}
        {result?.imported !== undefined && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {result.errors === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              ) : (
                <AlertCircle className="w-5 h-5 text-accent" />
              )}
              <span className="text-sm font-medium">
                {result.imported} canzoni importate
                {result.errors ? `, ${result.errors} errori` : ""}
              </span>
            </div>

            {result.duplicatesCount && result.duplicatesCount > 0 && (
              <div
                className="flex items-center justify-between p-3 bg-muted/50 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                onClick={() => setShowDuplicatesDialog(true)}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {result.duplicatesCount} duplicati nel CSV (saltati)
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">Vedi lista →</span>
              </div>
            )}

            {result.errorDetails && result.errorDetails.length > 0 && (
              <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                {result.errorDetails.slice(0, 3).map((err, i) => (
                  <p key={i}>{err}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Import button */}
        {csvContent && result?.uniqueCount && !result.imported && (
          <Button onClick={handleImport} disabled={isImporting} className="w-full neon-button-pink">
            {isImporting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Importazione...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Importa {result.uniqueCount} Canzoni
              </>
            )}
          </Button>
        )}

        {/* Reset after import */}
        {result?.imported !== undefined && (
          <Button variant="outline" onClick={resetImport} className="w-full">
            Nuovo Import
          </Button>
        )}
      </CardContent>

      {/* Duplicates Dialog */}
      <ImportDuplicatesDialog
        open={showDuplicatesDialog}
        onOpenChange={setShowDuplicatesDialog}
        duplicates={result?.duplicates ?? []}
        totalRaw={result?.totalRaw ?? result?.count ?? 0}
        uniqueCount={result?.uniqueCount ?? result?.imported ?? 0}
      />
    </Card>
  );
};
