# Contributing to NDS WebSocket Controller

First off, thank you for considering contributing to NDS WebSocket Controller! It's people like you that make this project such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When you create a bug report, include as many details as possible:

**Bug Report Template:**

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g. POP!_OS 22.04]
 - Node.js version: [e.g. 14.17.0]
 - Browser: [e.g. Chrome 96]
 - Device: [e.g. Samsung Galaxy S21]

**Additional context**
Any other context about the problem.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. Create an issue and provide:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **List some examples** of how it would be used

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure the test suite passes
4. Make sure your code lints
5. Issue that pull request!

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/nds-websocket-controller.git
cd nds-websocket-controller

# Install dependencies
cd server
npm install

# Start development server
npm run dev
```

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

**Examples:**
```
feat: Add network scanning functionality
fix: Resolve button mapping issue on Firefox
docs: Update installation instructions
style: Format code with Prettier
refactor: Simplify WebSocket connection logic
test: Add tests for button customization
chore: Update dependencies
```

### JavaScript Styleguide

- Use ES6+ features
- Use meaningful variable names
- Add comments for complex logic
- Follow existing code patterns
- Use async/await over promises where appropriate

```javascript
// Good
async function connectToServer(host, port) {
  try {
    const connection = await createWebSocket(host, port);
    return connection;
  } catch (error) {
    console.error('Connection failed:', error);
    throw error;
  }
}

// Avoid
function connectToServer(host, port) {
  return new Promise((resolve, reject) => {
    // ...
  });
}
```

### Documentation Styleguide

- Use Markdown
- Reference functions and classes in backticks
- Include code examples
- Keep line length under 100 characters

## Project Structure

```
nds-websocket-controller/
├── client/          # Frontend code
├── server/          # Backend code
├── docs/            # Documentation
├── scripts/         # Build/deployment scripts
└── tests/           # Test files
```

## Testing

```bash
# Run all tests
npm test

# Run specific test
npm test -- --grep "button mapping"

# Run with coverage
npm run test:coverage
```

## Questions?

Feel free to open an issue or reach out to the maintainers!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
