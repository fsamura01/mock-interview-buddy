import taskStore from "./store/taskStore.js";
const tasks = taskStore.getAllTasks();
console.log(tasks);
