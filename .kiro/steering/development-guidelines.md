# Photo Search Development Guidelines

## Architecture Priority

**Photo Search is a local-first desktop application. Development should prioritize:**

1. **🖥️ Desktop Local App (Primary)** - Electron V3 with direct file system access
2. **🤖 AI Enhanced Mode (Secondary)** - Optional backend for AI features  
3. **🌐 Web App (Tertiary)** - Browser version for development/testing only

**Key Principle:** The app MUST work without any backend server. AI features are enhancements, not requirements.

## Virtual Environment Usage

**ALWAYS use the existing .venv when working with Python components:**

```bash
# Navigate to the intent-first directory
cd photo-search-intent-first

# Activate the existing virtual environment
source .venv/bin/activate  # On macOS/Linux
# OR
.venv\Scripts\activate     # On Windows

# Verify you're in the correct environment
which python  # Should show path to .venv/bin/python
pip list      # Should show installed packages
```

**Never create new virtual environments** - always use the existing one at `photo-search-intent-first/.venv`

## Intent-First Development Philosophy

Follow the Intent-First methodology as outlined in `photo-search-intent-first/docs/intent_first_handbook.md`:

### Core Principles
1. **Investigate Intent Before Acting** - Understand the user problem before implementing solutions
2. **Value Over Process** - Focus on user outcomes, not just technical requirements
3. **Full Feature Focus** - Build complete, polished features rather than MVP compromises
4. **Proper Intent** - Every feature should solve a real user need with measurable value

### Development Approach
- **No MVP mindset** - Build features properly and completely from the start
- **Full functionality** - Don't cut corners on user experience or feature completeness
- **Proper intent** - Ensure every feature has clear user value and business justification
- **Quality first** - Prioritize code quality, user experience, and maintainability

## Architecture Guidelines

### Frontend (V3 Focus)
- **Primary focus**: `photo-search-intent-first/webapp-v3/` and `electron-v3/`
- **Technology stack**: React + TypeScript + Vite + shadcn/ui + Tailwind CSS
- **State management**: Zustand for global state
- **API integration**: Use existing API client with v1 adapter
- **Offline-first**: Support local file access and offline functionality

### Backend Integration
- **Existing backend**: `photo-search-intent-first/api/` (FastAPI)
- **Local models**: Use bundled CLIP models for offline operation
- **Future phases**: Plan for online model integration (OpenAI, Hugging Face)
- **Current focus**: Purely local, offline-capable functionality

### Desktop Application
- **Electron wrapper**: `electron-v3/` for desktop distribution
- **Security**: Context isolation, secure IPC, no Node.js in renderer
- **File access**: Direct file:// URLs for offline photo access
- **Model bundling**: Include AI models in application package

## Feature Implementation Standards

### Complete Feature Implementation
When implementing features, ensure:
1. **Full user workflow** - Complete end-to-end user experience
2. **Error handling** - Comprehensive error states and recovery
3. **Loading states** - Proper loading indicators and progressive enhancement
4. **Accessibility** - Full keyboard navigation and screen reader support
5. **Performance** - Optimized for large photo libraries (10k+ photos)
6. **Offline capability** - Works without internet connection

### Missing Features to Implement
Based on the original app, ensure these features are properly implemented in v3:

#### Core Photo Management
- Advanced search with filters (date, location, camera, etc.)
- Bulk operations (select multiple, batch actions)
- Photo editing integration
- Metadata editing and management
- Duplicate photo detection and management

#### Organization Features
- Smart collections with auto-updating rules
- Advanced tagging system with hierarchical tags
- Face recognition and people management
- Location-based organization and maps
- Timeline view with date clustering

#### Advanced Features
- OCR text extraction from photos
- AI-powered auto-tagging
- Similar photo finding
- Export/import functionality
- Backup and sync capabilities

## Code Quality Standards

### TypeScript
- **Strict mode**: Enable all strict TypeScript checks
- **Type safety**: No `any` types, proper interface definitions
- **Component props**: Use proper TypeScript interfaces for all props
- **API types**: Maintain type safety for all API interactions

### React Best Practices
- **Functional components**: Use hooks, avoid class components
- **Performance**: Proper memoization with useMemo/useCallback
- **State management**: Use Zustand for global state, local state for component-specific data
- **Error boundaries**: Implement proper error handling

