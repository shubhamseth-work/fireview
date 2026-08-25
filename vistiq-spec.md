# VISTIQ-Viewer

**Tagline:** *"Explore. Query. Manage."*

## Product Description

Vistiq is an open-source, privacy-first developer workspace for exploring, querying, editing, comparing, exporting, importing, and managing Firebase Firestore data directly inside VS Code-compatible IDEs.

**Primary targets:**

1. Visual Studio Code  
2. Cursor  
3. Future optional standalone desktop application

>   
> **IMPORTANT**  
> 

> - Vistiq is **NOT** a database engine.  
> - Vistiq is a developer/admin workspace for Firebase/Google Cloud data.  
> - Vistiq is **NOT affiliated with Google or Firebase**.  
> - Do not use Google/Firebase branding in a way that implies official affiliation.

---

## 1\. Primary Product Goal

Create an IDE extension that allows developers to manage their Firebase Firestore projects without leaving VS Code or Cursor.

The developer should be able to:

- Connect Firebase/Google Cloud projects  
- Authenticate securely  
- Browse Firestore collections  
- Browse documents  
- Inspect nested JSON  
- Create documents  
- Edit documents  
- Delete documents  
- Search documents  
- Query documents  
- Build advanced queries  
- Save queries  
- Export collections  
- Import collections  
- Perform batch operations  
- Compare documents  
- Compare projects  
- Copy data between projects  
- Work with Firebase Emulator  
- View Firebase Authentication users where API permissions allow  
- Maintain local activity/audit history  
- Use keyboard shortcuts  
- Use the VS Code command palette  
- Generate Firestore code from queries  
- Eventually support additional Firebase/Google Cloud services

The application must be developer-focused, secure, fast, and easy to use.

---

## 2\. Important Architecture Decision

**DO NOT** build the application as an Electron desktop application first.

The **primary product** must be a VS Code-compatible extension.

Architecture must support:

- VS Code  
- Cursor  
- Future standalone desktop application

Use a shared core architecture.

**Recommended structure:**

packages/

    core/

    firestore/

    auth/

    credentials/

    query-engine/

    query-builder/

    export/

    import/

    batch/

    diff/

    project-compare/

    migration/

    emulator/

    audit/

    shared/

    vscode-extension/

    webview-ui/

    desktop/

        future

The desktop package should **NOT** be implemented initially unless explicitly requested.

The core business logic must **NOT** depend on VS Code APIs.

VS Code-specific functionality must remain inside `vscode-extension`.

---

## 3\. Technology Stack

- TypeScript  
- Node.js  
- VS Code Extension API  
- React  
- Vite  
- VS Code Webview API  
- Firebase Admin SDK where appropriate  
- Google Cloud APIs where appropriate  
- Firebase client SDK only where appropriate  
- ESLint  
- Prettier  
- Vitest or Jest  
- pnpm or npm workspaces  
- GitHub Actions

**Preferred architecture:**

Extension Host

    |

    \+-- Core services

    |

    \+-- Firebase/Google APIs

    |

    \+-- SecretStorage

    |

    \+-- Webview messaging

             |

             \+-- React UI

Do **NOT** place credentials or service-account private keys inside React state, Webview localStorage, HTML, URL parameters, or source code.

---

## 4\. Open Source

The entire project must be designed as an open-source project.

Use a permissive license such as **Apache-2.0** unless there is a specific technical/legal reason to choose another license.

**Create:**

- `LICENSE`  
- `README.md`  
- `CONTRIBUTING.md`  
- `SECURITY.md`  
- `CODE_OF_CONDUCT.md`  
- `CHANGELOG.md`

**Add:**

.github/

    workflows/

        ci.yml

        security.yml

        release.yml

    ISSUE\_TEMPLATE/

    pull\_request\_template.md

**Document:**

- Installation  
- Development setup  
- Architecture  
- Authentication  
- Security  
- Contributing  
- Building  
- Testing  
- Publishing  
- Extension packaging

---

## 5\. Vistiq UI

Create a professional developer-tool UI.

The extension should provide:

1. Vistiq Activity Bar icon  
2. Vistiq sidebar  
3. Project explorer  
4. Collection explorer  
5. Document browser  
6. Query builder  
7. Saved queries  
8. Compare tools  
9. Migration tools  
10. Import/export  
11. Settings  
12. Connection manager  
13. Audit/activity history

