
import { Node, Edge } from '@xyflow/react';
import { Class } from '../models/ClassDiagram';


const NODE_WIDTH = 200; 
const NODE_HEIGHT = 150; 
const HORIZONTAL_SPACING = 250; 
const VERTICAL_SPACING = 200; 


export interface LayoutOptions {
  spacing?: number;
  direction?: 'horizontal' | 'vertical';
  centerX?: number;
  centerY?: number;
}


export interface ForceDirectedLayoutOptions extends LayoutOptions {
  /** Number of iterations for the simulation. Higher values lead to more stable layouts but take longer.
   * Default: 200 */
  iterations?: number;
  /** Strength of the attractive force between connected nodes (spring-like).
   * Default: 0.1 */
  attractionStrength?: number;
  /** Strength of the repulsive force between all nodes. (Uses 1/distance model).
   * Default: 1500 */
  repulsionStrength?: number;
  /** Desired 'optimal' distance between connected nodes. Edges act like springs trying to achieve this length.
   * Default: options.spacing or HORIZONTAL_SPACING (250) */
  optimalDistance?: number;
  /** Strength of the gravity force pulling nodes towards the centerX, centerY. Helps keep disconnected components centered.
   * Default: 0.02 */
  gravityStrength?: number;
  /** Initial maximum displacement a node can have in one iteration (simulates temperature).
   * Default: 50 */
  initialTemperature?: number;
  /** Factor by which temperature decreases in each iteration (e.g., 0.97 means 3% cooling).
   * Default: 0.97 */
  coolingFactor?: number;
  
}


/**
 * Arranges nodes in a grid layout
 */
export function gridLayout<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  options: LayoutOptions = {}
): Node<T>[] {
  const {
    spacing = HORIZONTAL_SPACING, 
    direction = 'horizontal', 
    centerX = 0,
    centerY = 0,
  } = options;
  
  const cols = Math.ceil(Math.sqrt(nodes.length));
  
  return nodes.map((node, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    
    const gridWidth = (cols - 1) * spacing;
    const gridHeight = (Math.ceil(nodes.length / cols) - 1) * spacing;
    
    const startX = centerX - gridWidth / 2;
    const startY = centerY - gridHeight / 2;

    return {
      ...node,
      position: {
        x: startX + col * spacing,
        y: startY + row * spacing,
      },
    };
  });
}


export function circleLayout<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  options: LayoutOptions = {}
): Node<T>[] {
  const {
    spacing = HORIZONTAL_SPACING, 
    centerX = 0, 
    centerY = 0, 
  } = options;
  
  
  const radius = Math.max(spacing, (nodes.length * (NODE_WIDTH || spacing)) / (2 * Math.PI) * 0.5);
  
  return nodes.map((node, index) => {
    const angle = (index * 2 * Math.PI) / nodes.length;
    
    return {
      ...node,
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      },
    };
  });
}

/**
 * Arranges nodes using a force-directed simulation.
 * Nodes repel each other, while edges act as springs pulling connected nodes together.
 */
