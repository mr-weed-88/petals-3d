/** Named scene mutations, kept in one place so they read the same in logs. */
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