**Example layout:**

VISTIQ

\------------------------------------------------

PROJECTS

Production

    Firestore

        users

        orders

        products

        payments

Staging

    Firestore

        users

        orders

Development

    Emulator

        users

        orders

\------------------------------------------------

TOOLS

Query Builder

Saved Queries

Compare

Migration

Import

Export

Audit History

\------------------------------------------------

SETTINGS

Connections

Security

Keyboard Shortcuts

About

\------------------------------------------------

---

## 6\. Project Connections

Support multiple Firebase/Google Cloud projects.

Each connection should contain metadata such as:

- Project ID  
- Display name  
- Environment label  
- Authentication method  
- Emulator configuration  
- Optional region metadata

**Environment labels:** `Development` · `Staging` · `Production` · `Custom`

Allow the user to manually mark a project as Production. Do not attempt to automatically determine production status with 100% confidence.

Production projects must receive stronger warnings for destructive actions.

---

## 7\. Authentication

Support:

- **A.** Google OAuth where appropriate  
- **B.** Service Account authentication  
- **C.** Firebase Emulator

Design authentication as an abstraction:

interface AuthProvider {

    connect(): Promise\<Connection\>;

    disconnect(): Promise\<void\>;

    getStatus(): Promise\<AuthStatus\>;

}

**Never store secrets in:**

- Source code  
- `.env` committed to Git  
- Webview localStorage  
- React state  
- Extension settings JSON  
- Logs  
- Telemetry

Use **VS Code SecretStorage** for credentials/tokens where possible.

Use OS secure credential storage through the VS Code mechanism rather than creating a custom credential database.

---

## 8\. Service Account Support

Allow the developer to connect using a Google Cloud/Firebase service account.

**Support:**

- JSON credential input  
- Secure credential storage  
- Connection test  
- Project validation  
- Permission validation

**After import:** DO NOT retain the raw JSON in normal application state.

**Do not expose** to the Webview:

- `private_key`  
- `client_email`  
- Private credentials

**Provide:**

- Test Connection  
- Validate Permissions  
- Disconnect  
- Remove Credentials

---

## 9\. Firestore Collection Explorer

**Display:**

Firestore

    Collection A

    Collection B

    Collection C

**Allow:**

- Expand  
- Collapse  
- Refresh  
- Search collection  
- Open collection  
- Collection count where practical  
- Create collection/document  
- Export collection  
- Import collection  
- Delete collection where technically applicable

Do not claim Firestore has a traditional relational schema — Firestore is schemaless. Represent structure based on observed documents.

---

## 10\. Document Viewer

**Support:**

- Table view  
- JSON/tree view  
- Raw JSON view  
- Document ID  
- Nested objects  
- Arrays  
- Strings  
- Numbers  
- Booleans  
- Null  
- Timestamps  
- References  
- GeoPoint where supported  
- Bytes where supported

**Example:**

users/123

{

    "name": "John",

    "age": 31,

    "active": true,

    "profile": {

        "country": "India"

    }

}

**Allow:** Edit · Copy JSON · Export · Delete · Duplicate · Compare · Refresh

---

## 11\. Document CRUD

Support **CREATE**, **READ**, **UPDATE**, **DELETE**.

- **Create:** auto ID, custom ID  
- **Update:** entire document, selected fields  
- **Delete:** document, selected documents, batch delete

All destructive operations require confirmation.

---

## 12\. JSON Editor

Create a high-quality JSON editor.

**Support:**

- Syntax highlighting  
- Validation  
- Formatting  
- Collapse/expand  
- Search  
- Copy  
- Paste  
- Undo/redo  
- Error location  
- Firestore type handling

Do not silently convert Firestore-specific types into incorrect JSON. Provide appropriate representations for: `Timestamp`, `Reference`, `GeoPoint`, `Bytes`.

---

## 13\. Search

Support collection/document search by:

- Document ID  
- Field values  
- Exact text  
- Partial text where practical

Clearly explain Firestore query limitations. Do not pretend arbitrary full-text search is native Firestore functionality.

---

## 14\. Basic Query Builder

Provide a visual query builder.

**Support:** Collection · Where · Order By · Limit · Pagination

**Operators:**

