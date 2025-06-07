
export interface SimulationConfig {
  cockroachCount: number;
  avoidanceStrength: number;
  wanderAmount: number;
  showMaskOverlay: boolean;
  maxSpeed: number;
  maxForce: number;
  bounceForce: number;
  cockroachSize: number;
  backgroundColor: string;
}

export interface CockroachAgent {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  wigglePhase: number;
  size: number;
}

export interface Vector2 {
  x: number;
  y: number;
}
