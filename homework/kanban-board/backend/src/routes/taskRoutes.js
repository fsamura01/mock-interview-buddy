import express from "express";
import taskStore from "../store/taskStore.js";

const router = express.Router();

// get all tasks GET /api/tasks
router.get("/", (req, res) => {
    const tasks = taskStore.getAllTasks();
    res.json(tasks);
});

// add task POST /api/tasks
router.post("/", (req, res) => {
    const { title, description, dueDate, status } = req.body;
    const newTask = taskStore.createTask(title, description, dueDate, status);
    res.json(newTask);
});


// update task PUT /api/tasks/:id
router.put("/:id", (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, dueDate, status } = req.body;
        const updatedTask = taskStore.updateTask(id, title, description, dueDate, status);
        res.json(updatedTask);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// delete task DELETE /api/tasks/:id
router.delete("/:id", (req, res) => {
    try {
        const { id } = req.params;
        const deletedTask = taskStore.deleteTask(id);
        res.json({ message: `Task with id ${deletedTask.id} has been deleted successfully` });
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

export default router;