`==` `!=` `<` `<=` `>` `>=` `array-contains` `array-contains-any` `in` `not-in`

Validate incompatible query combinations before execution.

---

## 15\. Advanced Query Builder

**Support:**

- Multiple filters  
- AND  
- OR where supported  
- Nested logical groups  
- Ordering  
- Limits  
- Cursors  
- Pagination  
- Array operators  
- Range operators  
- Collection-group queries  
- Document ID filters  
- Timestamps  
- References  
- GeoPoint  
- Query preview

**Example:**

(

    age \> 25

    AND active \== true

)

OR

(

    role \== "admin"

)

ORDER BY createdAt DESC

LIMIT 100

The UI must validate Firestore limitations.

---

## 16\. Saved Queries

Users can save queries. Each saved query contains:

- Name  
- Description  
- Project  
- Collection  
- Filters  
- Ordering  
- Limit  
- Query configuration  
- Tags

**Support:** Save · Run · Rename · Edit · Duplicate · Delete · Export · Import

Initially store saved queries locally. Do not require a Vistiq cloud backend.

---

## 17\. Query Code Generation

Allow **Generate Code** in: TypeScript, JavaScript, Python.

**Example:**

const snapshot \= await db

    .collection("users")

    .where("age", "\>", 25\)

    .where("active", "==", true)

    .limit(50)

    .get();

Allow **Copy Code**.

---

## 18\. Firebase Emulator

Support Firebase Emulator.

Detect `firebase.json` and emulator configuration where possible.

**Allow connections to local:** Firestore · Authentication · Functions · Storage

At minimum support Firestore Emulator.

**Display:**

Development

    Firebase Emulator

        Firestore

        Auth

        Functions

        Storage

Allow the user to distinguish emulator from production. Never accidentally connect a production operation to an emulator or vice versa without clear connection information.

---

## 19\. Collection Export

**Support formats:** JSON, CSV

**Options:**

- Include document ID  
- Include nested fields  
- Export selected documents  
- Export entire collection  
- Export query results

**For large collections:**

- Paginate  
- Avoid loading everything into memory  
- Stream/write incrementally where practical  
- Show progress  
- Allow cancellation where possible  
- Handle partial failures

Warn users that Firestore reads may incur costs.

---

## 20\. Collection Import

**Support formats:** JSON, CSV where practical

**Modes:** Create Only · Update Existing · Upsert

**Before import, show preview:**

Documents: 12,430

New: 10,200

Existing: 2,230

Potential conflicts: 125

Require confirmation.

**Support:** Validation · Preview · Conflict handling · Progress · Failure reporting · Retry · Cancellation where possible

Never silently overwrite production data.

---

## 21\. Batch Operations

**Support:** Batch delete · Batch update · Batch create · Batch copy · Batch export · Batch import

**Example:**

Selected: 1,245 documents

Actions:

Export

Delete

Update

Copy to Project

Process operations safely in controlled batches.

**Support:** Progress · Successful count · Failed count · Retry failed · Error report

Do not perform uncontrolled thousands-of-document operations.

---

## 22\. Production Safety Mode

For Production projects display a **RED PRODUCTION** indicator.

**Before destructive operations:**

WARNING

You are modifying a PRODUCTION Firestore project.

Operation:

Delete 1,250 documents

Type: DELETE 1250

\[Cancel\]  \[Continue\]

Use explicit confirmation. For large destructive operations, consider requiring a second confirmation.

---

## 23\. Document Diff

Support comparison between:

- Two documents  
- Document versions where available  
- Documents from different projects  
- JSON files  
- Exported documents

**Show:** Added · Removed · Changed (supports nested structural diff)

**Example:**

Production: age: 31

Staging:    age: 30

Highlight changed field.

**Allow:** Copy Left · Copy Right · Export Diff

---

## 24\. Project Comparison

Compare Firebase projects, e.g. **Production vs Staging**.

**Compare:**

- Collections  
- Observed document structures  
- Document IDs  
- Document counts where practical  
- Selected document contents

**Example:**

Production:

users, orders, products, payments, reviews

Staging:

users, orders, products, payments

reviews \= missing

Do not claim Firestore has a fixed schema — this is structural/data comparison.

---

## 25\. Project-to-Project Copy

Support controlled copy/migration between projects (e.g. **staging → production**).

**Allow:**

