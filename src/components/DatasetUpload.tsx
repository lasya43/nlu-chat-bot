import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Eye } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import DatasetPreview from "./DatasetPreview";

interface DatasetUploadProps {
  workspaceId: string;
  userId: string;
}

const DatasetUpload = ({ workspaceId, userId }: DatasetUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [fileName, setFileName] = useState("");

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileType = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "json", "rasa"].includes(fileType || "")) {
      toast.error("Please upload a CSV, JSON, or Rasa format file");
      return;
    }

    setUploading(true);
    setFileName(file.name);

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        let parsedData;
        let rowCount = 0;

        if (fileType === "csv") {
          const result = Papa.parse(content, { header: true });
          parsedData = result.data.slice(0, 10); // First 10 rows for preview
          rowCount = result.data.length;
        } else if (fileType === "json" || fileType === "rasa") {
          const jsonData = JSON.parse(content);
          parsedData = Array.isArray(jsonData) 
            ? jsonData.slice(0, 10) 
            : [jsonData];
          rowCount = Array.isArray(jsonData) ? jsonData.length : 1;
        }

        // Store in database
        const { data, error } = await supabase.from("datasets").insert({
          workspace_id: workspaceId,
          user_id: userId,
          name: file.name,
          file_type: fileType || "unknown",
          file_size: file.size,
          preview_data: parsedData,
          row_count: rowCount,
        }).select();

        if (error) {
          toast.error("Failed to upload dataset");
          console.error(error);
        } else {
          toast.success("Dataset uploaded successfully!");
          setPreviewData({ data: parsedData, type: fileType, rowCount, id: data[0].id });
        }
      };

      reader.readAsText(file);
    } catch (error) {
      toast.error("Error processing file");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Upload Dataset</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
            Upload your training dataset in CSV, JSON, or Rasa format
          </p>
          <label htmlFor="file-upload">
            <Button disabled={uploading} asChild>
              <span className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2" />
                {uploading ? "Uploading..." : "Choose File"}
              </span>
            </Button>
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".csv,.json,.rasa"
            onChange={handleFileUpload}
            className="hidden"
          />
          {fileName && (
            <p className="mt-2 text-sm text-muted-foreground">
              Selected: {fileName}
            </p>
          )}
        </CardContent>
      </Card>

      {previewData && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Dataset Preview</h3>
              </div>
              <span className="text-sm text-muted-foreground">
                Total rows: {previewData.rowCount}
              </span>
            </div>
            <DatasetPreview data={previewData.data} type={previewData.type} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DatasetUpload;