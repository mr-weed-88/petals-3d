/**
 * Catalogue of the scene mutations that need to become undoable commands.
 *
 * This is a design note, not executable behaviour. Undo/redo cannot be
 * built until the mesh-to-store aliasing described in ARCHITECTURE.md
 * section 6 is resolved, because a command history needs immutable
 * snapshots and there is currently no point in the data flow to take one.
 *
 * Kept as a typed constant so the intent survives and the keys can become
 * the command union when that work starts.
 */
export const SCENE_ACTIONS = {
    add: 'adding line to scene on pointer up',
    remove: 'removing/erasing line from the scene on pointer up',
    transforming:
        'translate/rotate/scale/color/opacity change on selected lines',
    linking: 'joining or rendering connected objects at once',
    group_creation: 'creating a group',
    group_deletion: 'deleting a group',
} as const

export type SceneActionName = keyof typeof SCENE_ACTIONS