- Selected documents  
- Entire collection  
- Filtered query results  
- Document trees where practical

**Before execution show:** Source · Destination · Document count · Estimated writes · Potential conflicts

Require explicit confirmation.

**Support:** Progress · Success · Failures · Retry · Error export

---

## 26\. Migration Workflow

All migration features must use this step flow:

1. Select Source  
2. Select Destination  
3. Select Data  
4. Preview  
5. Review Changes  
6. Confirm  
7. Execute  
8. Results

Never allow accidental mass migration through one click.

---

## 27\. Audit History

Implement local activity history.

**Record:** timestamp · operation · project · collection/document path · result

**Examples:**

UPDATE   production   users/123

EXPORT   production   users

DELETE   staging      users/456

**Do NOT record:** passwords, private keys, OAuth refresh tokens, secrets, complete sensitive documents.

**Allow:** Search · Filter · Clear · Export

V1/V2 audit history is local. Do not require a Vistiq cloud backend.

---

## 28\. Keyboard Shortcuts

Support platform-aware shortcuts.

**General**

| Shortcut | Action |
| :---- | :---- |
| `Cmd/Ctrl + K` | Command Palette |
| `Cmd/Ctrl + P` | Quick Open |
| `Cmd/Ctrl + R` | Refresh |
| `Cmd/Ctrl + W` | Close Vistiq tab where applicable |

**Documents**

| Shortcut | Action |
| :---- | :---- |
| `Cmd/Ctrl + N` | New Document |
| `Cmd/Ctrl + S` | Save |
| `Cmd/Ctrl + Shift + D` | Delete |

**Search**

| Shortcut | Action |
| :---- | :---- |
| `Cmd/Ctrl + F` | Search |
| `Cmd/Ctrl + Shift + F` | Global Search |

**Query**

| Shortcut | Action |
| :---- | :---- |
| `Cmd/Ctrl + Enter` | Run Query |

Expose shortcuts through VS Code command registration. Allow customization where practical.

---

## 29\. Command Palette

Register commands such as:

- `Vistiq: Connect Project`  
- `Vistiq: Disconnect Project`  
- `Vistiq: Refresh`  
- `Vistiq: Open Firestore`  
- `Vistiq: New Document`  
- `Vistiq: Run Query`  
- `Vistiq: Save Query`  
- `Vistiq: Export Collection`  
- `Vistiq: Import Collection`  
- `Vistiq: Compare Documents`  
- `Vistiq: Compare Projects`  
- `Vistiq: Copy to Project`  
- `Vistiq: Open Audit History`  
- `Vistiq: Settings`

Commands should integrate naturally with the VS Code Command Palette.

---

## 30\. Multiple Tabs

Support multiple Vistiq views, e.g. `users`, `users/123`, `orders`, `Query`, `Compare`.

**Allow:** Open · Close · Pin · Refresh · Duplicate where useful

Use VS Code WebviewPanel/custom editor concepts where appropriate.

---

## 31\. Firebase Authentication Viewer

Where permissions/API capabilities allow, provide read-oriented Firebase Authentication management.

**Display:** UID · email · email verification · provider · creation date · last sign-in

**Potential future actions:** disable · enable · delete

All sensitive/destructive actions require strong confirmation. Never expose credentials or tokens.

---

## 32\. Project File Detection

Detect Firebase project files in the workspace:

- `firebase.json`  
- `.firebaserc`  
- `firestore.rules`  
- `firestore.indexes.json`  
- `package.json`

**Provide:**

Detected Firebase Project

Project: my-project

Firestore: Detected

Rules: Detected

Indexes: Detected

Emulator: Detected

\[Connect\]

Do not assume that a Firebase configuration file proves ownership or access. Always validate actual credentials.

---

## 33\. Local Development

Support local Firebase projects. Detect `firebase.json` and emulator configuration.

**Allow:** Connect to Emulator · Connect to Cloud

Make environment obvious.

---

## 34\. Security Architecture

Security is a first-class requirement.

**Threat model against:**

- Malicious extensions  
- Malicious workspace code  
- Compromised Webview  
- Credential theft  
- Token leakage  
- Accidental production deletion  
- Malicious project configuration  
- Supply-chain attacks  
- Dependency vulnerabilities

Never execute arbitrary project code automatically. Do not trust `firebase.json`, `package.json`, workspace scripts, or project configuration as trusted input.

