// Layout utilities for arranging diagram elements
import { Node, Edge } from '@xyflow/react';
import { Class } from '../models/ClassDiagram';

// Constants for layout parameters
const NODE_WIDTH = 200;
const NODE_HEIGHT = 150;
const HORIZONTAL_SPACING = 250;
const VERTICAL_SPACING = 200;

// Interface for layout options
export interface LayoutOptions {
  spacing?: number;
  direction?: 'horizontal' | 'vertical';
  centerX?: number;
  centerY?: number;
}

/**
 * Arranges nodes in a grid layout
 */
export function gridLayout<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  options: LayoutOptions = {}
): Node<T>[] {
  const {
    spacing = 250,
    direction = 'horizontal',
    centerX = 0,
    centerY = 0,
  } = options;
  
  const cols = Math.ceil(Math.sqrt(nodes.length));
  
  return nodes.map((node, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    return {
      ...node,
      position: {
        x: centerX + col * spacing,
        y: centerY + row * spacing,
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
    spacing = 250,
    centerX = 500,
    centerY = 500,
  } = options;
  
  const radius = spacing * Math.max(nodes.length / (2 * Math.PI), 1);
  
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
  
  // Build adjacency list representation of the graph
  const graph: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};
  
  // Initialize
  nodes.forEach((node) => {
    graph[node.id] = [];
    inDegree[node.id] = 0;
  });
  
  // Build graph
  edges.forEach((edge) => {
    graph[edge.source].push(edge.target);
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
  });
  
  // Find root nodes (nodes with no incoming edges)
  const rootNodes: string[] = [];
  Object.entries(inDegree).forEach(([nodeId, degree]) => {
    if (degree === 0) {
      rootNodes.push(nodeId);
    }
  });
  
  // If no root nodes found, use the first node as root
  if (rootNodes.length === 0 && nodes.length > 0) {
    rootNodes.push(nodes[0].id);
  }
  
  // Assign levels to nodes
  const levels: Record<string, number> = {};
  const visited = new Set<string>();
  
  // BFS to assign levels
  const queue = rootNodes.map(id => ({ id, level: 0 }));
  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (visited.has(id)) continue;
    
    visited.add(id);
    levels[id] = level;
    
    // Enqueue children
    graph[id].forEach(childId => {
      queue.push({ id: childId, level: level + 1 });
    });
  }
  
  // Count nodes at each level
  const nodesPerLevel: Record<number, number> = {};
  const nodePositionInLevel: Record<string, number> = {};
  
  Object.entries(levels).forEach(([nodeId, level]) => {
    nodesPerLevel[level] = (nodesPerLevel[level] || 0) + 1;
    nodePositionInLevel[nodeId] = nodesPerLevel[level] - 1;
  });
  
  // Position the nodes based on their level and position in level
  return nodes.map(node => {
    const level = levels[node.id] || 0;
    const position = nodePositionInLevel[node.id] || 0;
    const nodesInLevel = nodesPerLevel[level] || 1;
    
    const width = direction === 'horizontal' ? VERTICAL_SPACING : HORIZONTAL_SPACING;
    const levelWidth = width * nodesInLevel;
    const x = direction === 'horizontal' 
      ? centerX + level * spacing
      : centerX + position * spacing - levelWidth / 2 + width / 2;
    
    const y = direction === 'horizontal'
      ? centerY + position * spacing - levelWidth / 2 + width / 2
      : centerY + level * spacing;
    
    return {
      ...node,
      position: { x, y },
    };
  });
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
  
  // For very small diagrams or diagrams with no edges, use grid layout
  if (nodes.length <= 3 || edges.length === 0) {
    return gridLayout(nodes, { 
      spacing: HORIZONTAL_SPACING,
      centerX: 100,
      centerY: 100
    });
  }
  
  // For diagrams with hierarchy, use tree layout
  return treeLayout(nodes, edges, {
    spacing: HORIZONTAL_SPACING,
    direction: 'vertical',
    centerX: 100,
    centerY: 100,
    ...options
  });
}