import { test, expect } from '@playwright/test';

test.describe('Todo Page', () => {
    const BASE_URL = 'http://localhost:5173';

    test('should add a new todo and append it to the list', async ({ page }) => {
        // 1. Mock initial empty todo list
        await page.route('**/api/v1/todos', async (route) => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ todos: [] }),
                });
            }
        });

        await page.goto(BASE_URL);

        // 2. Mock POST and subsequent GET
        const newTodo = {
            id: 'mock-id-1',
            name: 'Buy milk',
            description: 'Go to the store and buy milk',
            status: false,
        };

        await page.route('**/api/v1/todos', async (route) => {
            const method = route.request().method();
            if (method === 'POST') {
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify({ todo: newTodo }),
                });
            } else if (method === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ todos: [newTodo] }),
                });
            }
        });

        // 3. User types todo name and description
        await page.getByPlaceholder('Name').fill('Buy milk');
        await page.getByPlaceholder('Description').fill('Go to the store and buy milk');

        // 4. Click the Add Todo button
        await page.getByRole('button', { name: 'Add Todo' }).click()

        // 5. Verify the created todo item appears in the list
        const todoItemName = page.getByRole('heading', { name: 'Buy milk' });
        const todoItemDesc = page.getByText('Go to the store and buy milk');

        await expect(todoItemName).toBeVisible();
        await expect(todoItemDesc).toBeVisible();

        // 6. Verify input fields are cleared
        await expect(page.getByPlaceholder('Name')).toHaveValue('');
        await expect(page.getByPlaceholder('Description')).toHaveValue('');
    });

    test('should disable Add Todo button until both name and description are provided', async ({ page }) => {
        await page.route('**/api/v1/todos', async (route) => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ todos: [] }),
                });
            }
        });

        await page.goto(BASE_URL);

        const addButton = page.getByRole('button', { name: 'Add Todo' })
        await expect(addButton).toBeDisabled();

        await page.getByPlaceholder('Name').fill('Only Name');
        await expect(addButton).toBeDisabled();

        await page.getByPlaceholder('Name').fill('');
        await page.getByPlaceholder('Description').fill('Only Description');
        await expect(addButton).toBeDisabled();

        await page.getByPlaceholder('Name').fill('Both Provided');
        await expect(addButton).toBeEnabled();
    });

    test('should update a todo to complete and hide the Complete button', async ({ page }) => {
        const initialTodo = {
            id: 'todo-1',
            name: 'Finish tests',
            description: 'Write backend and frontend tests',
            status: false,
        }
        const completedTodo = {
            ...initialTodo,
            status: true,
        }
        let updated = false

        await page.route('**/api/v1/todos**', async (route) => {
            const method = route.request().method()
            if (method === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ todos: [updated ? completedTodo : initialTodo] }),
                })
                return
            }

            if (method === 'PUT') {
                updated = true
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ todo: completedTodo }),
                })
                return
            }

            await route.continue()
        });

        await page.goto(BASE_URL);

        const completeButton = page.getByRole('button', { name: 'Complete' })
        await expect(completeButton).toBeVisible()

        await completeButton.click()

        const updatedHeading = page.getByRole('heading', { name: 'Finish tests' })
        await expect(updatedHeading).toHaveClass(/line-through/)
        await expect(completeButton).toBeHidden()
    });

    test('should delete a todo and remove it from the list', async ({ page }) => {
        const initialTodos = [
            {
                id: 'todo-1',
                name: 'Task 1',
                description: 'Description 1',
                status: false,
            },
            {
                id: 'todo-2',
                name: 'Task 2',
                description: 'Description 2',
                status: false,
            }
        ]
        let todos = [...initialTodos]

        await page.route('**/api/v1/todos**', async (route) => {
            const method = route.request().method()
            const url = route.request().url()
            if (method === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ todos }),
                })
            } else if (method === 'DELETE') {
                const id = url.split('/').pop()
                todos = todos.filter(todo => todo.id !== id)
                await route.fulfill({
                    status: 204,
                    contentType: 'application/json',
                    body: '',
                })
            }
        });

        await page.goto(BASE_URL);

        // Verify both todos are present
        await expect(page.getByRole('heading', { name: 'Task 1' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Task 2' })).toBeVisible();

        // Click delete on first todo
        const deleteButton = page.locator('.Card').first().getByRole('button', { name: 'Delete' });
        await deleteButton.click();

        // Verify only second todo remains
        await expect(page.getByRole('heading', { name: 'Task 1' })).not.toBeVisible();
        await expect(page.getByRole('heading', { name: 'Task 2' })).toBeVisible();
    });
});
