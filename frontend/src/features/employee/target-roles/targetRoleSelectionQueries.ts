import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chooseTargetRole, getTargetRoleSelection } from './targetRoleSelectionApi'
import type { ChooseTargetRoleCommand } from './targetRoleSelectionTypes'

export const targetRoleSelectionQueryKey = ['employee-target-role-selection'] as const

export function useTargetRoleSelection() {
  return useQuery({
    queryKey: targetRoleSelectionQueryKey,
    queryFn: ({ signal }) => getTargetRoleSelection(signal),
  })
}

export function useChooseTargetRoleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (command: ChooseTargetRoleCommand) => chooseTargetRole(command),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: targetRoleSelectionQueryKey })
    },
  })
}
