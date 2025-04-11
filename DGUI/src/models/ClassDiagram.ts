import IDiagram from "./IDiagram";

export type Attribute = {
    name: string;
    type: string;
    visibility: string;
}

export type Parameter = {
    name: string;
    type: string;
}

export type Method = {
    name: string;
    parameters: Parameter[];
    returnType: string;
    visibility: string;
}

export type Class = {
    name: string;
    type: string;
    attributes: Attribute[];
    methods: Method[];
}

export enum RelationshipType {
    Association = 'Association',
    Dependency = 'Dependency',
    Aggregation = 'Aggregation',
    Composition = 'Composition',
    Inheritance = 'Inheritance',
    Realization = 'Realization'
}

export type Relationship = {
    type: RelationshipType;
    fromClass: string;
    toClass: string;
    fromMultiplicity?: string;
    toMultiplicity?: string;
}

export class ClassDiagram implements IDiagram {
    diagramType: string = 'UML Class Diagram';
    diagramName: string;
    classes: Class[];
    relationships: Relationship[];

    constructor(diagramName: string = '', classes: Class[] = [], relationships: Relationship[] = []) {
        this.diagramName = diagramName;
        this.classes = classes;
        this.relationships = relationships;
    }

    static fromJSON(json: any): ClassDiagram {
        return new ClassDiagram(
            json.diagramName,
            json.classes,
            json.relationships
        );
    }

    addClass(classObj: Class): void {
        this.classes.push(classObj);
    }

    removeClass(className: string): void {
        this.classes = this.classes.filter(c => c.name !== className);
        this.relationships = this.relationships.filter(
            r => r.fromClass !== className && r.toClass !== className
        );
    }

    addRelationship(relationship: Relationship): void {
        this.relationships.push(relationship);
    }

    removeRelationship(fromClass: string, toClass: string, type: RelationshipType): void {
        this.relationships = this.relationships.filter(
            r => !(r.fromClass === fromClass && r.toClass === toClass && r.type === type)
        );
    }

    getClass(className: string): Class | undefined {
        return this.classes.find(c => c.name === className);
    }

    getRelationships(className: string): Relationship[] {
        return this.relationships.filter(
            r => r.fromClass === className || r.toClass === className
        );
    }

    toJSON(): any {
        return {
            diagramName: this.diagramName,
            classes: this.classes,
            relationships: this.relationships
        };
    }
}