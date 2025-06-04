import IDiagram from "./IDiagram";

export type Column = {
    name: string;
    dataType: string;
    constraints?: string[];
    defaultValue?: string;
    description?: string;
}

export type Index = {
    name: string;
    columns: string[];
    isUnique?: boolean;
}

export type Table = {
    name: string;
    columns: Column[];
    primaryKey?: string[];
    indexes?: Index[];
}

export enum RelationshipCardinality {
    OneToOne = 'one-to-one',
    OneToMany = 'one-to-many',
    ManyToOne = 'many-to-one',
    ManyToMany = 'many-to-many'
}

export enum ReferentialAction {
    CASCADE = 'CASCADE',
    RESTRICT = 'RESTRICT',
    SET_NULL = 'SET NULL',
    SET_DEFAULT = 'SET DEFAULT',
    NO_ACTION = 'NO ACTION'
}

export type DatabaseRelationship = {
    name?: string;
    fromTable: string;
    toTable: string;
    fromColumns: string[];
    toColumns: string[];
    cardinality?: RelationshipCardinality;
    onUpdate?: ReferentialAction;
    onDelete?: ReferentialAction;
}

export class DatabaseDiagram implements IDiagram {
    diagramType: string = 'ER Diagram';
    diagramName: string;
    tables: Table[];
    relationships: DatabaseRelationship[];

    constructor(diagramName: string = '', tables: Table[] = [], relationships: DatabaseRelationship[] = []) {
        this.diagramType = 'ER Diagram';
        this.diagramName = diagramName;
        this.tables = tables;
        this.relationships = relationships;
    }

    static fromJSON(json: any): DatabaseDiagram {
        return new DatabaseDiagram(
            json.diagramName,
            json.tables,
            json.relationships
        );
    }

    addTable(table: Table): void {
        this.tables.push(table);
    }

    removeTable(tableName: string): void {
        this.tables = this.tables.filter(t => t.name !== tableName);
        this.relationships = this.relationships.filter(
            r => r.fromTable !== tableName && r.toTable !== tableName
        );
    }

    addRelationship(relationship: DatabaseRelationship): void {
        this.relationships.push(relationship);
    }

    removeRelationship(fromTable: string, toTable: string): void {
        this.relationships = this.relationships.filter(
            r => !(r.fromTable === fromTable && r.toTable === toTable)
        );
    }

    getTable(tableName: string): Table | undefined {
        return this.tables.find(t => t.name === tableName);
    }

    getRelationships(tableName: string): DatabaseRelationship[] {
        return this.relationships.filter(
            r => r.fromTable === tableName || r.toTable === tableName
        );
    }

    toJSON(): any {
        return {
            diagramType: this.diagramType,
            diagramName: this.diagramName,
            tables: this.tables,
            relationships: this.relationships
        };
    }
}

export default DatabaseDiagram;