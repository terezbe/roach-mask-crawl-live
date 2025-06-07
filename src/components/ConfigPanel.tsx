
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Bug } from 'lucide-react';
import { SimulationConfig } from '../types/simulation';

interface ConfigPanelProps {
  config: SimulationConfig;
  onConfigChange: (config: Partial<SimulationConfig>) => void;
  isRunning: boolean;
  onToggleSimulation: () => void;
  fps: number;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  config,
  onConfigChange,
  isRunning,
  onToggleSimulation,
  fps
}) => {
  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          Simulation Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Play/Pause Button */}
        <Button 
          onClick={onToggleSimulation}
          className="w-full"
          variant={isRunning ? "destructive" : "default"}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4 mr-2" />
              Pause Simulation
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Start Simulation
            </>
          )}
        </Button>

        {/* FPS Counter */}
        <div className="flex justify-between items-center">
          <Label>Performance</Label>
          <Badge variant="outline">
            {fps.toFixed(1)} FPS
          </Badge>
        </div>

        {/* Cockroach Count */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Cockroach Count</Label>
            <span className="text-sm text-muted-foreground">{config.cockroachCount}</span>
          </div>
          <Slider
            value={[config.cockroachCount]}
            onValueChange={([value]) => onConfigChange({ cockroachCount: value })}
            min={10}
            max={300}
            step={10}
            className="w-full"
          />
        </div>

        {/* Avoidance Strength */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Avoidance Strength</Label>
            <span className="text-sm text-muted-foreground">{config.avoidanceStrength.toFixed(1)}</span>
          </div>
          <Slider
            value={[config.avoidanceStrength]}
            onValueChange={([value]) => onConfigChange({ avoidanceStrength: value })}
            min={0.1}
            max={5.0}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Random Wander */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Random Wander</Label>
            <span className="text-sm text-muted-foreground">{config.wanderAmount.toFixed(1)}</span>
          </div>
          <Slider
            value={[config.wanderAmount]}
            onValueChange={([value]) => onConfigChange({ wanderAmount: value })}
            min={0.0}
            max={1.0}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Max Speed */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Max Speed</Label>
            <span className="text-sm text-muted-foreground">{config.maxSpeed.toFixed(1)}</span>
          </div>
          <Slider
            value={[config.maxSpeed]}
            onValueChange={([value]) => onConfigChange({ maxSpeed: value })}
            min={0.5}
            max={5.0}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Show Mask Overlay */}
        <div className="flex items-center justify-between">
          <Label htmlFor="mask-overlay">Show Mask Overlay</Label>
          <Switch
            id="mask-overlay"
            checked={config.showMaskOverlay}
            onCheckedChange={(checked) => onConfigChange({ showMaskOverlay: checked })}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfigPanel;
