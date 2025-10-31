import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Brain, Loader2, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ModelTrainingProps {
  workspaceId: string;
  userId: string;
}

const ModelTraining = ({ workspaceId, userId }: ModelTrainingProps) => {
  const [modelName, setModelName] = useState("");
  const [training, setTraining] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  const [annotationCount, setAnnotationCount] = useState(0);

  useEffect(() => {
    fetchModels();
    fetchAnnotationCount();
  }, [workspaceId]);

  const fetchModels = async () => {
    const { data, error } = await supabase
      .from('trained_models')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching models:", error);
      return;
    }

    setModels(data || []);
  };

  const fetchAnnotationCount = async () => {
    const { count, error } = await supabase
      .from('annotations')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error("Error fetching annotation count:", error);
      return;
    }

    setAnnotationCount(count || 0);
  };

  const handleTrain = async () => {
    if (!modelName) {
      toast.error("Please provide a model name");
      return;
    }

    if (annotationCount < 5) {
      toast.error("You need at least 5 annotations to train a model");
      return;
    }

    setTraining(true);
    try {
      const { data, error } = await supabase.functions.invoke('train-model', {
        body: {
          workspace_id: workspaceId,
          model_name: modelName
        }
      });

      if (error) throw error;

      toast.success("Model trained successfully!");
      setModelName("");
      fetchModels();
    } catch (error) {
      console.error("Training error:", error);
      toast.error("Failed to train model");
    } finally {
      setTraining(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      completed: "default",
      training: "secondary",
      failed: "outline"
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
        {status === "training" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Model Training</CardTitle>
          <CardDescription>
            Train NLU models using your annotated data. Requires at least 5 annotations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-md">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Available Annotations</span>
              <span className="text-2xl font-bold">{annotationCount}</span>
            </div>
            <Progress value={Math.min((annotationCount / 50) * 100, 100)} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {annotationCount < 5 
                ? `Need ${5 - annotationCount} more annotations to start training`
                : "Ready to train!"}
            </p>
          </div>

          <div>
            <Label htmlFor="modelName">Model Name</Label>
            <Input
              id="modelName"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g., my-nlu-model-v1"
              className="mt-2"
            />
          </div>

          <Button 
            onClick={handleTrain} 
            disabled={training || annotationCount < 5}
            className="w-full"
          >
            {training ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Training Model...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Train Model with spaCy
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trained Models ({models.length})</CardTitle>
          <CardDescription>History of all trained models in this workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {models.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No models trained yet. Start by annotating some data!
              </p>
            ) : (
              models.map((model) => (
                <div key={model.id} className="p-4 border rounded-md">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{model.model_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(model.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {getStatusBadge(model.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                    <div>
                      <span className="text-muted-foreground">Training Samples:</span>
                      <span className="ml-2 font-medium">{model.training_data_count}</span>
                    </div>
                    {model.accuracy && (
                      <div>
                        <span className="text-muted-foreground">Accuracy:</span>
                        <span className="ml-2 font-medium">{(model.accuracy * 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelTraining;
