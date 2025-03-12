import { dia, shapes } from '@joint/core';
import { useEffect, useRef } from 'react';
const ClassDiagramView = ({ graph }: { graph: dia.Graph }) => {
    const paperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!paperRef.current) return;

        // Initialize the paper
        const paper = new dia.Paper({
            el: paperRef.current,
            model: graph,
            width: '100%',
            height: 600,
            gridSize: 10,
            drawGrid: true,
            background: {
                color: '#f8f9fa'
            }
        });

        // Create UML classes
        const umlClass1 = new shapes.standard.Rectangle({
            position: { x: 100, y: 100 },
            size: { width: 180, height: 120 },
            attrs: {
                body: {
                    fill: '#ffffff',
                    stroke: '#000000',
                    strokeWidth: 2
                },
                label: {
                    text: 'Person',
                    fontSize: 18,
                    fontWeight: 'bold',
                    refY: '10%'
                }
            }
        });

        umlClass1.addTo(graph);

        // Add attributes and methods
        const umlClass2 = new shapes.standard.Rectangle({
            position: { x: 400, y: 100 },
            size: { width: 180, height: 180 },
            attrs: {
                body: {
                    fill: '#ffffff',
                    stroke: '#000000',
                    strokeWidth: 2
                },
                label: {
                    text: 'Employee\n\n- id: string\n- name: string\n\n+ getName(): string\n+ setName(name: string): void',
                    fontSize: 14,
                    refY: '10%',
                    textVerticalAnchor: 'top',
                    textAnchor: 'middle',
                    refX: '50%'
                }
            }
        });

        umlClass2.addTo(graph);

        // Create relationship
        const link = new shapes.standard.Link({
            source: { id: umlClass1.id },
            target: { id: umlClass2.id },
            attrs: {
                line: {
                    stroke: '#000000',
                    strokeWidth: 2,
                    targetMarker: {
                        type: 'path',
                        d: 'M 10 -5 0 0 10 5 Z'
                    }
                }
            },
            labels: [
                {
                    position: 0.5,
                    attrs: {
                        text: {
                            text: 'extends',
                            fontSize: 12
                        }
                    }
                }
            ]
        });

        link.addTo(graph);

        return () => {
            paper.remove();
        };
    }, [graph]);

    return (
        <div>
            <h1>Class Diagram</h1>
            <div
                ref={paperRef}
                id="class-diagram"
                style={{ width: '100%', height: '600px', border: '1px solid #ccc' }}
            />
        </div>
    );
}