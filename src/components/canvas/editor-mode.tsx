"use client";

import { createContext, useContext } from "react";

// Whether this editor instance is the public, signed-out /try Studio.
//
// Passed by context rather than threaded as a prop because the components
// that need it (the image uploader, reached from both the sidebar and the
// properties panel) sit several layers below CanvasEditor, and widening every
// intermediate component's props to carry a flag they don't otherwise use
// would be worse than a single read here.
export const EditorModeContext = createContext<{ guest: boolean }>({ guest: false });

export function useEditorMode() {
  return useContext(EditorModeContext);
}
