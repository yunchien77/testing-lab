import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { serverOf } from '../src/server'
import * as TodoRepo from '../src/repo/todo'
import { FastifyInstance } from 'fastify'
import { Todo, TodoBody } from '../src/types/todo'

describe('Todo API Testing', () => {
  let server: FastifyInstance

  beforeAll(async () => {
    server = serverOf()
    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  test('When receive a GET /api/v1/todos request, Then it should response an array of todos', async () => {
    // arrange: mock the repo function to return an array of todos
    const todos: Array<Todo> = [
      {
        id: '1',
        name: 'todo 1',
        description: 'description 1',
        status: false
      },
      {
        id: '2',
        name: 'todo 2',
        description: 'description 2',
        status: true
      }
    ]
    // Mock findAllTodos get all todos from database
    vi.spyOn(TodoRepo, 'findAllTodos').mockImplementation(async () => todos)

    // act: receive a GET /api/v1/todos request
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/todos'
    })

    // assert: response should be an array of todos
    const result = JSON.parse(response.body)['todos']
    expect(result).toStrictEqual(todos)
  })

  test('Given an empty array return from repo function, When receive a GET /api/v1/todos request, Then it should response an empty array', async () => {
    // arrange: mock the repo function to return an empty array
    vi.spyOn(TodoRepo, 'findAllTodos').mockImplementation(async () => [])

    // act: receive a GET /api/v1/todos request
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/todos'
    })

    // assert: response should be an empty array
    const todos = JSON.parse(response.body)['todos']
    expect(todos).toStrictEqual([])
  })

  test('Given a valid ID and status, When receive a PUT /api/v1/todos/:id request, Then it should response the updated todo object', async () => {
    // arrange: mock the repo function to return an updated todo object
    const updatedTodo: Todo = {
      id: '1',
      name: 'todo 1',
      description: 'description 1',
      status: true
    }
    const updateSpy = vi
      .spyOn(TodoRepo, 'updateTodoById')
      .mockImplementation(async () => updatedTodo)

    // act: receive a PUT /api/v1/todos/:id request
    const response = await server.inject({
      method: 'PUT',
      url: '/api/v1/todos/1',
      headers: {
        'content-type': 'application/json'
      },
      payload: JSON.stringify({ status: true })
    })

    // assert: response should be the updated todo object
    expect(response.statusCode).toBe(200)
    const result = JSON.parse(response.body)['todo']
    expect(result).toStrictEqual(updatedTodo)
    expect(updateSpy).toHaveBeenCalledWith('1', { status: true })
  })

  test('Given an invalid ID, When receive a PUT /api/v1/todos/:id request, Then it should response with status code 404', async () => {
    // arrange: mock the repo function to return null
    const updateSpy = vi
      .spyOn(TodoRepo, 'updateTodoById')
      .mockImplementation(async () => null)

    // act: receive a PUT /api/v1/todos/:id request
    const response = await server.inject({
      method: 'PUT',
      url: '/api/v1/todos/999',
      headers: {
        'content-type': 'application/json'
      },
      payload: JSON.stringify({ status: false })
    })

    // assert: response should with status code 404
    expect(response.statusCode).toBe(404)
    const body = JSON.parse(response.body)
    expect(body).toEqual({ msg: 'Not Found Todo:999' })
    expect(updateSpy).toHaveBeenCalledWith('999', { status: false })
  })

  test('Given a valid ID, When receive a DELETE /api/v1/todos/:id request, Then it should response with status code 204', async () => {
    // arrange: mock the repo function to return a successful delete result
    const deleteSpy = vi
      .spyOn(TodoRepo, 'deleteTodoById')
      .mockImplementation(async () => ({ deletedCount: 1 } as any))

    // act: receive a DELETE /api/v1/todos/:id request
    const response = await server.inject({
      method: 'DELETE',
      url: '/api/v1/todos/1'
    })

    // assert: response should be status code 204
    expect(response.statusCode).toBe(204)
    expect(deleteSpy).toHaveBeenCalledWith('1')
  })

  test('Given an invalid ID, When receive a DELETE /api/v1/todos/:id request, Then it should response with status code 404', async () => {
    // arrange: mock the repo function to return null
    const deleteSpy = vi
      .spyOn(TodoRepo, 'deleteTodoById')
      .mockImplementation(async () => null as any)

    // act: receive a DELETE /api/v1/todos/:id request
    const response = await server.inject({
      method: 'DELETE',
      url: '/api/v1/todos/999'
    })

    // assert: response should be status code 404
    expect(response.statusCode).toBe(404)
    const body = JSON.parse(response.body)
    expect(body).toEqual({ msg: 'Not Found Todo:999' })
    expect(deleteSpy).toHaveBeenCalledWith('999')
  })

  test('Given a valid todo body, When receive a POST /api/v1/todos request, Then it should response with status code 201 and the created todo', async () => {
    // arrange: mock the repo function to return a created todo
    const newTodo: Todo = {
      id: 'new-id',
      name: 'New Todo',
      description: 'New Description',
      status: false
    }
    const createSpy = vi
      .spyOn(TodoRepo, 'createTodo')
      .mockImplementation(async () => newTodo)

    // act: receive a POST /api/v1/todos request
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/todos',
      headers: {
        'content-type': 'application/json'
      },
      payload: JSON.stringify({ name: 'New Todo', description: 'New Description' })
    })

    // assert: response should be status code 201 and the created todo
    expect(response.statusCode).toBe(201)
    const result = JSON.parse(response.body)['todo']
    expect(result).toStrictEqual(newTodo)
    expect(createSpy).toHaveBeenCalledWith({ name: 'New Todo', description: 'New Description' })
  })

  test('Given an invalid todo body missing name, When receive a POST /api/v1/todos request, Then it should response with status code 500', async () => {
    // arrange: mock the repo function to throw an error
    const createSpy = vi
      .spyOn(TodoRepo, 'createTodo')
      .mockImplementation(async () => { throw new Error('Validation failed') })

    // act: receive a POST /api/v1/todos request with missing name
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/todos',
      headers: {
        'content-type': 'application/json'
      },
      payload: JSON.stringify({ description: 'Description only' })
    })

    // assert: response should be status code 500
    expect(response.statusCode).toBe(500)
    expect(createSpy).toHaveBeenCalledWith({ description: 'Description only' })
  })
})
