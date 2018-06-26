import * as T from '../types'

export const fakeStorage = () => ({ // no persistent storage for now
  getItem: (id) => Promise.resolve(null),
  setItem: (id, item) => Promise.resolve(true),
  getAllKeys: () => Promise.resolve([]),

  multiGet: (keys) => Promise.resolve([]),
  multiSet: (xs) => Promise.resolve(true)
} as T.Storage)