export function forceDirectedLayout<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  edges: Edge[],
  options: ForceDirectedLayoutOptions = {}
): Node<T>[] {
  if (nodes.length === 0) return [];

  const {
    iterations = 200,
    attractionStrength = 0.1,
    repulsionStrength = 1500, 
    optimalDistance: optDist = options.spacing ?? HORIZONTAL_SPACING,
    gravityStrength = 0.02,
    initialTemperature = 50,
    coolingFactor = 0.97,
    centerX = 0,
    centerY = 0,
  } = options;

  
  
  
  const currentPositions = new Map<string, { x: number; y: number }>();
  let allNodesAtSameInitialPosition = true;
  let firstNonNullPosition: { x: number; y: number } | null = null;

  nodes.forEach(node => {
    const pos = node.position ? { ...node.position } : { x: centerX, y: centerY }; 
    currentPositions.set(node.id, pos);

    if (firstNonNullPosition === null) {
      firstNonNullPosition = pos;
    } else if (pos.x !== firstNonNullPosition.x || pos.y !== firstNonNullPosition.y) {
      allNodesAtSameInitialPosition = false;
    }
  });
  
  if (allNodesAtSameInitialPosition && nodes.length > 1) {
    const initialRadius = optDist * 0.25 * Math.sqrt(nodes.length) + (NODE_WIDTH/4);
    nodes.forEach((node, index) => {
      const angle = (index * 2 * Math.PI) / nodes.length;
      currentPositions.set(node.id, {
        x: centerX + initialRadius * Math.cos(angle),
        y: centerY + initialRadius * Math.sin(angle),
      });
    });
  } else if (nodes.length === 1 && allNodesAtSameInitialPosition) {
     
     currentPositions.set(nodes[0].id, { x: centerX, y: centerY });
  }


  let currentTemperature = initialTemperature;

  for (let iter = 0; iter < iterations; iter++) {
    const displacements = new Map<string, { dx: number; dy: number }>();
    nodes.forEach(node => displacements.set(node.id, { dx: 0, dy: 0 }));

    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeU = nodes[i];
        const nodeV = nodes[j];
        const posU = currentPositions.get(nodeU.id)!;
        const posV = currentPositions.get(nodeV.id)!;

        const deltaX = posU.x - posV.x;
        const deltaY = posU.y - posV.y;
        let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance < 0.01) { 
          distance = 0.1; 
        }
        
        
        const repulsiveF = repulsionStrength / distance;

        const dispU = displacements.get(nodeU.id)!;
        dispU.dx += (deltaX / distance) * repulsiveF;
        dispU.dy += (deltaY / distance) * repulsiveF;

        const dispV = displacements.get(nodeV.id)!;
        dispV.dx -= (deltaX / distance) * repulsiveF;
        dispV.dy -= (deltaY / distance) * repulsiveF;
      }
    }

    
    edges.forEach(edge => {
      const sourceNodeId = edge.source;
      const targetNodeId = edge.target;
      
      if (!currentPositions.has(sourceNodeId) || !currentPositions.has(targetNodeId)) {
          console.warn(`ForceDirectedLayout: Edge ${edge.id || ''} connects to a non-existent node ID.`);
          return;
      }

      const posSource = currentPositions.get(sourceNodeId)!;
      const posTarget = currentPositions.get(targetNodeId)!;

      const deltaX = posSource.x - posTarget.x; 
      const deltaY = posSource.y - posTarget.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance < 0.01) return; 

      
      
      const attractiveF = attractionStrength * (distance - optDist);

      const dispSource = displacements.get(sourceNodeId)!;
      
      dispSource.dx -= (deltaX / distance) * attractiveF;
      dispSource.dy -= (deltaY / distance) * attractiveF;

      const dispTarget = displacements.get(targetNodeId)!;
      
      dispTarget.dx += (deltaX / distance) * attractiveF;
      dispTarget.dy += (deltaY / distance) * attractiveF;
    });

    
    if (gravityStrength > 0) {
      nodes.forEach(node => {
        const pos = currentPositions.get(node.id)!;
        const disp = displacements.get(node.id)!;

        const deltaXToCenter = centerX - pos.x;
        const deltaYToCenter = centerY - pos.y;
        
        
        disp.dx += deltaXToCenter * gravityStrength;
        disp.dy += deltaYToCenter * gravityStrength;
      });
    }

    
    nodes.forEach(node => {
      const pos = currentPositions.get(node.id)!;
      const disp = displacements.get(node.id)!;

      const displacementMagnitude = Math.sqrt(disp.dx * disp.dx + disp.dy * disp.dy);

      if (displacementMagnitude > 0) {
        
        const scale = Math.min(displacementMagnitude, currentTemperature) / displacementMagnitude;
        
        pos.x += disp.dx * scale;
        pos.y += disp.dy * scale;
      }
    });

    
    currentTemperature *= coolingFactor;
    if (currentTemperature < 0.01 && iter > iterations / 2) { 
        
    }
  }

  
  return nodes.map(node => ({
    ...node,
    position: currentPositions.get(node.id)!,
  }));
}


/**
 * Arranges nodes in a hierarchical tree layout
 * This is a simplified version that only handles basic hierarchies
 */
