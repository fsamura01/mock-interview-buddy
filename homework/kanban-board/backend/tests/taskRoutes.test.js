import test from "node:test";
import assert from "node:assert";
import app from "../src/app.js";

test("GET /api/tasks returns all tasks", async () => {
    const response = await fetch("http://localhost:3000/api/tasks");

    assert.strictEqual(response.status, 200);

    const tasks = await response.json();

    assert.strictEqual(tasks.length, 5);
});

test("POST /api/tasks creates a new task", async () => {
    const response = await fetch("http://localhost:3000/api/tasks", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            title: "Test Task",
            description: "Testing task creation",
            dueDate: "2026-10-01",
            status: "TODO"
        })
    });

    assert.strictEqual(response.status, 200);

    const task = await response.json();

    assert.strictEqual(task.title, "Test Task");
    assert.strictEqual(task.status, "TODO");
});

test("PUT /api/tasks/:id updates a task", async () => {
    const response = await fetch("http://localhost:3000/api/tasks/1", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            title: "Updated Task",
            description: "Updated description",
            dueDate: "2026-10-05",
            status: "IN_PROGRESS"
        })
    });

    assert.strictEqual(response.status, 200);

    const task = await response.json();

    assert.strictEqual(task.id, 1);
    assert.strictEqual(task.title, "Updated Task");
    assert.strictEqual(task.status, "IN_PROGRESS");
});


test("DELETE /api/tasks/:id deletes a task", async () => {
    const response = await fetch("http://localhost:3000/api/tasks/5", {
        method: "DELETE"
    });

    assert.strictEqual(response.status, 200);

    const result = await response.json();

    assert.strictEqual(
        result.message,
        "Task with id 5 has been deleted successfully"
    );
});