---

## 35\. Webview Security

**Use:** Content Security Policy · nonce-based scripts · strict message validation · minimal Webview permissions

Never expose credentials to Webview. Webview communicates with Extension Host through validated messages:

Webview

    |

    | message

    v

Extension Host

    |

    | validate

    v

Core Service

    |

    v

Firestore

Validate every command. Do not allow Webview messages to invoke arbitrary Node.js APIs.

---

## 36\. Secret Management

Use **VS Code SecretStorage** for: OAuth tokens, service account credentials, sensitive connection information.

**Never write credentials to:** logs, workspace files, JSON configuration, Git, localStorage.

**Provide:** Disconnect · Remove Credentials · Clear Secrets

---

## 37\. Logging

Provide safe logging.

**Never log:** private keys, tokens, passwords, complete sensitive documents.

**Support levels:** Info · Warning · Error · Debug

Allow users to enable debug logging. Redact secrets automatically.

---

## 38\. Telemetry

**Default: NO telemetry.**

No analytics. No tracking. No document collection. No user data collection. No Firestore data sent to Vistiq servers.

If telemetry is ever introduced: opt-in, documented, anonymous, disabled by default.

---

## 39\. Privacy

Vistiq should operate as a local-first application.

**Architecture:**

User

 |

Vistiq Extension

 |

Google/Firebase APIs

**NOT:**

User

 |

Vistiq Server

 |

Google/Firebase

The core product must not require a Vistiq backend. Firestore data should go directly between the user's environment and Google/Firebase services.

---

## 40\. Performance

Optimize for large collections. Do not load thousands of documents into React state unnecessarily.

**Use:** Pagination · virtualized lists · incremental loading · lazy rendering · debounced search · caching where safe.

The UI should remain responsive with large collections.

---

## 41\. Error Handling

**Handle:** authentication errors · permission errors · invalid project · invalid service account · Firestore unavailable · emulator unavailable · query validation errors · quota errors · network errors · timeout · partial batch failures.

Show developer-friendly errors, for example:

Permission denied.

The connected service account does not have permission to read:

projects/my-project/databases/(default)

Required permission may include:

datastore.entities.get

Check your IAM configuration.

Do not expose sensitive credential information.

---

## 42\. Firestore Cost Warnings

Where practical, warn users that:

- Collection reads may incur charges  
- Exports may perform many reads  
- Batch writes may incur writes  
- Migrations may generate significant Firestore usage

For large operations, show approximate operation counts. Do not claim exact pricing unless pricing is obtained from current official Google Cloud documentation.

---

## 43\. Testing

**Create unit tests for:** authentication, credentials, queries, query validation, CRUD, export, import, batch, diff, project comparison, migration, audit, security validation.

Create integration tests for Firestore Emulator. **Do not use production Firestore for automated tests.**

**Test:** malformed data, huge documents, nested objects, arrays, timestamps, references, GeoPoint, permission failures, network failures, partial failures.

---

## 44\. Security Testing

**Test:** Webview message injection, CSP, credential exposure, secret leakage, malicious configuration, command injection, path traversal, dependency vulnerabilities, unsafe serialization, XSS, prototype pollution, arbitrary code execution.

Run `npm audit` or equivalent. Use Dependabot/Renovate where appropriate.

---

## 45\. Accessibility

**Support:** keyboard navigation, screen readers, ARIA, focus management, high contrast, dark mode, light mode.

Use VS Code theme variables rather than hard-coded colors wherever practical. Vistiq should feel native inside VS Code/Cursor.

---

## 46\. Internationalization

Design UI strings so internationalization can be added later. Do not hard-code UI text deep inside business logic.

---

## 47\. Extension Packaging

Prepare extension packaging for **VSIX**.

**Include:** extension icon, README, CHANGELOG, LICENSE, repository metadata, bugs URL, homepage, publisher configuration placeholder.

Do not publish automatically without explicit authorization.

---

## 48\. VS Code Marketplace

Prepare the project for VS Code Marketplace publication.

**Requirements:** valid extension manifest, extension icon, categories, keywords, README, changelog, license, repository, versioning.

Do not claim official Firebase affiliation.

**Suggested categories:** Other · Data Science · Visualization · Developer Tools

Use the final verified branding only after trademark/domain checks.