export function treeLayout<T extends Record<string, unknown>>(
    nodes: Node<{ class: Class } & T>[],
    edges: Edge[],
    options: LayoutOptions = {}
  ): Node<T>[] {
    const {
      spacing = HORIZONTAL_SPACING,
      direction = 'vertical',
      centerX = 100,
      centerY = 100,
    } = options;
    
    if (nodes.length === 0) return [];

    
    const graph: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    
    
    nodes.forEach((node) => {
      graph[node.id] = [];
      inDegree[node.id] = 0;
    });
    
    
    edges.forEach((edge) => {
      if (graph[edge.source] && nodeMap.has(edge.target)) { 
        graph[edge.source].push(edge.target);
        inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
      }
    });
    
    
    let rootNodesIds: string[] = [];
    Object.entries(inDegree).forEach(([nodeId, degree]) => {
      if (degree === 0) {
        rootNodesIds.push(nodeId);
      }
    });
    
    
    
    if (rootNodesIds.length === 0 && nodes.length > 0) {
      let minInDegree = Infinity;
      for (const nodeId in inDegree) {
        minInDegree = Math.min(minInDegree, inDegree[nodeId]);
      }
      if (minInDegree !== Infinity) {
        for (const nodeId in inDegree) {
          if (inDegree[nodeId] === minInDegree) {
            rootNodesIds.push(nodeId);
          }
        }
      }
      
      if(rootNodesIds.length === 0 && nodes.length > 0) {
        rootNodesIds.push(nodes[0].id);
      }
    }
    
    
    const levels: Record<string, number> = {};
    const visitedDuringLeveling = new Set<string>();
    const queue: { id: string; level: number }[] = rootNodesIds.map(id => ({ id, level: 0 }));
    
    let head = 0;
    while(head < queue.length) {
      const { id, level } = queue[head++];
      if (visitedDuringLeveling.has(id) && levels[id] <= level) { 
          continue;
      }
      
      visitedDuringLeveling.add(id);
      levels[id] = level;
      
      (graph[id] || []).forEach(childId => {
        
        if (!visitedDuringLeveling.has(childId) || levels[childId] > level + 1) {
             
            inDegree[childId] = (inDegree[childId] || 1) -1;
            if(inDegree[childId] <= 0) { 
                 queue.push({ id: childId, level: level + 1 });
            }
        }
      });
    }

    
    nodes.forEach(node => {
        if (levels[node.id] === undefined) {
            levels[node.id] = 0; 
        }
    });

    
    const nodesAtLevel: Record<number, string[]> = {};
    Object.entries(levels).forEach(([nodeId, level]) => {
      if (!nodesAtLevel[level]) nodesAtLevel[level] = [];
      nodesAtLevel[level].push(nodeId);
    });
    
    
    const finalNodes: Node<T>[] = [];
    let maxLevelWidth = 0;
    for (const level in nodesAtLevel) {
        maxLevelWidth = Math.max(maxLevelWidth, nodesAtLevel[level].length);
    }

    nodes.forEach(node => {
      const nodeLevel = levels[node.id] || 0;
      const nodesInCurrentLevel = nodesAtLevel[nodeLevel]?.length || 1;
      const positionInLevel = nodesAtLevel[nodeLevel]?.indexOf(node.id) || 0;
      
      const levelBreadth = (nodesInCurrentLevel - 1) * spacing;
      const nodeOffset = positionInLevel * spacing - levelBreadth / 2;

      let x,y;
      if (direction === 'horizontal') {
        x = centerX + nodeLevel * (spacing + (NODE_WIDTH || 50)); 
        y = centerY + nodeOffset;
      } else { 
        x = centerX + nodeOffset;
        y = centerY + nodeLevel * (spacing + (NODE_HEIGHT || 50)); 
      }
      
      finalNodes.push({
        ...node,
        position: { x, y },
      });
    });
    return finalNodes;
  }

/**
 * Auto-arrange nodes based on their connectivity
 * This function chooses the appropriate layout algorithm based on the graph structure
 */
export function autoArrange<T extends Record<string, unknown>>(
  nodes: Node<{ class: Class } & T>[], 
  edges: Edge[],
  options: LayoutOptions = {} 
): Node<T>[] {
  if (nodes.length === 0) return [];
  
  const baseLayoutOptions = {
    spacing: options.spacing ?? HORIZONTAL_SPACING,
    centerX: options.centerX ?? 100,
    centerY: options.centerY ?? 100,
    ...options 
  };

  
  if (nodes.length <= 3 || edges.length === 0) {
    return gridLayout(nodes, baseLayoutOptions);
  }
  
  
  
  
  
  return treeLayout(nodes, edges, {
    ...baseLayoutOptions,
    direction: options.direction ?? 'vertical', 
  });

  
  
  
  
  
  
}