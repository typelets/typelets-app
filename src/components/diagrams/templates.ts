/**
 * Default diagram templates for Mermaid diagrams
 */

export const DEFAULT_DIAGRAM = `graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]`;

export const DIAGRAM_TEMPLATES = {
  flowchart: `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Option 1]
    B -->|No| D[Option 2]
    C --> E[End]
    D --> E`,
  sequence: `sequenceDiagram
    participant User
    participant Server
    participant Database
    User->>Server: Request
    Server->>Database: Query
    Database-->>Server: Data
    Server-->>User: Response`,
  class: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +bark()
    }
    class Cat {
        +meow()
    }
    Animal <|-- Dog
    Animal <|-- Cat`,
  state: `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : Start
    Processing --> Success : Complete
    Processing --> Error : Failed
    Success --> [*]
    Error --> Idle : Retry`,
  gantt: `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Planning
    Research           :a1, 2024-01-01, 7d
    Design             :a2, after a1, 5d
    section Development
    Frontend           :a3, after a2, 10d
    Backend            :a4, after a2, 12d
    section Testing
    QA Testing         :a5, after a3, 5d`,
  pie: `pie title Project Breakdown
    "Frontend" : 40
    "Backend" : 30
    "Testing" : 20
    "Documentation" : 10`,
};
