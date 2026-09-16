import Task from "../models/task.js";

// Create an array with 5 tasks
const tasks = [
    new Task(1, "Task 1", "Description 1", "2026-09-24", "TODO"),
    new Task(2, "Task 2", "Description 2", "2026-09-25", "TODO"),
    new Task(3, "Task 3", "Description 3", "2026-09-26", "IN_PROGRESS"),
    new Task(4, "Task 4", "Description 4", "2026-09-27", "IN_PROGRESS"),
    new Task(5, "Task 5", "Description 5", "2026-09-28", "DONE"),
];


// Export the array
const getAllTasks = () => {
    return tasks;
};

// Add a new task
const createTask = (title, description, dueDate, status) => {
    const newTask = new Task(tasks.length + 1, title, description, dueDate, status);
    tasks.push(newTask);
    return newTask;
};

export default { getAllTasks, createTask };
