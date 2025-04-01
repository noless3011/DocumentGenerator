import * as go from 'gojs';
import IDiagram from './IDiagram';

interface ClassData {
    name: string;
    properties: ClassProperty[];
    methods: ClassMethod[];
}

interface ClassProperty {
    name: string;
    type: string;
    visibility: string;
    scope?: string; // 'instance' or 'class' (static)
    default?: string;
}

interface ClassMethod {
    name: string;
    type: string;
    visibility: string;
    scope?: string; // 'instance' or 'class' (static)
    parameters: MethodParameter[];
}

interface MethodParameter {
    name: string;
    type: string;
}

class ClassDiagram implements IDiagram {
    private diagram: go.Diagram;
    private classCounter: number = 100; // Start class keys from 100
    // public onClassShapeClick: (className: string) => void = (className) => { }; // Removed - not needed for this logic

    constructor(container: HTMLDivElement) {
        const $ = go.GraphObject.make;
        this.diagram = new go.Diagram(container, {
            'undoManager.isEnabled': true,
            layout: $(go.TreeLayout, {
                angle: 90,
                path: go.TreePath.Source,
                setsPortSpot: false,
                setsChildPortSpot: false,
                arrangement: go.TreeArrangement.Horizontal
            }),
            model: $(go.GraphLinksModel, // Initialize GraphLinksModel here
                {
                    copiesArrays: true,
                    copiesArrayObjects: true,
                    linkCategoryProperty: 'relationship',
                    nodeDataArray: [],
                    linkDataArray: []
                })
        });

        // Visibility conversion function (moved inside class for encapsulation)
        const convertVisibility = (v: string): string => {
            switch (v) {
                case 'public': return '+';
                case 'private': return '-';
                case 'protected': return '#';
                case 'package': return '~';
                default: return v || ''; // Default to empty string if v is undefined
            }
        };

        // Property template
        const propertyTemplate =
            $(go.Panel, "Horizontal",
                $(go.TextBlock, { isMultiline: false, editable: false, width: 12 })
                    .bind('text', 'visibility', convertVisibility),
                $(go.TextBlock, { isMultiline: false, editable: true })
                    .bindTwoWay('text', 'name')
                    .bind('isUnderline', 'scope', (s: string) => s && s[0] === 'c'),
                $(go.TextBlock, "")
                    .bind('text', 'type', (t: string) => t ? ': ' : ''),
                $(go.TextBlock, { isMultiline: false, editable: true })
                    .bindTwoWay('text', 'type'),
                $(go.TextBlock, { isMultiline: false, editable: false })
                    .bind('text', 'default', (s: string) => s ? ' = ' + s : '')
            );

        // Method template
        const methodTemplate =
            $(go.Panel, "Horizontal",
                $(go.TextBlock, { isMultiline: false, editable: false, width: 12 })
                    .bind('text', 'visibility', convertVisibility),
                $(go.TextBlock, { isMultiline: false, editable: true })
                    .bindTwoWay('text', 'name')
                    .bind('isUnderline', 'scope', (s: string) => s && s[0] === 'c'),
                $(go.TextBlock, "()")
                    .bind('text', 'parameters', (parr: MethodParameter[]) => {
                        let s = '(';
                        for (let i = 0; i < parr.length; i++) {
                            const param = parr[i];
                            if (i > 0) s += ', ';
                            s += param.name + ': ' + param.type;
                        }
                        return s + ')';
                    }),
                $(go.TextBlock, "")
                    .bind('text', 'type', (t: string) => t ? ': ' : ''),
                $(go.TextBlock, { isMultiline: false, editable: true })
                    .bindTwoWay('text', 'type')
            );

        // Node template
        this.diagram.nodeTemplate =
            $(go.Node, "Auto", {
                locationSpot: go.Spot.Center,
                fromSpot: go.Spot.AllSides,
                toSpot: go.Spot.AllSides
            },
                $(go.Shape, { fill: 'lightyellow' }),
                $(go.Panel, "Table", { defaultRowSeparatorStroke: 'black' })
                    .add(
                        $(go.TextBlock, {
                            row: 0, columnSpan: 2, margin: 3, alignment: go.Spot.Center,
                            font: 'bold 12pt sans-serif',
                            isMultiline: false, editable: true
                        })
                            .bindTwoWay('text', 'name'),
                        $(go.TextBlock, "Properties", { row: 1, font: 'italic 10pt sans-serif' })
                            .bindObject("visible", "visible", v => !v, undefined, "PROPERTIES"),
                        $(go.Panel, "Vertical", {
                            name: "PROPERTIES",
                            row: 1, margin: 3, stretch: go.Stretch.Horizontal,
                            defaultAlignment: go.Spot.Left, background: "lightyellow",
                            itemTemplate: propertyTemplate
                        })
                            .bind("itemArray", "properties"),
                        go.GraphObject.make("PanelExpanderButton", { row: 1, column: 1, alignment: go.Spot.TopRight, visible: false }/* Removed: , "PROPERTIES" */)
                            .bind("visible", "properties", arr => arr && arr.length > 0), // Check for null array
                        $(go.TextBlock, "Methods", { row: 2, font: 'italic 10pt sans-serif' })
                            .bindObject("visible", "visible", v => !v, undefined, "METHODS"),
                        $(go.Panel, "Vertical", {
                            name: "METHODS",
                            row: 2, margin: 3, stretch: go.Stretch.Horizontal,
                            defaultAlignment: go.Spot.Left, background: "lightyellow",
                            itemTemplate: methodTemplate
                        })
                            .bind("itemArray", "methods"),
                        go.GraphObject.make("PanelExpanderButton", { row: 2, column: 1, alignment: go.Spot.TopRight, visible: false }/* Removed: , "METHODS" */)
                            .bind("visible", "methods", arr => arr && arr.length > 0) // Check for null array
                    )
            );

        // Link style function (moved inside class)
        const linkStyle = () => ({ isTreeLink: false, fromEndSegmentLength: 0, toEndSegmentLength: 0 });

        this.diagram.linkTemplate =
            $(go.Link, { isTreeLink: true }, linkStyle(),
                $(go.Shape),
                $(go.Shape, { toArrow: "Triangle", fill: "white" })
            );

        this.diagram.linkTemplateMap.add("Association",
            $(go.Link, linkStyle(),
                $(go.Shape)
            ));

        this.diagram.linkTemplateMap.add("Realization",
            $(go.Link, linkStyle(),
                $(go.Shape, { strokeDashArray: [3, 2] }),
                $(go.Shape, { toArrow: "Triangle", fill: "white" })
            ));

        this.diagram.linkTemplateMap.add("Dependency",
            $(go.Link, linkStyle(),
                $(go.Shape, { strokeDashArray: [3, 2] }),
                $(go.Shape, { toArrow: "OpenTriangle" })
            ));

        this.diagram.linkTemplateMap.add("Composition",
            $(go.Link, linkStyle(),
                $(go.Shape),
                $(go.Shape, { fromArrow: "StretchedDiamond", scale: 1.3 }),
                $(go.Shape, { toArrow: "OpenTriangle" })
            ));

        this.diagram.linkTemplateMap.add("Aggregation",
            $(go.Link, linkStyle(),
                $(go.Shape),
                $(go.Shape, { fromArrow: "StretchedDiamond", fill: "white", scale: 1.3 }),
                $(go.Shape, { toArrow: "OpenTriangle" })
            ));

        // Initially populate dropdowns (if needed, can be called from DiagramView later)
        // this.updateClassDropdowns(); // Removed - dropdown logic will be in React
    }


