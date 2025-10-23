import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderKanban, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface WorkspaceListProps {
  userId: string;
  onSelectWorkspace: (workspaceId: string) => void;
  selectedWorkspace: string | null;
}

const WorkspaceList = ({ userId, onSelectWorkspace, selectedWorkspace }: WorkspaceListProps) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkspaces();
  }, [userId]);

  const fetchWorkspaces = async () => {
    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load workspaces");
      console.error(error);
    } else {
      setWorkspaces(data || []);
      if (data && data.length > 0 && !selectedWorkspace) {
        onSelectWorkspace(data[0].id);
      }
    }
    setLoading(false);
  };

  const deleteWorkspace = async (id: string) => {
    const { error } = await supabase
      .from("workspaces")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete workspace");
    } else {
      toast.success("Workspace deleted successfully");
      fetchWorkspaces();
      if (selectedWorkspace === id) {
        onSelectWorkspace("");
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading workspaces...</div>;
  }

  if (workspaces.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No workspaces yet. Create your first workspace to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workspaces.map((workspace) => (
        <Card 
          key={workspace.id}
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedWorkspace === workspace.id ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => onSelectWorkspace(workspace.id)}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">{workspace.name}</h4>
                <p className="text-sm text-muted-foreground">
                  Created {formatDistanceToNow(new Date(workspace.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                deleteWorkspace(workspace.id);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default WorkspaceList;