---

## 49\. Cursor Compatibility

Design the extension using standard VS Code Extension APIs. Do not use unnecessary proprietary dependencies.

Test in Visual Studio Code and Cursor. Document any known Cursor-specific limitations. Do not assume all VS Code APIs behave identically in Cursor.

---

## 50\. Open VSX

Prepare for Open VSX distribution where appropriate.

Document: VS Code Marketplace, Open VSX, Cursor installation. Do not duplicate marketplace-specific assumptions in the core code.

---

## 51\. Future Desktop Application

Do not build the desktop application in V1. Maintain a clean architecture so a future application can use:

Vistiq Core

    |

    \+-- Electron/Desktop UI

The core must not depend on VS Code APIs.

---

## 52\. Future AI Features

Design for future AI integration but **DO NOT** make AI mandatory.

**Potential future features:**

- Natural language query generation (e.g. *"Find active users older than 25"* → Firestore query)  
- Explain query  
- Explain document  
- Generate migration  
- Detect suspicious schema changes  
- Generate Firestore code  
- Suggest indexes

Any future AI feature must be opt-in. Firestore data must not be sent to third-party AI providers without explicit user consent.

---

## 53\. Future Firebase Services

Architecture should allow future modules:

- Firebase Authentication  
- Firebase Storage  
- Cloud Functions  
- Firebase App Check  
- Remote Config  
- Firebase Hosting  
- Firebase Emulator Suite

Do not implement all of these initially. Firestore is the primary service.

---

## 54\. Future Enterprise Features

**Potential V3 features:**

- Advanced audit reporting  
- Organization policies  
- Team configuration  
- RBAC  
- Data masking  
- Sensitive-field detection  
- PII warnings  
- Advanced migration workflows  
- Backup/restore  
- Scheduled exports  
- Schema visualization  
- Query history  
- Query templates  
- Enterprise policy controls

Do not introduce a Vistiq cloud backend merely to implement these. Keep local-first architecture.

---

## 55\. Roadmap

### V1 — Core

1. VS Code extension  
2. Cursor compatibility  
3. Vistiq Activity Bar  
4. Sidebar  
5. Project connections  
6. Google authentication  
7. Service Account authentication  
8. Secure SecretStorage  
9. Firestore browser  
10. Collection browser  
11. Document browser  
12. Document CRUD  
13. JSON editor  
14. Search  
15. Basic query builder  
16. JSON copy  
17. JSON export  
18. CSV export  
19. Multiple tabs  
20. Firebase Emulator  
21. Command Palette  
22. Keyboard shortcuts  
23. Local activity history  
24. Production safety mode  
25. Testing  
26. Security hardening  
27. Open-source documentation

### V2 — Advanced

28. Saved queries  
29. Advanced query builder  
30. Batch operations  
31. Collection import  
32. Advanced collection export  
33. Document diff  
34. Project comparison  
35. Project-to-project copy  
36. Migration workflow  
37. Advanced local audit history  
38. Keyboard shortcut customization  
39. Query code generation  
40. Firebase Authentication viewer  
41. Workspace Firebase project detection  
42. Improved emulator integration  
43. Advanced search  
44. Query history  
45. Command palette improvements

### V3 — Advanced / Enterprise (Potential)

46. Schema visualization  
47. Collection relationship visualization  
48. Backup/restore  
49. Scheduled exports  
50. Data masking  
51. PII warnings  
52. Sensitive-field detection  
53. Advanced migration  
54. Organization policies  
55. Team configuration  
56. Advanced audit reporting  
57. Optional AI  
58. Optional cloud synchronization  
59. Optional collaboration  
60. Future desktop application

---

## 56\. Important Development Rule

**DO NOT** attempt to implement every feature immediately. Build incrementally.

**Phases:**

1. Architecture  
2. Extension shell  
3. Authentication  
4. Firestore connection  
5. Explorer  
6. Documents  
7. CRUD  
8. Query  
9. Export  
10. Emulator  
11. Security  
12. Testing  
13. V2 features  
14. V3 features

After each major phase: run tests, fix TypeScript errors, run lint, verify packaging, verify security, update documentation.

---

## 57\. Repository Structure

Use a clean monorepo.

/

package.json

pnpm-workspace.yaml

tsconfig.json

README.md

LICENSE

SECURITY.md

