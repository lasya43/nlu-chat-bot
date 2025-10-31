import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Save, Download, Upload, Loader2 } from "lucide-react";
import Papa from "papaparse";

interface Entity {
  text: string;
  type: string;
  start: number;
  end: number;
}

interface AnnotationInterfaceProps {
  workspaceId: string;
  userId: string;
}

const INTENT_OPTIONS = [
  "book_flight",
  "check_weather",
  "find_restaurant",
  "order_food",
  "get_directions",
  "book_hotel",
  "cancel_booking",
  "check_status",
  "ask_question",
  "greeting",
  "farewell"
];

const ENTITY_TYPES = ["location", "date", "time", "person", "organization", "product", "quantity", "price"];

const AnnotationInterface = ({ workspaceId, userId }: AnnotationInterfaceProps) => {
  const [text, setText] = useState("");
  const [intent, setIntent] = useState("");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedText, setSelectedText] = useState("");
  const [entityType, setEntityType] = useState("");
  const [predicting, setPredicting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [datasetSentences, setDatasetSentences] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchAnnotations();
    fetchDatasetSentences();
  }, [workspaceId]);

  const fetchAnnotations = async () => {
    const { data, error } = await supabase
      .from('annotations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching annotations:", error);
      return;
    }

    setAnnotations(data || []);
  };

  const fetchDatasetSentences = async () => {
    const { data: datasets, error } = await supabase
      .from('datasets')
      .select('preview_data')
      .eq('workspace_id', workspaceId)
      .limit(1);

    if (error || !datasets || datasets.length === 0) {
      return;
    }

    const previewData = datasets[0].preview_data as any;
    if (previewData && Array.isArray(previewData)) {
      const sentences = previewData
        .map((row: any) => {
          const values = Object.values(row);
          return values.find(v => typeof v === 'string' && v.length > 10);
        })
        .filter(Boolean) as string[];
      
      setDatasetSentences(sentences);
      if (sentences.length > 0) {
        setText(sentences[0]);
      }
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selected = selection?.toString().trim();
    if (selected) {
      setSelectedText(selected);
    }
  };

  const addEntity = () => {
    if (!selectedText || !entityType) {
      toast.error("Please select text and choose entity type");
      return;
    }

    const start = text.indexOf(selectedText);
    if (start === -1) return;

    const newEntity: Entity = {
      text: selectedText,
      type: entityType,
      start,
      end: start + selectedText.length
    };

    setEntities([...entities, newEntity]);
    setSelectedText("");
    setEntityType("");
    toast.success("Entity added");
  };

  const removeEntity = (index: number) => {
    setEntities(entities.filter((_, i) => i !== index));
  };

  const handleAutoPredict = async () => {
    if (!text) {
      toast.error("Please enter text first");
      return;
    }

    setPredicting(true);
    try {
      const { data, error } = await supabase.functions.invoke('nlu-predict', {
        body: { text }
      });

      if (error) throw error;

      setIntent(data.intent);
      setEntities(data.entities || []);
      toast.success(`Predicted with ${(data.confidence * 100).toFixed(1)}% confidence`);
    } catch (error) {
      console.error("Prediction error:", error);
      toast.error("Failed to predict");
    } finally {
      setPredicting(false);
    }
  };

  const handleSave = async () => {
    if (!text || !intent) {
      toast.error("Please provide text and intent");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('annotations')
        .insert([{
          workspace_id: workspaceId,
          user_id: userId,
          text,
          intent,
          entities: entities as any,
          auto_predicted: false
        }]);

      if (error) throw error;

      toast.success("Annotation saved successfully");
      fetchAnnotations();
      
      // Move to next sentence
      if (currentIndex < datasetSentences.length - 1) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        setText(datasetSentences[nextIndex]);
        setIntent("");
        setEntities([]);
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save annotation");
    } finally {
      setSaving(false);
    }
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(annotations, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `annotations_${new Date().toISOString()}.json`;
    link.click();
    toast.success("Exported to JSON");
  };

  const exportToCSV = () => {
    const csvData = annotations.map(a => ({
      text: a.text,
      intent: a.intent,
      entities: JSON.stringify(a.entities),
      created_at: a.created_at
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `annotations_${new Date().toISOString()}.csv`;
    link.click();
    toast.success("Exported to CSV");
  };

  const loadNextSentence = () => {
    if (currentIndex < datasetSentences.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setText(datasetSentences[nextIndex]);
      setIntent("");
      setEntities([]);
    } else {
      toast.info("No more sentences in dataset");
    }
  };

  const loadPreviousSentence = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setText(datasetSentences[prevIndex]);
      setIntent("");
      setEntities([]);
    }
  };

  const highlightedText = () => {
    if (entities.length === 0) return text;

    const sortedEntities = [...entities].sort((a, b) => a.start - b.start);
    let result = [];
    let lastIndex = 0;

    sortedEntities.forEach((entity) => {
      result.push(text.substring(lastIndex, entity.start));
      result.push(
        <Badge key={entity.start} variant="secondary" className="mx-1">
          {entity.text} <span className="text-xs ml-1">({entity.type})</span>
        </Badge>
      );
      lastIndex = entity.end;
    });

    result.push(text.substring(lastIndex));
    return result;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Annotation Interface</CardTitle>
          <CardDescription>
            Annotate text with intents and entities. Use AI predictions for faster labeling.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {datasetSentences.length > 0 && (
            <div className="flex items-center justify-between bg-muted p-2 rounded-md">
              <span className="text-sm text-muted-foreground">
                Sentence {currentIndex + 1} of {datasetSentences.length}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={loadPreviousSentence} disabled={currentIndex === 0}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" onClick={loadNextSentence} disabled={currentIndex === datasetSentences.length - 1}>
                  Next
                </Button>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="text">Text to Annotate</Label>
            <div 
              className="mt-2 p-4 border rounded-md min-h-[100px] cursor-text bg-background"
              onMouseUp={handleTextSelection}
            >
              {highlightedText()}
            </div>
            <Input
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter or edit text here..."
              className="mt-2"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAutoPredict} disabled={predicting} variant="secondary">
              {predicting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Auto-Predict with AI
            </Button>
          </div>

          <div>
            <Label htmlFor="intent">Intent</Label>
            <Select value={intent} onValueChange={setIntent}>
              <SelectTrigger id="intent" className="mt-2">
                <SelectValue placeholder="Select intent" />
              </SelectTrigger>
              <SelectContent>
                {INTENT_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Entity Annotation</Label>
            <div className="flex gap-2">
              <Input
                value={selectedText}
                onChange={(e) => setSelectedText(e.target.value)}
                placeholder="Select text or type entity"
                className="flex-1"
              />
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Entity type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addEntity} size="sm">Add Entity</Button>
            </div>

            {entities.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {entities.map((entity, index) => (
                  <Badge key={index} variant="outline" className="cursor-pointer" onClick={() => removeEntity(index)}>
                    {entity.text} ({entity.type}) ✕
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Annotation
            </Button>
            <Button onClick={exportToJSON} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved Annotations ({annotations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {annotations.map((annotation) => (
              <div key={annotation.id} className="p-3 border rounded-md">
                <div className="font-medium">{annotation.text}</div>
                <div className="flex gap-2 mt-2">
                  <Badge>{annotation.intent}</Badge>
                  {annotation.entities && annotation.entities.map((entity: Entity, idx: number) => (
                    <Badge key={idx} variant="secondary">
                      {entity.text} ({entity.type})
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnnotationInterface;