### Styling
- **Tailwind CSS**: Use utility-first approach
- **shadcn/ui**: Leverage existing component library
- **Responsive design**: Mobile-first, works on all screen sizes
- **Dark mode**: Support system preference and manual toggle

## Testing Strategy

### Component Testing
- **Unit tests**: Test individual components and utilities
- **Integration tests**: Test component interactions and API integration
- **Visual regression**: Ensure UI consistency across changes
- **Accessibility testing**: Automated a11y checks

### End-to-End Testing
- **User workflows**: Test complete user journeys
- **Electron integration**: Test desktop app functionality
- **Offline scenarios**: Test offline-first capabilities
- **Performance testing**: Test with large photo libraries

## File Organization

### Project Structure
```
photo-search-intent-first/
├── webapp-v3/           # Modern React frontend (PRIMARY FOCUS)
├── electron/            # Legacy Electron wrapper
├── api/                 # FastAPI backend
├── docs/                # Documentation
└── .venv/              # Python virtual environment (USE THIS)

electron-v3/             # New Electron wrapper (SECONDARY FOCUS)
├── main.js             # Electron main process
├── preload.js          # Security bridge
└── app/                # Built React app
```

### Component Organization
```
webapp-v3/src/
├── components/         # React components
│   ├── ui/            # shadcn/ui components
│   └── ...            # Feature components
├── services/          # API clients and external services
├── store/             # Zustand stores
├── hooks/             # Custom React hooks
├── types/             # TypeScript type definitions
└── lib/               # Utility functions
```

## Development Workflow

### Getting Started
1. **Environment setup**: Use existing .venv, install dependencies
2. **Code exploration**: Review existing codebase and documentation
3. **Feature planning**: Understand user intent before implementation
4. **Implementation**: Build complete features with proper testing
5. **Integration**: Ensure seamless integration with existing systems

### Pull Request Guidelines
1. **Intent documentation**: Clearly explain the user problem being solved
2. **Complete implementation**: No partial features or TODO comments
3. **Testing**: Include appropriate tests for new functionality
4. **Documentation**: Update relevant documentation
5. **Performance**: Consider impact on large photo libraries

## Security Considerations

### Electron Security
- **Context isolation**: Enabled by default
- **Node integration**: Disabled in renderer
- **Secure IPC**: Use preload script for safe API exposure
- **File access**: Validate all file paths and permissions

### Data Privacy
- **Local-first**: All processing happens locally by default
- **No telemetry**: Respect user privacy
- **Secure storage**: Use Electron's secure storage for sensitive data
- **Permission requests**: Clear user consent for file access

## Performance Guidelines

### Large Library Support
- **Virtualization**: Use react-window for large lists
- **Lazy loading**: Progressive image loading
- **Efficient indexing**: Optimize search index performance
- **Memory management**: Proper cleanup and garbage collection

### Offline Performance
- **Local models**: Bundle AI models with application
- **Caching**: Intelligent caching of thumbnails and metadata
- **Background processing**: Non-blocking operations
- **Progressive enhancement**: Core features work immediately

## Documentation Standards

### Code Documentation
- **JSDoc comments**: Document all public functions and components
- **README files**: Clear setup and usage instructions
- **API documentation**: Keep API docs up to date
- **Architecture decisions**: Document significant design choices

### User Documentation
- **Feature guides**: How to use each feature effectively
- **Troubleshooting**: Common issues and solutions
- **Performance tips**: Optimizing for large libraries
- **Keyboard shortcuts**: Complete shortcut reference

## Future Considerations

### Online Features (Future Phases)
- **Cloud models**: Integration with OpenAI, Hugging Face APIs
- **Sync capabilities**: Cross-device synchronization
- **Collaborative features**: Sharing and collaboration
- **Cloud storage**: Integration with cloud storage providers

### Scalability
- **Plugin architecture**: Extensible feature system
- **Multi-language**: Internationalization support
- **Enterprise features**: Advanced management capabilities
- **API ecosystem**: Public API for third-party integrations

---

**Remember**: Focus on building a world-class photo management application that users will love. Every feature should be implemented completely and properly, with attention to detail and user experience.