CONTRIBUTING.md

CHANGELOG.md

/apps/

    vscode-extension/

        src/

        package.json

        README.md

    webview/

        src/

        package.json

/packages/

    core/

    firestore/

    auth/

    credentials/

    query-engine/

    query-builder/

    export/

    import/

    batch/

    diff/

    project-compare/

    migration/

    emulator/

    audit/

    shared/

    Future:

    desktop/

/tests/

    unit/

    integration/

    security/

---

## 58\. Core Interfaces

Create interfaces similar to:

interface FirestoreConnection {

    connect(): Promise\<void\>;

    disconnect(): Promise\<void\>;

    listCollections(): Promise\<CollectionInfo\[\]\>;

    listDocuments(

        collectionPath: string,

        options?: QueryOptions

    ): Promise\<DocumentPage\>;

    getDocument(

        documentPath: string

    ): Promise\<FirestoreDocument | null\>;

    createDocument(

        collectionPath: string,

        data: FirestoreDocument,

        documentId?: string

    ): Promise\<void\>;

    updateDocument(

        documentPath: string,

        data: FirestoreDocument

    ): Promise\<void\>;

    deleteDocument(

        documentPath: string

    ): Promise\<void\>;

    runQuery(

        query: FirestoreQuery

    ): Promise\<DocumentPage\>;

}

Create separate services for:

- `ExportService`  
- `ImportService`  
- `BatchService`  
- `DiffService`  
- `ProjectCompareService`  
- `MigrationService`  
- `AuditService`  
- `CredentialService`

Do not put all functionality into one giant class.

---

## 59\. UI/Core Separation

React UI should never directly call Firebase APIs.

**Correct:**

React Webview

    |

    | validated message

    v

Extension Host

    |

    v

Core Service

    |

    v

Firebase

**Incorrect:**

React

    |

    v

Firebase Admin SDK

Never expose Firebase Admin SDK credentials to Webview.

---

## 60\. Document Model

Create a safe internal Firestore value model.

**Support:** string, number, boolean, null, timestamp, reference, geopoint, bytes, array, map.

Serialization must preserve Firestore semantics. Do not blindly `JSON.stringify` Firestore objects.

---

## 61\. Large Data Handling

Never assume collections are small.

**Support:** pagination, streaming where practical, virtual scrolling, lazy loading, chunked batch operations, memory limits.

Warn users before expensive operations.

---

## 62\. Failure Recovery

For batch/migration operations, show: `Total` · `Processed` · `Succeeded` · `Failed` · `Skipped`

Allow **Retry Failed**. Generate an error report. Never falsely report success if some operations failed.

---

## 63\. Versioning

Use Semantic Versioning, e.g. `0.1.0`, `0.2.0`, `1.0.0`.

V1 release should be considered stable only after: tests, security review, documentation, packaging, extension installation testing, Firestore Emulator integration testing.

---

## 64\. README

README must contain:

- Vistiq logo placeholder  
- **Vistiq** — *Explore. Query. Manage.*  
- Features  
- Screenshots placeholders  
- Installation (VS Code, Cursor)  
- Development  
- Authentication (Service Account, Firestore Emulator)  
- Security  
- Architecture  
- Privacy  
- Contributing  
- License  
- Roadmap  
- FAQ

**Disclaimer:** Vistiq is an independent open-source project and is not affiliated with Google or Firebase.

---

## 65\. SECURITY.md

Explain:

- Credential handling  
- SecretStorage  
- Webview security  
- CSP  
- No telemetry  
- Local-first architecture  
- Vulnerability reporting  
- Supported versions

Never include secrets in examples.

---

## 66\. Do NOT Build

- A Vistiq cloud server  
- Mandatory account registration  
- Mandatory Vistiq login  
- Analytics by default  
- Telemetry by default  
- Remote database for storing user data  
- Credential collection server  
- Arbitrary code execution  
- Automatic workspace script execution  
- Plaintext credential storage  
- Production operations without confirmation

---

## 67\. Legal / Branding

Use **Vistiq** only as the working product name.

**Before public launch, verify:**

- Domain availability  
- GitHub availability  
- npm package availability  
- VS Code Marketplace availability  
- Open VSX availability  
- Major app names  
- Trademark availability (India trademark databases, USPTO, WIPO, EUIPO)