    public addClass(className: string, x: number, y: number) {
        this.classCounter++;
        if (className) {
            this.diagram.model.addNodeData({
                key: this.classCounter,
                name: className,
                properties: [],
                methods: [],
                loc: `${x} ${y}` // Add location
            });
            // this.updateClassDropdowns(); // Removed - dropdown logic will be in React
            // this.updateSelectedClassDropdown(this.classCounter); // Removed - selection logic will be in React
            // hideAddClassInput(); // UI related, to be handled in React
        } else {
            alert("Class name cannot be empty."); // Consider better error handling in React
        }
    }

    public addProperty(selectedClassKey: string, propertyName: string, propertyType: string, propertyVisibility: string) {
        if (!selectedClassKey) return alert("Please select a class first.");
        if (!propertyName) return alert("Property name is required.");

        this.diagram.model.commit(m => {
            const nodeData = m.findNodeDataForKey(parseInt(selectedClassKey));
            if (nodeData) {
                if (!nodeData.properties) nodeData.properties = [];
                m.insertArrayItem(nodeData.properties, -1, {
                    name: propertyName,
                    type: propertyType,
                    visibility: propertyVisibility
                });
            }
        }, "add property");
    }

    public addMethod(selectedClassKey: string, methodName: string, methodReturnType: string, methodVisibility: string) {
        if (!selectedClassKey) return alert("Please select a class first.");
        if (!methodName) return alert("Method name is required.");

        this.diagram.model.commit(m => {
            const nodeData = m.findNodeDataForKey(parseInt(selectedClassKey));
            if (nodeData) {
                if (!nodeData.methods) nodeData.methods = [];
                m.insertArrayItem(nodeData.methods, -1, {
                    name: methodName,
                    type: methodReturnType,
                    visibility: methodVisibility,
                    parameters: [] // Initially no parameters
                });
            }
        }, "add method");
    }

    public addLink(fromClassKey: string, toClassKey: string, linkType: string) {
        if (!fromClassKey || !toClassKey) return alert("Please select both 'From Class' and 'To Class'.");
        if (fromClassKey === toClassKey) return alert("Cannot create a link between the same class.");

        (this.diagram.model as go.GraphLinksModel).addLinkData({
            from: parseInt(fromClassKey),
            to: parseInt(toClassKey),
            relationship: linkType
        });
    }

    public getDiagramModel(): go.GraphLinksModel {
        return this.diagram.model as go.GraphLinksModel;
    }

    public setDiagramModel(model: go.GraphLinksModel): void {
        this.diagram.model = model;
    }

    public getDiagram(): go.Diagram {
        return this.diagram;
    }

    public getClassCounter(): number {
        return this.classCounter;
    }

    public setClassCounter(value: number): void {
        this.classCounter = value;
    }

    public getNodeDataArray(): any[] {
        return (this.diagram.model as go.GraphLinksModel).nodeDataArray;
    }

    public getLinkDataArray(): any[] {
        return (this.diagram.model as go.GraphLinksModel).linkDataArray;
    }

    public dispose() {
        if (this.diagram) {
            this.diagram.div = null; // Removes the reference to the HTML div
            this.diagram = null;     // Clear the diagram instance
        }
    }

    // updateClassDropdowns(), updateSelectedClassDropdown(), updateSelectedClassUI(),
    // showAddClassInput(), hideAddClassInput() - UI related functions will be in React

}

export default ClassDiagram;