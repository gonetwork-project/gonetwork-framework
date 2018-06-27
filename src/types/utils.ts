// could be made pseudo opaque, but not much needed now
export type Milliseconds = number
export type DateMs = number

export interface Storage {
  getItem: (id: string) => Promise<string | null>
  setItem: (id: string, item: string) => Promise<boolean>
  getAllKeys: () => Promise<string[]>
  // removeItem: (id: string) => Promise<boolean> todo
  multiGet: (keys: string[]) => Promise<Array<[string, any]>>
  multiSet: (xs: [string, string][]) => Promise<boolean>
}
