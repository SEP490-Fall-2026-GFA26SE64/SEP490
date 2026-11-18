import { useState, type DependencyList, type Dispatch, type SetStateAction } from 'react'

/** Reset local edits with their owning scope before rendering its children. */
export function useResettableState<T>(initial: T, scope: DependencyList): [T, Dispatch<SetStateAction<T>>] {
  const [previousScope, setPreviousScope] = useState(scope)
  const [value, setValue] = useState(initial)
  if (scope.length !== previousScope.length || scope.some((item, index) => !Object.is(item, previousScope[index]))) {
    setPreviousScope(scope)
    setValue(initial)
    return [initial, setValue]
  }
  return [value, setValue]
}
