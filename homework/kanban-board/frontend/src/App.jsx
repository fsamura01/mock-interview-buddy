import './App.css'
import { useEffect, useState } from 'react'

function App() {
  const [tasks, setTasks] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    status: 'TODO'
  });

  useEffect(() => {
    const fetchTasks = async () => {
      const response = await fetch('http://localhost:3000/api/tasks');
      const data = await response.json();
      setTasks(data);
    };
    fetchTasks();
  }, []);

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch('http://localhost:3000/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    const data = await response.json();
    setTasks([...tasks, data]);
    setFormData({
      title: '',
      description: '',
      dueDate: '',
      status: 'TODO'
    });
  };

  const handleTaskDelete = async (id) => {
    const response = await fetch(`http://localhost:3000/api/tasks/${id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    setTasks(tasks.filter(task => task.id !== id));
  };

  const handleTaskStatusChange = async (id, newStatus) => {
    const task = tasks.find(task => task.id === id);
    const updatedTask = {
      ...task,
      status: newStatus
    };

    const response = await fetch(`http://localhost:3000/api/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedTask)
    });
    const data = await response.json();
    setTasks(tasks.map(task => task.id === id ? data : task));
  }


  return (
    <>
      <h1>Kanban Board</h1>

      <form className='form-section' onSubmit={handleTaskSubmit}>
        <h2>Add New Task</h2>
        <input
          type='text'
          placeholder='Title'
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}>
        </input>
        <input
          type='text'
          placeholder='Description'
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}>
        </input>
        <input
          type='date'
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}>
        </input>
        <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
          <option value="TODO">TODO</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="DONE">DONE</option>
        </select>
        <button>Add Task</button>
      </form>

      <div className="kanban-board">
        <div className="column">
          <h2>TODO</h2>
          {tasks.filter(task => task.status === 'TODO').map(task => (
            <div className="task" key={task.id}>
              <h3>{task.title}</h3>
              <p>{task.description}</p>
              <small>Due: {task.dueDate}</small>
              <select value={task.status} onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}>
                <option value="TODO">TODO</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="DONE">DONE</option>
              </select>
              <button onClick={() => handleTaskDelete(task.id)}>Delete</button>
            </div>
          ))}
        </div>

        <div className="column">
          <h2>IN PROGRESS</h2>
          {tasks.filter(task => task.status === 'IN_PROGRESS').map(task => (
            <div className="task" key={task.id}>
              <h3>{task.title}</h3>
              <p>{task.description}</p>
              <small>Due: {task.dueDate}</small>
              <button onClick={() => handleTaskDelete(task.id)}>Delete</button>
            </div>
          ))}
        </div>

        <div className="column">
          <h2>DONE</h2>
          {tasks.filter(task => task.status === 'DONE').map(task => (
            <div className="task" key={task.id}>
              <h3>{task.title}</h3>
              <p>{task.description}</p>
              <small>Due: {task.dueDate}</small>
              <button onClick={() => handleTaskDelete(task.id)}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default App
