import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { CockroachAgent, SimulationConfig, Vector2 } from '../types/simulation';

interface SimulationCanvasProps {
  agents: CockroachAgent[];
  setAgents: React.Dispatch<React.SetStateAction<CockroachAgent[]>>;
  maskData: ImageData | null;
  config: SimulationConfig;
  isRunning: boolean;
  onFpsUpdate: (fps: number) => void;
  fullScreen: boolean;
  darkMode: boolean;
}

const SimulationCanvas = forwardRef<HTMLCanvasElement, SimulationCanvasProps>(
  ({ agents, setAgents, maskData, config, isRunning, onFpsUpdate, fullScreen, darkMode }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const lastTimeRef = useRef<number>(0);
    const fpsCounterRef = useRef({ frames: 0, lastTime: 0 });

    useImperativeHandle(ref, () => canvasRef.current!);

    // Utility functions for vector math
    const normalize = (v: Vector2): Vector2 => {
      const mag = Math.sqrt(v.x * v.x + v.y * v.y);
      return mag > 0 ? { x: v.x / mag, y: v.y / mag } : { x: 0, y: 0 };
    };

    const limit = (v: Vector2, max: number): Vector2 => {
      const mag = Math.sqrt(v.x * v.x + v.y * v.y);
      if (mag > max) {
        const factor = max / mag;
        return { x: v.x * factor, y: v.y * factor };
      }
      return v;
    };

    // Check if a pixel in the mask is white (obstacle)
    const isObstacle = (x: number, y: number): number => {
      if (!maskData) return 0;
      
      const pixelX = Math.floor(x);
      const pixelY = Math.floor(y);
      
      if (pixelX < 0 || pixelX >= maskData.width || pixelY < 0 || pixelY >= maskData.height) {
        return 1; // Treat out-of-bounds as obstacle
      }
      
      const index = (pixelY * maskData.width + pixelX) * 4;
      const r = maskData.data[index];
      const g = maskData.data[index + 1];
      const b = maskData.data[index + 2];
      
      // Consider white pixels as obstacles (threshold-based)
      const brightness = (r + g + b) / 3;
      return brightness > 128 ? 1 : 0;
    };

    // Calculate avoidance force using simple sampling
    const calculateAvoidanceForce = (agent: CockroachAgent): Vector2 => {
      const sampleRadius = 30;
      const sampleCount = 8;
      let avoidanceForce = { x: 0, y: 0 };
      
      for (let i = 0; i < sampleCount; i++) {
        const angle = (i / sampleCount) * Math.PI * 2;
        const sampleX = agent.x + Math.cos(angle) * sampleRadius;
        const sampleY = agent.y + Math.sin(angle) * sampleRadius;
        
        const obstacleStrength = isObstacle(sampleX, sampleY);
        if (obstacleStrength > 0) {
          const forceX = agent.x - sampleX;
          const forceY = agent.y - sampleY;
          const distance = Math.sqrt(forceX * forceX + forceY * forceY);
          
          if (distance > 0) {
            avoidanceForce.x += (forceX / distance) * obstacleStrength;
            avoidanceForce.y += (forceY / distance) * obstacleStrength;
          }
        }
      }
      
      return limit(avoidanceForce, config.maxForce);
    };

    // Update agent physics
    const updateAgent = (agent: CockroachAgent, deltaTime: number, canvas: HTMLCanvasElement): CockroachAgent => {
      // Calculate steering forces
      const avoidanceForce = calculateAvoidanceForce(agent);
      
      // Add random wander
      const wanderForce = {
        x: (Math.random() - 0.5) * config.wanderAmount,
        y: (Math.random() - 0.5) * config.wanderAmount
      };
      
      // Combine forces
      const totalForce = {
        x: avoidanceForce.x * config.avoidanceStrength + wanderForce.x,
        y: avoidanceForce.y * config.avoidanceStrength + wanderForce.y
      };
      
      // Update velocity
      let newVx = agent.vx + totalForce.x * deltaTime;
      let newVy = agent.vy + totalForce.y * deltaTime;
      
      // Limit velocity
      const velocity = limit({ x: newVx, y: newVy }, config.maxSpeed);
      newVx = velocity.x;
      newVy = velocity.y;
      
      // Update position
      let newX = agent.x + newVx * deltaTime * 60; // Scale by 60 for consistent speed
      let newY = agent.y + newVy * deltaTime * 60;
      
      // Bounce off walls
      if (newX <= agent.size || newX >= canvas.width - agent.size) {
        newVx *= -config.bounceForce;
        newX = Math.max(agent.size, Math.min(canvas.width - agent.size, newX));
      }
      
      if (newY <= agent.size || newY >= canvas.height - agent.size) {
        newVy *= -config.bounceForce;
        newY = Math.max(agent.size, Math.min(canvas.height - agent.size, newY));
      }
      
      // Update angle based on velocity
      const newAngle = Math.atan2(newVy, newVx);
      
      // Update wiggle phase
      const newWigglePhase = agent.wigglePhase + deltaTime * 8;
      
      return {
        ...agent,
        x: newX,
        y: newY,
        vx: newVx,
        vy: newVy,
        angle: newAngle,
        wigglePhase: newWigglePhase
      };
    };

    // Draw a cockroach
    const drawCockroach = (ctx: CanvasRenderingContext2D, agent: CockroachAgent) => {
      ctx.save();
      
      // Move to cockroach position
      ctx.translate(agent.x, agent.y);
      ctx.rotate(agent.angle);
      
      // Add slight wiggle
      const wiggle = Math.sin(agent.wigglePhase) * 0.1;
      ctx.rotate(wiggle);
      
      // Color based on mode - black for fullscreen/darkMode, brown for normal
      const bodyColor = darkMode ? '#1a1a1a' : '#8B4513';
      const headColor = darkMode ? '#0a0a0a' : '#654321';
      const legColor = darkMode ? '#333' : '#333';
      
      // Draw cockroach body (simple ellipse)
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, agent.size, agent.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw head
      ctx.fillStyle = headColor;
      ctx.beginPath();
      ctx.ellipse(agent.size * 0.7, 0, agent.size * 0.4, agent.size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw antennae
      ctx.strokeStyle = legColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(agent.size * 0.9, -agent.size * 0.2);
      ctx.lineTo(agent.size * 1.2, -agent.size * 0.4);
      ctx.moveTo(agent.size * 0.9, agent.size * 0.2);
      ctx.lineTo(agent.size * 1.2, agent.size * 0.4);
      ctx.stroke();
      
      // Draw legs (simplified)
      for (let i = 0; i < 3; i++) {
        const legX = -agent.size * 0.3 + i * agent.size * 0.3;
        const legOffset = Math.sin(agent.wigglePhase + i) * 2;
        
        // Left legs
        ctx.beginPath();
        ctx.moveTo(legX, -agent.size * 0.4);
        ctx.lineTo(legX - 3, -agent.size * 0.8 + legOffset);
        ctx.stroke();
        
        // Right legs
        ctx.beginPath();
        ctx.moveTo(legX, agent.size * 0.4);
        ctx.lineTo(legX - 3, agent.size * 0.8 + legOffset);
        ctx.stroke();
      }
      
      ctx.restore();
    };

    // Animation loop
    const animate = (currentTime: number) => {
      if (!isRunning) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;
      
      // Update FPS counter
      fpsCounterRef.current.frames++;
      if (currentTime - fpsCounterRef.current.lastTime >= 1000) {
        onFpsUpdate(fpsCounterRef.current.frames);
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.lastTime = currentTime;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas with background color from config
      ctx.fillStyle = config.backgroundColor || (darkMode ? '#ffffff' : '#1e293b');
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw mask overlay if enabled
      if (config.showMaskOverlay && maskData) {
        ctx.globalAlpha = 0.3;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = maskData.width;
        tempCanvas.height = maskData.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.putImageData(maskData, 0, 0);
          ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
        }
        ctx.globalAlpha = 1.0;
      }

      // Update and draw agents
      if (deltaTime > 0 && deltaTime < 100) { // Prevent huge time jumps
        setAgents(prevAgents => 
          prevAgents.map(agent => updateAgent(agent, deltaTime / 1000, canvas))
        );
      }

      // Draw all cockroaches
      agents.forEach(agent => drawCockroach(ctx, agent));

      animationRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Set canvas size - full screen or fixed size
      if (fullScreen) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      } else {
        canvas.width = 1200;
        canvas.height = 800;
      }

      // Start animation loop
      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, [isRunning, agents, maskData, config, fullScreen, darkMode]);

    return (
      <canvas
        ref={canvasRef}
        className={fullScreen ? "fixed inset-0 z-0" : "w-full h-auto border border-border/20 rounded-lg"}
        style={fullScreen ? { width: '100vw', height: '100vh' } : { maxWidth: '100%', height: 'auto' }}
      />
    );
  }
);

SimulationCanvas.displayName = 'SimulationCanvas';

export default SimulationCanvas;
