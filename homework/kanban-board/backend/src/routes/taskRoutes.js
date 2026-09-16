import express from "express";
import taskStore from "../store/taskStore.js";

const router = express.Router();

router.get("/", (req, res) => {
    const tasks = taskStore.getAllTasks();
    res.json(tasks);
});

export default router;
