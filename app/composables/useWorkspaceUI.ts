export type WorkspaceSurface = 'none' | 'library' | 'queue' | 'scenes'
export type LibraryTab = 'tracks' | 'playlists' | 'import'

export function useWorkspaceUI() {
  const openSurface = useState<WorkspaceSurface>('workspace-surface', () => 'none')
  const libraryTab = useState<LibraryTab>('library-tab', () => 'tracks')

  function openSheet(surface: Exclude<WorkspaceSurface, 'none'>) {
    openSurface.value = surface
  }

  function closeSheet() {
    openSurface.value = 'none'
  }

  function toggleSheet(surface: Exclude<WorkspaceSurface, 'none'>) {
    openSurface.value = openSurface.value === surface ? 'none' : surface
  }

  function setLibraryTab(tab: LibraryTab) {
    libraryTab.value = tab
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape' && openSurface.value !== 'none') {
      closeSheet()
    }
  }

  function handleBackdropClick() {
    closeSheet()
  }

  return {
    openSurface: readonly(openSurface),
    libraryTab: readonly(libraryTab),
    openSheet,
    closeSheet,
    toggleSheet,
    setLibraryTab,
    handleEscape,
    handleBackdropClick
  }
}
