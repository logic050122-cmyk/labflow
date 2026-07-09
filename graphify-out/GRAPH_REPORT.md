# Graph Report - .  (2026-07-05)

## Corpus Check
- 38 files · ~66,677 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 184 nodes · 218 edges · 16 communities (14 shown, 2 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Auth Frontend|Auth Frontend]]
- [[_COMMUNITY_Web Dependencies|Web Dependencies]]
- [[_COMMUNITY_Server Foundation|Server Foundation]]
- [[_COMMUNITY_Web TS Config|Web TS Config]]
- [[_COMMUNITY_Server Dependencies|Server Dependencies]]
- [[_COMMUNITY_Server TS Config|Server TS Config]]
- [[_COMMUNITY_API Database Contracts|API Database Contracts]]
- [[_COMMUNITY_Documentation Governance|Documentation Governance]]
- [[_COMMUNITY_Business Roles Tasks|Business Roles Tasks]]
- [[_COMMUNITY_Architecture Layering|Architecture Layering]]
- [[_COMMUNITY_Vue App Entry|Vue App Entry]]
- [[_COMMUNITY_Auth Illustration|Auth Illustration]]
- [[_COMMUNITY_Brand Logo|Brand Logo]]
- [[_COMMUNITY_Vue Type Shim|Vue Type Shim]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `compilerOptions` - 13 edges
3. `MySQL Data Model` - 7 edges
4. `API Design Document` - 6 edges
5. `projects Table` - 6 edges
6. `tasks Table` - 6 edges
7. `scripts` - 5 edges
8. `createApp()` - 5 edges
9. `scripts` - 5 edges
10. `Document Maintenance Rules` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Owner and Member Role Rules` --semantically_similar_to--> `Architecture Permission Model`  [INFERRED] [semantically similar]
  AGENTS.md → docs/ARCHITECTURE.md
- `Task Status Rules` --semantically_similar_to--> `Task Status Values`  [INFERRED] [semantically similar]
  AGENTS.md → docs/DATABASE.md
- `Backend Layering Rules` --semantically_similar_to--> `Architecture Backend Layering`  [INFERRED] [semantically similar]
  AGENTS.md → docs/ARCHITECTURE.md
- `Frontend Layering Rules` --semantically_similar_to--> `Architecture Frontend Layering`  [INFERRED] [semantically similar]
  AGENTS.md → docs/ARCHITECTURE.md
- `First Version Scope` --conceptually_related_to--> `Document Maintenance Rules`  [INFERRED]
  docs/PROJECT_PLAN.md → AGENTS.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core LabFlow Collaboration Loop** — agents_labflow_core_business_flow, docs_project_plan_core_business_loop, docs_architecture_project_collaboration_flow, docs_api_task_state_side_effects, docs_todo_final_acceptance_criteria [INFERRED 0.85]
- **Owner Member Permission Model** — agents_role_rules, docs_architecture_permission_model, docs_api_permission_markers, docs_project_plan_system_user_project_role_model, docs_database_projects_table, docs_database_project_members_table [INFERRED 0.85]
- **Task Status Lifecycle** — agents_task_status_rules, docs_api_task_endpoints, docs_api_task_state_side_effects, docs_architecture_task_state_machine, docs_database_task_status_values, docs_database_tasks_table [INFERRED 0.95]

## Communities (16 total, 2 thin omitted)

### Community 0 - "Auth Frontend"
Cohesion: 0.10
Nodes (21): login(), LoginPayload, LoginResult, register(), RegisterPayload, http, request(), useAuthStore (+13 more)

### Community 1 - "Web Dependencies"
Cohesion: 0.09
Nodes (21): dependencies, axios, element-plus, pinia, vue, vue-router, devDependencies, @types/node (+13 more)

### Community 2 - "Server Foundation"
Cohesion: 0.17
Nodes (11): createApp(), ApiResponse, AppError, errorHandler(), notFoundHandler(), closeDatabase(), connectDatabase(), db (+3 more)

### Community 3 - "Web TS Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx, lib, module (+11 more)

### Community 4 - "Server Dependencies"
Cohesion: 0.11
Nodes (17): dependencies, dotenv, express, mysql2, devDependencies, tsx, @types/express, @types/node (+9 more)

### Community 5 - "Server TS Config"
Cohesion: 0.12
Nodes (15): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, noUncheckedIndexedAccess, outDir, resolveJsonModule (+7 more)

### Community 6 - "API Database Contracts"
Cohesion: 0.26
Nodes (14): Auth Endpoints, API Permission Markers, Project Endpoints, Resource Ownership Check, REST API Contract, Task Endpoints, Task State Side Effects, MySQL Data Model (+6 more)

### Community 7 - "Documentation Governance"
Cohesion: 0.26
Nodes (12): API Contract Rules, Database Rules, Document Maintenance Rules, API Design Document, Project Collaboration Flow, Database Design Document, Development Log Document, Core Business Loop (+4 more)

### Community 8 - "Business Roles Tasks"
Cohesion: 0.17
Nodes (12): LabFlow Core Business Flow, LabFlow Project Rules, Owner and Member Role Rules, Task Status Rules, Unified Response Format, Architecture Permission Model, Task State Machine, Task Status Values (+4 more)

### Community 9 - "Architecture Layering"
Cohesion: 0.29
Nodes (7): Backend Layering Rules, Frontend Layering Rules, Architecture Document, Architecture Backend Layering, Business Module Boundaries, Architecture Frontend Layering, Modular Monolith Architecture

### Community 11 - "Auth Illustration"
Cohesion: 1.00
Nodes (3): Auth Illustration, Data Analytics Chart, Futuristic Dashboard

### Community 12 - "Brand Logo"
Cohesion: 0.67
Nodes (3): Blue Brand Color, LabFlow Logo, Laboratory Flask Icon

## Knowledge Gaps
- **86 isolated node(s):** `name`, `version`, `private`, `dev`, `build` (+81 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Final Acceptance Criteria` connect `Business Roles Tasks` to `Documentation Governance`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `REST API Contract` connect `API Database Contracts` to `Business Roles Tasks`, `Documentation Governance`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _91 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth Frontend` be split into smaller, more focused modules?**
  _Cohesion score 0.10317460317460317 - nodes in this community are weakly interconnected._
- **Should `Web Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Web TS Config` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Server Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._