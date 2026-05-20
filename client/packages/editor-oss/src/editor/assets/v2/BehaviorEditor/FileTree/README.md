# Enhanced FileTree Component

The FileTree component has been significantly enhanced with new features for better file and directory management in the AI 3D Sandbox project.

## New Features

### 🔍 Search Functionality

- **File Search**: Search for files by name using the search input
- **Content Search**: Search within file content using the toggle button (📄/🔍)
- **Real-time Results**: Search results appear instantly as you type
- **Search Highlighting**: Search terms are highlighted in results

### 📁 Directory Management

- **Expand/Collapse**: Click the arrow (▶) next to directories to expand/collapse
- **Visual Indicators**: Clear visual indication of open/closed directories
- **Auto-expand**: Directories automatically expand when they contain the selected file

### 📄 File Management

- **Unsaved File Indicators**: Unsaved files are displayed in italic with a different color (#f0c674)
- **File Type Icons**: Different icons for different file types (JS, TS, JSON, MD, etc.)
- **File Selection**: Visual feedback for selected files

### 🖱️ Context Menu Operations

Right-click on any file or directory to access:

- **New File**: Create a new file in the selected location
- **New Folder**: Create a new directory
- **Rename**: Rename files or directories
- **Clone**: Duplicate files (files only)
- **Delete**: Remove files or directories with confirmation

### 🎨 Styling

- Consistent with existing theme variables (`--theme-container-main-dark`, `--theme-grey-bg`, etc.)
- Proper hover states and visual feedback
- Responsive design that works within the BehaviorCreator

## Props Interface

```typescript
interface FileTreeProps {
    files: File[];
    dirs: Directory[];
    selectedFile: File | undefined;
    onSelect: (file: File) => void;
    onFileChange?: (file: File) => void;
    onFileCreate?: (file: File) => void;
    onFileDelete?: (fileId: string) => void;
    onFileRename?: (fileId: string, newName: string) => void;
    onDirectoryCreate?: (directory: Directory) => void;
    onDirectoryDelete?: (directoryId: string) => void;
    onDirectoryRename?: (directoryId: string, newName: string) => void;
}
```

## Usage in BehaviorCreator

The FileTree is now fully integrated with the BehaviorCreator component with:

- File management callbacks that sync with the behavior's file structure
- Support for creating, editing, and deleting behavior files
- Auto-save functionality for unsaved changes
- Integration with the Monaco code editor

## Key Components

### 1. Search Container

- Search input with placeholder text
- Toggle button to switch between file and content search
- Search results container with highlighted matches

### 2. File Tree Structure

- Hierarchical display of files and directories
- Depth-based indentation
- File type icons and status indicators

### 3. Context Menu

- Fixed positioning based on right-click location
- Context-sensitive options (files vs directories)
- Confirmation dialogs for destructive operations

### 4. Utility Functions

Enhanced `fileManager.tsx` with new functions:

- `searchFilesByName()`: Search files by filename
- `searchFilesContent()`: Search within file content
- `getAllFiles()`: Get all files recursively
- `findDirectoryById()`: Find directory by ID
- `generateFileId()` / `generateDirectoryId()`: Generate unique IDs

## Accessibility

- Keyboard navigation support
- Screen reader friendly
- Proper ARIA attributes for interactive elements
- Clear visual focus indicators

## Performance

- Efficient search algorithms with memoization
- Minimal re-renders through proper useCallback usage
- Virtual scrolling for large file trees (if needed)

## Testing

A demo component (`FileTreeDemo.tsx`) is provided to showcase all features:

- Sample file structure with various file types
- Demonstrates all context menu operations
- Shows unsaved file indicators
- Interactive search functionality

## Future Enhancements

Potential future improvements:

- Drag and drop functionality
- Multi-file selection
- Keyboard shortcuts
- File preview on hover
- Advanced search filters
- Bookmarks/favorites system
