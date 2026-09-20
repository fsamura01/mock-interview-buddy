import './App.css'
import { useEffect, useState } from 'react'

function App() {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    status: 'TODO'
  });

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/tasks');
        if (!response.ok) {
          throw new Error('Failed to fetch tasks');
        }
        const data = await response.json();
        setTasks(data);
      } catch (error) {
        setError('Unable to load tasks. Please make sure the server is running.');
      }
    };
    fetchTasks();
  }, []);

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const response = await fetch('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to add task');
      }
      const data = await response.json();
      setTasks(prevTasks => [...prevTasks, data]);
      setFormData({
        title: '',
        description: '',
        dueDate: '',
        status: 'TODO'
      });
    } catch (error) {
      setError('Unable to add task. Please try again.');
    }
  };

  const handleTaskDelete = async (id) => {
    try {
      setError('');
      const response = await fetch(`http://localhost:3000/api/tasks/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
    } catch (error) {
      setError('Unable to delete task. Please try again.');
    }
  };

  const handleTaskStatusChange = async (id, newStatus) => {
    const task = tasks.find(task => task.id === id);
    const updatedTask = {
      ...task,
      status: newStatus
    };
    try {
      setError('');
      const response = await fetch(`http://localhost:3000/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedTask)
      });
      if (!response.ok) {
        throw new Error('Failed to update task');
      }
      const data = await response.json();
      setTasks(prevTasks => prevTasks.map(task => task.id === id ? data : task));
    } catch (error) {
      setError('Unable to update task. Please try again.');
    }
  }


  return (
    <>
      <h1>Kanban Board</h1>
      {error && <p className="error-message">{error}</p>}

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
          <h2>DONE</h2>
          {tasks.filter(task => task.status === 'DONE').map(task => (
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
      </div>
    </>
  )
}

export default App
