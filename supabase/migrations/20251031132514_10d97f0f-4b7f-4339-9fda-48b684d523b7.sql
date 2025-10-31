-- Create annotations table for storing labeled data
CREATE TABLE public.annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  intent TEXT,
  entities JSONB DEFAULT '[]'::jsonb,
  auto_predicted BOOLEAN DEFAULT false,
  confidence_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trained_models table for storing model metadata
CREATE TABLE public.trained_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL DEFAULT 'spacy',
  training_data_count INTEGER DEFAULT 0,
  accuracy NUMERIC,
  status TEXT DEFAULT 'training',
  model_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trained_models ENABLE ROW LEVEL SECURITY;

-- RLS policies for annotations
CREATE POLICY "Users can view own annotations"
  ON public.annotations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create annotations"
  ON public.annotations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own annotations"
  ON public.annotations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own annotations"
  ON public.annotations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for trained_models
CREATE POLICY "Users can view own models"
  ON public.trained_models FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create models"
  ON public.trained_models FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own models"
  ON public.trained_models FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own models"
  ON public.trained_models FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at triggers
CREATE TRIGGER update_annotations_updated_at
  BEFORE UPDATE ON public.annotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trained_models_updated_at
  BEFORE UPDATE ON public.trained_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();