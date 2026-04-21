import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { FastifyInstance } from 'fastify'
import { serverOf } from '../src/server'

// 1. Three-tier architecture
describe('Server Testing', () => {
  let server: FastifyInstance

  // 3. Before, After
  beforeAll(async () => {
    server = serverOf()
    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  // 2. Integration testing
  test('Given a running server, When receive a GET /ping request, Then it should response with status code 200', async () => {
    // act: receive a GET /ping request
    const response = await server.inject({
      method: 'GET',
      url: '/ping'
    })

    // assert: response should be status code 200 and body should be pong message
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body).toEqual({ msg: 'pong!' })
  })
})
