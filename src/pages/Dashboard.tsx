import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Bot, LogOut, Plus } from "lucide-react";
import WorkspaceList from "@/components/WorkspaceList";
import DatasetUpload from "@/components/DatasetUpload";
import EvaluatorDashboard from "@/components/EvaluatorDashboard";
import CreateWorkspaceDialog from "@/components/CreateWorkspaceDialog";
import AnnotationInterface from "@/components/AnnotationInterface";
import ModelTraining from "@/components/ModelTraining";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    } else {
      setUser(user);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast.success("Signed out successfully");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">NLU Chatbot Trainer</h1>
              <p className="text-sm text-muted-foreground">Milestone 1 & 2: Dataset Management, Annotation & Model Training</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>User Authentication & Dataset Management</CardTitle>
            <CardDescription>
              Milestone 1: Dataset Management | Milestone 2: Annotation & Model Training
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="workspace" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="workspace">Workspace</TabsTrigger>
                <TabsTrigger value="dataset">Dataset Upload</TabsTrigger>
                <TabsTrigger value="annotation">Annotation</TabsTrigger>
                <TabsTrigger value="training">Model Training</TabsTrigger>
                <TabsTrigger value="evaluator">Evaluator</TabsTrigger>
              </TabsList>

              <TabsContent value="workspace" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Project Workspaces</h3>
                  <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Workspace
                  </Button>
                </div>
                <WorkspaceList 
                  userId={user?.id} 
                  onSelectWorkspace={setSelectedWorkspace}
                  selectedWorkspace={selectedWorkspace}
                />
              </TabsContent>

              <TabsContent value="dataset" className="space-y-4">
                {selectedWorkspace ? (
                  <DatasetUpload 
                    workspaceId={selectedWorkspace} 
                    userId={user?.id} 
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Please select a workspace first to upload datasets</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="annotation" className="space-y-4">
                {selectedWorkspace ? (
                  <AnnotationInterface 
                    workspaceId={selectedWorkspace} 
                    userId={user?.id} 
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Please select a workspace first to start annotating</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="training" className="space-y-4">
                {selectedWorkspace ? (
                  <ModelTraining 
                    workspaceId={selectedWorkspace} 
                    userId={user?.id} 
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Please select a workspace first to train models</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="evaluator" className="space-y-4">
                <EvaluatorDashboard userId={user?.id} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <CreateWorkspaceDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        userId={user?.id}
      />
    </div>
  );
};

export default Dashboard;