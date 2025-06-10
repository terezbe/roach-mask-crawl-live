import React, { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import ConfigPanel from './ConfigPanel';
import SimulationCanvas from './SimulationCanvas';
import SimpleVideoReceiver from './SimpleVideoReceiver';
import { SimulationConfig, CockroachAgent } from '../types/simulation';

const CockroachSimulation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Load saved config from localStorage
  const loadSavedConfig = (): SimulationConfig => {
    try {
      const saved = localStorage.getItem('cockroach-simulation-config');
      if (saved) {
        return { ...getDefaultConfig(), ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Error loading saved config:', error);
    }
    return getDefaultConfig();
  };

  const getDefaultConfig = (): SimulationConfig => ({
    cockroachCount: 100,
    avoidanceStrength: 2.5,
    wanderAmount: 0.3,
    showMaskOverlay: false,
    maxSpeed: 2,
    maxForce: 0.1,
    bounceForce: 0.8,
    cockroachSize: 12,
    backgroundColor: '#ffffff'
  });

  const [config, setConfig] = useState<SimulationConfig>(loadSavedConfig);
  const [agents, setAgents] = useState<CockroachAgent[]>([]);
  const [maskData, setMaskData] = useState<ImageData | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [fps, setFps] = useState(0);
  const [autoStart, setAutoStart] = useState(() => {
    const saved = localStorage.getItem('cockroach-simulation-autostart');
    return saved === 'true';
  });
  const [hideUI, setHideUI] = useState(() => {
    const saved = localStorage.getItem('cockroach-simulation-hideui');
    return saved === 'true';
  });
  const [showUIToggle, setShowUIToggle] = useState(false);

  // Save config to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('cockroach-simulation-config', JSON.stringify(config));
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }, [config]);

  // Save auto-start preference
  useEffect(() => {
    localStorage.setItem('cockroach-simulation-autostart', autoStart.toString());
  }, [autoStart]);

  // Save hide UI preference
  useEffect(() => {
    localStorage.setItem('cockroach-simulation-hideui', hideUI.toString());
  }, [hideUI]);

  // Auto-start simulation if enabled
  useEffect(() => {
    if (autoStart && !isRunning) {
      console.log('Auto-starting simulation...');
      setIsRunning(true);
    }
  }, [autoStart]);

  // Initialize cockroaches when component mounts or count/size changes
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
          size: config.cockroachSize + Math.random() * (config.cockroachSize * 0.3)
        });
      }
      
      setAgents(newAgents);
    }
  }, [config.cockroachCount, config.cockroachSize]);

  const handleConfigChange = (newConfig: Partial<SimulationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const toggleSimulation = () => {
    setIsRunning(!isRunning);
  };

  const resetToDefaults = () => {
    setConfig(getDefaultConfig());
    localStorage.removeItem('cockroach-simulation-config');
  };

  if (hideUI) {
    return (
      <div className="fixed inset-0 bg-background overflow-hidden">
        {/* Hover area for UI toggle - only visible on hover */}
        <div 
          className="fixed top-0 right-0 w-32 h-16 z-50 flex items-center justify-center"
          onMouseEnter={() => setShowUIToggle(true)}
          onMouseLeave={() => setShowUIToggle(false)}
        >
          <div className={`transition-opacity duration-300 ${showUIToggle ? 'opacity-100' : 'opacity-0'} bg-card/90 backdrop-blur-sm rounded-lg p-2 border border-border/50`}>
            <div className="flex items-center gap-2">
              <Label htmlFor="show-ui" className="text-xs">Show UI</Label>
              <Switch
                id="show-ui"
                checked={!hideUI}
                onCheckedChange={(checked) => setHideUI(!checked)}
              />
            </div>
          </div>
        </div>

        {/* Full screen simulation */}
        <div className="w-full h-full" style={{ backgroundColor: config.backgroundColor || '#ffffff' }}>
          <SimulationCanvas
            ref={canvasRef}
            agents={agents}
            setAgents={setAgents}
            maskData={maskData}
            config={config}
            isRunning={isRunning}
            onFpsUpdate={setFps}
            fullScreen={true}
            darkMode={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Cockroach Avoidance Simulation
              </h1>
              <p className="text-muted-foreground">
                Real-time 2D simulation with TouchDesigner direct video streaming
              </p>
            </div>
            
            {/* Auto-start and UI controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="auto-start">Auto-start</Label>
                <Switch
                  id="auto-start"
                  checked={autoStart}
                  onCheckedChange={setAutoStart}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="hide-ui">Hide UI</Label>
                <Switch
                  id="hide-ui"
                  checked={hideUI}
                  onCheckedChange={setHideUI}
                />
              </div>
            </div>
          </div>
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
              onResetDefaults={resetToDefaults}
            />
            <div className="mt-4">
              <SimpleVideoReceiver
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
                fullScreen={false}
                darkMode={false}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CockroachSimulation;
