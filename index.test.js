import { generateMockObject } from './index'

describe('index.js', () => {
  it('should expose a function called generateMockObject', () => {
    expect(generateMockObject).toBeDefined()
  })
})
