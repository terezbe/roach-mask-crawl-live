
import React, { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import ConfigPanel from './ConfigPanel';
import SimulationCanvas from './SimulationCanvas';
import StreamHandler from './StreamHandler';
import { SimulationConfig, CockroachAgent } from '../types/simulation';

const CockroachSimulation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [config, setConfig] = useState<SimulationConfig>({
    cockroachCount: 100,
    avoidanceStrength: 2.5,
    wanderAmount: 0.3,
    showMaskOverlay: false,
    maxSpeed: 2,
    maxForce: 0.1,
    bounceForce: 0.8
  });
  
  const [agents, setAgents] = useState<CockroachAgent[]>([]);
  const [maskData, setMaskData] = useState<ImageData | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [fps, setFps] = useState(0);

  // Initialize cockroaches when component mounts or count changes
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const newAgents: CockroachAgent[] = [];
      
      for (let i = 0; i < config.cockroachCount; i++) {
        newAgents.push({
          id: i,
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          angle: Math.random() * Math.PI * 2,
          wigglePhase: Math.random() * Math.PI * 2,
          size: 12 + Math.random() * 8
        });
      }
      
      setAgents(newAgents);
    }
  }, [config.cockroachCount]);

  const handleConfigChange = (newConfig: Partial<SimulationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const toggleSimulation = () => {
    setIsRunning(!isRunning);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Cockroach Avoidance Simulation
          </h1>
          <p className="text-muted-foreground">
            Real-time 2D simulation with NDI mask stream integration
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Configuration Panel */}
          <div className="xl:col-span-1">
            <ConfigPanel
              config={config}
              onConfigChange={handleConfigChange}
              isRunning={isRunning}
              onToggleSimulation={toggleSimulation}
              fps={fps}
            />
            <div className="mt-4">
              <StreamHandler
                onMaskUpdate={setMaskData}
                showPreview={config.showMaskOverlay}
              />
            </div>
          </div>

          {/* Simulation Canvas */}
          <div className="xl:col-span-3">
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <SimulationCanvas
                ref={canvasRef}
                agents={agents}
                setAgents={setAgents}
                maskData={maskData}
                config={config}
                isRunning={isRunning}
                onFpsUpdate={setFps}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CockroachSimulation;
