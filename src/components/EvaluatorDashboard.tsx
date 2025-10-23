import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Evaluation {
  id: string;
  workspace_id: string;
  accuracy: number;
  f1_score: number;
  precision_score: number;
  recall_score: number;
  notes: string;
  evaluated_at: string;
  workspaces: {
    name: string;
  };
}

interface EvaluatorDashboardProps {
  userId: string;
}

const EvaluatorDashboard = ({ userId }: EvaluatorDashboardProps) => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    const { data, error } = await supabase
      .from("evaluations")
      .select(`
        *,
        workspaces (
          name
        )
      `)
      .order("evaluated_at", { ascending: false });

    if (error) {
      console.error("Error fetching evaluations:", error);
    } else {
      setEvaluations(data || []);
    }
    setLoading(false);
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 75) return <Badge className="bg-blue-500">Good</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-500">Fair</Badge>;
    return <Badge variant="destructive">Needs Improvement</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">Loading evaluations...</div>;
  }

  if (evaluations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No evaluations yet. Evaluations will appear here once created.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Model Evaluation Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>F1 Score</TableHead>
                  <TableHead>Precision</TableHead>
                  <TableHead>Recall</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Evaluated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((evaluation) => (
                  <TableRow key={evaluation.id}>
                    <TableCell className="font-medium">
                      {evaluation.workspaces?.name || "Unknown"}
                    </TableCell>
                    <TableCell>{evaluation.accuracy}%</TableCell>
                    <TableCell>{evaluation.f1_score}%</TableCell>
                    <TableCell>{evaluation.precision_score}%</TableCell>
                    <TableCell>{evaluation.recall_score}%</TableCell>
                    <TableCell>{getScoreBadge(evaluation.accuracy)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(evaluation.evaluated_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EvaluatorDashboard;