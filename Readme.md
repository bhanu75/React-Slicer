# React Component Modularizer CLI

🚀 **A professional-grade CLI tool for extracting React components from monolithic App.jsx files**

Built for internal dev teams working with AI-generated code or large, unstructured React applications.

## 🎯 Problem Solved

- **AI-Generated Code**: Claude/GPT often outputs everything in a single App.jsx file
- **Legacy Codebases**: Large monolithic components that need restructuring
- **Team Collaboration**: Breaking down files for better maintainability and code reviews
- **Developer Velocity**: Automated component extraction saves hours of manual refactoring

## ⚡ Quick Start

### Installation

```bash
# Install dependencies
npm install

# Make executable (Unix/Mac)
chmod +x modularize.js
```

### Basic Usage

```bash
# Place your App.jsx in the current directory, then run:
node modularize.js

# Or if installed globally:
npx modularize
```

## 🧠 How It Works

1. **Scans** your App.jsx file using Babel AST parsing
2. **Identifies** extractable components (function declarations and arrow functions)
3. **Extracts** components while preserving all code and logic
4. **Creates** individual `.jsx` files in `/components` directory
5. **Updates** App.jsx with proper import statements
6. **Formats** all output using Prettier
7. **Displays** complete results in console codeblocks for review

## 📋 What Gets Extracted

### ✅ Supported Component Types

```jsx
// Function declarations
function MyComponent() {
  return <div>Hello</div>;
}

// Arrow functions
const MyComponent = () => {
  return <div>Hello</div>;
}

// Arrow functions with hooks
const MyComponent = () => {
  const [state, setState] = useState(false);
  return <div>{state ? 'On' : 'Off'}</div>;
}
```

### ❌ What Stays in App.jsx

- The main `App` component (never extracted)
- Import statements
- Non-component functions
- Constants and variables
- Components that don't follow naming conventions

## 🔧 Example Transformation

### Before (App.jsx)
```jsx
import React, { useState } from 'react';

function Header() {
  return <header><h1>My App</h1></header>;
}

const Sidebar = () => {
  const [open, setOpen] = useState(false);
  return <aside>Sidebar content</aside>;
}

function App() {
  return (
    <div>
      <Header />
      <Sidebar />
    </div>
  );
}

export default App;
```

### After Modularization

**Updated App.jsx:**
```jsx
import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';

function App() {
  return (
    <div>
      <Header />
      <Sidebar />
    </div>
  );
}

export default App;
```

**components/Header.jsx:**
```jsx
export default function Header() {
  return <header><h1>My App</h1></header>;
}
```

**components/Sidebar.jsx:**
```jsx
import React, { useState } from 'react';

const Sidebar = () => {
  const [open, setOpen] = useState(false);
  return <aside>Sidebar content</aside>;
};

export default Sidebar;
```

## 🧪 Testing

Run the built-in test suite:

```bash
npm test
# or
node test.js
```

The test suite:
- Creates a sample monolithic App.jsx
- Runs the modularizer
- Validates all outputs
- Cleans up test files

## 💡 Features

- **🛡️ Idempotent**: Safe to run multiple times
- **🎨 Auto-formatting**: Uses Prettier for consistent code style
- **📦 Zero Config**: Works out of the box
- **🔍 AST-based**: Robust parsing using Babel
- **👀 Visual Output**: Shows all generated files in console
- **⚡ Fast**: Processes large files in seconds
- **🧹 Clean**: No temporary files or artifacts left behind

## 🏗️ Architecture

Built following **FANGA internal tool standards**:

- **Node.js CLI-first** architecture
- **Babel AST parsing** for robust code analysis
- **Prettier integration** for consistent formatting
- **File system operations** with proper error handling
- **Console output** with codeblock formatting for dev UX
- **Modular design** for future API/UI extensions

## 🔮 Roadmap (Post-MVP)

- **Express API** for web interface integration
- **React UI** with drag-drop and live preview
- **ZIP export** functionality
- **VS Code extension** for in-editor use
- **Advanced parsing** for complex component patterns
- **Configuration file** support

## 🤝 Contributing

This is designed as an **internal tool MVP**. For production use:

1. Add comprehensive error handling
2. Implement configuration options
3. Add support for TypeScript
4. Include more robust component detection
5. Add integration tests

## 📊 Success Metrics

✅ **MVP Success Criteria:**
- Extracts components from AI-generated App.jsx files
- Creates clean, importable component files
- Updates App.jsx with proper imports
- Zero manual editing required
- Console shows complete code preview

## 🚨 Limitations

- Only processes files named `App.jsx`
- Components must follow PascalCase naming
- No support for class components (by design)
- No TypeScript support in MVP
- Limited to single-file input

---

**Built for internal dev teams who value clean, maintainable React codebases.**
