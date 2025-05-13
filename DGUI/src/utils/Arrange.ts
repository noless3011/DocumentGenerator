// Layout utilities for arranging diagram elements
import { Node, Edge } from '@xyflow/react';
import { Class } from '../models/ClassDiagram';

// Constants for layout parameters
const NODE_WIDTH = 200; // Can inform optimal distance, not directly used in point-mass physics
const NODE_HEIGHT = 150; // Can inform optimal distance
const HORIZONTAL_SPACING = 250; // Default for optimal distance or grid spacing
const VERTICAL_SPACING = 200; // Default for grid spacing

// Interface for layout options
export interface LayoutOptions {
  spacing?: number;
  direction?: 'horizontal' | 'vertical';
  centerX?: number;
  centerY?: number;
}

// Interface for Force-Directed Layout specific options
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
  // minEnergyThreshold?: number; // Potential future addition: stop if system energy is low
}


/**
 * Arranges nodes in a grid layout
 */
export function gridLayout<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  options: LayoutOptions = {}
): Node<T>[] {
  const {
    spacing = HORIZONTAL_SPACING, // Use HORIZONTAL_SPACING as a general default if not specified
    direction = 'horizontal', // Direction doesn't strictly apply to grid like this but kept for interface
    centerX = 0,
    centerY = 0,
  } = options;
  
  const cols = Math.ceil(Math.sqrt(nodes.length));
  
  return nodes.map((node, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    // Adjust so centerX, centerY refers to the center of the grid
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

/**
 * Arranges nodes in a circle layout
 */
export function circleLayout<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  options: LayoutOptions = {}
): Node<T>[] {
  const {
    spacing = HORIZONTAL_SPACING, // Used to calculate radius
    centerX = 0, // Default center X
    centerY = 0, // Default center Y
  } = options;
  
  // Ensure a minimum radius even for few nodes, and scale with node count
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

  // Initialize positions:
  // - Use existing positions if provided.
  // - If all nodes are at the same position (e.g., 0,0 or all undefined), spread them in a circle.
  const currentPositions = new Map<string, { x: number; y: number }>();
  let allNodesAtSameInitialPosition = true;
  let firstNonNullPosition: { x: number; y: number } | null = null;

  nodes.forEach(node => {
    const pos = node.position ? { ...node.position } : { x: centerX, y: centerY }; // Default to center if undefined
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
     // Single node, ensure it's at centerX, centerY if it was at a default spot
     currentPositions.set(nodes[0].id, { x: centerX, y: centerY });
  }


  let currentTemperature = initialTemperature;

  for (let iter = 0; iter < iterations; iter++) {
    const displacements = new Map<string, { dx: number; dy: number }>();
    nodes.forEach(node => displacements.set(node.id, { dx: 0, dy: 0 }));

    // 1. Calculate repulsive forces between all pairs of nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeU = nodes[i];
        const nodeV = nodes[j];
        const posU = currentPositions.get(nodeU.id)!;
        const posV = currentPositions.get(nodeV.id)!;

        const deltaX = posU.x - posV.x;
        const deltaY = posU.y - posV.y;
        let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance < 0.01) { // Avoid division by zero or extreme forces if coincident
          distance = 0.1; // Jitter them apart slightly
        }
        
        // Repulsive force: F_r = k_r / distance
        const repulsiveF = repulsionStrength / distance;

        const dispU = displacements.get(nodeU.id)!;
        dispU.dx += (deltaX / distance) * repulsiveF;
        dispU.dy += (deltaY / distance) * repulsiveF;

        const dispV = displacements.get(nodeV.id)!;
        dispV.dx -= (deltaX / distance) * repulsiveF;
        dispV.dy -= (deltaY / distance) * repulsiveF;
      }
    }

    // 2. Calculate attractive forces for edges (springs)
    edges.forEach(edge => {
      const sourceNodeId = edge.source;
      const targetNodeId = edge.target;
      
      if (!currentPositions.has(sourceNodeId) || !currentPositions.has(targetNodeId)) {
          console.warn(`ForceDirectedLayout: Edge ${edge.id || ''} connects to a non-existent node ID.`);
          return;
      }

      const posSource = currentPositions.get(sourceNodeId)!;
      const posTarget = currentPositions.get(targetNodeId)!;

      const deltaX = posSource.x - posTarget.x; // Vector from target to source
      const deltaY = posSource.y - posTarget.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance < 0.01) return; // Nodes are effectively at the same spot

      // Attractive force (spring): F_a = k_a * (distance - optimalDistance)
      // Positive if too far (pulls), negative if too close (pushes via spring mechanism)
      const attractiveF = attractionStrength * (distance - optDist);

      const dispSource = displacements.get(sourceNodeId)!;
      // Force on source is towards target: -delta direction scaled by attractiveF
      dispSource.dx -= (deltaX / distance) * attractiveF;
      dispSource.dy -= (deltaY / distance) * attractiveF;

      const dispTarget = displacements.get(targetNodeId)!;
      // Force on target is towards source: +delta direction scaled by attractiveF
      dispTarget.dx += (deltaX / distance) * attractiveF;
      dispTarget.dy += (deltaY / distance) * attractiveF;
    });

    // 3. Apply gravity towards center (optional, but good for stability)
    if (gravityStrength > 0) {
      nodes.forEach(node => {
        const pos = currentPositions.get(node.id)!;
        const disp = displacements.get(node.id)!;

        const deltaXToCenter = centerX - pos.x;
        const deltaYToCenter = centerY - pos.y;
        
        // Simple gravity: pull towards center, proportional to distance & strength
        disp.dx += deltaXToCenter * gravityStrength;
        disp.dy += deltaYToCenter * gravityStrength;
      });
    }

    // 4. Update positions based on displacements, limited by temperature
    nodes.forEach(node => {
      const pos = currentPositions.get(node.id)!;
      const disp = displacements.get(node.id)!;

      const displacementMagnitude = Math.sqrt(disp.dx * disp.dx + disp.dy * disp.dy);

      if (displacementMagnitude > 0) {
        // Limit total displacement by current temperature
        const scale = Math.min(displacementMagnitude, currentTemperature) / displacementMagnitude;
        
        pos.x += disp.dx * scale;
        pos.y += disp.dy * scale;
      }
    });

    // 5. Cool down the temperature
    currentTemperature *= coolingFactor;
    if (currentTemperature < 0.01 && iter > iterations / 2) { // Optional early exit if system cooled down
        // break; 
    }
  }

  // Create new node objects with updated positions
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

    // Build adjacency list representation of the graph
    const graph: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    
    // Initialize
    nodes.forEach((node) => {
      graph[node.id] = [];
      inDegree[node.id] = 0;
    });
    
    // Build graph
    edges.forEach((edge) => {
      if (graph[edge.source] && nodeMap.has(edge.target)) { // Check if source and target exist
        graph[edge.source].push(edge.target);
        inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
      }
    });
    
    // Find root nodes (nodes with no incoming edges)
    let rootNodesIds: string[] = [];
    Object.entries(inDegree).forEach(([nodeId, degree]) => {
      if (degree === 0) {
        rootNodesIds.push(nodeId);
      }
    });
    
    // If no root nodes found (e.g., a cycle or all nodes have parents),
    // try to pick nodes with minimal in-degree or just the first one as a fallback.
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
      // If still no roots (e.g. empty graph or disconnected nodes not in inDegree map properly)
      if(rootNodesIds.length === 0 && nodes.length > 0) {
        rootNodesIds.push(nodes[0].id);
      }
    }
    
    // Assign levels to nodes using BFS/DFS to handle multiple roots and DAGs
    const levels: Record<string, number> = {};
    const visitedDuringLeveling = new Set<string>();
    const queue: { id: string; level: number }[] = rootNodesIds.map(id => ({ id, level: 0 }));
    
    let head = 0;
    while(head < queue.length) {
      const { id, level } = queue[head++];
      if (visitedDuringLeveling.has(id) && levels[id] <= level) { // Already visited via a shorter or equal path
          continue;
      }
      
      visitedDuringLeveling.add(id);
      levels[id] = level;
      
      (graph[id] || []).forEach(childId => {
        // To prevent cycles from breaking the layout, only add if not already processed at a lower level
        if (!visitedDuringLeveling.has(childId) || levels[childId] > level + 1) {
             // Decrement in-degree for children to handle DAGs correctly with BFS
            inDegree[childId] = (inDegree[childId] || 1) -1;
            if(inDegree[childId] <= 0) { // Process node when all its parents are processed
                 queue.push({ id: childId, level: level + 1 });
            }
        }
      });
    }

    // Ensure all nodes get a level, even if disconnected or part of cycles not reached
    nodes.forEach(node => {
        if (levels[node.id] === undefined) {
            levels[node.id] = 0; // Place unreached nodes at level 0 or maxLevel + 1
        }
    });

    // Count nodes at each level and assign positions within the level
    const nodesAtLevel: Record<number, string[]> = {};
    Object.entries(levels).forEach(([nodeId, level]) => {
      if (!nodesAtLevel[level]) nodesAtLevel[level] = [];
      nodesAtLevel[level].push(nodeId);
    });
    
    // Position the nodes
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
        x = centerX + nodeLevel * (spacing + (NODE_WIDTH || 50)); // Using spacing for level separation
        y = centerY + nodeOffset;
      } else { // Vertical
        x = centerX + nodeOffset;
        y = centerY + nodeLevel * (spacing + (NODE_HEIGHT || 50)); // Using spacing for level separation
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
  options: LayoutOptions = {} // Generic options, specific layouts will use their defaults if not overridden
): Node<T>[] {
  if (nodes.length === 0) return [];
  
  const baseLayoutOptions = {
    spacing: options.spacing ?? HORIZONTAL_SPACING,
    centerX: options.centerX ?? 100,
    centerY: options.centerY ?? 100,
    ...options // Pass through any other relevant options
  };

  // For very small diagrams or diagrams with no edges, use grid layout
  if (nodes.length <= 3 || edges.length === 0) {
    return gridLayout(nodes, baseLayoutOptions);
  }
  
  // For diagrams with some hierarchy, tree layout is often good.
  // A more sophisticated check could involve detecting cycles or graph density.
  // For now, we'll default to treeLayout if not a tiny graph.
  // Force-directed could be another option here if tree structure isn't dominant.
  return treeLayout(nodes, edges, {
    ...baseLayoutOptions,
    direction: options.direction ?? 'vertical', // treeLayout specific default
  });

  // Example of how forceDirectedLayout could be integrated:
  // if (isCyclic(nodes, edges) || graphDensity(nodes,edges) > SOME_THRESHOLD) {
  //   return forceDirectedLayout(nodes, edges, { ...baseLayoutOptions, ...options });
  // } else {
  //   return treeLayout(nodes, edges, { ...baseLayoutOptions, direction: options.direction ?? 'vertical' });
  // }
}