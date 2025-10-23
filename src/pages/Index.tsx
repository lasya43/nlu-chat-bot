import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bot, Database, FileUp, BarChart3 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary rounded-2xl shadow-lg">
              <Bot className="h-16 w-16 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            NLU Chatbot Trainer
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Professional platform for training and evaluating Natural Language Understanding chatbots
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="shadow-lg">
            Get Started
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card p-6 rounded-lg shadow-md border">
            <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
              <Database className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Workspace Management</h3>
            <p className="text-muted-foreground">
              Create and manage multiple chatbot projects with ease
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg shadow-md border">
            <div className="p-3 bg-secondary/10 rounded-lg w-fit mb-4">
              <FileUp className="h-8 w-8 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Dataset Upload & Preview</h3>
            <p className="text-muted-foreground">
              Upload training datasets in CSV, JSON, or Rasa format with instant preview
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg shadow-md border">
            <div className="p-3 bg-accent/10 rounded-lg w-fit mb-4">
              <BarChart3 className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Evaluator Dashboard</h3>
            <p className="text-muted-foreground">
              Track model performance with comprehensive evaluation metrics
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