Do **NOT** claim the name is legally cleared until an actual trademark search has been performed.

Do not claim affiliation with: Google, Firebase, Microsoft, VS Code, Cursor.

---

## 68\. Final Product Vision

Vistiq should feel like **"Developer Tools for Firestore"** — not "Another database GUI."

**Ideal user experience:**

1. Developer opens VS Code.  
2. Vistiq appears in the Activity Bar.  
3. Developer selects **Production**.  
4. Vistiq connects securely.  
5. Developer opens **Firestore → users**.  
6. They see documents immediately.  
7. They can Inspect, Search, Query, Edit, Create, Delete, Export, Import, Compare, Copy, Migrate — without leaving the IDE.

---

## 69\. Definition of Done

The project is not considered complete merely because the extension launches. The final product must have:

- [ ] VS Code extension  
- [ ] Cursor compatibility  
- [ ] Vistiq sidebar  
- [ ] Project manager  
- [ ] Google OAuth  
- [ ] Service Account  
- [ ] Secure SecretStorage  
- [ ] Firestore collections  
- [ ] Firestore documents  
- [ ] CRUD  
- [ ] JSON editor  
- [ ] Search  
- [ ] Query builder  
- [ ] Advanced query builder  
- [ ] Saved queries  
- [ ] JSON export  
- [ ] CSV export  
- [ ] Collection import  
- [ ] Batch operations  
- [ ] Document diff  
- [ ] Project comparison  
- [ ] Project-to-project copy  
- [ ] Migration workflow  
- [ ] Emulator support  
- [ ] Firebase Auth viewer  
- [ ] Command Palette  
- [ ] Keyboard shortcuts  
- [ ] Local audit history  
- [ ] Production safety  
- [ ] Code generation  
- [ ] Firebase project detection  
- [ ] Large-data handling  
- [ ] Error recovery  
- [ ] Security hardening  
- [ ] Unit tests  
- [ ] Integration tests  
- [ ] Security tests  
- [ ] Documentation  
- [ ] README  
- [ ] CONTRIBUTING  
- [ ] SECURITY  
- [ ] LICENSE  
- [ ] CI/CD  
- [ ] VSIX packaging  
- [ ] Open-source repository

---

## 70\. Development Behavior

You are not allowed to take shortcuts that compromise security or architecture.

**Do not:**

- Invent Firebase APIs  
- Invent VS Code APIs  
- Store secrets insecurely  
- Hard-code credentials  
- Put business logic inside React components  
- Create giant files  
- Ignore TypeScript errors  
- Suppress errors without justification  
- Skip tests  
- Use production Firebase for automated tests  
- Implement fake success responses

**When an API behavior is uncertain:**

1. Inspect the official SDK/API documentation  
2. Inspect installed package types  
3. Implement against verified APIs  
4. Add tests

**When a requirement conflicts with Firestore limitations:**

- Explain the limitation  
- Implement the closest valid behavior  
- Provide a clear UI explanation

---

## 71\. Implementation Order

**Step 1** — Create monorepo **Step 2** — Create VS Code extension shell **Step 3** — Create Vistiq Activity Bar and sidebar **Step 4** — Create React Webview **Step 5** — Create core service architecture **Step 6** — Implement secure credential storage **Step 7** — Implement Firebase project connection **Step 8** — Implement Firestore connection **Step 9** — Implement collection explorer **Step 10** — Implement document viewer **Step 11** — Implement CRUD **Step 12** — Implement query builder **Step 13** — Implement export **Step 14** — Implement emulator **Step 15** — Implement security tests **Step 16** — Implement V2 advanced functionality

Do not jump directly to migration/project-copy features before the core Firestore functionality is stable.

---

## 72\. Final Expectation

Produce real production-quality code. Do not provide pseudo-code when implementation is possible. Do not leave major features as TODO unless they are explicitly marked as future V3 features.

Use TypeScript types properly. Use clean architecture. Write tests. Document important architectural decisions.

**Keep Vistiq:**

- Open source  
- Local-first  
- Privacy-first  
- Secure  
- Extensible  
- Developer-friendly  
- Cross-platform through VS Code-compatible IDEs

The final result should be a serious open-source developer tool rather than a simple Firestore CRUD demo.

Start by creating the architecture and project structure, then implement the V1 foundation incrementally.  
