import { dia, shapes } from '@joint/core'
import IDiagram from './IDiagram';
interface ClassData{
    name: string;
    attributes: string[];
    methods: string[];

}

class ClassDiagram implements IDiagram {
    private graph: dia.Graph;
    private paper: dia.Paper;
    private classes: Map<string, shapes.standard.Rectangle> = new Map();
    private relationships: Map<string, dia.Link> = new Map();

    constructor(container: HTMLDivElement) {
        this.graph = new dia.Graph();
        this.paper = new dia.Paper({
            el: container,
            model: this.graph,
            width: '100%',
            height: 600,
            gridSize: 10,
            drawGrid: true,
            background: {
                color: '#f8f9fa'
            }
        });
    }

    addRelationship(source: string, target: string, type: string) {
    }

    addClass(name: string, classdata: ClassData, x: number, y: number) {
        // Format attributes and methods as strings
        const attributesText = classdata.attributes.join('\n');
        const methodsText = classdata.methods.join('\n');
        
        const umlClass = new shapes.standard.Rectangle({
            position: { x, y },
            size: { width: 200, height: 180 },
            attrs: {
                body: {
                    fill: '#ffffff',
                    stroke: '#000000',
                    strokeWidth: 2
                },
                label: {
                    text: `${classdata.name}\n\n${attributesText}\n\n${methodsText}`,
                    fontSize: 14,
                    refY: '10%'
                }
            }
        });

        umlClass.addTo(this.graph);
    }
}